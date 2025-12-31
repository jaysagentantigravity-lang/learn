import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import VisualCard from './VisualCard';
import MermaidDiagram from './MermaidDiagram';

interface MessageListProps {
  messages: Message[];
  onPlayAudio?: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onPlayAudio }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Parser that splits the text by custom tags [DIAGRAM]...[/DIAGRAM] or [IMAGE]...[/IMAGE]
   */
  const renderMessageContent = (text: string) => {
    // Regex to capture [TAG]content[/TAG] or everything else
    const regex = /\[DIAGRAM\]([\s\S]*?)\[\/DIAGRAM\]|\[IMAGE\]([\s\S]*?)\[\/IMAGE\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Push preceding text if any
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      if (match[1]) { // Diagram Content
        parts.push({
          type: 'diagram',
          content: match[1].trim()
        });
      } else if (match[2]) { // Image URL
        parts.push({
          type: 'image',
          content: match[2].trim()
        });
      }

      lastIndex = regex.lastIndex;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return parts.map((part, idx) => {
      if (part.type === 'text') {
        if (!part.content.trim()) return null;
        return (
          <div key={idx} className="markdown-body text-white/90">
            <ReactMarkdown>{part.content}</ReactMarkdown>
          </div>
        );
      } else if (part.type === 'diagram') {
        return (
          <VisualCard 
            key={idx} 
            type="diagram" 
            content={<MermaidDiagram chart={part.content} />} 
          />
        );
      } else if (part.type === 'image') {
        return (
           <VisualCard 
             key={idx} 
             type="image" 
             content={
               <img 
                 src={part.content} 
                 alt="Visual Interleave" 
                 className="w-full h-auto object-cover max-h-[350px]"
                 loading="lazy" 
               />
             } 
           />
        );
      }
      return null;
    });
  };

  return (
    <div 
      className="flex-1 w-full max-w-3xl px-4 overflow-y-auto scrollbar-hide flex flex-col gap-6 py-4 z-10 relative"
      style={{ 
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 50px, black 100%)', 
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50px, black 100%)' 
      }}
    >
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`
              max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3 text-sm md:text-base leading-relaxed backdrop-blur-sm shadow-sm relative group
              ${msg.role === 'user' 
                ? 'bg-white/10 text-white/90 rounded-br-none border border-white/5' 
                : 'bg-black/30 text-white/90 font-light border border-white/5 w-full'
              }
            `}>
              {msg.image && (
                <img 
                  src={`data:image/jpeg;base64,${msg.image}`} 
                  alt="User uploaded" 
                  className="mb-3 rounded-lg max-h-48 object-contain border border-white/10"
                />
              )}
              
              {/* Content Renderer */}
              <div className="flex flex-col gap-2">
                {renderMessageContent(msg.text)}
              </div>
              
              {/* Sources / Grounding */}
              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2 mb-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1 w-full mb-1">
                    <Globe size={10} /> Sources:
                  </span>
                  {msg.groundingSources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-800/50 transition-colors truncate max-w-[200px]"
                    >
                      {source.title || new URL(source.url || '').hostname}
                    </a>
                  ))}
                </div>
              )}

              {/* Timestamp & Audio Trigger Row */}
              <div className={`flex items-center gap-3 mt-1 ${msg.role === 'user' ? 'justify-end text-white/40' : 'justify-start text-zinc-500'}`}>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {formatTime(msg.timestamp)}
                </span>
                
                {msg.role === 'model' && onPlayAudio && (
                  <button 
                      onClick={() => onPlayAudio(msg)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Play Audio"
                  >
                      <Volume2 size={14} />
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default MessageList;