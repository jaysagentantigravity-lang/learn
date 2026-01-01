import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-8 text-center font-sans relative overflow-hidden">
          {/* Background Noise */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>
          
          <div className="z-10 max-w-lg border border-red-500/20 bg-red-950/10 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_50px_-10px_rgba(239,68,68,0.2)]">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 animate-pulse">
               <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
            </div>
            
            <h1 className="text-3xl font-light text-white mb-2 tracking-wide">System Malfunction</h1>
            <p className="text-red-300/70 text-sm font-mono mb-8 uppercase tracking-widest">Critical Rendering Error Detected</p>
            
            <div className="bg-black/40 rounded-lg p-4 mb-8 text-left border border-white/5 overflow-auto max-h-32">
               <code className="text-xs text-red-400 font-mono break-all">
                 {this.state.error?.message || "Unknown Error"}
               </code>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-red-500/20"
            >
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;