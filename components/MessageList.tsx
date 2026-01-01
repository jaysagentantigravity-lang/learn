import React, { useEffect, useRef, useState } from 'react';
import { Message, AudioMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import VisualCard from './VisualCard';
import MermaidDiagram from './MermaidDiagram';
import ClarificationCard from './ClarificationCard';
import HolographicStepper from './HolographicStepper';

interface MessageListProps {
  messages: Message[];
  onPlayAudio: (message: Message, mode: AudioMode) => void;
  onClarificationSubmit: (msgId: string, option: string) => void;
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
      {copied ? <i className="fa-solid fa-check text-green-400 text-sm"></i> : <i className="fa-solid fa-copy text-sm"></i>}
      <span className="text-[10px] font-mono uppercase">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
};

const MessageList: React.FC<MessageListProps> = ({ messages, onPlayAudio, onClarificationSubmit, isThinking, thinkingStatus }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Smart Auto-scroll: Only scroll if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Threshold: 150px from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    // Always scroll on new user message (length change) or if already near bottom
    if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, messages[messages.length - 1]?.text, isThinking, thinkingStatus]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const renderContent = (text: string) => {
    if (!text) return null;
    
    const regex = /!\[([\s\S]*?)\]\([\s\S]*?\)|\[DIAGRAM\]([\s\S]*?)\[\/DIAGRAM\]|\[\[GENERATE_IMAGE:\s*["']?([\s\S]*?)["']?\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      
      if (match[3]) {
        parts.push({ type: 'image', content: match[3].trim() });
      } else if (match[2]) {
        parts.push({ type: 'diagram', content: match[2].trim() });
      } else if (match[1]) {
        parts.push({ type: 'image', content: match[1].trim() });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', content: text.substring(lastIndex) });

    return parts.map((part, idx) => {
      if (part.type === 'diagram') {
        return <VisualCard key={idx} type="diagram" content={<MermaidDiagram chart={part.content} />} />;
      }
      if (part.type === 'image') {
        return <VisualCard key={idx} type="image" content={part.content} isPrompt={true} />;
      }
      return (
        <div key={idx} className="prose prose-invert max-w-none prose-lg">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 mt-12 mb-8 tracking-tight leading-tight" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl md:text-3xl font-semibold text-cyan-50 mt-10 mb-6 border-l-4 border-cyan-500 pl-6 py-1" {...props} />,
              p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed mb-6 font-light text-lg tracking-wide opacity-90" {...props} />,
              strong: ({node, ...props}) => <strong className="text-cyan-200 font-bold" {...props} />,
              ul: ({node, ...props}) => <ul className="space-y-3 mb-8 ml-6" {...props} />,
              li: ({node, ...props}) => <li className="text-zinc-300 list-disc pl-2 marker:text-cyan-500" {...props} />,
              code({node, inline, className, children, ...props}: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                return !inline && match ? (
                  <div className="rounded-2xl overflow-hidden my-8 border border-white/10 shadow-2xl">
                    <div className="bg-[#0a0a0a] px-4 py-2 text-xs text-zinc-500 border-b border-white/5 uppercase tracking-wider font-semibold flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span> {match[1]}
                       </div>
                       <CopyButton text={codeString} />
                    </div>
                    <SyntaxHighlighter
                      {...props}
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        background: 'rgba(0, 0, 0, 0.4)', 
                        margin: 0, 
                        padding: '1.5rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className="bg-white/10 text-cyan-200 px-1.5 py-0.5 rounded font-mono text-sm border border-white/5" {...props}>
                    {children}
                  </code>
                );
              },
              table: ({node, ...props}) => <div className="overflow-x-auto my-8 rounded-xl border border-white/10 shadow-xl"><table className="min-w-full divide-y divide-white/10 bg-black/20" {...props} /></div>,
              thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
              th: ({node, ...props}) => <th className="px-6 py-4 text-left text-xs font-bold text-cyan-400 uppercase tracking-wider" {...props} />,
              tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5" {...props} />,
              tr: ({node, ...props}) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
              td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300" {...props} />,
            }}
          >
            {part.content}
          </ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className="flex-1 w-full flex flex-col items-center overflow-y-auto pb-32" style={{ scrollBehavior: 'smooth', overflowAnchor: 'none' }}>
      <div className="w-full max-w-5xl px-4 md:px-8 py-10 flex flex-col gap-12">
        <AnimatePresence mode='popLayout'>
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            
            // "The Curtain" Logic:
            // If it's the last message (Model), AND we are thinking, AND there is no text yet...
            // Hide the bubble. Show Stepper instead.
            if (msg.role === 'model' && isLastMessage && isThinking && !msg.text) {
              return null;
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
                    <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-3xl rounded-br-none border border-white/10 max-w-xl text-lg text-white/90 shadow-lg">
                       {msg.image && <img src={`data:image/jpeg;base64,${msg.image}`} className="mb-4 rounded-xl max-h-40 border border-white/10" />}
                       {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden group">
                    
                    {msg.clarification ? (
                      <ClarificationCard 
                        data={msg.clarification} 
                        onSubmit={(opt) => onClarificationSubmit(msg.id, opt)} 
                      />
                    ) : (
                      <>
                        <div className="relative z-10 min-h-[60px]">
                          {renderContent(msg.text)}
                          {/* Cursor for streaming if this is the last message and still thinking */}
                          {isThinking && isLastMessage && (
                            <div className="h-6 w-2 bg-cyan-400 animate-pulse inline-block" />
                          )}
                        </div>

                        {/* Footer Controls */}
                        {msg.text && (
                          <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-6">
                            
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
                                    className="text-xs text-zinc-500 hover:text-cyan-400 flex items-center gap-2 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
                                  >
                                    <i className="fa-solid fa-earth-americas text-xs"></i> {s.title}
                                  </motion.a>
                                ))}
                              </AnimatePresence>
                            </div>

                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === msg.id ? null : msg.id);
                                }}
                                className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/5 hover:border-cyan-500/30 group/btn"
                              >
                                <i className="fa-solid fa-volume-high text-lg group-hover/btn:text-cyan-400 transition-colors"></i>
                                <span className="text-xs font-bold uppercase tracking-widest">Listen</span>
                              </button>

                              <AnimatePresence>
                                {activeDropdownId === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full right-0 mb-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20"
                                  >
                                    <button
                                      onClick={() => onPlayAudio(msg, 'verbatim')}
                                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3"
                                    >
                                      <i className="fa-solid fa-book-open text-cyan-400 text-sm"></i>
                                      Read Article
                                    </button>
                                    <button
                                      onClick={() => onPlayAudio(msg, 'story')}
                                      className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3 border-t border-white/5"
                                    >
                                      <i className="fa-solid fa-microphone text-purple-400 text-sm"></i>
                                      Explain it to me
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
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
          {/* Show when thinking, and the last message (model) has NO text yet */}
          {isThinking && (!messages.length || (messages[messages.length-1].role === 'model' && !messages[messages.length-1].text)) && (
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