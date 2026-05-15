import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<{ [key: string]: string }>({});
  const [activeModel, setActiveModel] = useState('gemini');

  useEffect(() => {
    fetch('/api/keys')
      .then(r => r.json())
      .then(d => {
        setKeys(d);
        if (d.activeModel) setActiveModel(d.activeModel);
      });
  }, []);

  const handleSave = async () => {
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...keys, activeModel })
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2">Preferred Model</label>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-cyan-400"
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="deepseek">DeepSeek (DeepSeek Chat)</option>
              <option value="groq">Groq (Llama 3.3)</option>
            </select>
          </div>

          {[
            { id: 'gemini', label: 'Gemini / Google AI Studio API Key' },
            { id: 'openai', label: 'OpenAI API Key' },
            { id: 'deepseek', label: 'DeepSeek API Key' },
            { id: 'groq', label: 'Groq API Key' },
            { id: 'pinecone', label: 'Pinecone API Key (Vector Memory)' },
            { id: 'supabase_url', label: 'Supabase URL (Database)' },
            { id: 'supabase_key', label: 'Supabase Anon Key (Database)' }
          ].map(provider => (
            <div key={provider.id}>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2">
                {provider.label}
              </label>
              <input
                type="password"
                value={keys[provider.id] || ''}
                onChange={(e) => setKeys({ ...keys, [provider.id]: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-400"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl hover:bg-white/5 text-zinc-300">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-medium">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
