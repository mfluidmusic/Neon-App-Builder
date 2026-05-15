import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '../lib/utils';
import * as motion from "motion/react-client";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatArea({
  chatId,
  title,
  messages,
  isGenerating,
  onSendMessage,
  onOpenSettings
}: {
  chatId: string;
  title: string;
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (msg: string, attachedFiles?: any[]) => void;
  onOpenSettings: () => void;
}) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSend = async () => {
    if ((input.trim() || files.length > 0) && !isGenerating) {
      // First upload files if any
      let uploadedFiles = [];
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          uploadedFiles = data.files;
        }
      }

      onSendMessage(input.trim(), uploadedFiles);
      setInput('');
      setFiles([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent h-full max-h-screen">
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/10 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-white">{title}</span>
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-tighter">Active Model</span>
            <span className="text-sm font-mono text-cyan-400">GEMINI-2.5-PRO</span>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 overflow-auto p-4 md:p-8 space-y-6"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex w-full gap-4",
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded bg-fuchsia-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-2">A1</div>
            )}
            <div
              className={cn(
                "max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 whitespace-pre-wrap text-sm leading-relaxed",
                msg.role === 'user'
                  ? 'bg-fuchsia-600/20 border border-fuchsia-600/30 backdrop-blur-sm shadow-md text-zinc-100'
                  : 'bg-white/5 border border-white/10 backdrop-blur-sm text-zinc-100'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-2">ME</div>
            )}
          </motion.div>
        ))}
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full gap-4 justify-start">
             <div className="w-8 h-8 rounded bg-fuchsia-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-2">A1</div>
             <div className="bg-white/5 border border-white/10 backdrop-blur-sm text-zinc-100 max-w-[75%] rounded-2xl px-6 py-5 shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" style={{ animationDelay: '300ms' }} />
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-8 border-t border-transparent bg-gradient-to-t from-black/40 to-transparent">
        <div className="max-w-4xl mx-auto">
          {files.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white whitespace-nowrap">
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-fuchsia-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex items-center group">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={e => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files)])} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-4 p-2 text-zinc-500 hover:text-cyan-400 transition-colors z-10"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Describe a feature, attach files, or trigger a self-build..."
              className="w-full bg-white/5 border border-white/20 rounded-2xl py-6 pr-24 pl-14 text-lg focus:outline-none focus:border-cyan-400/50 transition-all backdrop-blur-xl text-zinc-100 shadow-sm placeholder-zinc-500"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && files.length === 0) || isGenerating}
              className="absolute right-4 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              Build
            </button>
          </div>
          <div className="flex gap-6 mt-4 ml-6 hidden sm:flex">
            <span onClick={() => fileInputRef.current?.click()} className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></span> Attach Files
            </span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span> Project Context
            </span>
            <span onClick={onOpenSettings} className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></span> API Keys & Settings
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

