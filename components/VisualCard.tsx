import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateImage } from '../services/geminiService';

interface VisualCardProps {
  type: 'image' | 'diagram';
  content: React.ReactNode; 
  label?: string;
  isPrompt?: boolean;
  orientation?: 'landscape' | 'portrait';
  isHQ?: boolean; // New prop for High Quality Mode
}

const VisualCard: React.FC<VisualCardProps> = ({ type, content, isPrompt = false, orientation = 'landscape', isHQ = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(type === 'image' && isPrompt);
  const [error, setError] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 

  useEffect(() => {
    // Optimization: If we already have an image URL in the content (e.g. from history), use it directly
    if (type === 'image' && typeof content === 'string' && (content.startsWith('blob:') || content.startsWith('data:'))) {
        setImageUrl(content);
        setGenerated(true);
        setLoading(false);
        return;
    }

    if (type === 'image' && isPrompt && typeof content === 'string' && !generated) {
      handleGenerate();
    }
    
  }, [type, isPrompt, content]);

  const handleGenerate = async () => {
    if (typeof content !== 'string') return;
    
    setLoading(true);
    setError(false);
    try {
      // Pass the orientation to the service, and the HQ flag
      const result = await generateImage(content, orientation as 'landscape' | 'portrait', isHQ);
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
  
  if (type === 'image' && (isPrompt || generated)) {
     if (imageUrl) {
        displayContent = (
           <motion.div
             initial={{ opacity: 0, scale: 1.15, filter: "blur(20px)" }}
             animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
             transition={{ duration: 1.2, ease: "easeOut" }}
             className="w-full h-auto" // CHANGED: h-auto allows natural height
           >
             <img 
               src={imageUrl} 
               alt="Generated Visualization" 
               // CHANGED: object-contain preserves ratio, h-auto matches image height
               className={`w-full h-auto shadow-2xl transition-all duration-700 hover:scale-[1.01] cursor-zoom-in ${orientation === 'portrait' ? 'rounded-[32px]' : 'rounded-3xl'}`}
               onClick={() => setIsExpanded(true)}
               loading="lazy"
               decoding="async"
             />
           </motion.div>
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
              initial={{ scale: 0.95, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4 }}
              src={imageUrl}
              alt="Full Size Visualization"
              className="max-w-full max-h-screen rounded-3xl shadow-[0_0_100px_rgba(6,182,212,0.15)] border border-white/10"
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
        className={`w-full mx-auto ${orientation === 'portrait' ? 'h-full' : 'my-8 max-w-4xl'}`}
      >
        <div className={`relative overflow-hidden border border-white/10 shadow-[0_0_40px_-10px_rgba(6,182,212,0.1)] bg-black/40 backdrop-blur-md group ${orientation === 'portrait' ? 'rounded-[32px] h-full' : 'rounded-[40px]'}`}>
          
          {/* CHANGED: Removed min-h constraint if image is loaded to avoid whitespace */}
          <div className={`${!imageUrl ? (orientation === 'portrait' ? 'h-full min-h-[400px]' : 'min-h-[250px]') : ''} flex items-center justify-center relative bg-black/20 overflow-hidden`}>
            
            {loading ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden h-[300px]">
                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_2s_ease-in-out_infinite]" style={{ height: '50%' }}></div>
                
                {/* Pulsing Grid */}
                <div className="relative grid grid-cols-3 gap-1.5">
                   {[...Array(9)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                      />
                   ))}
                </div>
                
                <span className="mt-6 text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-light animate-pulse font-mono">
                  Synthesizing {orientation === 'portrait' ? 'Character' : 'Visual'}...
                </span>
                
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
                className="w-full flex justify-center"
              >
                {displayContent}
                
                {type === 'image' && (isPrompt || generated) && imageUrl && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <p className="text-[10px] text-zinc-400 font-mono line-clamp-2 tracking-wide uppercase">
                        PROMPT :: {typeof content === 'string' ? content.substring(0, 60) : ''}...
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