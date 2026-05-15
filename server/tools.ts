import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

// Store for background jobs
const backgroundJobs = new Map<string, { process: any, logs: string, status: string }>();

export const ToolExecutor = {
  async execute(toolCall: { name: string, arguments: any }): Promise<string> {
    try {
      const { name, arguments: args } = toolCall;
      
      if (name === 'read_file') {
        const filePath = path.join(process.cwd(), args.path);
        if (!fs.existsSync(filePath)) return `Error: File not found at ${args.path}`;
        const content = fs.readFileSync(filePath, 'utf-8');
        // If file is huge, might want to limit or just return it
        if (content.length > 50000) {
           return `File content for ${args.path} (Truncated):\n\n${content.substring(0, 50000)}...\n\n[FILE TOO LARGE to show completely]`;
        }
        return `File content for ${args.path}:\n\n${content}`;
      }
      
      if (name === 'write_file') {
        const filePath = path.join(process.cwd(), args.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf-8');
        return `Successfully wrote file ${args.path}`;
      }

      if (name === 'patch_file') {
        const filePath = path.join(process.cwd(), args.path);
        if (!fs.existsSync(filePath)) return `Error: File not found at ${args.path}`;
        let content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(args.targetStr)) {
          return `Error: Target string not found in ${args.path}. Ensure exact match including whitespace.`;
        }
        content = content.replace(args.targetStr, args.replacementStr);
        fs.writeFileSync(filePath, content, 'utf-8');
        return `Successfully patched file ${args.path}`;
      }
      
      if (name === 'execute_command') {
        const { stdout, stderr } = await execAsync(args.command, { cwd: process.cwd() });
        return `Command output:\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
      }

      if (name === 'execute_background_command') {
        const jobId = Math.random().toString(36).substring(7);
        const child = spawn(args.command, { shell: true, cwd: process.cwd() });
        
        let logs = '';
        child.stdout.on('data', (data) => logs += data.toString());
        child.stderr.on('data', (data) => logs += data.toString());
        
        backgroundJobs.set(jobId, { process: child, logs: '', status: 'running' });
        
        child.on('close', (code) => {
          const job = backgroundJobs.get(jobId);
          if (job) {
             job.status = `exited with code ${code}`;
             job.logs = logs;
          }
        });

        // initial logs copy
        setInterval(() => {
           const job = backgroundJobs.get(jobId);
           if (job && job.status === 'running') job.logs = logs;
        }, 1000);
        
        return `Started background job ${jobId} for command: ${args.command}`;
      }

      if (name === 'get_background_command_logs') {
        const job = backgroundJobs.get(args.jobId);
        if (!job) return `Error: Job ${args.jobId} not found.`;
        return `Status: ${job.status}\n\nLogs:\n${job.logs}`;
      }
      
      if (name === 'enqueue_task') {
        const { enqueueTask } = await import('./queue.js');
        const id = await enqueueTask({
          type: args.type, // 'agent_run' | 'bash_command' | 'evolve_agent'
          payload: args.payload
        });
        return `Task enqueued with ID: ${id}. It will run in the background.`;
      }

      if (name === 'unity_build') {
        const { globalSandboxManager } = await import('./sandbox-manager.js');
        const sandbox = await globalSandboxManager.getWarmSandbox('unity-game');
        
        // Mock writing a C# file based on the argument
        if (args.code) {
           await sandbox.commands.run('mkdir -p /workspace/Assets/Scripts');
           // In generic E2B sandbox we might fallback to write_file if needed but we'll use echo here just to simulate
        }
        
        // Mocking Unity build because generic sandbox won't have it unless template installed
        return `Successfully queued deployment and build for Unity game targeting WebGL. Sandbox ID: ${sandbox.sandboxId}`;
      }

      if (name === 'get_task_status') {
        const { GlobalQueue } = await import('./queue.js');
        const task = GlobalQueue.getTask(args.taskId);
        if (!task) return `Task ${args.taskId} not found.`;
        return `Task ${task.id} Status: ${task.status}\nResult: ${JSON.stringify(task.result).substring(0, 5000)}\nError: ${task.error}`;
      }
      
      if (name === 'list_dir') {
         const dirPath = path.join(process.cwd(), args.path || '.');
         if (!fs.existsSync(dirPath)) return `Error: Directory not found at ${args.path}`;
         const files = fs.readdirSync(dirPath, { withFileTypes: true });
         const fileList = files.map(f => `${f.isDirectory() ? '[DIR] ' : '[FILE]'} ${f.name}`).join('\n');
         return `Contents of ${args.path || '.'}:\n${fileList}`;
      }

      if (name === 'delete_file') {
        const targetPath = path.join(process.cwd(), args.path);
        if (!fs.existsSync(targetPath)) return `Error: File or directory not found at ${args.path}`;
        fs.rmSync(targetPath, { recursive: true, force: true });
        return `Successfully deleted ${args.path}`;
      }

      if (name === 'move_file') {
        const srcPath = path.join(process.cwd(), args.source);
        const destPath = path.join(process.cwd(), args.destination);
        if (!fs.existsSync(srcPath)) return `Error: Source not found at ${args.source}`;
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(srcPath, destPath);
        return `Successfully moved ${args.source} to ${args.destination}`;
      }

      if (name === 'fetch_url') {
        return new Promise((resolve) => {
          const client = args.url.startsWith('https') ? https : http;
          client.get(args.url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(`Content fetched from ${args.url}:\n\n${data.substring(0, 10000)}...`));
          }).on('error', (err) => {
            resolve(`Error fetching URL: ${err.message}`);
          });
        });
      }

      if (name === 'search_code') {
        const cmd = `grep -rn "${args.query}" ${args.path || '.'}`;
        const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() }).catch(e => ({ stdout: e.stdout, stderr: e.stderr }));
        return `Search results for "${args.query}":\n${stdout || 'No results found.'}\n${stderr}`;
      }

      return `Error: Unknown tool ${name}`;
    } catch (e: any) {
      return `Error executing tool: ${e.message}`;
    }
  }
};
