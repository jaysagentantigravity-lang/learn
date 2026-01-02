import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceName, UserSettings } from '../types';
import { tokenEstimator } from '../services/tokenEstimator';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

interface SummaryData {
  calls: number;
  input: number;
  output: number;
  total: number;
}

const voices: { name: VoiceName; description: string; color: string }[] = [
  { name: 'Kore', description: 'Balanced & Soothing', color: 'bg-cyan-500' },
  { name: 'Puck', description: 'Energetic & Bright', color: 'bg-amber-500' },
  { name: 'Charon', description: 'Deep & Authoritative', color: 'bg-purple-500' },
  { name: 'Fenrir', description: 'Resonant & Bold', color: 'bg-red-500' },
  { name: 'Aoede', description: 'Soft & Melodic', color: 'bg-emerald-500' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'usage'>('general');
  const [stats, setStats] = useState<Record<string, SummaryData>>(tokenEstimator.getSummary());
  const [totalTokens, setTotalTokens] = useState(tokenEstimator.getTotalTokens());

  useEffect(() => {
    if (isOpen) {
      const update = () => {
        setStats(tokenEstimator.getSummary());
        setTotalTokens(tokenEstimator.getTotalTokens());
      };
      update();
      // Subscribe to real-time updates
      const unsub = tokenEstimator.subscribe(update);
      return unsub;
    }
  }, [isOpen]);

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
          className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 shrink-0">
            <h2 className="text-xl font-light text-white tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-gear text-cyan-400"></i>
              System Control
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6 pt-4 shrink-0">
             <button 
                onClick={() => setActiveTab('general')}
                className={`pb-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'general' ? 'text-white border-b-2 border-cyan-500' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
                General
             </button>
             <button 
                onClick={() => setActiveTab('usage')}
                className={`pb-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'usage' ? 'text-white border-b-2 border-cyan-500' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
                Neural Analytics
             </button>
          </div>

          {/* Content Scroll Area */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
            
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Assistant Voice
                </h3>
                
                <div className="space-y-3">
                  {voices.map((voice) => (
                    <button
                      key={voice.name}
                      onClick={() => onUpdateSettings({ ...settings, voiceName: voice.name })}
                      className={`w-full flex items-center justify-between p-4 rounded-3xl border transition-all duration-200 ${
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
              </motion.div>
            )}

            {activeTab === 'usage' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-black/40 rounded-3xl border border-white/5 p-6 mb-6">
                     <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Total Estimated Usage</div>
                     <div className="text-4xl font-thin text-white font-mono">{totalTokens.toLocaleString()} <span className="text-lg text-zinc-600">tks</span></div>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                    Feature Breakdown
                  </h3>
                  
                  <div className="space-y-2">
                     {Object.entries(stats).map(([feature, data]: [string, SummaryData]) => (
                        <div key={feature} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center border border-white/10 text-zinc-400">
                                 <i className={`fa-solid ${getFeatureIcon(feature)} text-xs`}></i>
                              </div>
                              <div>
                                 <div className="text-xs text-zinc-300 font-bold uppercase">{feature.replace('_', ' ')}</div>
                                 <div className="text-[10px] text-zinc-500">{data.calls} calls</div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-xs font-mono text-cyan-300">{data.total.toLocaleString()}</div>
                              <div className="text-[10px] text-zinc-600">est. tokens</div>
                           </div>
                        </div>
                     ))}
                     {Object.keys(stats).length === 0 && (
                        <div className="text-center py-8 text-zinc-600 text-sm italic">
                           No activity recorded yet.
                        </div>
                     )}
                  </div>
               </motion.div>
            )}

          </div>

          {/* Footer */}
          <div className="p-6 bg-black/40 border-t border-white/5 text-center shrink-0">
            <p className="text-[10px] text-zinc-600">
              Lumina AI v1.2 • Powered by Gemini 2.5 Flash & Pro
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const getFeatureIcon = (feature: string) => {
   switch(feature) {
      case 'discovery': return 'fa-compass';
      case 'clarification': return 'fa-filter';
      case 'research': return 'fa-book';
      case 'visuals': return 'fa-eye';
      case 'synthesis': return 'fa-pen-nib';
      case 'tts': return 'fa-volume-high';
      case 'stt': return 'fa-microphone-lines';
      case 'image_gen': return 'fa-image';
      default: return 'fa-microchip';
   }
};

export default SettingsModal;