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
  // We use a lock ID to ensure the same card gets the same random image, 
  // but different cards with same keyword get different images.
  const cleanKeyword = encodeURIComponent(keyword.trim() || 'technology');
  // 600x600 resolution, 'all' tag mode (matches all keywords)
  return `https://loremflickr.com/600/600/${cleanKeyword}/all?lock=${lockId}`;
};

// -- SUB-COMPONENT: Discovery Card (Handles Image State) --
const DiscoveryCard: React.FC<{ tile: DiscoveryTile; index: number; onClick: () => void }> = ({ tile, index, onClick }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Priority: Real URL -> Fallback Stock Image
    if (tile.imageUrl && tile.imageUrl.trim() !== '' && !tile.imageUrl.includes('base64')) {
      setImgSrc(tile.imageUrl);
      setHasError(false);
    } else {
      // If no valid URL provided, go straight to stock fallback
      setImgSrc(getStockFallback(tile.imageKeyword, tile.id));
      setHasError(false);
    }
  }, [tile]);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      // If the real URL fails, switch to stock fallback
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
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.6,
        ease: "easeOut"
      }}
      className="w-full aspect-square rounded-[32px] overflow-hidden relative" 
    >
      <BorderBeam className="w-full h-full rounded-[32px] shadow-2xl overflow-hidden">
        <button
          onClick={onClick}
          className="group relative w-full h-full text-left transition-all"
        >
          {/* Background Image - Strict Object Cover */}
          <img 
            src={imgSrc} 
            onError={handleImageError}
            alt={tile.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0" 
            loading="lazy"
          />
          
          {/* Darker Gradient for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
          <div className={`absolute inset-0 bg-gradient-to-br ${getColorForCategory(tile.category)} opacity-20 group-hover:opacity-40 transition-opacity mix-blend-overlay`} />

          {/* Icon */}
          <div className="absolute top-4 right-4 text-white/30 group-hover:text-white/80 transition-colors z-20">
              <i className={`fa-solid ${getIconForCategory(tile.category)} text-xl drop-shadow-md`}></i>
          </div>

          {/* Text Container */}
          <div className="absolute inset-0 flex flex-col justify-between p-5 z-20">
            {/* Top: Title (Limited to 2 lines, tight leading) */}
            <div className="mt-6">
              <span className="text-lg md:text-xl font-medium text-white tracking-wide group-hover:text-cyan-100 transition-colors line-clamp-2 leading-tight drop-shadow-lg text-balance">
                {tile.title}
              </span>
            </div>

            {/* Bottom: Subtitle (Sentence case, 2 lines, Grammar aware) */}
            <div>
              <div className="flex items-center gap-2 mb-1 opacity-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold truncate drop-shadow-md">
                    {tile.category || 'Trending'}
                  </span>
              </div>
              <span className="text-sm font-normal text-zinc-300 line-clamp-2 leading-snug drop-shadow-md text-balance">
                {tile.subtitle}
              </span>
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
      
      {/* Hero Header - FIXED HEIGHT to prevent jitter when cards load */}
      <div className="mb-4 flex flex-col items-center relative z-20 h-[180px] shrink-0 justify-center w-full">
        
        {/* Container for Title + Greeting + Location (Grouped Tightly) */}
        <div className="relative flex flex-col items-center justify-center w-full">
           
           {/* 1. Lumina Title - Aluminum Gradient & Angle */}
           <motion.h1
              initial={{ filter: "blur(15px)", opacity: 0, y: 30 }}
              animate={isShifted 
                ? { scale: 0.4, y: -45, filter: "blur(0px)", opacity: 1 } // Shift Up
                : { 
                    filter: ["blur(15px)", "blur(0px)", "blur(6px)", "blur(0px)"], 
                    opacity: [0, 1, 1, 1], 
                    y: 0,
                    scale: 1
                  }
              }
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="text-6xl md:text-8xl font-thin tracking-tighter leading-none bg-gradient-to-br from-white via-zinc-300 to-zinc-600 text-transparent bg-clip-text drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)] origin-center z-20 pb-2"
            >
              Lumina
            </motion.h1>

            {/* 2. Dynamic Seasonal Greeting - Tight Spacing */}
            <motion.div
               initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
               animate={isShifted ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.9 }}
               transition={{ duration: 1.2, delay: 0.2 }}
               className="relative z-10 w-full flex flex-col items-center mt-[-16px]" // Pull tighter
            >
               <h2 className="text-4xl md:text-6xl font-thin text-cyan-50/90 tracking-tighter whitespace-nowrap overflow-visible drop-shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                  {greeting}
               </h2>

               {/* 3. Location - Title Case, no uppercase */}
               <div className="flex items-center text-xs text-zinc-500 mt-3 font-mono tracking-widest opacity-70">
                 <i className="fa-solid fa-location-dot mr-1.5 text-cyan-500/50"></i> {locationName}
               </div>
            </motion.div>
        </div>
      </div>

      {/* Row A: Visual Discovery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-8 min-h-[250px]">
        {loading ? (
             // SKELETON LOADING
             [...Array(4)].map((_, i) => (
               <motion.div
                 key={`skel-${i}`}
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                 onClick={() => onSuggestionClick(tile.userPrompt, { useThinking: true, useSearch: true })}
               />
            ))
          )}
      </div>

      {/* Row B: Slim Presets (Chips) */}
      <div className="w-full max-w-4xl overflow-x-auto scrollbar-hide pb-4">
        {/* Container with fixed min-height to reserve space and prevent jumps */}
        <div className="flex flex-nowrap md:justify-center gap-4 min-w-max px-2 h-[52px] items-center">
          {loading ? (
             // SKELETON CHIPS: Match Height to Real Chips (approx 46px)
             [...Array(4)].map((_, idx) => (
               <motion.div
                  key={`chip-skel-${idx}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-[46px] w-32 rounded-full bg-white/5 border border-white/5 relative overflow-hidden"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" />
               </motion.div>
             ))
          ) : (
             // LOADED CHIPS
             presets.map((preset, idx) => (
               <motion.div
                 key={idx}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ 
                   delay: 0.1 + (idx * 0.05), // Fast stagger
                   duration: 0.4
                 }}
                 className="rounded-full"
               >
                 <BorderBeam className="rounded-full" borderWidth={1}>
                   <button
                     onClick={() => onSuggestionClick(preset.text, { useThinking: false, useSearch: true })}
                     className="group flex items-center gap-3 px-6 py-3 transition-all w-full h-full hover:bg-white/5"
                   >
                     <i className={`fa-solid ${preset.icon || 'fa-magnifying-glass'} text-zinc-500 group-hover:text-cyan-300 text-sm group-hover:scale-110 transition-transform`}></i>
                     <span className="text-sm font-medium text-zinc-300 group-hover:text-white whitespace-nowrap tracking-wide">{preset.text}</span>
                   </button>
                 </BorderBeam>
               </motion.div>
             ))
          )}
        </div>
      </div>

    </div>
  );
};

export default WelcomeScreen;