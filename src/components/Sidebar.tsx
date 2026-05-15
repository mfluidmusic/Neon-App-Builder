import React from 'react';
import { Plus, Moon, Sun, Settings, Key, Trash2, TerminalSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import * as motion from "motion/react-client";

interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export function Sidebar({
  isOpen,
  chats,
  activeChatId,
  isDark,
  onToggleTheme,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenQueue,
  onOpenSettings
}: {
  isOpen: boolean;
  chats: ChatSummary[];
  activeChatId: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenQueue: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed md:relative z-40 w-64 h-full flex flex-col transition-transform duration-300 ease-in-out border-r border-white/10 backdrop-blur-md bg-black/20",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
          <span className="font-bold text-xl tracking-tight uppercase">Neon</span>
        </div>
        <button
          onClick={onNewChat}
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-3 font-medium shadow-inner"
        >
          <Plus size={20} /> New Build
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 ml-2">
          Your Builds
        </div>
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "group p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-colors",
              activeChatId === chat.id
                ? "bg-white/10 border border-white/10 text-cyan-400"
                : "hover:bg-white/5 text-zinc-400 opacity-70"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold truncate pr-2">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <span className="text-[10px] opacity-70 font-mono">
              {new Date(chat.updatedAt).toLocaleDateString()}
            </span>
          </div>
        ))}
        {chats.length === 0 && (
          <div className="text-sm text-zinc-500 px-2 italic mt-4">
            No previous builds.
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1 text-sm font-medium">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors opacity-80"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors opacity-80">
          <Key size={18} />
          <span>API Keys</span>
        </button>
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors opacity-80"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button 
          onClick={onOpenQueue}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-emerald-400 opacity-90 mb-4"
        >
          <TerminalSquare size={18} className="animate-pulse" />
          <span className="font-mono">Task Queue</span>
        </button>
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs flex items-center justify-between mt-2">
          <span>System: Online</span>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
        </div>
      </div>
    </div>
  );
}
