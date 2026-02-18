import logging
import re
import time
from typing import Any, Dict

from app.config import settings
from app.services.ocr_service import ocr_service
from app.services.pricing_service import pricing_service
from app.services.claude_service import claude_service
from app.services.roi_calculator import roi_calculator
from app.services.screen_capture import screen_capture

logger = logging.getLogger(__name__)

# Injected by main.py via init_socketio()
sio: Any = None

# Per-session state shared across the capture loop
_session_state: Dict[str, Any] = {
    "last_known_card": None,
    "last_known_timestamp": None,
    "session_id": None,
}

LAST_KNOWN_CARD_TTL_SECONDS = 30


def init_socketio(sio_instance) -> None:
    """Called by main.py to inject the shared Socket.IO server instance."""
    global sio
    sio = sio_instance
    _register_events()


def _register_events() -> None:
    """Register all Socket.IO event handlers on the shared sio instance."""

    @sio.event
    async def connect(sid, _environ):
        logger.info("Client connected: %s", sid)
        await sio.emit("connected", {"message": "Connected to card analyzer"}, to=sid)

    @sio.event
    async def disconnect(sid):
        logger.info("Client disconnected: %s", sid)
        screen_capture.stop_capture()

    @sio.event
    async def select_region(sid):
        try:
            region = screen_capture.select_capture_region()
            if region:
                await sio.emit(
                    "region_selected",
                    {"success": True, "region": region,
                     "message": f"Region selected: {region['width']}x{region['height']}"},
                    to=sid,
                )
            else:
                await sio.emit(
                    "region_selected",
                    {"success": False, "message": "No valid region selected"},
                    to=sid,
                )
        except Exception as e:
            await sio.emit("error", {"message": f"Region selection failed: {str(e)}"}, to=sid)

    @sio.event
    async def start_analysis(sid):
        logger.info("Starting analysis for client: %s", sid)

        if not screen_capture.capture_region:
            await sio.emit("error", {"message": "Please select a capture region first"}, to=sid)
            return

        frame_count = 0

        async def process_frame(frame_array, frame_b64, _frame_num):
            nonlocal frame_count
            frame_count += 1

            # Always forward the frame for the live preview
            await sio.emit("frame", {"image": frame_b64, "timestamp": frame_count}, to=sid)

            # Only run the analysis pipeline every N frames
            if frame_count % settings.PROCESS_EVERY_N_FRAMES != 0:
                return

            # --- OCR ---
            try:
                ocr_result = await ocr_service.extract_text_dual_region(frame_array)
            except Exception as e:
                logger.warning("OCR failed on frame %d: %s", frame_count, e)
                ocr_result = {"texts": [], "confidence": 0.0, "card_info": {}, "text": "",
                              "ocr_engine": ocr_service.ocr_engine}

            ocr_text = ocr_result.get("text", "")

            # --- Card / auction parsing ---
            card_info = parse_whatsnot_card_info(ocr_text)
            auction_info = parse_whatsnot_auction_info(ocr_text)

            # Merge OCR card_info fields (richer regex) over the simpler _extract_card_info output
            for key in ("player_name", "year", "set_name", "card_number", "grade", "rookie"):
                if not card_info.get(key) and ocr_result.get("card_info", {}).get(key):
                    card_info[key] = ocr_result["card_info"][key]

            card_info["ocr_engine"] = ocr_result.get("ocr_engine", "unknown")

            # --- Last-known-card TTL ---
            now = time.time()
            if card_info.get("player_name"):
                _session_state["last_known_card"] = card_info
                _session_state["last_known_timestamp"] = now
            else:
                last = _session_state.get("last_known_card")
                last_ts = _session_state.get("last_known_timestamp")
                if last and last_ts and (now - last_ts) < LAST_KNOWN_CARD_TTL_SECONDS:
                    card_info = last  # carry forward within TTL

            # If still no card, emit a status ping and skip the expensive lookups
            if not card_info.get("player_name"):
                if frame_count % 30 == 0:
                    await sio.emit("status", {
                        "message": "Scanning for cards...",
                        "ocr_text": ocr_text,
                        "timestamp": frame_count,
                    }, to=sid)
                return

            # --- Pricing ---
            try:
                pricing_data = await pricing_service.get_card_prices(card_info)
            except Exception as e:
                logger.error("Pricing fetch failed: %s", e)
                pricing_data = {"count": 0, "prices": [], "average": 0.0, "median": 0.0,
                                "query_used": ""}

            # --- ROI (never raises after refactor) ---
            roi_analysis = roi_calculator.calculate_roi_analysis(
                card_info, auction_info.get("current_bid", 0), pricing_data
            )

            # --- Claude ---
            try:
                claude_analysis = await claude_service.generate_deal_recommendation(
                    card_info, auction_info.get("current_bid", 0)
                )
            except Exception as e:
                logger.warning("Claude analysis failed: %s", e)
                claude_analysis = {}

            await sio.emit("analysis_result", {
                "card_info": card_info,
                "auction_info": auction_info,
                "pricing_data": pricing_data,
                "roi_analysis": roi_analysis,
                "claude_analysis": claude_analysis,
                "confidence": calculate_detection_confidence(card_info, auction_info),
                "timestamp": frame_count,
            }, to=sid)

        try:
            await screen_capture.start_capture_stream(process_frame, fps=settings.CAPTURE_FPS)
        except Exception as e:
            await sio.emit("error", {"message": f"Failed to start capture: {str(e)}"}, to=sid)

    @sio.event
    async def stop_analysis(sid):
        logger.info("Stopping analysis for client: %s", sid)
        screen_capture.stop_capture()
        await sio.emit("analysis_stopped", {"message": "Analysis stopped"}, to=sid)


