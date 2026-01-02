import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type WidgetType = 'CHART' | 'MAP' | 'STATS' | 'RADAR' | 'LOGOS';

interface SmartWidgetProps {
  type: WidgetType;
  jsonString: string;
}

const LoadingPlaceholder = () => (
    <div className="w-full h-48 flex flex-col items-center justify-center text-zinc-600">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin mb-3"></div>
        <span className="text-[10px] font-mono animate-pulse">Awaiting Data Stream...</span>
    </div>
);

// --- SUB-COMPONENT: LOGO CLOUD ---
const LogoCloudViz = ({ data }: { data: any }) => {
  if (!data || !data.data || !Array.isArray(data.data)) return <LoadingPlaceholder />;
  
  return (
    <div className="w-full py-8">
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {data.data.map((logo: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="group flex flex-col items-center gap-3"
          >
            {/* Logo Container - Clean White Tile for Best Visibility */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center p-3 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group-hover:scale-110 relative overflow-hidden border border-white/20">
               <img 
                 src={logo.url} 
                 alt={logo.label} 
                 className="w-full h-full object-contain relative z-10 opacity-100 transition-all filter drop-shadow-sm"
                 loading="lazy"
                 onError={(e) => {
                    // Fallback to UI Avatars if external logo fails
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${logo.label}&background=random&color=fff&rounded=true&bold=true`;
                 }}
               />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold group-hover:text-cyan-400 transition-colors text-center max-w-[100px] truncate">
              {logo.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: BAR / LINE CHART ---
const ChartViz = ({ data }: { data: any }) => {
  if (!data || !data.data || !Array.isArray(data.data)) return <LoadingPlaceholder />;

  const chartType = data.type || 'bar';
  const points = data.data;
  
  if (points.length === 0) return <LoadingPlaceholder />;

  const maxVal = Math.max(...points.map((p: any) => p.value));
  
  return (
    <div className="w-full h-64 flex items-end justify-between gap-2 md:gap-4 px-4 pb-2 pt-8 relative">
       {/* Grid Lines */}
       <div className="absolute inset-0 flex flex-col justify-between px-4 pb-8 pointer-events-none opacity-20">
          <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
          <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
          <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
          <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
       </div>

       {points.map((point: any, i: number) => {
         const heightPct = maxVal > 0 ? (point.value / maxVal) * 100 : 0;
         
         return (
           <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              {/* Tooltip */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-cyan-500/30 text-cyan-400 text-xs px-2 py-1 rounded-md whitespace-nowrap z-10 font-mono shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                 {point.value} {data.unit || ''}
              </div>

              {chartType === 'line' ? (
                <div className="w-full flex justify-center items-end h-full relative">
                   <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="w-0.5 bg-gradient-to-t from-transparent to-cyan-500/50 absolute bottom-0"
                   />
                   <motion.div 
                      initial={{ bottom: 0, opacity: 0 }}
                      animate={{ bottom: `${heightPct}%`, opacity: 1 }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="absolute w-3 h-3 rounded-full bg-cyan-500 border-2 border-white shadow-[0_0_10px_rgba(6,182,212,0.8)] z-10"
                   />
                </div>
              ) : (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: 'spring', damping: 20, delay: i * 0.1 }}
                  className="w-full max-w-[40px] bg-gradient-to-t from-cyan-900/20 via-cyan-500/50 to-cyan-400 rounded-t-sm relative overflow-hidden backdrop-blur-sm border-t border-x border-cyan-300/30 hover:brightness-125 transition-all"
                >
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:10px_10px]" />
                </motion.div>
              )}
              
              <div className="mt-3 text-[10px] text-zinc-400 font-mono uppercase tracking-widest truncate w-full text-center group-hover:text-white transition-colors">
                {point.label}
              </div>
           </div>
         );
       })}
    </div>
  );
};

// --- SUB-COMPONENT: HOLOGRAPHIC MAP ---
const MapViz = ({ data }: { data: any }) => {
  if (!data || !data.data || !Array.isArray(data.data)) return <LoadingPlaceholder />;

  const regionMap: Record<string, {x: number, y: number, color: string}> = {
    "North America": { x: 25, y: 30, color: "text-cyan-400" },
    "South America": { x: 35, y: 70, color: "text-emerald-400" },
    "Europe": { x: 52, y: 25, color: "text-purple-400" },
    "Africa": { x: 52, y: 55, color: "text-amber-400" },
    "Asia": { x: 75, y: 35, color: "text-red-400" },
    "Oceania": { x: 85, y: 75, color: "text-blue-400" },
  };

  const points = data.data;
  
  if (points.length === 0) return <LoadingPlaceholder />;

  return (
    <div className="w-full aspect-[16/9] bg-black/40 rounded-2xl relative overflow-hidden border border-white/5">
      <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
      }}></div>
      
      <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-30 pointer-events-none fill-white/10">
         <path d="M20,20 Q40,10 50,30 T40,60 T30,80" /> 
         <path d="M90,20 Q110,10 130,20 T140,50 T100,60" /> 
         <path d="M100,50 Q110,70 100,90" /> 
         <path d="M160,70 Q170,80 160,90" /> 
      </svg>

      {points.map((p: any, i: number) => {
        const coords = regionMap[p.region] || { x: 50, y: 50, color: "text-white" };
        const size = Math.min(Math.max(p.value, 20), 80); 
        
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.2, type: 'spring' }}
            className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-help group z-10`}
            style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
          >
             <div className={`absolute w-[200%] h-[200%] rounded-full animate-ping opacity-20 bg-current ${coords.color}`} />
             <div className={`relative rounded-full bg-black/80 border border-current backdrop-blur-md flex items-center justify-center ${coords.color}`}
                  style={{ width: `${size * 0.8}px`, height: `${size * 0.8}px` }}
             >
                <span className="text-xs font-bold">{p.value}</span>
             </div>
             <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded border border-white/10 ${coords.color}`}>
               {p.region}
             </div>
             {p.info && (
               <div className="absolute top-full mt-2 w-32 bg-zinc-900 border border-white/10 p-2 text-[10px] text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center shadow-xl">
                 {p.info}
               </div>
             )}
          </motion.div>
        );
      })}
    </div>
  );
};

// --- SUB-COMPONENT: RADAR CHART ---
const RadarViz = ({ data }: { data: any }) => {
  if (!data || !data.data || !Array.isArray(data.data)) return <LoadingPlaceholder />;

  const points = data.data;
  if (points.length === 0) return <LoadingPlaceholder />;

  const count = points.length;
  const radius = 100;
  const center = 110; 
  const angleStep = (Math.PI * 2) / count;
  const maxVal = Math.max(...points.map((p: any) => p.value));

  const polyPoints = points.map((p: any, i: number) => {
    const value = maxVal > 0 ? Math.max(0, Math.min(p.value, maxVal)) : 0;
    const r = (value / maxVal) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const axes = points.map((p: any, i: number) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, label: p.label };
  });

  return (
    <div className="w-full h-80 flex items-center justify-center relative">
       <div className="relative w-64 h-64 md:w-80 md:h-80">
          <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
             {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
                <polygon 
                  key={idx}
                  points={points.map((_: any, i: number) => {
                    const r = radius * scale;
                    const angle = i * angleStep - Math.PI / 2;
                    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
             ))}

             {axes.map((axis: any, i: number) => (
                <g key={i}>
                  <line x1={center} y1={center} x2={axis.x} y2={axis.y} stroke="rgba(255,255,255,0.1)" />
                  <foreignObject 
                    x={axis.x - 40} 
                    y={axis.y - (axis.y < center ? 25 : -5)} 
                    width="80" 
                    height="30"
                  >
                     <div className={`text-[10px] text-center font-bold uppercase tracking-widest text-zinc-400 flex justify-center`}>
                        <span className="bg-black/60 px-1 rounded backdrop-blur-sm">{axis.label}</span>
                     </div>
                  </foreignObject>
                </g>
             ))}

             <motion.polygon
                initial={{ opacity: 0, scale: 0, transformOrigin: "center" }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                points={polyPoints}
                fill="rgba(34, 211, 238, 0.3)" 
                stroke="#22d3ee"
                strokeWidth="2"
             />

             {points.map((p: any, i: number) => {
                const value = maxVal > 0 ? Math.max(0, Math.min(p.value, maxVal)) : 0;
                const r = (value / maxVal) * radius;
                const angle = i * angleStep - Math.PI / 2;
                const x = center + r * Math.cos(angle);
                const y = center + r * Math.sin(angle);
                
                return (
                  <motion.circle
                    key={i}
                    cx={x} cy={y} r="3"
                    className="fill-cyan-100"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  />
                );
             })}
          </svg>
       </div>
    </div>
  );
};


const SmartWidget: React.FC<SmartWidgetProps> = ({ type, jsonString }) => {
  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonString);
      // Basic validation
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }, [jsonString]);

  if (!data) return <LoadingPlaceholder />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-3xl mx-auto my-8"
    >
      <div className="bg-black/60 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_0_30px_-5px_rgba(6,182,212,0.1)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
           <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/50 border border-white/10 shadow-inner`}>
                <i className={`fa-solid ${
                    type === 'MAP' ? 'fa-earth-americas text-emerald-400' : 
                    type === 'RADAR' ? 'fa-draw-polygon text-purple-400' :
                    type === 'LOGOS' ? 'fa-building text-amber-400' :
                    'fa-chart-simple text-cyan-400'
                } text-xs`}></i>
              </div>
              <div>
                 <div className="text-xs font-bold text-white tracking-wider uppercase">{data.title || 'Analysis'}</div>
                 <div className="text-[10px] text-zinc-500 font-mono">AI Generated Visualization</div>
              </div>
           </div>
           
           <div className="flex gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
           </div>
        </div>

        {/* Content */}
        <div className="p-2 md:p-6 bg-gradient-to-b from-black/0 to-cyan-900/10">
           {type === 'CHART' && <ChartViz data={data} />}
           {type === 'MAP' && <MapViz data={data} />}
           {type === 'RADAR' && <RadarViz data={data} />}
           {type === 'LOGOS' && <LogoCloudViz data={data} />}
        </div>
        
        {/* Footer */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>
    </motion.div>
  );
};

export default SmartWidget;