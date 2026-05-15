import { Sandbox } from '@e2b/code-interpreter';

export class SandboxManager {
  private pool: Map<string, Sandbox[]> = new Map();
  private warmPoolSize = 2; // Keep it small for dev

  async getWarmSandbox(template: string = 'base'): Promise<Sandbox> {
    if (!this.pool.has(template) || this.pool.get(template)!.length === 0) {
      await this.warmPool(template);
    }
    const sandboxArray = this.pool.get(template);
    if (sandboxArray && sandboxArray.length > 0) {
        return sandboxArray.pop()!;
    }
    // Fallback if empty after warmPool
    return await Sandbox.create({ template, timeoutMs: 3600000 });
  }

  private async warmPool(template: string) {
    const instances: Sandbox[] = [];
    for (let i = 0; i < this.warmPoolSize; i++) {
        try {
            const sb = await Sandbox.create({ 
                template, 
                timeoutMs: 3600000 
            });
            instances.push(sb);
        } catch (e) {
            console.error(`Failed to warm sandbox for template ${template}`, e);
        }
    }
    this.pool.set(template, instances);
  }

  async forkForParallel(sandbox: Sandbox): Promise<Sandbox> {
    // E2B snapshot is not natively available in open source as easily without specific flags,
    // so we'll just create a new one for now as a placeholder for cloning.
    return await Sandbox.create({ template: 'base', timeoutMs: 3600000 }); 
  }
}

export const globalSandboxManager = new SandboxManager();
