import { StateGraph, START, END } from "@langchain/langgraph";
import { globalSandboxManager } from './sandbox-manager.js';
import { LLMRouter, LLMMessage } from './llm-router.js';
import { ToolExecutor } from './tools.js';

export interface EnhancedAgentState {
  task: string;
  subtasks: string[];
  currentPlan: string;
  thought: string;
  toolCalls: any[];
  toolResults: string[];
  errors: string[];
  sandboxId?: string;
  workspacePath: string;
  history: LLMMessage[];
  performanceMetrics: { time: number; tokens: number; successRate: number };
  isComplete: boolean;
  evolutionScore: number;
}

export class AgentOrchestratorGraph {
  private router = new LLMRouter();
  private keys: any;
  private preferredModel: string;

  constructor(keys: any, preferredModel: string) {
      this.keys = keys;
      this.preferredModel = preferredModel;
  }

  private async executeLLM(systemPrompt: string, state: EnhancedAgentState): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...state.history,
      { role: 'user', content: `Task: ${state.task}\nCurrent errors: ${state.errors.join(', ')}` }
    ];
    return await this.router.generateContext(messages, this.keys, this.preferredModel);
  }

  private async superPlanner(state: EnhancedAgentState) {
    const prompt = `You are the Super-Planner. Decompose the task into subtasks if needed. Return subtasks JSON or just basic plan.`;
    const response = await this.executeLLM(prompt, state);
    return { currentPlan: response, subtasks: ["Subtask 1"], history: [...state.history, {role: 'assistant', content: `[Planner]: ${response}`}] };
  }

  private async parallelExecutor(state: EnhancedAgentState) {
    const prompt = `You are a Parallel Executor. Write code or commands to solve the task. Output \`\`\`tool_call JSON block.
If finished, output DONE_CODING.`;
    const response = await this.executeLLM(prompt, state);
    const toolMatch = response.match(/\`\`\`(?:tool_call|json)?\n?([\s\S]*?)\n?\`\`\`/i);
    let results = [...state.toolResults];
    let errors = [...state.errors];
    
    if (toolMatch) {
       try {
         const json = JSON.parse(toolMatch[1].trim());
         const res = await ToolExecutor.execute(json);
         results.push(res);
       } catch (e: any) {
         errors.push(e.message);
       }
    }
    
    return { 
        history: [...state.history, {role: 'assistant', content: `[Executor]: ${response}`}],
        toolResults: results,
        errors: errors,
        isComplete: response.includes('DONE_CODING') && errors.length === 0
    };
  }

  private async debateVerifier(state: EnhancedAgentState) {
    const prompt = `You are a Verifier. Review errors: ${state.errors.join(', ')} and output a fix thought.`;
    const response = await this.executeLLM(prompt, state);
    return { 
       history: [...state.history, {role: 'assistant', content: `[Verifier]: ${response}`}],
       errors: [] // clear errors for next executor run
    };
  }

  private async evolverNode(state: EnhancedAgentState) {
    if (state.errors.length > 0) {
      console.log("🚀 Evolving self — analyzing task history");
    }
    return { isComplete: true };
  }

  buildGraph() {
    const graphState = {
        task: null,
        subtasks: null,
        currentPlan: null,
        thought: null,
        toolCalls: null,
        toolResults: null,
        errors: null,
        sandboxId: null,
        workspacePath: null,
        history: null,
        performanceMetrics: null,
        isComplete: null,
        evolutionScore: null
    };
    
    // Simple mock implementation of LangGraph without true reducer functions to simply get compiling
    const builder = new StateGraph<EnhancedAgentState>({
        channels: {
            task: { value: (a: any, b: any) => b || a },
            subtasks: { value: (a: any, b: any) => b || a },
            currentPlan: { value: (a: any, b: any) => b || a },
            thought: { value: (a: any, b: any) => b || a },
            toolCalls: { value: (a: any, b: any) => b || a },
            toolResults: { value: (a: any, b: any) => b || a },
            errors: { value: (a: any, b: any) => b || a },
            sandboxId: { value: (a: any, b: any) => b || a },
            workspacePath: { value: (a: any, b: any) => b || a },
            history: { value: (a: any, b: any) => b || a },
            performanceMetrics: { value: (a: any, b: any) => b || a },
            isComplete: { value: (a: any, b: any) => b !== null ? b : a },
            evolutionScore: { value: (a: any, b: any) => b || a }
        }
    });

    builder
      .addNode("super-planner", this.superPlanner.bind(this))
      .addNode("parallel-executor", this.parallelExecutor.bind(this))
      .addNode("debate-verifier", this.debateVerifier.bind(this))
      .addNode("evolver", this.evolverNode.bind(this))
      
      .addEdge(START, "super-planner")
      .addEdge("super-planner", "parallel-executor")
      .addConditionalEdges("parallel-executor", (s: EnhancedAgentState) => s.isComplete ? "evolver" : (s.errors.length > 0 ? "debate-verifier" : "parallel-executor"))
      .addEdge("debate-verifier", "parallel-executor")
      .addEdge("evolver", END);

    return builder.compile();
  }
}