# ---------------------------------------------------------------------------
# Parsing helpers (unchanged logic, kept here for proximity to the pipeline)
# ---------------------------------------------------------------------------

def parse_whatsnot_card_info(text: str) -> Dict:
    card_info: Dict = {
        "player_name": "",
        "year": "",
        "set_name": "",
        "card_number": "",
        "grade": "",
        "grading_company": "",
        "rookie": False,
    }

    player_match = extract_player_name(text)
    if player_match:
        card_info["player_name"] = player_match

    year_match = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', text)
    if year_match:
        card_info["year"] = year_match.group(1)

    grade_match = re.search(r'\b(PSA|BGS|SGC)\s*(\d+(?:\.\d+)?)\b', text, re.IGNORECASE)
    if grade_match:
        card_info["grading_company"] = grade_match.group(1).upper()
        card_info["grade"] = f"{card_info['grading_company']} {grade_match.group(2)}"

    card_num_match = re.search(r'#(\d+)', text)
    if card_num_match:
        card_info["card_number"] = card_num_match.group(1)

    if any(w in text.lower() for w in ['rookie', 'rc', 'rookie card']):
        card_info["rookie"] = True

    set_name = extract_set_name(text)
    if set_name:
        card_info["set_name"] = set_name

    return card_info


def parse_whatsnot_auction_info(text: str) -> Dict:
    auction_info: Dict = {
        "current_bid": 0.0,
        "time_remaining": "",
        "bid_count": 0,
        "seller": "",
    }

    bid_match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
    if bid_match:
        auction_info["current_bid"] = float(bid_match.group(1).replace(",", ""))

    time_match = re.search(r'(\d+[hm]|\d+:\d+)', text)
    if time_match:
        auction_info["time_remaining"] = time_match.group(1)

    bid_count_match = re.search(r'(\d+)\s*bid', text, re.IGNORECASE)
    if bid_count_match:
        auction_info["bid_count"] = int(bid_count_match.group(1))

    return auction_info


def extract_player_name(text: str) -> str:
    patterns = [
        r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b',
        r'\b([A-Z]\.\s*[A-Z][a-z]+)\b',
    ]
    for pattern in patterns:
        for match in re.findall(pattern, text):
            if not any(w in match.lower() for w in ['psa', 'bgs', 'card', 'lot', 'bid', 'time']):
                return match
    return ""


def extract_set_name(text: str) -> str:
    common_sets = [
        'topps', 'panini', 'upper deck', 'fleer', 'donruss', 'bowman',
        'prizm', 'select', 'optic', 'mosaic', 'chronicles',
    ]
    text_lower = text.lower()
    for set_name in common_sets:
        if set_name in text_lower:
            idx = text_lower.find(set_name)
            context = text[max(0, idx - 20):min(len(text), idx + len(set_name) + 20)]
            m = re.search(rf'\b\w*{set_name}\w*\b', context, re.IGNORECASE)
            if m:
                return m.group(0)
    return ""


def calculate_detection_confidence(card_info: Dict, auction_info: Dict) -> float:
    confidence = 0.0
    if card_info.get("player_name"):
        confidence += 0.4
    if card_info.get("year"):
        confidence += 0.2
    if card_info.get("grade"):
        confidence += 0.2
    if auction_info.get("current_bid", 0) > 0:
        confidence += 0.2
    return min(confidence, 1.0)
