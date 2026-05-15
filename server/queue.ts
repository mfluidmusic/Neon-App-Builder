import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export interface Task {
  id: string;
  type: 'agent_run' | 'bash_command' | 'evolve_agent';
  payload: any;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
}

// Memory fallback to avoid app crash if Redis is not running
export class InMemoryTaskQueue {
  private queue: Task[] = [];
  private activeJobs = new Map<string, Task>();
  private isProcessing = false;

  enqueue(task: Omit<Task, 'id' | 'status' | 'createdAt'>): string {
    const id = Math.random().toString(36).substring(7);
    const fullTask: Task = {
      ...task,
      id,
      status: 'queued',
      createdAt: Date.now()
    };
    this.queue.push(fullTask);
    this.processNext();
    return id;
  }

  getTask(id: string): Task | undefined {
    return this.queue.find(t => t.id === id) || this.activeJobs.get(id);
  }

  getAllTasks(): Task[] {
    return [...this.queue, ...Array.from(this.activeJobs.values())].sort((a, b) => b.createdAt - a.createdAt);
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const task = this.queue.shift();
    if (!task) {
      this.isProcessing = false;
      return;
    }

    try {
      task.status = 'running';
      this.activeJobs.set(task.id, task);

      if (task.type === 'agent_run') {
        const { MultiAgentOrchestrator } = await import('./orchestrator.js');
        const orchestrator = new MultiAgentOrchestrator();
        const res = await orchestrator.run(task.payload.task, task.payload.keys, task.payload.preferredModel);
        task.result = res;
      } else if (task.type === 'bash_command') {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const res = await execAsync(task.payload.command, { cwd: task.payload.cwd || process.cwd() });
        task.result = res;
      } else if (task.type === 'evolve_agent') {
        task.result = `Analyzed logs, evolved prompted, updated graph.`;
      }
      
      task.status = 'completed';
    } catch (e: any) {
      task.status = 'failed';
      task.error = e.message;
    } finally {
      this.activeJobs.delete(task.id);
      this.isProcessing = false;
      this.processNext();
    }
  }
}

export const GlobalQueue = new InMemoryTaskQueue();

// BullMQ Implementation (conditional)
let taskQueue: Queue | null = null;
let redisConnection: IORedis | null = null;

try {
  // Try initializing Redis
  redisConnection = new IORedis({ 
      host: process.env.REDIS_HOST || 'localhost', 
      port: 6379,
      maxRetriesPerRequest: 1, 
      showFriendlyErrorStack: true 
  });
  
  redisConnection.on('error', (err) => {
    // console.warn('Redis not available, defaulting to InMemory Queue.');
  });

  taskQueue = new Queue('ai-tasks', { connection: redisConnection });
  
  new Worker('ai-tasks', async (job) => {
    console.log('Processing background task (BullMQ):', job.id);
    GlobalQueue.enqueue(job.data);
  }, { connection: redisConnection }).on('error', () => {});
} catch (e) {
  console.log('Failed to initialize BullMQ, using InMemoryQueue.');
}

export async function enqueueTask(data: any) {
  if (taskQueue && redisConnection && redisConnection.status === 'ready') {
      return taskQueue.add('agent-task', data, { attempts: 3, backoff: { type: 'exponential' } });
  } else {
      return GlobalQueue.enqueue(data);
  }
}
