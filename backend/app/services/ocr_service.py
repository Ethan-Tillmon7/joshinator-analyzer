import easyocr
import cv2
import numpy as np
from typing import List, Dict, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

class OCRService:
    def __init__(self):
        # Initialize EasyOCR reader
        self.reader = easyocr.Reader(['en'], gpu=True)
        self.executor = ThreadPoolExecutor(max_workers=2)
        
    async def extract_text(self, image: np.ndarray) -> Dict:
        """Extract text from image using EasyOCR"""
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
            return {"texts": [], "confidence": 0}
    
    def _run_ocr(self, image: np.ndarray) -> Dict:
        """Run OCR processing"""
        # Preprocess image
        processed = self._preprocess_image(image)
        
        # Run EasyOCR
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
            "card_info": card_info
        }
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR accuracy"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(thresh)
        
        return denoised
    
    def _extract_card_info(self, texts: List[Dict]) -> Dict:
        """Extract structured card information from OCR results"""
        card_info = {
            "player_name": None,
            "year": None,
            "set_name": None,
            "card_number": None,
            "grade": None
        }
        
        # Simple extraction logic - enhance this based on your needs
        all_text = " ".join([t["text"] for t in texts])
        
        # Look for year (4 digits)
        import re
        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', all_text)
        if year_match:
            card_info["year"] = year_match.group(1)
        
        # Look for PSA grade
        grade_match = re.search(r'PSA\s*(\d+)', all_text, re.IGNORECASE)
        if grade_match:
            card_info["grade"] = f"PSA {grade_match.group(1)}"
        
        # Extract player name (this is simplified - enhance as needed)
        # You might want to use a database of known player names
        words = all_text.split()
        if len(words) >= 2:
            card_info["player_name"] = " ".join(words[:2])
        
        return card_info

ocr_service = OCRService()
