import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface VisualCardProps {
  type: 'image' | 'diagram';
  content: React.ReactNode;
  loading?: boolean;
  label?: string;
}

const VisualCard: React.FC<VisualCardProps> = ({ type, content, loading = false, label }) => {
  // Artificial delay to show shimmer if loading is false immediately (for effect)
  const [showShimmer, setShowShimmer] = useState(loading);

  useEffect(() => {
    if (loading) {
      setShowShimmer(true);
    } else {
      // Keep shimmer for at least 800ms to feel "processed"
      const timer = setTimeout(() => setShowShimmer(false), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="my-6 w-full max-w-2xl mx-auto"
    >
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] bg-white/5 backdrop-blur-sm">
        
        {/* Header Label */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/20 border-b border-white/5 flex items-center px-4 z-10">
          <Sparkles size={12} className="text-cyan-400 mr-2" />
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">
            {label || (type === 'diagram' ? 'System Visualization' : 'Generated Imagery')}
          </span>
        </div>

        {/* Content Area */}
        <div className="pt-8 min-h-[200px] flex items-center justify-center relative">
          
          {showShimmer ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900">
              {/* Shimmer Gradient */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
              
              <div className="relative z-10 flex flex-col items-center gap-3">
                 <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"></div>
                 <span className="text-xs text-cyan-200/70 animate-pulse">
                   {type === 'diagram' ? 'Mapping structure...' : 'Dreaming up visualization...'}
                 </span>
              </div>
            </div>
          ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="w-full"
             >
               {content}
             </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

export default VisualCard;