import React from 'react';

interface BorderBeamProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  alwaysOn?: boolean; // If true, beam is visible always. If false, only on hover.
  isThinking?: boolean; // Special prop to change color during thinking state
}

const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className = "",
  duration = 14, // Slower duration (14s) for realistic, heavy glass physics
  borderWidth = 1.5,
  colorFrom = "transparent", // Transparent tail for a clean "glint" effect
  colorTo = "#94a3b8",   // Slate-400 (Desaturated Blue/Grey) for realistic glass reflection
  alwaysOn = false,
  isThinking = false
}) => {
  // Thinking Colors: Purple theme override (also desaturated slightly)
  const beamColorFrom = isThinking ? "transparent" : colorFrom;
  const beamColorTo = isThinking ? "#a855f7" : colorTo; // Purple-500

  return (
    <div className={`relative group ${className}`}>
      
      {/* 1. Base Glassmorphism Layer */}
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xl rounded-[inherit] z-0 border border-white/5" />

      {/* 2. The Animated Double-Beam Ring (Masked) */}
      <div 
        className={`absolute inset-0 rounded-[inherit] pointer-events-none z-10 overflow-hidden
          ${alwaysOn ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
          transition-opacity duration-500 ease-out
        `}
        style={{
             WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
             WebkitMaskComposite: 'xor',
             maskComposite: 'exclude',
             padding: `${borderWidth}px`
        }}
      >
        {/* 
           PHYSICS: "The Chase"
           Both beams rotate CLOCKWISE. 
           - Beam A starts at 0deg (Top)
           - Beam B starts at 180deg (Bottom)
           Since they move at the same speed in the same direction, they never cross.
           This mimics a light source rotating around the object.
        */}

        {/* Beam A */}
        <div 
          className="absolute top-[50%] left-[50%] w-[400%] aspect-square"
          style={{
            transform: 'translate(-50%, -50%)',
            // Ultra-tight 10 degree tail for "Spark" effect
            background: `conic-gradient(from 0deg, transparent 0 350deg, ${beamColorTo} 360deg)`,
            // Reduced blur for sharp glass edge look
            filter: `blur(1.5px) drop-shadow(0 0 4px ${beamColorTo})`, 
            animation: `spin-clockwise ${duration}s linear infinite`,
          }}
        />
        
        {/* Beam B (Offset 180) */}
        <div 
          className="absolute top-[50%] left-[50%] w-[400%] aspect-square"
          style={{
            transform: 'translate(-50%, -50%)',
            background: `conic-gradient(from 180deg, transparent 0 350deg, ${beamColorTo} 360deg)`,
            filter: `blur(1.5px) drop-shadow(0 0 4px ${beamColorTo})`,
            animation: `spin-clockwise ${duration}s linear infinite`,
          }}
        />
      </div>

      {/* 3. Static High-Gloss Ridge (Texture) */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] mix-blend-overlay" />

      {/* 4. Content */}
      <div className="relative z-30 w-full h-full rounded-[inherit] overflow-hidden">
        {children}
      </div>

      <style>{`
        @keyframes spin-clockwise {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BorderBeam;