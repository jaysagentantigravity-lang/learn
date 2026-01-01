import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSystemSound } from '../services/audioUtils';

interface HolographicStepperProps {
  status: string; // "Analyzing Request...", "Gathering Deep Knowledge...", "Designing Visuals...", "Synthesizing Response..."
}

const steps = [
  { id: 'research', label: 'Deep Research', match: ['Analyzing', 'Gathering', 'Researching'] },
  { id: 'visual', label: 'Visual Architecture', match: ['Designing', 'Visuals'] },
  { id: 'write', label: 'Synthesis', match: ['Synthesizing', 'Writing'] }
];

const HolographicStepper: React.FC<HolographicStepperProps> = ({ status }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Init audio context for ticks
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Determine step based on status string
    let newIndex = 0;
    if (status.includes('Designing') || status.includes('Visuals')) newIndex = 1;
    else if (status.includes('Synthesizing') || status.includes('Writing')) newIndex = 2;
    
    if (newIndex > currentStepIndex) {
      // Play tick sound on step progress
      if (audioCtxRef.current) playSystemSound('tick', audioCtxRef.current);
      setCurrentStepIndex(newIndex);
    }
  }, [status, currentStepIndex]);

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 relative">
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const isPending = index > currentStepIndex;

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
                <div className={`absolute left-[11px] top-7 w-[2px] h-6 ${isCompleted ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
              )}

              {/* Icon/Status Indicator */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div 
                      key="check"
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-xs"
                    >
                      <i className="fa-solid fa-check"></i>
                    </motion.div>
                  ) : isActive ? (
                    <motion.div 
                      key="active"
                      className="w-6 h-6 rounded-full border border-cyan-400 flex items-center justify-center relative"
                    >
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                      <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping" />
                    </motion.div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/10 bg-black/50" />
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <div className={`${isActive ? 'text-cyan-300 font-semibold' : isCompleted ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
                <span className="text-sm tracking-widest uppercase">{step.label}</span>
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="ml-3 text-xs text-cyan-500/50 font-mono"
                  >
                    // {status.split('...')[0]}...
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