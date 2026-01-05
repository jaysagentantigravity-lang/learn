import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type BackgroundMode = 'idle' | 'thinking' | 'searching' | 'speaking';

interface BackgroundMeshProps {
  mode?: BackgroundMode;
}

// Optimized: 64x64 Noise PNG (Base64) - ~400 bytes, zero GPU compute cost compared to SVG Filters
const STATIC_NOISE = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLLVAAAAPUlEQVR42u3OMQEAAAgDIJfc6B7Dz4QDC5NGQiJZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZeQ0d/0IC/wAAAABJRU5ErkJggg==')";

// --- STATIC STAR FIELD COMPONENT (Optimized) ---
const StaticStarField = React.memo(() => {
  // Reduced count from 100 to 40 for mobile performance
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      size: Math.random() > 0.8 ? '2px' : '1px', // Simplified sizes
      opacity: Math.random() * 0.4 + 0.1, 
      duration: 3 + Math.random() * 4
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[-2] contain-strict">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full will-change-opacity"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animation: `twinkle ${star.duration}s infinite ease-in-out alternate`
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
});

const BackgroundMesh: React.FC<BackgroundMeshProps> = ({ mode = 'idle' }) => {
  const palette = useMemo(() => {
    const palettes = {
      idle: { top: '#0f172a', highlight: '#1e293b' }, 
      thinking: { top: '#1c1917', highlight: '#44403c' },
      searching: { top: '#022c22', highlight: '#115e59' },
      speaking: { top: '#000000', highlight: '#27272a' }
    };
    return palettes[mode];
  }, [mode]);

  return (
    <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
      
      {/* 1. Base Dark Background */}
      <div className="absolute inset-0 bg-black z-[-10]" />

      {/* 2. CSS-based Gradient Transition (Cheaper than JS animation loops) */}
      <div 
        className="absolute inset-0 z-[-5] transition-colors duration-1000 ease-in-out"
        style={{
          background: `radial-gradient(120% 60% at 50% -10%, ${palette.highlight} 0%, ${palette.top} 40%, transparent 100%)`
        }}
      />

      {/* 3. Static Star Field (Memoized) */}
      <StaticStarField />

      {/* 4. The "Horizon" Curve (Reduced blur radius for performance) */}
      <motion.div 
        animate={{ y: [0, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-40vh] left-[-20%] right-[-20%] h-[80vh] bg-black rounded-[100%] z-0" 
        style={{ filter: 'blur(60px)', opacity: 0.9 }} 
      />
      
      {/* 5. Static Noise Overlay (GPU Optimized) */}
      <div 
        className="absolute inset-0 z-50 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{ 
          backgroundImage: STATIC_NOISE, 
          backgroundSize: '128px 128px',
          backgroundRepeat: 'repeat'
        }}
      ></div>
      
    </div>
  );
};

export default React.memo(BackgroundMesh);