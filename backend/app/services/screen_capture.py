# backend/app/services/screen_capture.py
# Modified version that works without tkinter

import asyncio
import base64
import io
import time
from typing import Dict, Optional, Callable, Any
import cv2
import numpy as np
import mss
from PIL import Image, ImageTk

class ScreenCaptureService:
    def __init__(self):
        self.capture_region: Optional[Dict] = None
        self.is_capturing = False
        self.sct = mss.mss()
        self.default_region = {"top": 100, "left": 100, "width": 800, "height": 600}
        
    def select_capture_region(self) -> Optional[Dict]:
        """
        For headless mode, return a default region.
        In production, this would open a region selector UI.
        """
        print("⚠️  Using default capture region (headless mode)")
        print("📍 Default region: 800x600 at (100, 100)")
        print("💡 To customize, modify the default_region in the code")
        
        # Use default region for now
        self.capture_region = self.default_region.copy()
        return self.capture_region
    
    def set_custom_region(self, top: int, left: int, width: int, height: int) -> Dict:
        """
        Manually set capture region without UI
        """
        self.capture_region = {
            "top": top,
            "left": left, 
            "width": width,
            "height": height
        }
        print(f"📍 Custom region set: {width}x{height} at ({left}, {top})")
        return self.capture_region
    
    def capture_frame(self) -> Optional[np.ndarray]:
        """Capture a single frame from the selected region"""
        if not self.capture_region:
            print("❌ No capture region selected")
            return None
            
        try:
            # Capture screen region
            screenshot = self.sct.grab(self.capture_region)
            
            # Convert to numpy array
            frame = np.array(screenshot)
            
            # Convert BGRA to RGB (mss returns BGRA)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2RGB)
            
            return frame
            
        except Exception as e:
            print(f"❌ Frame capture failed: {e}")
            return None
    
    def frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert frame to base64 string for transmission"""
        try:
            # Convert to PIL Image
            pil_image = Image.fromarray(frame)
            
            # Convert to base64
            buffer = io.BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/jpeg;base64,{img_str}"
            
        except Exception as e:
            print(f"❌ Base64 conversion failed: {e}")
            return ""
    
    async def start_capture_stream(self, process_callback: Callable, fps: int = 5):
        """Start continuous capture stream"""
        if not self.capture_region:
            raise Exception("No capture region selected")
        
        self.is_capturing = True
        frame_interval = 1.0 / fps
        frame_count = 0
        
        print(f"🎬 Starting capture stream at {fps} FPS")
        print(f"📍 Region: {self.capture_region}")
        
        try:
            while self.is_capturing:
                start_time = time.time()
                
                # Capture frame
                frame = self.capture_frame()
                
                if frame is not None:
                    frame_count += 1
                    
                    # Convert to base64 for transmission
                    frame_b64 = self.frame_to_base64(frame)
                    
                    # Call processing callback
                    if process_callback:
                        await process_callback(frame, frame_b64, frame_count)
                
                # Maintain frame rate
                elapsed = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                else:
                    # If we're running behind, yield control briefly
                    await asyncio.sleep(0.001)
                    
        except Exception as e:
            print(f"❌ Capture stream error: {e}")
            raise
        finally:
            self.is_capturing = False
            print("🛑 Capture stream stopped")
    
    def stop_capture(self):
        """Stop the capture stream"""
        self.is_capturing = False
        print("🛑 Stopping capture...")
    
    def get_screen_info(self) -> Dict:
        """Get information about available screens"""
        monitors = self.sct.monitors
        return {
            "primary_monitor": monitors[0],  # First monitor is the "all monitors" combined
            "monitors": monitors[1:],        # Individual monitors
            "total_monitors": len(monitors) - 1
        }
    
    def list_windows(self) -> Dict:
        """
        Placeholder for window detection.
        In a full implementation, this would list application windows
        for more precise region selection.
        """
        return {
            "message": "Window detection not implemented in headless mode",
            "suggestion": "Use set_custom_region() to specify coordinates manually"
        }

# Create singleton instance
screen_capture = ScreenCaptureService()


class VODReplayService:
    """Replay a recorded video file through the same analysis pipeline as live capture."""

    def __init__(self):
        self._is_replaying = False
        self._video_path: Optional[str] = None

    def load_video(self, video_path: str) -> dict:
        """Validate the video file and return metadata."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            cap.release()
            return {"success": False, "error": f"Cannot open video: {video_path}"}

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        duration = frame_count / fps
        cap.release()

        self._video_path = video_path
        return {
            "success": True,
            "frame_count": frame_count,
            "fps": fps,
            "duration_seconds": duration,
        }

    async def start_replay_stream(self, process_callback: Callable, target_fps: int = 5) -> None:
        """Read frames from the loaded video and push them through process_callback."""
        if not self._video_path:
            raise RuntimeError("No video loaded — call load_video() first")

        cap = cv2.VideoCapture(self._video_path)
        if not cap.isOpened():
            cap.release()
            raise RuntimeError(f"Cannot open video: {self._video_path}")

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_skip = max(1, int(video_fps / target_fps))
        frame_interval = 1.0 / target_fps

        self._is_replaying = True
        frame_num = 0

        try:
            while self._is_replaying:
                ret, bgr_frame = cap.read()
                if not ret:
                    break  # end of video

                frame_num += 1
                if frame_num % frame_skip != 0:
                    continue

                # BGR → RGB (same as live capture)
                rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
                frame_b64 = screen_capture.frame_to_base64(rgb_frame)

                start = asyncio.get_event_loop().time()
                await process_callback(rgb_frame, frame_b64, frame_num)
                elapsed = asyncio.get_event_loop().time() - start
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time:
                    await asyncio.sleep(sleep_time)
                else:
                    await asyncio.sleep(0)
        finally:
            cap.release()
            self._is_replaying = False

    def stop_replay(self) -> None:
        self._is_replaying = False


vod_replay = VODReplayService()

# Helper functions for easy usage
def setup_whatsnot_region():
    """Setup a region optimized for Whatsnot streams"""
    # Common Whatsnot window dimensions (adjust as needed)
    return screen_capture.set_custom_region(
        top=50,      # Adjust based on browser toolbar
        left=100,    # Adjust based on browser sidebar
        width=1200,  # Whatsnot stream width
        height=800   # Whatsnot stream height
    )

def setup_fullscreen_region():
    """Setup full screen capture"""
    screen_info = screen_capture.get_screen_info()
    primary = screen_info["primary_monitor"]
    
    return screen_capture.set_custom_region(
        top=0,
        left=0,
        width=primary["width"],
        height=primary["height"]
    )

if __name__ == "__main__":
    # Test the screen capture
    print("🧪 Testing screen capture service...")
    
    # Setup region
    region = setup_whatsnot_region()
    print(f"📍 Test region: {region}")
    
    # Capture a test frame
    frame = screen_capture.capture_frame()
    
    if frame is not None:
        print(f"✅ Test capture successful! Frame shape: {frame.shape}")
        
        # Save test image
        test_image = Image.fromarray(frame)
        test_image.save("test_capture.jpg")
        print("💾 Test image saved as 'test_capture.jpg'")
    else:
        print("❌ Test capture failed!")