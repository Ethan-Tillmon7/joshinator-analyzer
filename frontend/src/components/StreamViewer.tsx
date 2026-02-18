import React, { useEffect, useRef } from 'react';

export interface StreamViewerProps {
  frameData: { image: string; timestamp: number } | null;
  isAnalyzing: boolean;
  regionSelected: boolean;
}

const StreamViewer: React.FC<StreamViewerProps> = ({ frameData, isAnalyzing, regionSelected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (frameData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = frameData.image;
      }
    }
  }, [frameData]);

  if (!frameData) {
    let icon: string;
    let message: string;

    if (isAnalyzing) {
      icon = '⏳';
      message = 'Waiting for frames...';
    } else if (regionSelected) {
      icon = '▶';
      message = 'Click Start Analysis to begin streaming';
    } else {
      icon = '📍';
      message = 'Select a region to get started';
    }

    return (
      <div className="stream-viewer">
        <div className="stream-placeholder">
          <span className="stream-placeholder-icon">{icon}</span>
          <p className="stream-placeholder-text">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stream-viewer">
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', borderRadius: '8px' }}
      />
    </div>
  );
};

export default StreamViewer;
