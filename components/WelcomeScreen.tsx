import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessingOptions } from '../types';
import BorderBeam from './BorderBeam';
import { fetchDynamicDiscovery } from '../services/geminiService';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string, options: ProcessingOptions) => void;
}

interface DiscoveryTile {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  imageKeyword: string;
  imageUrl?: string;
  userPrompt: string;
}

interface PresetChip {
  text: string;
  icon: string;
}

// Helper: Get context-aware stock image from LoremFlickr (Creative Commons)
const getStockFallback = (keyword: string, lockId: string) => {
  const cleanKeyword = encodeURIComponent(keyword.trim() || 'technology');
  return `https://loremflickr.com/600/600/${cleanKeyword}/all?lock=${lockId}`;
};

// -- SUB-COMPONENT: Discovery Card (Handles Image State & Transitions) --
const DiscoveryCard: React.FC<{ tile: DiscoveryTile; index: number; onClick: () => void }> = ({ tile, index, onClick }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Reset state when tile changes
    setImageLoaded(false);
    
    // Priority: Real URL -> Fallback Stock Image
    if (tile.imageUrl && tile.imageUrl.trim() !== '' && !tile.imageUrl.includes('base64')) {
      setImgSrc(tile.imageUrl);
      setHasError(false);
    } else {
      setImgSrc(getStockFallback(tile.imageKeyword, tile.id));
      setHasError(false);
    }
  }, [tile]);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getStockFallback(tile.imageKeyword, tile.id));
    }
  };

  const getIconForCategory = (cat: string) => {
    const c = (cat || 'general').toLowerCase();
    if (c.includes('news')) return 'fa-newspaper';
    if (c.includes('tech')) return 'fa-microchip';
    if (c.includes('fact') || c.includes('wow')) return 'fa-bolt';
    if (c.includes('data')) return 'fa-chart-simple';
    return 'fa-star';
  };

  const getColorForCategory = (cat: string) => {
    const c = (cat || 'general').toLowerCase();
    if (c.includes('news')) return 'from-blue-500/10 to-indigo-500/10';
    if (c.includes('tech')) return 'from-cyan-500/10 to-teal-500/10';
    if (c.includes('fact')) return 'from-amber-500/10 to-orange-500/10';
    return 'from-purple-500/10 to-pink-500/10';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1] // Quartic Ease Out
      }}
      className="w-full aspect-square rounded-[32px] overflow-hidden relative" 
    >
      <BorderBeam className="w-full h-full rounded-[32px] shadow-2xl overflow-hidden bg-zinc-900">
        <button
          onClick={onClick}
          className="group relative w-full h-full text-left transition-all"
        >
          {/* 1. Background Image Layer with Cinematic Entrance */}
          <div className="absolute inset-0 bg-zinc-900 overflow-hidden">
             <motion.div
                initial={{ opacity: 0, scale: 1.15, filter: "blur(20px)" }}
                animate={{ 
                    opacity: imageLoaded ? 1 : 0, 
                    scale: 1, 
                    filter: "blur(0px)" 
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-full h-full"
             >
                <img 
                  src={imgSrc} 
                  onError={handleImageError}
                  onLoad={() => setImageLoaded(true)}
                  alt={tile.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0" 
                  loading="lazy"
                />
             </motion.div>
          </div>
          
          {/* 2. Gradient Overlays (Static, fades in with image) */}
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: imageLoaded ? 0.9 : 0 }}
             transition={{ duration: 1 }}
             className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" 
          />
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: imageLoaded ? 0.2 : 0 }}
             className={`absolute inset-0 bg-gradient-to-br ${getColorForCategory(tile.category)} group-hover:opacity-40 transition-opacity mix-blend-overlay pointer-events-none`} 
          />

          {/* 3. Icon (Fade In) */}
          <div className="absolute top-4 right-4 text-white/30 group-hover:text-white/80 transition-colors z-20">
              <i className={`fa-solid ${getIconForCategory(tile.category)} text-xl drop-shadow-md`}></i>
          </div>

          {/* 4. Text Container (Staggered Entry) */}
          <div className="absolute inset-0 flex flex-col justify-between p-5 z-20">
            {/* Top: Title */}
            <div className="mt-6 overflow-hidden">
              <motion.span 
                 initial={{ y: 20, opacity: 0, filter: "blur(5px)" }}
                 animate={imageLoaded ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
                 transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                 className="block text-lg md:text-xl font-medium text-white tracking-wide group-hover:text-cyan-100 transition-colors line-clamp-2 leading-tight drop-shadow-lg text-balance"
              >
                {tile.title}
              </motion.span>
            </div>

            {/* Bottom: Subtitle */}
            <div>
              <motion.div 
                 initial={{ x: -10, opacity: 0 }}
                 animate={imageLoaded ? { x: 0, opacity: 0.9 } : {}}
                 transition={{ duration: 0.6, delay: 0.2 }}
                 className="flex items-center gap-2 mb-1"
              >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold truncate drop-shadow-md">
                    {tile.category || 'Trending'}
                  </span>
              </motion.div>
              
              <motion.span 
                 initial={{ y: 20, opacity: 0, filter: "blur(5px)" }}
                 animate={imageLoaded ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
                 transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                 className="block text-sm font-normal text-zinc-300 line-clamp-2 leading-snug drop-shadow-md text-balance"
              >
                {tile.subtitle}
              </motion.span>
            </div>
          </div>
        </button>
      </BorderBeam>
    </motion.div>
  );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  const [tiles, setTiles] = useState<DiscoveryTile[]>([]);
  const [presets, setPresets] = useState<PresetChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Global");
  
  // Animation State
  const [isShifted, setIsShifted] = useState(false);
  const [greeting, setGreeting] = useState("Ignite your curiosity"); 

  useEffect(() => {
    let isMounted = true;
    
    // Trigger Title Shift Animation after settle
    const animTimer = setTimeout(() => {
      if (isMounted) setIsShifted(true);
    }, 3700);

    const initDiscovery = async () => {
      // 1. Get Approximate Location
      let loc = "Global";
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.city && ipData.country_name) {
            loc = `${ipData.city}, ${ipData.country_name}`;
          }
        }
      } catch (e) {
        console.warn("Location fetch failed, defaulting to Global");
      }
      
      if (!isMounted) return;
      setLocationName(loc);

      // 2. Fetch Dynamic Content via Gemini
      const data = await fetchDynamicDiscovery(loc);
      
      if (isMounted && data) {
        setTiles(data.tiles);
        setPresets(data.presets || []); 
        if (data.greeting) setGreeting(data.greeting);
        setLoading(false);
      }
    };

    initDiscovery();

    return () => { 
      isMounted = false; 
      clearTimeout(animTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 md:px-8 text-center z-10 overflow-y-auto">
      
      {/* Hero Header */}
      <div className="mb-4 flex flex-col items-center relative z-20 h-[180px] shrink-0 justify-center w-full">
        <div className="relative flex flex-col items-center justify-center w-full">
           
           <motion.h1
              initial={{ filter: "blur(15px)", opacity: 0, y: 30 }}
              animate={isShifted 
                ? { scale: 0.4, y: -45, filter: "blur(0px)", opacity: 1 } 
                : { 
                    filter: ["blur(15px)", "blur(0px)", "blur(6px)", "blur(0px)"], 
                    opacity: [0, 1, 1, 1], 
                    y: 0,
                    scale: 1
                  }
              }
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="mt-2 text-6xl md:text-8xl font-thin tracking-tighter leading-none bg-gradient-to-br from-white via-zinc-300 to-zinc-600 text-transparent bg-clip-text drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)] origin-center z-20 pb-2"
            >
              Lumina
            </motion.h1>

            <motion.div
               initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
               animate={isShifted ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.9 }}
               transition={{ duration: 1.2, delay: 0.2 }}
               className="relative z-10 w-full flex flex-col items-center mt-[-16px]"
            >
               <h2 className="text-4xl md:text-6xl font-thin text-cyan-50/90 tracking-tighter whitespace-nowrap overflow-visible drop-shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                  {greeting}
               </h2>

               <div className="flex items-center text-xs text-zinc-500 mt-4 font-sans tracking-widest opacity-70">
                 <i className="fa-solid fa-location-dot mr-1.5 text-cyan-500/50"></i> {locationName}
               </div>
            </motion.div>
        </div>
      </div>

      {/* Row A: Visual Discovery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-8 min-h-[250px]">
        <AnimatePresence mode="popLayout">
          {loading ? (
             // SKELETON LOADING
             [...Array(4)].map((_, i) => (
               <motion.div
                 key={`skel-${i}`}
                 layout
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)", transition: { duration: 0.3 } }}
                 className="rounded-[32px] w-full aspect-square bg-white/5 border border-white/5 relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" style={{ content: '""' }} />
               </motion.div>
             ))
          ) : (
             // LOADED TILES
             tiles.map((tile, idx) => (
               <DiscoveryCard 
                 key={tile.id} 
                 tile={tile} 
                 index={idx} 
                 onClick={() => onSuggestionClick(tile.userPrompt, { useThinking: true, useSearch: true, mode: 'learning' })}
               />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Row B: Slim Presets (Chips) */}
      <div className="w-full max-w-4xl overflow-x-auto scrollbar-hide pb-4">
        <div className="flex flex-nowrap md:justify-center gap-4 min-w-max px-2 h-[44px] items-center">
          <AnimatePresence mode="popLayout">
            {loading ? (
               // SKELETON CHIPS
               [...Array(4)].map((_, idx) => (
                 <motion.div
                    key={`chip-skel-${idx}`}
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-[38px] w-32 rounded-full bg-white/5 border border-white/5 relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" />
                 </motion.div>
               ))
            ) : (
               // LOADED CHIPS
               presets.map((preset, idx) => (
                 <motion.div
                   key={idx}
                   layout
                   initial={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
                   animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                   transition={{ 
                     delay: 0.3 + (idx * 0.05),
                     duration: 0.5,
                     type: "spring", stiffness: 300, damping: 20
                   }}
                   className="rounded-full"
                 >
                   <BorderBeam className="rounded-full" borderWidth={1}>
                     <button
                       onClick={() => onSuggestionClick(preset.text, { useThinking: false, useSearch: true, mode: 'explanatory' })}
                       className="group flex items-center gap-3 px-6 py-2 transition-all w-full h-full bg-white/5 hover:bg-white/10 backdrop-blur-md"
                     >
                       <i className={`fa-solid ${preset.icon || 'fa-magnifying-glass'} text-zinc-500 group-hover:text-cyan-300 text-sm group-hover:scale-110 transition-transform`}></i>
                       <span className="text-sm font-medium text-zinc-300 group-hover:text-white whitespace-nowrap tracking-wide">{preset.text}</span>
                     </button>
                   </BorderBeam>
                 </motion.div>
               ))
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

export default WelcomeScreen;