import mss
import numpy as np
from PIL import Image
import asyncio
from typing import Optional, Tuple

class ScreenCaptureService:
    def __init__(self):
        self.sct = mss.mss()
        self.monitor = None
        self.is_capturing = False
        
    def select_region(self) -> Optional[dict]:
        """Allow user to select screen region (implement UI for this)"""
        # For now, capture primary monitor
        # In production, implement a region selector
        self.monitor = self.sct.monitors[1]  # Primary monitor
        return self.monitor
    
    async def capture_frame(self) -> Optional[np.ndarray]:
        """Capture a single frame from selected region"""
        if not self.monitor:
            return None
            
        try:
            # Capture screen
            screenshot = self.sct.grab(self.monitor)
            
            # Convert to numpy array
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
            frame = np.array(img)
            
            return frame
        except Exception as e:
            print(f"Capture error: {e}")
            return None
    
    async def start_capture_stream(self, callback, fps: int = 5):
        """Start continuous capture stream"""
        self.is_capturing = True
        interval = 1.0 / fps
        
        while self.is_capturing:
            frame = await self.capture_frame()
            if frame is not None:
                await callback(frame)
            await asyncio.sleep(interval)
    
    def stop_capture(self):
        """Stop capture stream"""
        self.is_capturing = False

screen_capture = ScreenCaptureService()
