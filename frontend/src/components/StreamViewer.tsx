import React, { useEffect, useRef } from 'react';

export interface StreamViewerProps {
  frameData: { image: string; timestamp: number } | null;
  isAnalyzing: boolean;
  regionSelected: boolean;
  // thumb: the lower-third aim check · preview: the larger frame in the setup plate
  variant?: 'thumb' | 'preview';
}

const StreamViewer: React.FC<StreamViewerProps> = ({ frameData, isAnalyzing, regionSelected, variant = 'thumb' }) => {
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
    const message = isAnalyzing
      ? 'Waiting for frames'
      : regionSelected
        ? 'Feed starts with Start'
        : 'No region set';

    return (
      <div className={`stream-viewer stream-viewer-${variant} is-empty`}>
        <span className="stream-empty-text">{variant === 'thumb' ? 'No feed' : message}</span>
      </div>
    );
  }

  return (
    <div className={`stream-viewer stream-viewer-${variant}`}>
      <canvas ref={canvasRef} aria-label="Latest captured frame from the selected screen region" role="img" />
    </div>
  );
};

export default StreamViewer;
