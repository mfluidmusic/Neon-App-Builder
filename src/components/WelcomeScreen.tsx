import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Sparkles, Paperclip } from 'lucide-react';

export function WelcomeScreen({ onStart, onOpenSettings }: { onStart: (msg: string) => void, onOpenSettings: () => void }) {
  const [input, setInput] = useState('');

  // Particle effect generator
  useEffect(() => {
    const container = document.getElementById('neon-container');
    if (!container) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        const p = document.createElement('div');
        p.className = 'particle';
        const dx = (Math.random() - 0.5) * 600;
        const dy = (Math.random() - 0.5) * 300 - 80;
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        p.style.left = '50%';
        p.style.top = '40%';
        container.appendChild(p);
        setTimeout(() => p.remove(), 4000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    if (input.trim()) {
      onStart(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
      <div id="neon-container" className="relative text-center px-6 z-10 w-full mb-12">
        <h1 className="neon-text text-5xl md:text-7xl font-bold tracking-tighter text-white font-sans">
          What do you want to do?
        </h1>
      </div>

      <div className="w-full max-w-4xl px-8 z-20">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="Describe a feature, ask a question, or trigger a self-build..."
            className="w-full bg-white/5 border border-white/20 rounded-2xl py-6 pl-16 pr-24 text-lg focus:outline-none focus:border-cyan-400/50 transition-all backdrop-blur-xl text-zinc-100 placeholder-zinc-500"
          />
          <div className="absolute left-6 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
          </div>
          <button
            onClick={handleStart}
            disabled={!input.trim()}
            className="absolute right-4 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            Build
          </button>
        </div>
        <div className="flex gap-6 mt-4 ml-6">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></span> Attach Files
          </span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span> Project Context
          </span>
          <span onClick={onOpenSettings} className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></span> Code Settings
          </span>
        </div>
      </div>
    </div>
  );
}

