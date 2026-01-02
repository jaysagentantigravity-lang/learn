import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSystemSound } from '../services/audioUtils';

interface HolographicStepperProps {
  status: string; 
}

const steps = [
  { id: 'research', label: 'Deep Research', match: ['Analyzing', 'Gathering', 'Researching'] },
  { id: 'visual', label: 'Visual Architecture', match: ['Designing', 'Visuals'] },
  { id: 'write', label: 'Synthesis', match: ['Synthesizing', 'Writing'] }
];

const HolographicStepper: React.FC<HolographicStepperProps> = ({ status }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Determine step based on status string
    let newIndex = 0;
    if (status.includes('Designing') || status.includes('Visuals')) newIndex = 1;
    else if (status.includes('Synthesizing') || status.includes('Writing')) newIndex = 2;
    
    if (newIndex > currentStepIndex) {
      playSystemSound('tick');
      setCurrentStepIndex(newIndex);
    }
  }, [status, currentStepIndex]);

  return (
    <div className="w-full max-w-md mx-auto my-8 md:my-12 p-4 md:p-6 relative">
      
      {/* MOBILE LAYOUT (Horizontal) - Hidden on md+ */}
      <div className="flex md:hidden items-center justify-between relative px-2">
         {/* Connecting Line */}
         <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 -z-10 transform -translate-y-1/2 overflow-hidden">
            <motion.div 
               className="h-full bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
               initial={{ width: '0%' }}
               animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
               transition={{ duration: 0.5, ease: "easeInOut" }}
            />
         </div>

         {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            return (
               <div key={step.id} className="flex flex-col items-center gap-2 relative">
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                        <motion.div 
                            key="completed"
                            initial={{ scale: 0.5, opacity: 0, filter: "brightness(2)" }}
                            animate={{ scale: 1, opacity: 1, filter: "brightness(1)" }}
                            transition={{ duration: 0.4 }}
                            className="w-8 h-8 rounded-full border border-emerald-500/50 bg-emerald-900/40 text-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)] backdrop-blur-sm"
                        >
                            <i className="fa-solid fa-check text-xs"></i>
                        </motion.div>
                    ) : isActive ? (
                        <motion.div 
                            key="active"
                            className="w-8 h-8 relative flex items-center justify-center"
                        >
                            {/* Spinning Ring */}
                            <motion.div 
                                className="absolute inset-0 rounded-full border border-cyan-500/30 border-t-cyan-200"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="w-2 h-2 bg-cyan-200 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                        </motion.div>
                    ) : (
                        <div key="pending" className="w-8 h-8 rounded-full border border-white/10 bg-black/50 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        </div>
                    )}
                  </AnimatePresence>
                  
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 whitespace-nowrap text-[10px] text-cyan-300 font-bold uppercase tracking-widest bg-black/80 px-2 py-0.5 rounded-full border border-cyan-500/20 shadow-lg"
                    >
                      {step.label}
                    </motion.span>
                  )}
               </div>
            );
         })}
      </div>

      {/* DESKTOP LAYOUT (Vertical) - Hidden on sm */}
      <div className="hidden md:block space-y-6">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 relative"
            >
              {/* Vertical Line Connector */}
              {index !== steps.length - 1 && (
                <div className="absolute left-[11px] top-7 w-[1px] h-6 bg-white/5 overflow-hidden">
                    {isCompleted && (
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: '100%' }}
                            transition={{ duration: 0.4 }}
                            className="w-full bg-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                        />
                    )}
                </div>
              )}

              {/* Icon */}
              <div className="relative w-6 h-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div 
                      key="check"
                      initial={{ scale: 1.5, opacity: 0, filter: "brightness(3)" }} 
                      animate={{ scale: 1, opacity: 1, filter: "brightness(1)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 text-[10px] shadow-[0_0_15px_-2px_rgba(16,185,129,0.4)]"
                    >
                      <i className="fa-solid fa-check"></i>
                    </motion.div>
                  ) : isActive ? (
                    <motion.div 
                      key="active"
                      className="relative w-8 h-8 flex items-center justify-center"
                    >
                      {/* Outer Orbit */}
                      <motion.div 
                         className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
                         animate={{ rotate: 360 }}
                         transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Inner Fast Ring */}
                      <motion.div 
                         className="absolute inset-1 rounded-full border border-t-transparent border-l-transparent border-r-cyan-400/80 border-b-cyan-400/80"
                         animate={{ rotate: -360 }}
                         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Core */}
                      <motion.div 
                         className="w-2 h-2 bg-cyan-200 rounded-full shadow-[0_0_10px_2px_rgba(34,211,238,0.6)]" 
                         animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                         transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </motion.div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                         <div className="w-1 h-1 rounded-full bg-white/20" />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <div className={`${isActive ? 'text-zinc-200' : isCompleted ? 'text-emerald-500/60' : 'text-zinc-600'} transition-colors duration-500`}>
                <span className={`text-sm tracking-[0.2em] uppercase font-medium ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
                    {step.label}
                </span>
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="ml-3 text-xs text-cyan-500/70 font-mono"
                  >
                    // {status.split('...')[0]}
                    <motion.span 
                        animate={{ opacity: [0, 1, 0] }} 
                        transition={{ duration: 0.8, repeat: Infinity }}
                    >_</motion.span>
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HolographicStepper;