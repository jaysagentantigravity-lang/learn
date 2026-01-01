import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type BackgroundMode = 'idle' | 'thinking' | 'searching' | 'speaking';

interface BackgroundMeshProps {
  mode?: BackgroundMode;
}

const NOISE_URI = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E`;

// --- STATIC STAR FIELD COMPONENT ---
const StaticStarField = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      size: Math.random() * 1.5 + 0.5 + 'px', 
      opacity: Math.random() * 0.4 + 0.1, 
      delay: Math.random() * 5
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[-2]">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
          animate={{ opacity: [star.opacity, star.opacity * 0.5, star.opacity] }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

const BackgroundMesh: React.FC<BackgroundMeshProps> = ({ mode = 'idle' }) => {
  const palettes = {
    idle: { top: '#0f172a', highlight: '#1e293b' }, 
    thinking: { top: '#1c1917', highlight: '#44403c' },
    searching: { top: '#022c22', highlight: '#115e59' },
    speaking: { top: '#000000', highlight: '#27272a' }
  };

  const currentPalette = palettes[mode];

  return (
    <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none transition-colors duration-1000">
      
      {/* 1. Base Dark Background */}
      <div className="absolute inset-0 bg-black z-[-10]" />

      {/* 2. Top "Atmosphere" Gradient */}
      <motion.div 
        animate={{
          background: [
            `radial-gradient(120% 60% at 50% -10%, ${currentPalette.highlight} 0%, ${currentPalette.top} 40%, transparent 100%)`,
            `radial-gradient(130% 65% at 50% -5%, ${currentPalette.highlight} 0%, ${currentPalette.top} 45%, transparent 100%)`,
            `radial-gradient(120% 60% at 50% -10%, ${currentPalette.highlight} 0%, ${currentPalette.top} 40%, transparent 100%)`
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 opacity-60 z-[-5]"
      />

      {/* 3. Static Star Field */}
      <StaticStarField />

      {/* 4. The "Horizon" Curve */}
      <motion.div 
        animate={{ y: [0, 60, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-40vh] left-[-20%] right-[-20%] h-[80vh] bg-black rounded-[100%] blur-[100px] opacity-90 z-0" 
      />
      
      {/* 5. Cinematic Grain */}
      <div 
        className="absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("${NOISE_URI}")`, filter: 'contrast(120%) brightness(100%)' }}
      ></div>
      
    </div>
  );
};

export default BackgroundMesh;