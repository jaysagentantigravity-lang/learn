import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSession } from '../services/storageService';
import BorderBeam from './BorderBeam';

interface HistoryPanelProps {
  sessions: ChatSession[];
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ sessions, onLoadSession, onDeleteSession, onClose }) => {
  
  return (
    <div className="flex flex-col items-center justify-start h-full w-full px-4 md:px-8 pt-10 pb-4 z-10 overflow-hidden">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="text-3xl font-light text-white tracking-wide">
            <span className="text-cyan-400 font-bold">Memory</span> Core
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Local Encrypted Storage</p>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </motion.div>

      {/* List Container */}
      <div className="w-full max-w-4xl flex-1 overflow-y-auto custom-scrollbar pr-2">
        {sessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="h-64 flex flex-col items-center justify-center text-zinc-600"
          >
            <i className="fa-regular fa-folder-open text-4xl mb-4 opacity-30"></i>
            <p className="text-sm font-mono">No archives found.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {sessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onLoadSession(session)}
                  className="group cursor-pointer rounded-3xl"
                >
                  <BorderBeam className="rounded-3xl hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)] transition-shadow">
                    <div className="p-5 bg-black/40 h-full flex flex-col justify-between min-h-[140px] relative">
                      
                      {/* Date Badge */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-cyan-500/80 font-mono border border-cyan-500/20 px-2 py-0.5 rounded-full bg-cyan-900/10">
                          {new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        
                        <button
                          onClick={(e) => onDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2 -mt-2 text-zinc-600 hover:text-red-400"
                          title="Delete Archive"
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-white font-medium mb-1 line-clamp-1 group-hover:text-cyan-200 transition-colors">
                          {session.title || "Untitled Session"}
                        </h3>
                        <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed">
                          {session.preview}
                        </p>
                      </div>

                      {/* Message Count */}
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-wider">
                         <i className="fa-regular fa-comments"></i>
                         {session.messages.length} Exchanges
                      </div>

                    </div>
                  </BorderBeam>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryPanel;
