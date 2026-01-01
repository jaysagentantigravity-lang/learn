import React, { useRef, useState } from 'react';
import { AppState, ProcessingOptions } from '../types';

interface InputBarProps {
  appState: AppState;
  onSendMessage: (text: string, options: ProcessingOptions) => void;
  onAudioInput: (blob: Blob) => void;
  onStop?: () => void;
}

const InputBar: React.FC<InputBarProps> = ({ appState, onSendMessage, onAudioInput, onStop }) => {
  const [inputText, setInputText] = useState('');
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText, { useThinking, useSearch: !useThinking && useSearch, image: selectedImage || undefined }); // Disable search if thinking is on (usually mutually exclusive for best results, though tech supports both)
    setInputText('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Keep the data URL prefix here for preview, strip it later
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' }); // or audio/webm
          onAudioInput(blob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic Error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const isThinking = appState === AppState.THINKING;

  return (
    <div className="w-full max-w-2xl px-4 pb-6">
      {/* Image Preview */}
      {selectedImage && (
        <div className="mb-2 relative inline-block">
          <img src={selectedImage} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-white/20" />
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-white"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <div className="relative group">
        {/* Glow effect behind the bar */}
        <div className={`absolute -inset-0.5 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur ${isThinking ? 'bg-amber-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-purple-600'}`}></div>
        
        <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pr-2 shadow-2xl">
          
          {/* Action Toggles */}
          <div className="flex items-center gap-1 pl-2 border-r border-white/10 pr-2 mr-2">
            <button 
                onClick={() => setUseThinking(!useThinking)}
                disabled={isThinking}
                className={`p-2 md:p-3 rounded-full transition-colors text-lg ${useThinking ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white disabled:opacity-50'}`}
                title="Deep Thinking Mode (Gemini Pro)"
            >
                <i className="fa-solid fa-brain"></i>
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className={`p-2 md:p-3 rounded-full transition-colors text-lg ${selectedImage ? 'text-cyan-400' : 'text-gray-400 hover:text-white disabled:opacity-50'}`}
                title="Upload Image"
            >
                <i className="fa-solid fa-image"></i>
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : (isThinking ? "Processing..." : "Ask anything...")}
            disabled={isThinking || isRecording}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm md:text-base min-w-0"
          />

          <div className="flex items-center gap-1">
            <button 
                onClick={toggleRecording}
                disabled={isThinking}
                className={`p-2 md:p-3 rounded-full transition-all text-lg ${isRecording ? 'bg-red-500/80 text-white animate-pulse' : 'text-gray-400 hover:text-white disabled:opacity-50'}`}
            >
                <i className="fa-solid fa-microphone"></i>
            </button>
            
            {isThinking ? (
              <button 
                onClick={onStop}
                className="p-2 md:p-3 rounded-full transition-all duration-300 text-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white animate-pulse"
                title="Stop Generation"
              >
                 <i className="fa-solid fa-stop"></i>
              </button>
            ) : (
              <button 
                  onClick={handleSend}
                  disabled={(!inputText && !selectedImage)}
                  className={`p-2 md:p-3 rounded-full transition-all duration-300 text-lg
                    ${(inputText || selectedImage)
                      ? 'bg-white text-black hover:bg-cyan-50 transform hover:scale-105' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
              >
                  {useThinking ? <i className="fa-solid fa-wand-magic-sparkles"></i> : <i className="fa-solid fa-paper-plane"></i>}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Hints */}
      {!isThinking && (
        <div className="flex justify-center gap-4 mt-3 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
          <span className={useThinking ? "text-amber-500/80" : ""}>{useThinking ? "Gemini 3 Pro (Deep Think)" : "Gemini 3 Flash"}</span>
          <span className="hidden md:inline">•</span>
          <span className={useSearch ? "text-blue-400/80" : ""}>Search {useSearch ? "ON" : "OFF"}</span>
        </div>
      )}
    </div>
  );
};

export default InputBar;