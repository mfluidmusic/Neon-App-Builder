import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, TerminalSquare, X } from 'lucide-react';

export function TaskQueueDashboard({ onClose }: { onClose: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for tasks
  useEffect(() => {
    const fetchTasks = async () => {
       try {
         // We can use a new API endpoint we'll create: /api/tasks
         const res = await fetch('/api/tasks');
         const data = await res.json();
         if (data.tasks) {
           setTasks(data.tasks);
         }
       } catch (e) {
         console.error('Failed to fetch tasks', e);
       } finally {
         setLoading(false);
       }
    };
    
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3 text-emerald-400">
            <TerminalSquare size={20} />
            <h2 className="text-lg font-mono font-semibold text-white tracking-tight">Autonomous Agent Queue</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-gray-900 to-gray-950">
          {loading ? (
            <div className="text-gray-400 text-sm font-mono flex items-center gap-2">
               <span className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
               Syncing multi-agent state...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-4">
               <div className="relative">
                 <TerminalSquare size={48} className="opacity-20" />
                 <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gray-800 rounded-full border border-gray-700 animate-pulse" />
               </div>
               <p className="font-mono text-sm">No autonomous sub-agents running.</p>
            </div>
          ) : (
             <div className="space-y-4">
               {tasks.map((task) => (
                 <div key={task.id} className="relative group bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 font-mono text-sm overflow-hidden transition-all hover:border-gray-600">
                   {task.status === 'running' && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 animate-pulse" />
                   )}
                   {task.status === 'completed' && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                   )}
                   {task.status === 'failed' && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                   )}
                   
                   <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-3">
                       <span className="px-2 py-1 bg-gray-900 rounded text-xs font-bold text-gray-300 border border-gray-700">
                         ID: {task.id}
                       </span>
                       <span className="text-gray-200 font-semibold">{task.type.toUpperCase()}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        {task.status === 'queued' && <span className="text-gray-400 flex items-center gap-1"><Clock size={14}/> Queued</span>}
                        {task.status === 'running' && <span className="text-blue-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"/> Processing</span>}
                        {task.status === 'completed' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={14}/> Success</span>}
                        {task.status === 'failed' && <span className="text-red-400 flex items-center gap-1"><XCircle size={14}/> Failed</span>}
                     </div>
                   </div>

                   <div className="text-gray-400 text-xs mb-3 bg-gray-900/50 p-2 rounded">
                     {JSON.stringify(task.payload).substring(0, 150)}...
                   </div>

                   {task.error && (
                     <div className="mt-2 text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-900/50">
                       <span className="font-bold">Error:</span> {task.error}
                     </div>
                   )}
                   
                   {task.result && task.status === 'completed' && (
                     <div className="mt-2 text-emerald-400 text-xs bg-emerald-950/20 p-2 rounded border border-emerald-900/30 max-h-32 overflow-y-auto overflow-x-hidden">
                       <span className="font-bold">Output:</span> {JSON.stringify(task.result, null, 2)}
                     </div>
                   )}
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
