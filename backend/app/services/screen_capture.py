# backend/app/services/screen_capture.py
import asyncio
import mss
import cv2
import numpy as np
from typing import Dict, Callable, Optional, Tuple
import base64
import tkinter as tk
import threading

class ScreenCaptureService:
    def __init__(self):
        self.capture_region = None
        self.is_capturing = False
        self.capture_task = None
        
    def select_capture_region(self) -> Optional[Dict]:
        """Interactive region selection for phone mirroring area"""
        print("Click and drag to select the region to capture...")
        
        # Take screenshot for overlay
        with mss.mss() as sct:
            screenshot = sct.grab(sct.monitors[1])  # Primary monitor
            img_array = np.array(screenshot)
            img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGRA2RGB)
        
        # Region selection variables
        region_coords = {"x": 0, "y": 0, "width": 0, "height": 0}
        selection_done = threading.Event()
        
        def region_selector():
            root = tk.Tk()
            root.attributes('-fullscreen', True)
            root.attributes('-alpha', 0.3)
            root.configure(bg='red')
            root.attributes('-topmost', True)
            
            canvas = tk.Canvas(root, highlightthickness=0)
            canvas.pack(fill=tk.BOTH, expand=True)
            
            start_x = start_y = 0
            rect_id = None
            
            def start_selection(event):
                nonlocal start_x, start_y, rect_id
                start_x, start_y = event.x, event.y
                if rect_id:
                    canvas.delete(rect_id)
            
            def update_selection(event):
                nonlocal rect_id
                if rect_id:
                    canvas.delete(rect_id)
                rect_id = canvas.create_rectangle(
                    start_x, start_y, event.x, event.y, 
                    outline='white', width=2
                )
            
            def end_selection(event):
                nonlocal region_coords
                region_coords.update({
                    "x": min(start_x, event.x),
                    "y": min(start_y, event.y), 
                    "width": abs(event.x - start_x),
                    "height": abs(event.y - start_y)
                })
                root.quit()
                root.destroy()
                selection_done.set()
            
            canvas.bind("<Button-1>", start_selection)
            canvas.bind("<B1-Motion>", update_selection)
            canvas.bind("<ButtonRelease-1>", end_selection)
            
            # Instructions
            label = tk.Label(root, text="Click and drag to select capture area. Release to confirm.", 
                           bg='black', fg='white', font=('Arial', 16))
            label.pack(pady=20)
            
            root.mainloop()
        
        # Run region selector in thread
        selector_thread = threading.Thread(target=region_selector)
        selector_thread.start()
        selector_thread.join()
        
        if region_coords["width"] > 50 and region_coords["height"] > 50:
            self.capture_region = region_coords
            print(f"Region selected: {region_coords}")
            return region_coords
        else:
            print("Invalid region selected")
            return None

    async def start_capture_stream(self, callback: Callable, fps: int = 5):
        """Start capturing the selected region"""
        if not self.capture_region:
            print("No region selected. Please select a region first.")
            return
            
        self.is_capturing = True
        frame_interval = 1.0 / fps
        frame_count = 0
        
        with mss.mss() as sct:
            # Adjust region for mss format
            monitor = {
                "top": self.capture_region["y"],
                "left": self.capture_region["x"], 
                "width": self.capture_region["width"],
                "height": self.capture_region["height"]
            }
            
            while self.is_capturing:
                try:
                    # Capture frame
                    screenshot = sct.grab(monitor)
                    
                    # Convert to numpy array
                    img_array = np.array(screenshot)
                    img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGRA2RGB)
                    
                    # Encode as base64 for transmission
                    _, buffer = cv2.imencode('.jpg', img_rgb, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    img_b64 = base64.b64encode(buffer).decode()
                    
                    # Process frame through callback
                    await callback(img_rgb, img_b64, frame_count)
                    
                    frame_count += 1
                    await asyncio.sleep(frame_interval)
                    
                except Exception as e:
                    print(f"Capture error: {e}")
                    await asyncio.sleep(0.1)

    def stop_capture(self):
        """Stop the capture stream"""
        self.is_capturing = False

# Global instance
screen_capture = ScreenCaptureService()