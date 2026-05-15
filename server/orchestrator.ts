import { LLMRouter, LLMMessage } from './llm-router.js';
import { ToolExecutor } from './tools.js';

export interface AgentState {
  task: string;
  files: Record<string, string>;
  history: LLMMessage[];
  errors: string[];
  status: 'planning' | 'coding' | 'executing' | 'reviewing' | 'completed' | 'failed';
  plan?: string;
  currentCode?: string;
}

export class MultiAgentOrchestrator {
  private router: LLMRouter;

  constructor() {
    this.router = new LLMRouter();
  }

  async run(initialTask: string, keys: any, preferredModel: string): Promise<AgentState> {
    let state: AgentState = {
      task: initialTask,
      files: {},
      history: [],
      errors: [],
      status: 'planning'
    };

    let iterations = 0;
    while (state.status !== 'completed' && state.status !== 'failed' && iterations < 15) {
      iterations++;
      
      switch (state.status) {
        case 'planning':
          state = await this.plannerNode(state, keys, preferredModel);
          break;
        case 'coding':
          state = await this.coderNode(state, keys, preferredModel);
          break;
        case 'executing':
          state = await this.executorNode(state, keys, preferredModel);
          break;
        case 'reviewing':
          state = await this.reviewerNode(state, keys, preferredModel);
          break;
      }
    }

    if (iterations >= 15 && state.status !== 'completed') {
      state.status = 'failed';
      state.errors.push('Max iterations reached.');
    }

    return state;
  }

  private async executeLLM(systemPrompt: string, state: AgentState, keys: any, preferredModel: string): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...state.history,
      { role: 'user', content: `Current Task: ${state.task}\nCurrent State: ${JSON.stringify({
        errors: state.errors,
        plan: state.plan,
        status: state.status
      })}` }
    ];
    return await this.router.generateContext(messages, keys, preferredModel);
  }

  private async plannerNode(state: AgentState, keys: any, preferredModel: string): Promise<AgentState> {
    const prompt = `You are the Expert Planner Agent. Your job is to break down the task into concrete steps.
Return ONLY a detailed plan in text format.`;
    const plan = await this.executeLLM(prompt, state, keys, preferredModel);
    state.plan = plan;
    state.history.push({ role: 'assistant', content: `[Planner]: Created plan:\n${plan}` });
    state.status = 'coding';
    return state;
  }

  private async coderNode(state: AgentState, keys: any, preferredModel: string): Promise<AgentState> {
    const prompt = `You are the Expert Coder Agent. Your job is to write or modify code based on the plan.
You have FULL tool access to the host environment. Output a \`\`\`tool_call JSON block to use tools.
Available tools:
1. {"name": "read_file", "arguments": {"path": "string"}}
2. {"name": "write_file", "arguments": {"path": "string", "content": "string"}}
3. {"name": "patch_file", "arguments": {"path": "string", "targetStr": "string", "replacementStr": "string"}}
4. {"name": "execute_command", "arguments": {"command": "string"}}
5. {"name": "search_code", "arguments": {"query": "string", "path": "string"}}
6. {"name": "list_dir", "arguments": {"path": "string"}}

Output exactly ONE tool_call block per response to execute a tool.
If you have written the necessary code or files and are finished coding, output "DONE_CODING" to pass control to the executor.`;
    
    const response = await this.executeLLM(prompt, state, keys, preferredModel);
    state.history.push({ role: 'assistant', content: `[Coder]:\n${response}` });

    const toolMatch = response.match(/\`\`\`(?:tool_call|json)?\n?([\s\S]*?)\n?\`\`\`/i);
    if (toolMatch) {
       try {
         const toolCallJson = JSON.parse(toolMatch[1].trim());
         const result = await ToolExecutor.execute(toolCallJson);
         state.history.push({ role: 'user', content: `[System (Tool Result)]: ${result}` });
         // Stay in coding state to allow multiple edits
       } catch(e: any) {
         state.errors.push(`Tool execution failed: ${e.message}`);
       }
    } else if (response.includes('DONE_CODING')) {
       state.status = 'executing';
    } else {
       // If the agent hallucinated and didn't use a tool or say DONE_CODING, we force execution to check
       state.status = 'executing'; 
    }
    
    return state;
  }

  private async executorNode(state: AgentState, keys: any, preferredModel: string): Promise<AgentState> {
    const prompt = `You are the Executor/Testing Agent. Your job is to run tools to verify the code works and debug errors.
Use 'execute_command' tool call. E.g., 'npm run build' or 'tsc' or 'node file.js'.
Available tools:
1. {"name": "execute_command", "arguments": {"command": "string"}}
2. {"name": "read_file", "arguments": {"path": "string"}}

Output exactly ONE tool_call block per response to execute a tool.
If tests pass or you have verified functionality, output "TESTS_PASSED".
If tests fail and you want the Coder to try again, log the error and output "TESTS_FAILED".`;

    const response = await this.executeLLM(prompt, state, keys, preferredModel);
    state.history.push({ role: 'assistant', content: `[Executor]:\n${response}` });

    const toolMatch = response.match(/\`\`\`(?:tool_call|json)?\n?([\s\S]*?)\n?\`\`\`/i);
    if (toolMatch) {
       try {
         const toolCallJson = JSON.parse(toolMatch[1].trim());
         const result = await ToolExecutor.execute(toolCallJson);
         state.history.push({ role: 'user', content: `[System (Tool Result)]: ${result}` });
       } catch(e: any) {
         state.errors.push(`Execution tool failed: ${e.message}`);
       }
    } else if (response.includes('TESTS_PASSED')) {
       state.status = 'reviewing';
    } else if (response.includes('TESTS_FAILED')) {
       state.status = 'coding'; // send back to coder
    } else {
       state.status = 'reviewing';
    }
    
    return state;
  }

  private async reviewerNode(state: AgentState, keys: any, preferredModel: string): Promise<AgentState> {
    const prompt = `You are the Reviewer / Self-Reflection Agent. Evaluate the work.
If everything meets the requirements of the original task, output "APPROVED".
If something is missing or wrong, describe it and output "REJECTED".`;

    const response = await this.executeLLM(prompt, state, keys, preferredModel);
    state.history.push({ role: 'assistant', content: `[Reviewer]:\n${response}` });

    if (response.includes('APPROVED')) {
       state.status = 'completed';
    } else if (response.includes('REJECTED')) {
       state.status = 'planning'; // Go back to drawing board
       state.errors.push(`Reviewer rejected implementation: ${response}`);
    } else {
       // default to completed to avoid infinite loop
       state.status = 'completed';
    }
    
    return state;
  }
}
