import React, { useEffect, useRef } from 'react';

interface StreamViewerProps {
  frameData: { image: string; timestamp: number } | null;
}

const StreamViewer: React.FC<StreamViewerProps> = ({ frameData }) => {
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
  
  return (
    <div className="stream-viewer">
      <h3>Live Stream</h3>
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxWidth: '100%', 
          border: '2px solid #ccc',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default StreamViewer;
