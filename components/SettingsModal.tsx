import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceName, UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

const voices: { name: VoiceName; description: string; color: string }[] = [
  { name: 'Kore', description: 'Balanced & Soothing', color: 'bg-cyan-500' },
  { name: 'Puck', description: 'Energetic & Bright', color: 'bg-amber-500' },
  { name: 'Charon', description: 'Deep & Authoritative', color: 'bg-purple-500' },
  { name: 'Fenrir', description: 'Resonant & Bold', color: 'bg-red-500' },
  { name: 'Aoede', description: 'Soft & Melodic', color: 'bg-emerald-500' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
            <h2 className="text-xl font-light text-white tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-microphone-lines text-cyan-400"></i>
              Settings
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Assistant Voice
            </h3>
            
            <div className="space-y-3">
              {voices.map((voice) => (
                <button
                  key={voice.name}
                  onClick={() => onUpdateSettings({ ...settings, voiceName: voice.name })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    settings.voiceName === voice.name 
                      ? 'bg-white/10 border-cyan-500/50 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]' 
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voice.color} text-white font-bold shadow-lg`}>
                      {voice.name[0]}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{voice.name}</div>
                      <div className="text-xs text-zinc-500">{voice.description}</div>
                    </div>
                  </div>
                  
                  {settings.voiceName === voice.name && (
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }}
                      className="bg-cyan-500 rounded-full p-1 text-black flex items-center justify-center w-5 h-5"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-black/40 border-t border-white/5 text-center">
            <p className="text-[10px] text-zinc-600">
              Lumina AI v1.0 • Powered by Gemini 2.5 Flash & Pro
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;