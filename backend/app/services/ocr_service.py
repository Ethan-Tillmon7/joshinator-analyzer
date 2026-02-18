import cv2
import numpy as np
from typing import List, Dict
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re


class OCRService:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.ocr_engine = "mock"
        self.paddle_reader = None
        self.easy_reader = None

        try:
            from paddleocr import PaddleOCR
            self.paddle_reader = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            self.ocr_engine = "paddleocr"
            print("✅ PaddleOCR loaded successfully")
        except Exception:
            try:
                import easyocr
                self.easy_reader = easyocr.Reader(['en'], gpu=False)
                self.ocr_engine = "easyocr"
                print("✅ EasyOCR loaded successfully (PaddleOCR unavailable)")
            except ImportError:
                print("⚠️  No OCR engine available, using mock OCR for testing")

    # ------------------------------------------------------------------
    # Public async API
    # ------------------------------------------------------------------

    async def extract_text(self, image: np.ndarray) -> Dict:
        """Extract text from a full image (single-region, kept for back-compat)."""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(self.executor, self._run_ocr, image)
        except Exception as e:
            print(f"OCR Error: {e}")
            return {"texts": [], "confidence": 0, "card_info": {}, "text": "", "ocr_engine": self.ocr_engine}

    async def extract_text_dual_region(self, image: np.ndarray) -> Dict:
        """
        Run OCR on the title and bid regions separately, then merge.

        Title crop (top 20%): card name, year, set, grade.
        Bid crop   (bottom 25%): current bid, timer.
        """
        loop = asyncio.get_event_loop()
        title_crop = self._crop_title_region(image)
        bid_crop = self._crop_bid_region(image)

        title_result, bid_result = await asyncio.gather(
            loop.run_in_executor(self.executor, self._run_ocr, title_crop),
            loop.run_in_executor(self.executor, self._run_ocr, bid_crop),
        )

        merged_texts = title_result["texts"] + bid_result["texts"]
        merged_text = title_result["text"] + " " + bid_result["text"]
        combined_confidence = (title_result["confidence"] + bid_result["confidence"]) / 2
        card_info = self._extract_card_info(merged_texts)

        return {
            "texts": merged_texts,
            "confidence": combined_confidence,
            "card_info": card_info,
            "text": merged_text.strip(),
            "ocr_engine": self.ocr_engine,
        }

    def extract_text_easyocr(self, image_path_or_array) -> Dict:
        """Synchronous extraction — kept for back-compat and testing."""
        try:
            return self._run_ocr(image_path_or_array)
        except Exception as e:
            print(f"OCR Error: {e}")
            return {"texts": [], "confidence": 0, "card_info": {}, "text": "", "ocr_engine": self.ocr_engine}

    # ------------------------------------------------------------------
    # Region cropping
    # ------------------------------------------------------------------

    def _crop_title_region(self, image: np.ndarray) -> np.ndarray:
        """Top 20% of the frame — card name, year, set, grade."""
        h = image.shape[0]
        return image[0:int(h * 0.20), :]

    def _crop_bid_region(self, image: np.ndarray) -> np.ndarray:
        """Bottom 25% of the frame — current bid, timer."""
        h = image.shape[0]
        return image[int(h * 0.75):, :]

    # ------------------------------------------------------------------
    # Engine dispatch
    # ------------------------------------------------------------------

    def _run_ocr(self, image) -> Dict:
        if self.ocr_engine == "paddleocr":
            try:
                return self._run_paddle_ocr(image)
            except Exception as e:
                print(f"PaddleOCR error, falling back: {e}")
                if self.easy_reader:
                    return self._run_easy_ocr(image)
        elif self.ocr_engine == "easyocr":
            return self._run_easy_ocr(image)
        return self._mock_ocr_result()

    def _run_paddle_ocr(self, image) -> Dict:
        """Run PaddleOCR and normalise output to the shared dict shape."""
        if isinstance(image, str):
            raw = self.paddle_reader.ocr(image, cls=True)
        else:
            processed = self._preprocess_image(image)
            raw = self.paddle_reader.ocr(processed, cls=True)

        texts = []
        total_confidence = 0.0

        # PaddleOCR returns [[ [box, (text, score)], ... ]] — one list per page
        for page in (raw or []):
            if page is None:
                continue
            for item in page:
                box, (text, score) = item
                texts.append({"text": text, "confidence": score, "bbox": box})
                total_confidence += score

        avg_confidence = total_confidence / len(texts) if texts else 0.0
        card_info = self._extract_card_info(texts)

        return {
            "texts": texts,
            "confidence": avg_confidence,
            "card_info": card_info,
            "text": " ".join(t["text"] for t in texts),
            "ocr_engine": "paddleocr",
        }

    def _run_easy_ocr(self, image) -> Dict:
        """Run EasyOCR and normalise output to the shared dict shape."""
        if isinstance(image, str):
            results = self.easy_reader.readtext(image)
        else:
            processed = self._preprocess_image(image)
            results = self.easy_reader.readtext(processed)

        texts = []
        total_confidence = 0.0

        for (bbox, text, confidence) in results:
            texts.append({"text": text, "confidence": confidence, "bbox": bbox})
            total_confidence += confidence

        avg_confidence = total_confidence / len(results) if results else 0.0
        card_info = self._extract_card_info(texts)

        return {
            "texts": texts,
            "confidence": avg_confidence,
            "card_info": card_info,
            "text": " ".join(t["text"] for t in texts),
            "ocr_engine": "easyocr",
        }

    def _mock_ocr_result(self) -> Dict:
        """Mock result for testing when no OCR engine is available."""
        mock_texts = [
            {"text": "2023", "confidence": 0.95, "bbox": [[100, 50], [150, 50], [150, 70], [100, 70]]},
            {"text": "Topps", "confidence": 0.90, "bbox": [[100, 80], [160, 80], [160, 100], [100, 100]]},
            {"text": "Mike Trout", "confidence": 0.88, "bbox": [[100, 110], [200, 110], [200, 130], [100, 130]]},
            {"text": "PSA 10", "confidence": 0.92, "bbox": [[100, 140], [160, 140], [160, 160], [100, 160]]},
            {"text": "#27", "confidence": 0.85, "bbox": [[100, 170], [140, 170], [140, 190], [100, 190]]},
        ]
        card_info = {
            "player_name": "Mike Trout",
            "year": "2023",
            "set_name": "Topps",
            "card_number": "27",
            "grade": "PSA 10",
            "rookie": False,
        }
        return {
            "texts": mock_texts,
            "confidence": 0.90,
            "card_info": card_info,
            "text": "2023 Topps Mike Trout PSA 10 #27",
            "ocr_engine": "mock",
        }

    # ------------------------------------------------------------------
    # Pre-processing
    # ------------------------------------------------------------------

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Grayscale + adaptive threshold + denoise for better OCR accuracy."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            return cv2.fastNlMeansDenoising(thresh)
        except Exception as e:
            print(f"Preprocessing error: {e}")
            return image

    # ------------------------------------------------------------------
    # Attribute extraction (shared by all engines)
    # ------------------------------------------------------------------

    def _extract_card_info(self, texts: List[Dict]) -> Dict:
        """Extract structured card attributes from a list of OCR text results."""
        card_info = {
            "player_name": None,
            "year": None,
            "set_name": None,
            "card_number": None,
            "grade": None,
            "rookie": False,
        }

        all_text = " ".join(t["text"] for t in texts)

        year_match = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', all_text)
        if year_match:
            card_info["year"] = year_match.group(1)

        grade_match = re.search(r'\b(PSA|BGS|SGC)\s*(\d+(?:\.\d+)?)\b', all_text, re.IGNORECASE)
        if grade_match:
            card_info["grade"] = f"{grade_match.group(1).upper()} {grade_match.group(2)}"

        card_num_match = re.search(r'#(\d+)', all_text)
        if card_num_match:
            card_info["card_number"] = card_num_match.group(1)

        if any(w in all_text.lower() for w in ['rookie', 'rc', 'rookie card']):
            card_info["rookie"] = True

        words = all_text.split()
        name_candidates = [
            w for w in words
            if w.istitle()
            and len(w) > 2
            and not re.match(r'\d+', w)
            and w.upper() not in {'PSA', 'BGS', 'SGC', 'TOPPS', 'PANINI', 'BOWMAN'}
        ]
        if len(name_candidates) >= 2:
            card_info["player_name"] = " ".join(name_candidates[:2])
        elif name_candidates:
            card_info["player_name"] = name_candidates[0]

        for kw in ['topps', 'panini', 'bowman', 'upper deck', 'donruss']:
            if kw in all_text.lower():
                card_info["set_name"] = kw.title()
                break

        return card_info


# Singleton
ocr_service = OCRService()
