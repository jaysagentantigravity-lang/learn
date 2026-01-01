import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateImage } from '../services/geminiService';

interface VisualCardProps {
  type: 'image' | 'diagram';
  content: React.ReactNode; // Can be a component (Diagram) or a string (Prompt for image)
  label?: string;
  isPrompt?: boolean; // If true, 'content' is treated as a prompt string
}

const VisualCard: React.FC<VisualCardProps> = ({ type, content, label, isPrompt = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(type === 'image' && isPrompt);
  const [error, setError] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 

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

  let displayContent = content;
  
  if (type === 'image' && isPrompt) {
     if (imageUrl) {
        displayContent = (
           <img 
             src={imageUrl} 
             alt="Generated Visualization" 
             className="w-full h-auto object-cover rounded-lg shadow-2xl transition-all duration-500 hover:scale-[1.01] cursor-zoom-in" 
             onClick={() => setIsExpanded(true)}
           />
        );
     } else {
        displayContent = null;
     }
  }

  return (
    <>
      <AnimatePresence>
        {isExpanded && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setIsExpanded(false)}
          >
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={imageUrl}
              alt="Full Size Visualization"
              className="max-w-full max-h-screen rounded-lg shadow-[0_0_100px_rgba(6,182,212,0.15)] border border-white/10"
            />
            <button className="absolute top-6 right-6 p-4 text-white/50 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="my-8 w-full max-w-4xl mx-auto"
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_-10px_rgba(6,182,212,0.1)] bg-black/40 backdrop-blur-md group">
          
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-black/60 to-transparent border-b border-white/5 flex items-center justify-between px-4 z-20">
            <div className="flex items-center">
              <i className="fa-solid fa-wand-magic-sparkles text-cyan-400 mr-2 animate-pulse text-sm"></i>
              <span className="text-[10px] uppercase tracking-widest text-cyan-100/70 font-semibold shadow-black drop-shadow-md">
                {label || (type === 'diagram' ? 'System Visualization' : 'Generative Infographic')}
              </span>
            </div>
            
            {type === 'image' && isPrompt && !loading && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1"
                title="Regenerate"
              >
                <i className="fa-solid fa-rotate"></i>
              </button>
            )}
          </div>

          <div className="min-h-[250px] flex items-center justify-center relative bg-black/20">
            
            {loading ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden">
                {/* Holographic Scan Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_2s_ease-in-out_infinite]" style={{ height: '50%' }}></div>
                
                <div className="relative grid grid-cols-3 gap-1 animate-pulse">
                   {[...Array(9)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-cyan-500/40 rounded-sm"></div>
                   ))}
                </div>
                
                <span className="mt-6 text-[10px] text-cyan-400/80 uppercase tracking-[0.2em] font-light animate-pulse">
                  Rendering Visual Matrix...
                </span>
                
                {/* CSS Scan Animation Injection */}
                <style>{`
                  @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(200%); opacity: 0; }
                  }
                `}</style>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center text-red-400/80 p-6 text-center">
                <i className="fa-solid fa-triangle-exclamation text-2xl mb-2 opacity-50"></i>
                <p className="text-sm">Visual synthesis failed.</p>
                <button onClick={handleGenerate} className="mt-4 px-4 py-2 bg-white/5 rounded-full text-xs hover:bg-white/10 transition border border-white/5">Retry</button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex justify-center"
              >
                {displayContent}
                
                {type === 'image' && isPrompt && imageUrl && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <p className="text-[10px] text-zinc-400 font-mono line-clamp-2">
                        {typeof content === 'string' ? content : ''}
                      </p>
                  </div>
                )}
              </motion.div>
            )}
            
            {!imageUrl && !loading && !error && type === 'image' && isPrompt && (
              <div className="flex flex-col items-center text-zinc-600 p-8 text-center max-w-md">
                  <i className="fa-solid fa-cube text-4xl mb-4 opacity-20"></i>
                  <p className="text-xs font-mono opacity-50">Initializing Render Sequence...</p>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </>
  );
};

export default VisualCard;