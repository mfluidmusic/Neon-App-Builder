import { GoogleGenAI } from '@google/genai';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMRouter {
  private activeModel: string = 'gemini';
  private autoSwap: boolean = true;
  private keyFails: Record<string, number> = {};

  async generateContext(messages: LLMMessage[], keys: Record<string, string>, modelPreference: string) {
    const providers = ['gemini', 'openai', 'deepseek', 'groq'];
    
    let target = modelPreference;
    
    const cleanKey = (k: string | undefined) => (k || '').trim().replace(/^["']|["']$/g, '');

    const hasKey = (provider: string) => {
      let k;
      if (provider === 'gemini') k = keys.gemini || process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY;
      else if (provider === 'openai') k = keys.openai || process.env.OPENAI_API_KEY;
      else if (provider === 'deepseek') k = keys.deepseek || process.env.DEEPSEEK_API_KEY;
      else if (provider === 'groq') k = keys.groq || process.env.GROQ_API_KEY;
      else k = keys[provider];
      
      const clean = cleanKey(k);
      return !!clean && clean !== 'MY_GEMINI_API_KEY' && !clean.includes('MY_GEMINI');
    };

    if (!providers.includes(target) || !hasKey(target)) {
       target = hasKey('gemini') ? 'gemini' : providers.find(p => hasKey(p)) || 'gemini';
    }

    const tryProvider = async (provider: string): Promise<string> => {
      try {
        if (provider === 'gemini') {
          const key = cleanKey(keys.gemini || process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY);
          if (!key) throw new Error('Gemini API key is missing. Please add a valid key in Settings.');
          return await this.callGemini(messages, key);
        } else if (provider === 'openai') {
          const key = cleanKey(keys.openai || process.env.OPENAI_API_KEY);
          if (!key) throw new Error('OpenAI API key is missing. Please add it in Settings.');
          return await this.callOpenAI(messages, key);
        } else if (provider === 'deepseek') {
          const key = cleanKey(keys.deepseek || process.env.DEEPSEEK_API_KEY);
          if (!key) throw new Error('DeepSeek API key is missing. Please add it in Settings.');
          return await this.callDeepSeek(messages, key);
        } else if (provider === 'groq') {
          const key = cleanKey(keys.groq || process.env.GROQ_API_KEY);
          if (!key) throw new Error('Groq API key is missing. Please add it in Settings.');
          return await this.callGroq(messages, key);
        }
        throw new Error('Unknown provider');
      } catch (err: any) {
        console.error(`Provider error [${provider}]:`, err.message);
        if (err.message.includes('429') || err.message.includes('exhausted') || err.message.includes('rate')) {
           this.keyFails[provider] = (this.keyFails[provider] || 0) + 1;
        }
        throw err;
      }
    };

    try {
      this.activeModel = target;
      return await tryProvider(target);
    } catch (e: any) {
      if (this.autoSwap) {
        let lastErr = e;
        let attempted = [target];
        for (const p of providers) {
          if (p !== target && hasKey(p)) {
            try {
              this.activeModel = p;
              attempted.push(p);
              return await tryProvider(p);
            } catch (err: any) {
              lastErr = err;
            }
          }
        }
        throw new Error(`All available models failed (${attempted.join(', ')}). Last error: ${lastErr.message || String(lastErr)}`);
      }
      throw e;
    }
  }

  getActiveModel() {
    return this.activeModel;
  }
  
  setAutoSwap(val: boolean) {
    this.autoSwap = val;
  }

  private async callGemini(messages: LLMMessage[], key: string) {
    const ai = new GoogleGenAI({ apiKey: key });
    const systemInstruction = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const msgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
      // Note: We'll implement true multimodal files via Gemini API natively later
    }));
    
    const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError = null;

    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: msgs,
            config: { systemInstruction }
        });
        return response.text || '';
      } catch (e: any) {
        lastError = e;
        const msg = typeof e === 'object' && e !== null ? JSON.stringify(e) + ' ' + (e.message || '') : String(e);
        if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
           console.log(`Model ${modelName} rate limited, trying next...`);
           continue;
        }
        throw e;
      }
    }
    throw lastError;
  }

  private async callOpenAI(messages: LLMMessage[], key: string) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
    if (!res.ok) throw new Error(`OpenAI Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  private async callDeepSeek(messages: LLMMessage[], key: string) {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
    if (!res.ok) throw new Error(`DeepSeek Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  private async callGroq(messages: LLMMessage[], key: string) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
    if (!res.ok) throw new Error(`Groq Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }
}
