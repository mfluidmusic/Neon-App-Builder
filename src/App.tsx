import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatArea } from './components/ChatArea';
import { Menu } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { TaskQueueDashboard } from './components/TaskQueueDashboard';

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatFull extends ChatSummary {
  messages: Message[];
}

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatFull | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveChat(data);
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!window.confirm("Delete this build?")) return;
    try {
      await fetch(`/api/chat/${id}`, { method: 'DELETE' });
      await loadHistory();
      if (activeChat?.id === id) {
        setActiveChat(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (msg: string, attachedFiles?: any[]) => {
    setIsGenerating(true);
    
    // Optimistic UI update
    const currentChatId = activeChat?.id || null;
    const optimisticMessage: Message = { role: 'user', content: msg };
    
    if (activeChat) {
      setActiveChat({
        ...activeChat,
        messages: [...activeChat.messages, optimisticMessage]
      });
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: msg,
          chatId: currentChatId,
          files: attachedFiles || []
        })
      });

      if (res.ok) {
        const data = await res.json();
        await loadChat(data.chatId);
        await loadHistory();
      } else {
        console.error('Failed to send message');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="flex h-screen overflow-hidden font-sans text-zinc-100" 
      style={{ backgroundColor: '#09090b', backgroundImage: 'radial-gradient(circle at 0% 0%, #1e1b4b 0%, transparent 50%), radial-gradient(circle at 100% 100%, #312e81 0%, transparent 50%), radial-gradient(circle at 50% 50%, #000000 0%, #09090b 100%)' }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        chats={chats}
        activeChatId={activeChat?.id || null}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onNewChat={handleNewChat}
        onSelectChat={loadChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
        onOpenQueue={() => setShowQueue(true)}
      />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showQueue && <TaskQueueDashboard onClose={() => setShowQueue(false)} />}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header Toggle */}
        {!activeChat && (
          <header className="md:hidden h-14 border-b border-white/10 flex items-center px-4 absolute top-0 w-full z-10 bg-black/10 backdrop-blur-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-lg text-white">
              <Menu size={24} />
            </button>
            <div className="flex-1 text-center font-semibold text-lg tracking-tight text-white">Neon Builder</div>
          </header>
        )}
        
        {activeChat ? (
          <>
            <div className="md:hidden absolute top-0 left-0 p-4 z-20">
              <button onClick={() => setSidebarOpen(true)} className="p-2 bg-black/20 backdrop-blur-md shadow-sm border border-white/10 rounded-lg text-white hover:bg-black/30 transition-colors">
                <Menu size={20} />
              </button>
            </div>
            <ChatArea
              chatId={activeChat.id}
              title={activeChat.title}
              messages={activeChat.messages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onOpenSettings={() => setShowSettings(true)}
            />
          </>
        ) : (
          <WelcomeScreen onStart={(msg) => handleSendMessage(msg, [])} onOpenSettings={() => setShowSettings(true)} />
        )}
      </div>
    </div>
  );
}

