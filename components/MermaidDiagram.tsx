import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: 'transparent',
        primaryColor: '#18181b', // zinc-900
        primaryTextColor: '#fff',
        primaryBorderColor: '#06b6d4', // cyan-500
        lineColor: '#a1a1aa', // zinc-400
        secondaryColor: '#000',
        tertiaryColor: '#fff',
        mainBkg: 'transparent',
        nodeBorder: '#06b6d4',
        clusterBkg: 'rgba(255,255,255,0.05)',
        clusterBorder: '#06b6d4',
        titleColor: '#fff',
        edgeLabelBackground: '#000',
      }
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(true);
        // Clean up mermaid text output if it failed
        const errorElement = document.querySelector(`#d${containerRef.current.id}`);
        if (errorElement) errorElement.remove();
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 border border-red-500/30 rounded bg-red-500/10 text-red-200 text-xs font-mono">
        Failed to render visualization.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full flex justify-center p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;