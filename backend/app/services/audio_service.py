"""
Audio capture and transcription service.

Captures system audio in 7-second chunks, transcribes via Whisper (base model),
and extracts sports card attributes from the auctioneer's commentary.

macOS setup: brew install portaudio && pip install pyaudio sounddevice
"""
import logging
import queue
import re
import threading
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Card set keywords used for extraction
_SET_KEYWORDS: List[str] = [
    'topps', 'panini', 'bowman', 'prizm', 'select', 'optic',
    'donruss', 'upper deck', 'fleer', 'mosaic', 'chronicles',
]


class AudioService:
    CHUNK_DURATION_SECONDS = 7
    SAMPLE_RATE = 16000  # Whisper expects 16 kHz
    CHANNELS = 1

    def __init__(self):
        self.whisper_model = None
        self._audio_queue: queue.Queue = queue.Queue(maxsize=4)
        self._is_running = False
        self._capture_thread: Optional[threading.Thread] = None
        self._process_thread: Optional[threading.Thread] = None

        # Latest results — read by the websocket pipeline
        self.latest_transcript: Optional[str] = None
        self.latest_attributes: Dict = {}
        self.audio_confidence: float = 0.0

        self._load_whisper()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def _load_whisper(self) -> None:
        try:
            import whisper
            self.whisper_model = whisper.load_model("base")
            logger.info("Whisper model loaded (base)")
        except Exception as e:
            logger.warning("openai-whisper not available — audio features disabled: %s", e)

    def is_available(self) -> bool:
        return self.whisper_model is not None

    def start(self) -> None:
        if not self.is_available():
            logger.warning("AudioService.start() called but Whisper not loaded — skipping")
            return
        if self._is_running:
            return
        self._is_running = True
        self._capture_thread = threading.Thread(
            target=self._capture_loop, daemon=True, name="audio-capture"
        )
        self._process_thread = threading.Thread(
            target=self._process_loop, daemon=True, name="audio-process"
        )
        self._capture_thread.start()
        self._process_thread.start()
        logger.info("AudioService started")

    def stop(self) -> None:
        self._is_running = False
        logger.info("AudioService stopped")

    # ------------------------------------------------------------------
    # Audio capture thread
    # ------------------------------------------------------------------

    def _capture_loop(self) -> None:
        """Continuously capture CHUNK_DURATION_SECONDS of audio and enqueue it."""
        try:
            import sounddevice as sd
            import numpy as np

            while self._is_running:
                try:
                    chunk = sd.rec(
                        int(self.CHUNK_DURATION_SECONDS * self.SAMPLE_RATE),
                        samplerate=self.SAMPLE_RATE,
                        channels=self.CHANNELS,
                        dtype="float32",
                    )
                    sd.wait()
                    # Non-blocking put; drop if queue is full (processing can't keep up)
                    try:
                        self._audio_queue.put_nowait(chunk)
                    except queue.Full:
                        pass
                except Exception as e:
                    logger.error("Audio capture error: %s", e)
                    if self._is_running:
                        import time; time.sleep(1)

        except ImportError:
            logger.error("sounddevice not installed — audio capture disabled")
            self._is_running = False

    # ------------------------------------------------------------------
    # Transcription thread
    # ------------------------------------------------------------------

    def _process_loop(self) -> None:
        """Pull audio chunks, transcribe with Whisper, extract card attributes."""
        while self._is_running:
            try:
                chunk = self._audio_queue.get(timeout=2)
                audio_flat = chunk.flatten()
                result = self.whisper_model.transcribe(
                    audio_flat, language="en", fp16=False
                )
                transcript: str = result.get("text", "").strip()
                if transcript:
                    self.latest_transcript = transcript
                    self.latest_attributes = self._extract_attributes(transcript)
                    self.audio_confidence = self._score_confidence(self.latest_attributes)
                    logger.debug(
                        "Audio transcript: %s | confidence: %.2f",
                        transcript[:80], self.audio_confidence
                    )
            except queue.Empty:
                continue
            except Exception as e:
                logger.error("Audio processing error: %s", e)

    # ------------------------------------------------------------------
    # Attribute extraction
    # ------------------------------------------------------------------

    def _extract_attributes(self, text: str) -> Dict:
        """Extract structured card attributes from a Whisper transcript."""
        attrs: Dict = {}
        lower = text.lower()

        # Grade — PSA / BGS / SGC + numeric
        grade_match = re.search(
            r'\b(psa|bgs|sgc)\s*(\d+(?:\.\d+)?)\b', lower
        )
        if grade_match:
            company = grade_match.group(1).upper()
            value = grade_match.group(2)
            attrs["grade"] = f"{company} {value}"
            attrs["grading_company"] = company

        # Year
        year_match = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', text)
        if year_match:
            attrs["year"] = year_match.group(1)

        # Set name
        for kw in _SET_KEYWORDS:
            if kw in lower:
                attrs["set_name"] = kw.title()
                break

        # Rookie flag
        if any(w in lower for w in ("rookie", "rookie card", " rc ")):
            attrs["rookie"] = True

        # Spoken bid — auctioneer reads the price aloud ("forty dollars", "$40", "40 bucks")
        # Match plain numbers that could be prices (1–4 digits, optionally decimal)
        bid_match = re.search(r'\$?\b(\d{1,4}(?:\.\d{2})?)\b', text)
        if bid_match:
            candidate = float(bid_match.group(1))
            # Filter out years and card numbers (if value looks like a year it's probably not a bid)
            if not re.match(r'^(19|20)\d{2}$', bid_match.group(1)):
                attrs["spoken_bid"] = candidate

        return attrs

    def _score_confidence(self, attrs: Dict) -> float:
        """Rate how complete the extracted attributes are (0.0–1.0)."""
        score = 0.0
        if attrs.get("grade"):
            score += 0.4
        if attrs.get("year"):
            score += 0.2
        if attrs.get("set_name"):
            score += 0.2
        if attrs.get("spoken_bid"):
            score += 0.2
        return score

    # ------------------------------------------------------------------
    # Public accessor
    # ------------------------------------------------------------------

    def get_latest(self) -> Dict:
        return {
            "transcript": self.latest_transcript,
            "attributes": self.latest_attributes,
            "audio_confidence": self.audio_confidence,
            "is_active": self._is_running and self.is_available(),
        }


# Singleton
audio_service = AudioService()
