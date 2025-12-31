import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateImage } from '../services/geminiService';

interface VisualCardProps {
  type: 'image' | 'diagram';
  content: React.ReactNode; // Can be a component (Diagram) or a string (Prompt for image)
  label?: string;
  isPrompt?: boolean; // If true, 'content' is treated as a prompt string
}

const VisualCard: React.FC<VisualCardProps> = ({ type, content, label, isPrompt = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [generated, setGenerated] = useState(false);

  // If it's a prompt, auto-generate on mount
  useEffect(() => {
    if (type === 'image' && isPrompt && typeof content === 'string' && !generated) {
      handleGenerate();
    }
  }, [type, isPrompt, content]);

  const handleGenerate = async () => {
    if (typeof content !== 'string') return;
    
    setLoading(true);
    setError(false);
    try {
      const result = await generateImage(content);
      if (result) {
        setImageUrl(result);
        setGenerated(true);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Determine what to display
  let displayContent = content;
  
  if (type === 'image' && isPrompt) {
     if (imageUrl) {
        displayContent = (
           <img 
             src={imageUrl} 
             alt="Generated Visualization" 
             className="w-full h-auto object-cover rounded-lg shadow-2xl transition-all duration-500 hover:scale-[1.01]" 
           />
        );
     } else {
        // Fallback or Loading state handled by container below
        displayContent = null;
     }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="my-8 w-full max-w-4xl mx-auto"
    >
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_-10px_rgba(6,182,212,0.2)] bg-black/40 backdrop-blur-md group">
        
        {/* Header Label */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-black/60 to-transparent border-b border-white/5 flex items-center justify-between px-4 z-20">
          <div className="flex items-center">
            <i className="fa-solid fa-wand-magic-sparkles text-cyan-400 mr-2 animate-pulse text-sm"></i>
            <span className="text-[10px] uppercase tracking-widest text-cyan-100/70 font-semibold shadow-black drop-shadow-md">
              {label || (type === 'diagram' ? 'System Visualization' : 'Generative Visualization')}
            </span>
          </div>
          
          {/* Regenerate Button for Images */}
          {type === 'image' && isPrompt && !loading && (
             <button 
               onClick={handleGenerate}
               className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1"
               title="Regenerate"
             >
               <i className="fa-solid fa-rotate"></i>
             </button>
          )}
        </div>

        {/* Content Area */}
        <div className="min-h-[250px] flex items-center justify-center relative bg-gradient-to-b from-transparent to-black/20">
          
          {loading ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="relative">
                 <div className="absolute inset-0 blur-xl bg-cyan-500/20 rounded-full animate-pulse"></div>
                 <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin relative z-10"></div>
              </div>
              <span className="mt-4 text-xs text-cyan-200/70 tracking-wider font-light animate-pulse">
                Synthesizing Visuals...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-red-400/80 p-6 text-center">
               <i className="fa-solid fa-circle-exclamation text-2xl mb-2 opacity-50"></i>
               <p className="text-sm">Visual synthesis failed.</p>
               <button onClick={handleGenerate} className="mt-4 px-4 py-2 bg-white/5 rounded-full text-xs hover:bg-white/10 transition">Try Again</button>
            </div>
          ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="w-full h-full"
             >
               {displayContent}
               
               {/* Show Prompt Text on Hover if Image */}
               {type === 'image' && isPrompt && imageUrl && (
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-[10px] text-zinc-400 font-mono line-clamp-2">
                       {typeof content === 'string' ? content : ''}
                    </p>
                 </div>
               )}
             </motion.div>
          )}
          
          {/* Placeholder for prompt if not generated yet and not loading (shouldn't happen with auto-gen, but safe fallback) */}
          {!imageUrl && !loading && !error && type === 'image' && isPrompt && (
             <div className="flex flex-col items-center text-zinc-500 p-8 text-center max-w-md">
                <i className="fa-solid fa-image text-5xl mb-4 opacity-20"></i>
                <p className="text-sm font-light italic opacity-50">"{String(content).substring(0, 100)}..."</p>
             </div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

export default VisualCard;