import socketio
from app.services.ocr_service import ocr_service
from app.services.pricing_service import pricing_service
from app.services.screen_capture import screen_capture
from app.config import settings
import numpy as np
import base64
import cv2

def init_socketio(sio: socketio.AsyncServer):
    """Initialize Socket.IO event handlers"""
    
    @sio.event
    async def connect(sid, environ):
        print(f"Client connected: {sid}")
        await sio.emit('connected', {'message': 'Welcome to Sports Card Analyzer'}, to=sid)
    
    @sio.event
    async def disconnect(sid):
        print(f"Client disconnected: {sid}")
        screen_capture.stop_capture()
    
    @sio.event
    async def start_analysis(sid, data):
        """Start the analysis stream"""
        print(f"Starting analysis for client: {sid}")
        
        # Select screen region (for now, use default)
        monitor = screen_capture.select_region()
        
        if not monitor:
            await sio.emit('error', {'message': 'Failed to select screen region'}, to=sid)
            return
        
        # Start capture stream
        frame_count = 0
        
        async def process_frame(frame: np.ndarray):
            nonlocal frame_count
            frame_count += 1
            
            # Process every N frames
            if frame_count % settings.PROCESS_EVERY_N_FRAMES != 0:
                return
            
            try:
                # Send preview frame to client
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                await sio.emit('frame', {
                    'image': f'data:image/jpeg;base64,{frame_base64}',
                    'timestamp': frame_count
                }, to=sid)
                
                # Run OCR
                ocr_result = await ocr_service.extract_text(frame)
                
                if ocr_result['confidence'] > settings.OCR_CONFIDENCE_THRESHOLD:
                    # Get pricing data
                    price_data = await pricing_service.get_card_prices(
                        ocr_result['card_info']
                    )
                    
                    # Send results to client
                    await sio.emit('analysis_result', {
                        'ocr': ocr_result,
                        'pricing': price_data,
                        'timestamp': frame_count
                    }, to=sid)
                    
            except Exception as e:
                print(f"Frame processing error: {e}")
                await sio.emit('error', {'message': str(e)}, to=sid)
        
        # Start capture
        await screen_capture.start_capture_stream(
            process_frame, 
            fps=settings.CAPTURE_FPS
        )
    
    @sio.event
    async def stop_analysis(sid):
        """Stop the analysis stream"""
        print(f"Stopping analysis for client: {sid}")
        screen_capture.stop_capture()
        await sio.emit('analysis_stopped', {'message': 'Analysis stopped'}, to=sid)
