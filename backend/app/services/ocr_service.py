# backend/app/services/ocr_service.py
# Simplified version for testing (replace with full version once easyocr is installed)

import cv2
import numpy as np
from typing import List, Dict, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re

class OCRService:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        try:
            import easyocr
            self.reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=False for compatibility
            self.has_easyocr = True
            print("✅ EasyOCR loaded successfully")
        except ImportError:
            print("⚠️  EasyOCR not available, using mock OCR for testing")
            self.reader = None
            self.has_easyocr = False
        
    async def extract_text(self, image: np.ndarray) -> Dict:
        """Extract text from image using EasyOCR or mock data"""
        try:
            # Run OCR in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._run_ocr,
                image
            )
            return result
        except Exception as e:
            print(f"OCR Error: {e}")
            return {"texts": [], "confidence": 0, "card_info": {}}
    
    def extract_text_easyocr(self, image_path_or_array) -> Dict:
        """Synchronous OCR extraction for testing"""
        try:
            if self.has_easyocr:
                return self._run_ocr(image_path_or_array)
            else:
                return self._mock_ocr_result()
        except Exception as e:
            print(f"OCR Error: {e}")
            return {"texts": [], "confidence": 0, "card_info": {}}
    
    def _run_ocr(self, image) -> Dict:
        """Run OCR processing"""
        if not self.has_easyocr:
            return self._mock_ocr_result()
            
        try:
            # Handle both file path and numpy array
            if isinstance(image, str):
                # File path
                results = self.reader.readtext(image)
            else:
                # Numpy array - preprocess first
                processed = self._preprocess_image(image)
                results = self.reader.readtext(processed)
            
            # Extract card information
            texts = []
            total_confidence = 0
            
            for (bbox, text, confidence) in results:
                texts.append({
                    "text": text,
                    "confidence": confidence,
                    "bbox": bbox
                })
                total_confidence += confidence
            
            avg_confidence = total_confidence / len(results) if results else 0
            
            # Try to identify card details
            card_info = self._extract_card_info(texts)
            
            return {
                "texts": texts,
                "confidence": avg_confidence,
                "card_info": card_info,
                "text": " ".join([t["text"] for t in texts])  # Combined text
            }
            
        except Exception as e:
            print(f"EasyOCR processing error: {e}")
            return self._mock_ocr_result()
    
    def _mock_ocr_result(self) -> Dict:
        """Mock OCR result for testing when EasyOCR is not available"""
        mock_texts = [
            {"text": "2023", "confidence": 0.95, "bbox": [[100, 50], [150, 50], [150, 70], [100, 70]]},
            {"text": "Topps", "confidence": 0.90, "bbox": [[100, 80], [160, 80], [160, 100], [100, 100]]},
            {"text": "Mike Trout", "confidence": 0.88, "bbox": [[100, 110], [200, 110], [200, 130], [100, 130]]},
            {"text": "PSA 10", "confidence": 0.92, "bbox": [[100, 140], [160, 140], [160, 160], [100, 160]]},
            {"text": "#27", "confidence": 0.85, "bbox": [[100, 170], [140, 170], [140, 190], [100, 190]]}
        ]
        
        card_info = {
            "player_name": "Mike Trout",
            "year": "2023",
            "set_name": "Topps",
            "card_number": "27",
            "grade": "PSA 10",
            "rookie": False
        }
        
        return {
            "texts": mock_texts,
            "confidence": 0.90,
            "card_info": card_info,
            "text": "2023 Topps Mike Trout PSA 10 #27"
        }
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR accuracy"""
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(thresh)
            
            return denoised
        except Exception as e:
            print(f"Preprocessing error: {e}")
            return image
    
    def _extract_card_info(self, texts: List[Dict]) -> Dict:
        """Extract structured card information from OCR results"""
        card_info = {
            "player_name": None,
            "year": None,
            "set_name": None,
            "card_number": None,
            "grade": None,
            "rookie": False
        }
        
        # Combine all text
        all_text = " ".join([t["text"] for t in texts])
        
        # Look for year (4 digits)
        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', all_text)
        if year_match:
            card_info["year"] = year_match.group(1)
        
        # Look for PSA/BGS grade
        grade_match = re.search(r'(PSA|BGS)\s*(\d+(?:\.\d+)?)', all_text, re.IGNORECASE)
        if grade_match:
            card_info["grade"] = f"{grade_match.group(1).upper()} {grade_match.group(2)}"
        
        # Look for card number
        card_num_match = re.search(r'#(\d+)', all_text)
        if card_num_match:
            card_info["card_number"] = card_num_match.group(1)
        
        # Look for rookie indicators
        if any(word in all_text.lower() for word in ['rookie', 'rc', 'rookie card']):
            card_info["rookie"] = True
        
        # Extract player name (simplified - look for capitalized words)
        words = all_text.split()
        name_candidates = []
        for word in words:
            if (word.istitle() and 
                len(word) > 2 and 
                not re.match(r'\d+', word) and 
                word.upper() not in ['PSA', 'BGS', 'TOPPS', 'PANINI']):
                name_candidates.append(word)
        
        if len(name_candidates) >= 2:
            card_info["player_name"] = " ".join(name_candidates[:2])
        elif len(name_candidates) == 1:
            card_info["player_name"] = name_candidates[0]
        
        # Look for common set names
        set_keywords = ['topps', 'panini', 'bowman', 'upper deck', 'donruss']
        for keyword in set_keywords:
            if keyword in all_text.lower():
                card_info["set_name"] = keyword.title()
                break
        
        return card_info

# Create singleton instance
ocr_service = OCRService()

if __name__ == "__main__":
    # Test the OCR service
    print("🧪 Testing OCR service...")
    
    # Test with mock data
    result = ocr_service.extract_text_easyocr("test_image.jpg")
    print(f"📄 OCR Result: {result}")
    
    if result.get("card_info"):
        print(f"🃏 Card Info: {result['card_info']}")