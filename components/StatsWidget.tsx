
import React from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatsWidgetProps {
  title?: string;
  data: StatItem[];
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, data }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto my-6 p-1 rounded-[30px] bg-gradient-to-br from-white/10 to-transparent p-[1px]"
    >
       <div className="bg-black/60 backdrop-blur-xl rounded-[29px] overflow-hidden border border-white/5 relative">
          
          {/* Header */}
          {title && (
             <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <i className="fa-solid fa-chart-pie text-cyan-400 text-sm"></i>
                   <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">{title}</span>
                </div>
                <div className="flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
                   <div className="w-1 h-1 rounded-full bg-cyan-500/30"></div>
                   <div className="w-1 h-1 rounded-full bg-cyan-500/30"></div>
                </div>
             </div>
          )}

          {/* Grid */}
          <div className={`grid ${data.length > 2 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'} divide-x divide-white/5`}>
             {data.map((stat, i) => (
                <div key={i} className="p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors group">
                   <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-semibold group-hover:text-cyan-400 transition-colors">
                      {stat.label}
                   </div>
                   <div className="text-2xl md:text-3xl font-light text-white font-mono flex items-baseline gap-1">
                      {typeof stat.value === 'number' ? (
                          <CountUp end={stat.value} />
                      ) : (
                          <span>{stat.value}</span>
                      )}
                      {stat.unit && <span className="text-sm text-zinc-600 font-sans">{stat.unit}</span>}
                   </div>
                   {stat.trend && (
                      <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1
                         ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 
                           stat.trend === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-400'}
                      `}>
                         <i className={`fa-solid fa-caret-${stat.trend === 'neutral' ? 'right' : stat.trend}`}></i>
                         <span>{stat.trend.toUpperCase()}</span>
                      </div>
                   )}
                </div>
             ))}
          </div>
          
          {/* Footer Decoration */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20"></div>
       </div>
    </motion.div>
  );
};

// Simple Counter Animation Component
const CountUp = ({ end }: { end: number }) => {
   const [count, setCount] = React.useState(0);
   
   React.useEffect(() => {
      let start = 0;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
         const elapsed = currentTime - startTime;
         const progress = Math.min(elapsed / duration, 1);
         // Ease Out Quart
         const ease = 1 - Math.pow(1 - progress, 4);
         
         setCount(Math.floor(ease * end));

         if (progress < 1) {
            requestAnimationFrame(animate);
         }
      };
      
      requestAnimationFrame(animate);
   }, [end]);

   return <span>{count.toLocaleString()}</span>;
}

export default StatsWidget;
