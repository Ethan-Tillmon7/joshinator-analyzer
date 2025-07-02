# backend/app/services/whatsnot_detector.py
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
import re
from .ocr_service import ocr_service

class WhatsnTCardDetector:
    def __init__(self):
        self.last_detection = None
        self.detection_confidence_threshold = 0.6
        
    def detect_card_in_frame(self, frame: np.ndarray) -> Dict:
        """
        Detect card information from Whatsnot auction frame
        Optimized for mobile app layout and common card display patterns
        """
        results = {
            "card_detected": False,
            "card_info": {},
            "auction_info": {},
            "confidence": 0.0,
            "debug_regions": []
        }
        
        try:
            # Preprocess frame for better OCR
            processed_frame = self._preprocess_whatsnot_frame(frame)
            
            # Detect different regions of Whatsnot interface
            regions = self._identify_whatsnot_regions(processed_frame)
            
            # Extract text from each region
            card_text = self._extract_text_from_regions(processed_frame, regions)
            
            # Parse card information
            card_info = self._parse_card_information(card_text)
            
            # Extract auction details
            auction_info = self._extract_auction_details(card_text)
            
            # Calculate overall confidence
            confidence = self._calculate_detection_confidence(card_info, auction_info)
            
            if confidence > self.detection_confidence_threshold:
                results.update({
                    "card_detected": True,
                    "card_info": card_info,
                    "auction_info": auction_info,
                    "confidence": confidence,
                    "debug_regions": regions
                })
                
                # Cache successful detection
                self.last_detection = results
                
        except Exception as e:
            print(f"Card detection error: {e}")
            results["error"] = str(e)
            
        return results
    
    def _preprocess_whatsnot_frame(self, frame: np.ndarray) -> np.ndarray:
        """Optimize frame for Whatsnot OCR"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Noise reduction
        denoised = cv2.medianBlur(thresh, 3)
        
        # Sharpen text
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        return sharpened
    
    def _identify_whatsnot_regions(self, frame: np.ndarray) -> Dict[str, Tuple]:
        """
        Identify key regions in Whatsnot mobile interface
        Returns regions as (y1, y2, x1, x2) tuples
        """
        height, width = frame.shape[:2]
        
        regions = {
            # Top region - usually has seller/title info
            "header": (0, int(height * 0.15), 0, width),
            
            # Card display area - center of screen  
            "card_area": (int(height * 0.15), int(height * 0.65), 0, width),
            
            # Bottom region - current bid, time remaining
            "auction_details": (int(height * 0.65), int(height * 0.85), 0, width),
            
            # Very bottom - buttons and controls
            "controls": (int(height * 0.85), height, 0, width),
            
            # Side regions for additional info
            "left_side": (int(height * 0.2), int(height * 0.8), 0, int(width * 0.25)),
            "right_side": (int(height * 0.2), int(height * 0.8), int(width * 0.75), width)
        }
        
        return regions
    
    def _extract_text_from_regions(self, frame: np.ndarray, regions: Dict) -> Dict:
        """Extract text from each identified region"""
        text_results = {}
        
        for region_name, (y1, y2, x1, x2) in regions.items():
            try:
                # Extract region
                region_img = frame[y1:y2, x1:x2]
                
                if region_img.size > 0:
                    # Run OCR on region
                    text_result = ocr_service.extract_text_easyocr(region_img)
                    text_results[region_name] = text_result.get("text", "")
                else:
                    text_results[region_name] = ""
                    
            except Exception as e:
                print(f"Error extracting text from {region_name}: {e}")
                text_results[region_name] = ""
                
        return text_results
    
    def _parse_card_information(self, text_data: Dict) -> Dict:
        """Parse card information from extracted text"""
        card_info = {
            "player_name": "",
            "year": "",
            "set_name": "",
            "card_number": "",
            "grade": "",
            "grading_company": "",
            "parallel": "",
            "rookie": False
        }
        
        # Combine relevant text regions
        combined_text = " ".join([
            text_data.get("header", ""),
            text_data.get("card_area", ""),
            text_data.get("auction_details", "")
        ])
        
        # Extract player name (usually prominent in header/card area)
        player_match = self._extract_player_name(combined_text)
        if player_match:
            card_info["player_name"] = player_match
        
        # Extract year (4-digit number, usually 1950-2025)
        year_match = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', combined_text)
        if year_match:
            card_info["year"] = year_match.group(1)
        
        # Extract grade (PSA 10, BGS 9.5, etc.)
        grade_match = re.search(r'\b(PSA|BGS|SGC)\s*(\d+(?:\.\d+)?)\b', combined_text, re.IGNORECASE)
        if grade_match:
            card_info["grading_company"] = grade_match.group(1).upper()
            card_info["grade"] = f"{card_info['grading_company']} {grade_match.group(2)}"
        
        # Extract card number
        card_num_match = re.search(r'#(\d+)', combined_text)
        if card_num_match:
            card_info["card_number"] = card_num_match.group(1)
        
        # Check for rookie indicators
        if any(word in combined_text.lower() for word in ['rookie', 'rc', 'rookie card']):
            card_info["rookie"] = True
        
        # Extract set name (more complex, often in header)
        set_name = self._extract_set_name(text_data.get("header", ""))
        if set_name:
            card_info["set_name"] = set_name
            
        return card_info
    
    def _extract_auction_details(self, text_data: Dict) -> Dict:
        """Extract auction-specific information"""
        auction_info = {
            "current_bid": 0.0,
            "time_remaining": "",
            "bid_count": 0,
            "seller": "",
            "starting_bid": 0.0
        }
        
        auction_text = text_data.get("auction_details", "")
        
        # Extract current bid ($X.XX format)
        bid_match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', auction_text)
        if bid_match:
            auction_info["current_bid"] = float(bid_match.group(1).replace(",", ""))
        
        # Extract time remaining
        time_match = re.search(r'(\d+[hm]|\d+:\d+)', auction_text)
        if time_match:
            auction_info["time_remaining"] = time_match.group(1)
        
        # Extract bid count
        bid_count_match = re.search(r'(\d+)\s*bid', auction_text, re.IGNORECASE)
        if bid_count_match:
            auction_info["bid_count"] = int(bid_count_match.group(1))
            
        return auction_info
    
    def _extract_player_name(self, text: str) -> Optional[str]:
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
                if not any(word in match.lower() for word in ['psa', 'bgs', 'card', 'lot']):
                    return match
        
        return None
    
    def _extract_set_name(self, text: str) -> Optional[str]:
        """Extract set name from header text"""
        # Common set name patterns
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
        
        return None
    
    def _calculate_detection_confidence(self, card_info: Dict, auction_info: Dict) -> float:
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

# Global instance
whatsnot_detector = WhatsnTCardDetector()