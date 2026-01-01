import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type BackgroundMode = 'idle' | 'thinking' | 'searching' | 'speaking';

interface BackgroundMeshProps {
  mode?: BackgroundMode;
}

// Self-contained noise texture (base64 svg)
const NOISE_URI = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E`;

const BackgroundMesh: React.FC<BackgroundMeshProps> = ({ mode = 'idle' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Palette config
  const palettes = {
    idle: { bg: '#083344', glow: '#22d3ee', particle: '165, 243, 252' },     // Cyan
    thinking: { bg: '#2a1205', glow: '#fbbf24', particle: '252, 211, 77' },  // Amber
    searching: { bg: '#022c22', glow: '#34d399', particle: '110, 231, 183' }, // Emerald
    speaking: { bg: '#2e1065', glow: '#a855f7', particle: '216, 180, 254' }   // Purple
  };

  const currentPalette = palettes[mode];

  // Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    // Configuration based on mode
    const config = {
      speed: mode === 'thinking' || mode === 'searching' ? 0.8 : 0.3,
      jitter: mode === 'thinking' ? 0.5 : 0.1,
      connectionDistance: mode === 'speaking' ? 150 : 100,
      count: window.innerWidth < 768 ? 40 : 80
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      phase: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.speed;
        this.vy = (Math.random() - 0.5) * config.speed;
        this.size = Math.random() * 2;
        this.phase = Math.random() * Math.PI * 2;
      }

      update() {
        // Add mode-based jitter
        if (config.jitter > 0.1) {
            this.vx += (Math.random() - 0.5) * 0.05;
            this.vy += (Math.random() - 0.5) * 0.05;
            // Dampen
            this.vx *= 0.99;
            this.vy *= 0.99;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        this.phase += 0.05;
      }

      draw() {
        if (!ctx) return;
        const opacity = (Math.sin(this.phase) + 1) / 2 * 0.5 + 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${currentPalette.particle}, ${opacity})`;
        ctx.fill();
      }
    }

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < config.count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, i) => {
        p.update();
        p.draw();

        // Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < config.connectionDistance) {
            const opacity = 1 - dist / config.connectionDistance;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${currentPalette.particle}, ${opacity * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener('resize', init);
    animate();

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode, currentPalette]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
      
      {/* Base Background Color (Smooth Transition) */}
      <motion.div 
        animate={{ backgroundColor: currentPalette.bg }}
        transition={{ duration: 2 }}
        className="absolute inset-0 z-0 opacity-80"
      />

      {/* Large Soft Glow Orbs */}
      <motion.div 
        animate={{ backgroundColor: currentPalette.glow }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-10 mix-blend-screen"
      />
      <motion.div 
        animate={{ backgroundColor: currentPalette.glow }}
        transition={{ duration: 4, delay: 2, ease: "easeInOut" }}
        className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-10 mix-blend-screen"
      />

      {/* Canvas Particle Layer */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-10 opacity-60"
      />
      
      {/* Cinematic Grain Overlay */}
      <div 
        className="absolute inset-0 z-20 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("${NOISE_URI}")`, filter: 'contrast(150%) brightness(100%)' }}
      ></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60"></div>

    </div>
  );
};

export default BackgroundMesh;