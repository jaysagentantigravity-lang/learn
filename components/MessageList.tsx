import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Message, AudioMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import VisualCard from './VisualCard';
import ClarificationCard from './ClarificationCard';
import HolographicStepper from './HolographicStepper';
import StatsWidget from './StatsWidget';
import SmartWidget, { WidgetType } from './SmartWidget';
import CinematicStoryCard from './CinematicStoryCard';

// Lazy Load Heavy Components to optimize initial bundle size
const MermaidDiagram = React.lazy(() => import('./MermaidDiagram'));
const CodeSandbox = React.lazy(() => import('./CodeSandbox'));
const CodeBlock = React.lazy(() => import('./CodeBlock'));

interface MessageListProps {
  messages: Message[];
  onPlayAudio: (message: Message, mode: AudioMode) => void;
  onClarificationSubmit: (msgId: string, option: string) => void;
  onSuggestionClick?: (text: string) => void;
  isThinking: boolean;
  thinkingStatus?: string;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
      title="Copy Code"
    >
      {copied ? <i className="fa-solid fa-check text-emerald-400 text-sm"></i> : <i className="fa-solid fa-copy text-sm"></i>}
      <span className="text-[10px] font-mono uppercase">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
};

// Loading Skeleton for Lazy Components
const ComponentSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div className="w-full h-32 rounded-3xl bg-white/5 border border-white/5 animate-pulse flex flex-col items-center justify-center gap-2">
    <div className="w-6 h-6 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin"></div>
    <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Loading {label}...</span>
  </div>
);

