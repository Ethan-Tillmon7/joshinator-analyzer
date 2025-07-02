# backend/app/api/websocket.py
import socketio
from app.services.screen_capture import screen_capture
from app.services.ocr_service import ocr_service
from app.services.pricing_service import pricing_service
from app.services.claude_service import claude_service
from app.services.roi_calculator import roi_calculator
from app.config import settings
import cv2
import numpy as np
import re
from typing import Dict

sio = socketio.AsyncServer(cors_allowed_origins="*")

@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to card analyzer'}, to=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")
    screen_capture.stop_capture()

@sio.event
async def select_region(sid):
    """Allow client to select capture region"""
    try:
        print(f"Client {sid} selecting capture region...")
        region = screen_capture.select_capture_region()
        
        if region:
            await sio.emit('region_selected', {
                'success': True,
                'region': region,
                'message': f'Region selected: {region["width"]}x{region["height"]}'
            }, to=sid)
        else:
            await sio.emit('region_selected', {
                'success': False,
                'message': 'No valid region selected'
            }, to=sid)
            
    except Exception as e:
        await sio.emit('error', {'message': f'Region selection failed: {str(e)}'}, to=sid)

@sio.event
async def start_analysis(sid):
    """Start Whatsnot auction analysis"""
    print(f"Starting Whatsnot analysis for client: {sid}")
    
    # Check if region is selected
    if not screen_capture.capture_region:
        await sio.emit('error', {
            'message': 'Please select a capture region first'
        }, to=sid)
        return
    
    frame_count = 0
    
    async def process_frame(frame_array, frame_b64, frame_num):
        nonlocal frame_count
        frame_count += 1
        
        # Only process every N frames to reduce load
        if frame_count % settings.PROCESS_EVERY_N_FRAMES != 0:
            # Send frame for preview
            await sio.emit('frame', {
                'image': frame_b64,
                'timestamp': frame_count
            }, to=sid)
            return
        
        try:
            # Send frame for preview
            await sio.emit('frame', {
                'image': frame_b64,
                'timestamp': frame_count
            }, to=sid)
            
            # Extract text from frame using OCR
            ocr_result = ocr_service.extract_text_easyocr(frame_array)
            
            if ocr_result and ocr_result.get("text"):
                # Parse Whatsnot auction information
                card_info = parse_whatsnot_card_info(ocr_result["text"])
                auction_info = parse_whatsnot_auction_info(ocr_result["text"])
                
                # Only proceed if we have valid card info
                if card_info.get("player_name") and auction_info.get("current_bid", 0) > 0:
                    # Get pricing data
                    pricing_data = await pricing_service.get_card_prices(card_info)
                    
                    # Calculate ROI analysis
                    roi_analysis = roi_calculator.calculate_roi_analysis(
                        card_info, 
                        auction_info.get("current_bid", 0), 
                        pricing_data
                    )
                    
                    # Get Claude's analysis
                    claude_analysis = await claude_service.generate_deal_recommendation(
                        card_info, 
                        auction_info.get("current_bid", 0)
                    )
                    
                    # Send comprehensive results
                    await sio.emit('analysis_result', {
                        'card_info': card_info,
                        'auction_info': auction_info,
                        'pricing_data': pricing_data,
                        'roi_analysis': roi_analysis,
                        'claude_analysis': claude_analysis,
                        'confidence': calculate_detection_confidence(card_info, auction_info),
                        'timestamp': frame_count
                    }, to=sid)
                else:
                    # Send status update for scanning
                    if frame_count % 30 == 0:  # Every 30 frames
                        await sio.emit('status', {
                            'message': 'Scanning for cards...',
                            'ocr_text': ocr_result.get("text", ""),
                            'timestamp': frame_count
                        }, to=sid)
                    
        except Exception as e:
            print(f"Frame processing error: {e}")
            await sio.emit('error', {'message': str(e)}, to=sid)
    
    # Start capture
    try:
        await screen_capture.start_capture_stream(
            process_frame, 
            fps=settings.CAPTURE_FPS
        )
    except Exception as e:
        await sio.emit('error', {'message': f'Failed to start capture: {str(e)}'}, to=sid)

@sio.event
async def stop_analysis(sid):
    """Stop the analysis stream"""
    print(f"Stopping analysis for client: {sid}")
    screen_capture.stop_capture()
    await sio.emit('analysis_stopped', {'message': 'Analysis stopped'}, to=sid)

