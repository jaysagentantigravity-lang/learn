import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingIndicatorProps {
  status?: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ status = "Processing..." }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex justify-start w-full mb-8"
    >
      <div className="bg-[#050505]/60 backdrop-blur-md border border-amber-500/20 rounded-3xl p-6 shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)] flex items-center gap-6 max-w-lg">
        
        {/* Animated Brain/Network Icon */}
        <div className="relative w-12 h-12 flex-shrink-0">
           <motion.div 
             animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} 
             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
             className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl"
           />
           <div className="relative z-10 w-full h-full flex items-center justify-center bg-amber-950/30 rounded-full border border-amber-500/30">
             <i className="fa-solid fa-brain text-amber-400 text-xl"></i>
           </div>
           
           {/* Orbiting particles */}
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
             className="absolute inset-[-4px] rounded-full border border-transparent border-t-amber-500/40"
           />
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-200 font-semibold tracking-wide text-sm uppercase">Deep Reasoning</span>
            <i className="fa-solid fa-wand-magic-sparkles text-amber-400 animate-pulse text-xs"></i>
          </div>
          <div className="h-4 relative overflow-hidden">
             <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-zinc-500 text-xs block absolute top-0 left-0 whitespace-nowrap"
                >
                  {status}
                </motion.span>
             </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default ThinkingIndicator;