const MessageList: React.FC<MessageListProps> = ({ messages, onPlayAudio, onClarificationSubmit, onSuggestionClick, isThinking, thinkingStatus }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Smart Auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, messages[messages.length - 1]?.text, isThinking, thinkingStatus]);

  // Regex for parsing inline tags
  const regex = /!\[GENERATE_IMAGE:(?:(PORTRAIT|LANDSCAPE):)?([\s\S]*?)\]|!\[([\s\S]*?)\]\([\s\S]*?\)|\[DIAGRAM\]([\s\S]*?)\[\/DIAGRAM\]|\[\[GENERATE_IMAGE:([\s\S]*?)\]\]|\[\[WIDGET:([A-Z_]+)\]\]([\s\S]*?)\[\[\/WIDGET\]\]|\[AUDIO_ATMOSPHERE:([\s\S]*?)\]/g;

  // Render text parts, handling images and diagrams inline (for standard layout)
  const renderParts = (text: string) => {
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }

      // match[1] = orientation (PORTRAIT/LANDSCAPE)
      // match[2] = prompt (for new tag)
      // match[3] = alt text (standard md)
      // match[4] = diagram
      // match[5] = old gen tag
      // match[6] = widget type (STATS, CHART, MAP, RADAR)
      // match[7] = widget json content
      // match[8] = audio atmosphere content

      if (match[2]) { // New tag found
          const orientation = (match[1] === 'PORTRAIT') ? 'portrait' : 'landscape';
          // Use HQ mode if it is a portrait request to ensure facial accuracy
          const isHQ = orientation === 'portrait';
          parts.push({ type: 'image', content: match[2].trim(), orientation, isHQ });
      } else if (match[4]) { // Diagram
          parts.push({ type: 'diagram', content: match[4].trim() });
      } else if (match[3]) { // Standard ![alt](src) - treat as image if needed, or text
          parts.push({ type: 'text', content: match[0] }); // Render standard MD images via ReactMarkdown usually
      } else if (match[5]) { // Old tag
          parts.push({ type: 'image', content: match[5].trim(), orientation: 'landscape', isHQ: false });
      } else if (match[6] && match[7]) { // Widget Generic
          parts.push({ type: 'smart_widget', widgetType: match[6], content: match[7].trim() });
      } else if (match[8]) { // Audio Atmosphere
          parts.push({ type: 'audio_atmosphere', content: match[8].trim() });
      }
      
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', content: text.substring(lastIndex) });

    return parts.map((part, idx) => {
       if (part.type === 'image') {
          return <VisualCard key={idx} type="image" content={part.content} isPrompt={true} orientation={part.orientation as any} isHQ={part.isHQ} />;
       }
       if (part.type === 'diagram') {
          return (
             <VisualCard key={idx} type="diagram" content={
                <Suspense fallback={<ComponentSkeleton label="Diagram" />}>
                   <MermaidDiagram chart={part.content} />
                </Suspense>
             } />
          );
       }
       if (part.type === 'smart_widget') {
          // Handle Legacy STATS or New CHART/MAP/RADAR/LOGOS
          if (part.widgetType === 'STATS') {
              try {
                const statsData = JSON.parse(part.content);
                return <StatsWidget key={idx} title={statsData.title} data={statsData.data} />;
              } catch(e) { return null; }
          }
          return <SmartWidget key={idx} type={part.widgetType as WidgetType} jsonString={part.content} />;
       }
       if (part.type === 'audio_atmosphere') {
          // Visual cue only, audio is handled by procedural engine in Story Mode or future updates
          return (
            <div key={idx} className="my-6 flex items-center gap-3 p-3 rounded-full bg-cyan-900/10 border border-cyan-500/20 max-w-fit">
               <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full animate-ping bg-cyan-500/20"></div>
                   <i className="fa-solid fa-music text-cyan-400 text-xs"></i>
               </div>
               <div className="flex flex-col">
                   <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Sonic Ambiance</span>
                   <span className="text-xs text-cyan-300/80 italic line-clamp-1">{part.content}</span>
               </div>
            </div>
          );
       }

       return (
          <div key={idx} className="prose prose-invert max-w-none prose-lg">
             <ReactMarkdown components={markdownComponents}>{part.content}</ReactMarkdown>
          </div>
       );
    });
  };

  const markdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-5xl md:text-6xl font-cinzel text-white mt-12 mb-8 tracking-tight leading-none text-center" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-3xl font-serif-display font-light text-zinc-100 mt-12 mb-6 border-b border-zinc-800 pb-2" {...props} />,
      p: ({node, ...props}: any) => <p className="text-zinc-300 leading-relaxed mb-6 font-light text-lg tracking-wide opacity-90" {...props} />,
      strong: ({node, ...props}: any) => <strong className="text-white font-bold" {...props} />,
      ul: ({node, ...props}: any) => <ul className="space-y-3 mb-8 ml-6" {...props} />,
      li: ({node, ...props}: any) => <li className="text-zinc-300 list-disc pl-2 marker:text-zinc-500" {...props} />,
      blockquote: ({node, ...props}: any) => (
         <div className="my-12 relative flex justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl text-cyan-500/10 font-serif-display leading-none z-0">“</div>
            <blockquote className="relative z-10 text-center max-w-3xl" {...props}>
               <div className="text-2xl md:text-3xl font-serif-display italic text-white leading-tight px-8">
                  {props.children}
               </div>
               <div className="w-24 h-1 bg-cyan-500 mx-auto mt-6 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
            </blockquote>
         </div>
      ),
      code({node, inline, className, children, ...props}: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        const language = match ? match[1] : 'text';

        if (!inline && ['html', 'xml', 'svg'].includes(language)) {
           return (
             <Suspense fallback={<ComponentSkeleton label="Sandbox" />}>
                <CodeSandbox code={codeString} language={language} />
             </Suspense>
           );
        }

        return !inline && match ? (
          <div className="rounded-3xl overflow-hidden my-8 border border-white/10 shadow-2xl">
            <div className="bg-[#0a0a0a] px-4 py-2 text-xs text-zinc-500 border-b border-white/5 uppercase tracking-wider font-semibold flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500"></span> {match[1]}
               </div>
               <CopyButton text={codeString} />
            </div>
            <Suspense fallback={<div className="p-8 bg-black/40 text-zinc-500 text-xs">Loading Code...</div>}>
                <CodeBlock language={match[1]} code={codeString} />
            </Suspense>
          </div>
        ) : (
          <code className="bg-white/10 text-zinc-200 px-1.5 py-0.5 rounded-lg font-mono text-sm border border-white/5" {...props}>
            {children}
          </code>
        );
      },
      table: ({node, ...props}: any) => <div className="overflow-x-auto my-8 rounded-3xl border border-white/10 shadow-xl"><table className="min-w-full divide-y divide-white/10 bg-black/20" {...props} /></div>,
      thead: ({node, ...props}: any) => <thead className="bg-white/5" {...props} />,
      th: ({node, ...props}: any) => <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider" {...props} />,
      tbody: ({node, ...props}: any) => <tbody className="divide-y divide-white/5" {...props} />,
      tr: ({node, ...props}: any) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
      td: ({node, ...props}: any) => <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300" {...props} />,
  };

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col items-center overflow-y-auto pb-32" style={{ scrollBehavior: 'smooth', overflowAnchor: 'none' }}>
      <div className="w-full max-w-5xl px-4 md:px-8 py-10 flex flex-col gap-12">
        <AnimatePresence mode='popLayout'>
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            
            // "The Curtain" Logic
            if (msg.role === 'model' && isLastMessage && isThinking && !msg.text && !msg.storyManifest) {
              return null;
            }

            // --- CINEMATIC STORY MODE DETECTION ---
            if (msg.storyManifest) {
               return (
                 <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full"
                 >
                    <CinematicStoryCard manifest={msg.storyManifest} />
                 </motion.div>
               );
            }
            
            // SPECIAL LAYOUT DETECTION: Portrait Mode
            // If the message contains a PORTRAIT image tag, we use the Magazine Layout (Split View)
            const portraitMatch = /!\[GENERATE_IMAGE:PORTRAIT:([\s\S]*?)\]/.exec(msg.text);
            const isPortraitLayout = !!portraitMatch && msg.role === 'model';
            
            let heroImagePrompt = "";
            let bodyText = msg.text;

            if (isPortraitLayout && portraitMatch) {
                heroImagePrompt = portraitMatch[1].trim();
                // Remove the tag from the body text so it doesn't render twice
                bodyText = msg.text.replace(portraitMatch[0], '');
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }} // Slow reveal
                className="w-full"
              >
                {msg.role === 'user' ? (
                  <div className="flex justify-end mb-8">
                    <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-[40px] rounded-br-none border border-white/10 max-w-xl text-lg text-white/90 shadow-lg">
                       {msg.image && <img src={`data:image/jpeg;base64,${msg.image}`} className="mb-4 rounded-3xl max-h-40 border border-white/10" />}
                       {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[48px] p-8 md:p-16 shadow-2xl relative overflow-hidden group">
                    
                    {msg.clarification ? (
                      <ClarificationCard 
                        data={msg.clarification} 
                        onSubmit={(opt) => onClarificationSubmit(msg.id, opt)} 
                      />
                    ) : (
                      <>
                        <div className="relative z-10 min-h-[60px]">
                          {/* --- MAGAZINE LAYOUT (Split View) --- */}
                          {isPortraitLayout ? (
                             <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                                {/* Left Column: Hero Portrait */}
                                <div className="w-full md:w-1/3 shrink-0">
                                   <div className="sticky top-8">
                                      <VisualCard type="image" content={heroImagePrompt} isPrompt={true} orientation="portrait" isHQ={true} />
                                   </div>
                                </div>
                                {/* Right Column: Text Content */}
                                <div className="w-full md:w-2/3 flex flex-col justify-center">
                                   {renderParts(bodyText)}
                                   
                                    {/* Lumina Streaming Cursor (Inside Flex container) */}
                                    {isThinking && isLastMessage && (
                                        <motion.span
                                          className="inline-block w-2 h-5 bg-cyan-400 shadow-[0_0_15px_2px_rgba(34,211,238,0.8)] ml-1 align-middle rounded-sm"
                                          animate={{ opacity: [1, 0.2, 1] }}
                                          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    )}
                                </div>
                             </div>
                          ) : (
                             // --- STANDARD LAYOUT (Stacked) ---
                             <div className="relative">
                                {renderParts(msg.text)}
                                
                                {/* Lumina Streaming Cursor (Standard) */}
                                {isThinking && isLastMessage && (
                                    <motion.span
                                      className="inline-block w-2 h-5 bg-cyan-400 shadow-[0_0_15px_2px_rgba(34,211,238,0.8)] ml-1 align-middle rounded-sm"
                                      animate={{ opacity: [1, 0.2, 1] }}
                                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}
                             </div>
                          )}
                        </div>

                        {/* --- Follow-up Suggestions (Curiosity Chips) --- */}
                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                          <div className="mt-8 mb-4">
                             <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                                Suggested Exploration
                             </h4>
                             <div className="flex flex-wrap gap-2">
                               {msg.suggestedActions.map((action, i) => (
                                 <motion.button
                                   key={i}
                                   initial={{ opacity: 0, scale: 0.9 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   transition={{ delay: i * 0.1 }}
                                   onClick={() => onSuggestionClick && onSuggestionClick(action)}
                                   className="text-left px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-100 text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2 group/chip"
                                 >
                                    <i className="fa-regular fa-compass text-zinc-500 group-hover/chip:text-cyan-400 transition-colors"></i>
                                    {action}
                                 </motion.button>
                               ))}
                             </div>
                          </div>
                        )}

                        {/* Footer Controls */}
                        {msg.text && (
                          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-6">
                            
                            {/* Grounding Sources - Neural Node Style */}
                            <div className="flex flex-wrap gap-3">
                              <AnimatePresence mode="popLayout">
                                {msg.groundingSources?.map((s, i) => (
                                  <motion.a 
                                    key={s.url || i} 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                    href={s.url} 
                                    target="_blank" 
                                    className="group relative px-4 py-2 bg-black/40 rounded-full border border-white/10 hover:border-cyan-500/50 flex items-center gap-2 transition-all hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 group-hover:bg-cyan-400 transition-colors"></div>
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-cyan-100 font-bold max-w-[150px] truncate">
                                      {s.title}
                                    </span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-zinc-600 group-hover:text-cyan-500 ml-1"></i>
                                  </motion.a>
                                ))}
                              </AnimatePresence>
                            </div>

                            {/* Playback Actions */}
                            <div className="flex items-center gap-3 ml-auto">
                                {/* Story Mode Button */}
                                <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPlayAudio(msg, 'story');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white transition-all border border-purple-500/10 hover:border-purple-500/30 group/story"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover/story:scale-110 transition-transform"></i>
                                    <span className="text-xs font-bold uppercase tracking-widest">Explain</span>
                                </button>
                                
                                {/* Verbatim Button */}
                                <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPlayAudio(msg, 'verbatim');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/5 hover:border-white/20 group/read"
                                >
                                    <i className="fa-solid fa-volume-high text-sm group-hover/read:scale-110 transition-transform"></i>
                                    <span className="text-xs font-bold uppercase tracking-widest">Read</span>
                                </button>
                            </div>

                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
          
          {/* Holographic Stepper State */}
          {isThinking && (!messages.length || (messages[messages.length-1].role === 'model' && !messages[messages.length-1].text && !messages[messages.length-1].storyManifest)) && (
            <motion.div
               key="stepper"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="w-full"
            >
              <HolographicStepper status={thinkingStatus || "Initializing..."} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      <div ref={bottomRef} className="h-10" />
    </div>
  );
};

export default MessageList;