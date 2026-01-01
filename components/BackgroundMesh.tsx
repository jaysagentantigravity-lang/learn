import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type BackgroundMode = 'idle' | 'thinking' | 'searching' | 'speaking';

interface BackgroundMeshProps {
  mode?: BackgroundMode;
}

const NOISE_URI = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E`;

// --- SHOOTING STAR COMPONENT ---
interface ShootingStarProps {
  id: number;
  onComplete: () => void;
}

const ShootingStar: React.FC<ShootingStarProps> = ({ onComplete }) => {
  const config = useMemo(() => {
    // 1. Spawn: Random X (0-100vw), Top-weighted Y (0-50vh)
    const startX = Math.random() * 100; 
    const startY = Math.random() * 50;  

    // 2. Angle: "Falling" generally means downwards.
    // 0deg = Right, 90deg = Down, 180deg = Left
    // If starting on Left (0-50%), tend to fall Right (10-80deg)
    // If starting on Right (50-100%), tend to fall Left (100-170deg)
    // We add some randomness so it's not perfectly split.
    const isLeft = startX < 50;
    const baseAngle = isLeft ? 45 : 135; 
    const variance = (Math.random() * 60) - 30; // +/- 30deg
    const angle = baseAngle + variance;

    // 3. Distance & Speed
    // Closer (larger) stars move faster and further.
    // Further (smaller) stars move slower and shorter.
    const depth = Math.random(); // 0 (Far) to 1 (Near)
    
    const distance = 300 + (depth * 500); // 300px to 800px
    const duration = 1.0 + ((1 - depth) * 1.5); // 1s (Fast/Near) to 2.5s (Slow/Far)
    const size = 1 + (depth * 2); // 1px to 3px head
    const maxTailLength = 100 + (depth * 200); // Tail length proportional to speed/depth

    return {
      startX,
      startY,
      angle,
      distance,
      duration,
      size,
      maxTailLength
    };
  }, []);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${config.startX}%`,
        top: `${config.startY}%`,
        rotate: `${config.angle}deg`, // Rotate coordinate system
        transformOrigin: 'top left',
        zIndex: -1 // Ensure strictly background
      }}
      initial={{ x: 0, opacity: 0, scale: 0.5 }}
      animate={{
        x: config.distance, // Move 'Forward' in rotated space
        opacity: [0, 1, 1, 0], // Fade In -> Hold -> Fade Out
        scale: [0.5, 1, 0.5], // Perspective scaling
      }}
      transition={{
        duration: config.duration,
        ease: "easeIn", // Accelerate (Gravity)
        times: [0, 0.1, 0.7, 1] // Fade out at very end
      }}
      onAnimationComplete={onComplete}
    >
      {/* Container for Head + Tail to ensure correct relative positioning */}
      <div className="relative flex items-center">
         
         {/* The Tail (Trailing behind head) */}
         {/* Since we move +X, the tail should be to the LEFT (-X) of the head */}
         {/* We use 'order-first' or absolute positioning. Let's use absolute to anchor to head. */}
         <motion.div
            className="absolute right-[50%] h-[1px] origin-right bg-gradient-to-r from-transparent via-cyan-400/50 to-white"
            style={{ 
              top: '50%',
              translateY: '-50%',
            }} 
            animate={{
              width: [0, config.maxTailLength, 0], // Grow with speed, shrink at end
            }}
            transition={{
              duration: config.duration,
              ease: "easeInOut", // Smooth growth/shrink
              times: [0, 0.4, 1] // Max length at 40% (peak speed visual), then shrink
            }}
         />

         {/* The Head */}
         <div 
           className="relative rounded-full bg-white shadow-[0_0_8px_1px_rgba(255,255,255,0.9)] z-10" 
           style={{ width: config.size, height: config.size }}
         />
         
      </div>
    </motion.div>
  );
};

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
  const [stars, setStars] = useState<{ id: number }[]>([]);

  const palettes = {
    idle: { top: '#0f172a', highlight: '#1e293b' }, 
    thinking: { top: '#1c1917', highlight: '#44403c' },
    searching: { top: '#022c22', highlight: '#115e59' },
    speaking: { top: '#000000', highlight: '#27272a' }
  };

  const currentPalette = palettes[mode];

  useEffect(() => {
    const scheduleStar = () => {
      const delay = Math.random() * 4000 + 1000; 
      setTimeout(() => {
        // Check if component is still mounted logic not strictly needed for this simple effect
        // but prevents state updates on unmount if we had a ref
        setStars(prev => {
          // Limit concurrent stars to prevent performance drop / clutter
          if (prev.length > 5) return prev; 
          return [...prev, { id: Date.now() }];
        });
        scheduleStar();
      }, delay);
    };

    scheduleStar();
    // No cleanup for the recursive timeout pattern in this simplified scope, 
    // real app might want a ref to clear timeout.
  }, []);

  const removeStar = (id: number) => {
    setStars(prev => prev.filter(s => s.id !== id));
  };

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

      {/* 4. Shooting Stars Layer */}
      {/* Important: z-[-1] to stay behind content */}
      <div className="absolute inset-0 z-[-1]">
        <AnimatePresence>
          {stars.map(star => (
            <ShootingStar key={star.id} id={star.id} onComplete={() => removeStar(star.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* 5. The "Horizon" Curve */}
      <motion.div 
        animate={{ y: [0, -30, 0], scale: [1, 1.02, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-40vh] left-[-20%] right-[-20%] h-[80vh] bg-black rounded-[100%] blur-[100px] opacity-90 z-0" 
      />
      
      {/* 6. Cinematic Grain */}
      <div 
        className="absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("${NOISE_URI}")`, filter: 'contrast(120%) brightness(100%)' }}
      ></div>
      
    </div>
  );
};

export default BackgroundMesh;