def parse_whatsnot_card_info(text: str) -> Dict:
    """Parse card information from Whatsnot OCR text"""
    card_info = {
        "player_name": "",
        "year": "",
        "set_name": "",
        "card_number": "",
        "grade": "",
        "grading_company": "",
        "rookie": False
    }
    
    # Extract player name (usually prominent)
    player_match = extract_player_name(text)
    if player_match:
        card_info["player_name"] = player_match
    
    # Extract year (4-digit number, usually 1950-2025)
    year_match = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', text)
    if year_match:
        card_info["year"] = year_match.group(1)
    
    # Extract grade (PSA 10, BGS 9.5, etc.)
    grade_match = re.search(r'\b(PSA|BGS|SGC)\s*(\d+(?:\.\d+)?)\b', text, re.IGNORECASE)
    if grade_match:
        card_info["grading_company"] = grade_match.group(1).upper()
        card_info["grade"] = f"{card_info['grading_company']} {grade_match.group(2)}"
    
    # Extract card number
    card_num_match = re.search(r'#(\d+)', text)
    if card_num_match:
        card_info["card_number"] = card_num_match.group(1)
    
    # Check for rookie indicators
    if any(word in text.lower() for word in ['rookie', 'rc', 'rookie card']):
        card_info["rookie"] = True
    
    # Extract set name
    set_name = extract_set_name(text)
    if set_name:
        card_info["set_name"] = set_name
        
    return card_info

def parse_whatsnot_auction_info(text: str) -> Dict:
    """Parse auction information from Whatsnot OCR text"""
    auction_info = {
        "current_bid": 0.0,
        "time_remaining": "",
        "bid_count": 0,
        "seller": ""
    }
    
    # Extract current bid ($X.XX format)
    bid_match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
    if bid_match:
        auction_info["current_bid"] = float(bid_match.group(1).replace(",", ""))
    
    # Extract time remaining
    time_match = re.search(r'(\d+[hm]|\d+:\d+)', text)
    if time_match:
        auction_info["time_remaining"] = time_match.group(1)
    
    # Extract bid count
    bid_count_match = re.search(r'(\d+)\s*bid', text, re.IGNORECASE)
    if bid_count_match:
        auction_info["bid_count"] = int(bid_count_match.group(1))
        
    return auction_info

def extract_player_name(text: str) -> str:
    """Extract player name using common patterns"""
    # Common player name patterns
    patterns = [
        r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b',  # First Last
        r'\b([A-Z]\.\s*[A-Z][a-z]+)\b',      # F. Last
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            # Filter out common non-player words
            if not any(word in match.lower() for word in ['psa', 'bgs', 'card', 'lot', 'bid', 'time']):
                return match
    
    return ""

def extract_set_name(text: str) -> str:
    """Extract set name from text"""
    common_sets = [
        'topps', 'panini', 'upper deck', 'fleer', 'donruss', 'bowman',
        'prizm', 'select', 'optic', 'mosaic', 'chronicles'
    ]
    
    text_lower = text.lower()
    for set_name in common_sets:
        if set_name in text_lower:
            # Find the full set name context
            idx = text_lower.find(set_name)
            start = max(0, idx - 20)
            end = min(len(text), idx + len(set_name) + 20)
            context = text[start:end]
            
            # Extract the likely set name
            set_match = re.search(rf'\b\w*{set_name}\w*\b', context, re.IGNORECASE)
            if set_match:
                return set_match.group(0)
    
    return ""

async def calculate_roi_analysis(card_info: Dict, current_bid: float, pricing_data: Dict) -> Dict:
    """Calculate ROI analysis for the current auction - DEPRECATED: Use roi_calculator service instead"""
    # This function is now handled by the roi_calculator service
    # Keeping for backward compatibility but should use roi_calculator.calculate_roi_analysis()
    return roi_calculator.calculate_roi_analysis(card_info, current_bid, pricing_data)

def calculate_detection_confidence(card_info: Dict, auction_info: Dict) -> float:
    """Calculate overall detection confidence"""
    confidence = 0.0
    
    # Player name is crucial
    if card_info.get("player_name"):
        confidence += 0.4
    
    # Year adds significant confidence  
    if card_info.get("year"):
        confidence += 0.2
    
    # Grade information
    if card_info.get("grade"):
        confidence += 0.2
    
    # Current bid suggests active auction
    if auction_info.get("current_bid", 0) > 0:
        confidence += 0.2
    
    return min(confidence, 1.0)