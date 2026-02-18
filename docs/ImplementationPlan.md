Implementation Plan: Joshinator Analyzer — Full Roadmap
Context
The current app has a working end-to-end pipeline (screen capture → EasyOCR → eBay API → ROI → Claude → React UI), but several weak points prevent reliable real-world use: OCR engine is suboptimal, eBay queries are fragile, ROI has no "insufficient data" state, the signal is buried in the UI, and latency is tight. This plan hardens all four layers across four phases.

Phase 1: Core Loop
1.1 — Dependencies
backend/requirements.txt: Add paddleocr==2.7.3, paddlepaddle==2.6.1 (CPU), rapidfuzz==3.6.1

1.2 — OCR: PaddleOCR + Dual-Region Crop
backend/app/services/ocr_service.py

Rename existing EasyOCR logic to _run_easy_ocr()
Add _run_paddle_ocr(image) using PaddleOCR(use_angle_cls=True, lang='en', show_log=False). PaddleOCR returns [[[box, (text, score)]]] — flatten to match existing {"texts": [...], "confidence": float, "card_info": {}, "text": str} shape.
Update __init__ to try PaddleOCR first, then EasyOCR, then mock; set self.ocr_engine string accordingly.
Update _run_ocr() dispatcher to call the right engine with fallback.
Add _crop_title_region(image) — top 20% of frame (card name, year, set, grade)
Add _crop_bid_region(image) — bottom 25% of frame (bid, timer)
Add extract_text_dual_region(image: np.ndarray) -> Dict (async): run _run_ocr on both crops in ThreadPoolExecutor, merge results. Card attributes come from title crop; bid info from bottom crop.
1.3 — SQLite Pricing Cache
backend/app/services/cache_service.py (new file)

SQLiteCacheService(db_path, ttl_hours=3) using stdlib sqlite3
Table: pricing_cache(cache_key TEXT PK, data TEXT, query TEXT, created_at TEXT)
_make_key(card_info): MD5 of {player_name, year, set_name, grade, card_number} — stable regardless of dict key order
get(card_info) -> Optional[Dict]: check TTL, return parsed JSON or None
set(card_info, data, query): upsert row
purge_expired(): delete rows older than TTL
Singleton: cache_service = SQLiteCacheService()
1.4 — eBay Pipeline Hardening
backend/app/services/pricing_service.py

Import and use cache_service from 1.3; remove self.cache = {}
Add _build_search_query_with_claude(card_info) async: send Claude a short prompt asking for an optimal eBay search string (≤60 chars). Fall back to existing _build_search_query() if Claude unavailable.
Update _search_ebay_sold → _search_ebay_sold_with_titles() returning (prices: List[float], titles: List[str]) by also extracting item.title
Add _fuzzy_filter_prices(query, prices, titles): use rapidfuzz.fuzz.token_sort_ratio with threshold 70. If all titles filtered out, return unfiltered (safety valve).
Update get_card_prices() flow: check SQLite cache → Claude query → eBay call → fuzzy filter → if zero results, retry with broader query (drop card_number and grade) → cache result.
Add query_used to returned dict for debugging.
1.5 — ROI: INSUFFICIENT_DATA State + Signal Field
backend/app/services/roi_calculator.py

Add constant COMP_THRESHOLD = 3
Add _build_gray_result(reason: str) -> Dict returning {"recommendation": "INSUFFICIENT_DATA", "signal": "GRAY", "roi_potential": 0.0, "confidence": 0.0, "suggested_max_bid": 0.0, "fair_value_range": {"min":0,"max":0,"estimated":0}, "key_factors": [], "insufficient_data_reason": reason, "comp_count": 0}
In calculate_roi_analysis(): early-return gray if current_bid <= 0, not card_info.get("player_name"), not pricing_data.get("prices"), or len(prices) < COMP_THRESHOLD
Add "signal" field ("GREEN"/"YELLOW"/"RED"/"GRAY") and "comp_count" to all return paths
In _generate_recommendation(): widen yellow zone when price_count < 6 (thin data). Specific thresholds: if thin, green_threshold=35 else 30; yellow_upper=20 else 15; yellow_lower=-15 else -10.
1.6 — Model Updates
backend/app/models/card.py

CardIdentification: add grading_company, rookie: bool = False, parallel, auto: bool = False, ocr_engine: str = "unknown", audio_confidence: float = 0.0, last_seen_timestamp: Optional[float] = None
PricingData: add count, prices, average, median, min_price, max_price, standard_deviation, sale_dates, sources, timeframe, query_used — matching the frontend PriceData TypeScript interface
Add SignalState enum: GREEN/YELLOW/RED/GRAY
1.7 — Wire Dual-Region OCR in websocket.py
backend/app/api/websocket.py

Change ocr_service.extract_text_easyocr(frame_array) → await ocr_service.extract_text_dual_region(frame_array)
Add module-level _session_state: Dict = {"last_known_card": None, "last_known_timestamp": None, "session_id": None}
1.8 — Config Additions
backend/app/config.py

Add: PRICING_CACHE_DB, PRICING_CACHE_TTL_HOURS=3, MIN_COMPS_FOR_SIGNAL=3, FUZZY_MATCH_THRESHOLD=70
1.9 — Frontend: Signal Banner
frontend/src/types/index.ts

Add "INSUFFICIENT_DATA" | "UNKNOWN" to ROIAnalysis.recommendation union
Add signal: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY' to ROIAnalysis
frontend/src/components/AnalysisDisplay.tsx

Add SignalBanner as the very first element (before the card-section div). Large colored banner showing: signal text, player name + grade, current bid, estimated value, suggested max bid, confidence %. Add insufficient_data_reason in small text if present.
Signal colors: GREEN=#00C851, YELLOW=#ffbb33, RED=#ff4444, GRAY=#9e9e9e
frontend/src/App.css

.signal-banner: padding 20px, border-radius, transition on background-color
.signal-label: 2.4em, font-weight 800, letter-spacing 3px, white
.signal-subline: flex row, gap 24px, wrap, 1em
Phase 1 Verification
Start backend — confirm "PaddleOCR loaded" or "EasyOCR loaded" in logs
Start frontend → select region → start analysis → confirm ocr_engine field in payload
Force GRAY: use card with no eBay comps → banner shows "INSUFFICIENT_DATA"
Check pricing_cache.db created: sqlite3 pricing_cache.db "SELECT cache_key, query FROM pricing_cache;"
GREEN/YELLOW/RED banner visible at top — not buried
Phase 2: Audio Recognition
2.1 — Dependencies
backend/requirements.txt: Add openai-whisper==20231117, sounddevice==0.4.6, pyaudio==0.2.14
Note: macOS requires brew install portaudio before pip install pyaudio

2.2 — AudioService
backend/app/services/audio_service.py (new file)

AudioService with CHUNK_DURATION_SECONDS=7, SAMPLE_RATE=16000
__init__: load Whisper "base" model via whisper.load_model("base"); set self.whisper_model = None if import fails
is_available() -> bool
start(): launch _capture_loop() and _process_loop() as daemon threads
stop(): set _is_running = False
_capture_loop(): use sounddevice.rec() to capture chunks, put into self.audio_queue
_process_loop(): pull chunks, call self.whisper_model.transcribe(chunk, language="en", fp16=False), parse transcript via _extract_attributes()
_extract_attributes(text) -> Dict: regex extraction of grade (PSA/BGS/SGC + number), year (4-digit), set_name (keyword list), rookie (bool), spoken_bid (float)
_score_confidence(attrs) -> float: 0.4 for grade, 0.2 each for year/set/bid
get_latest() -> Dict: returns {transcript, attributes, audio_confidence}
Singleton: audio_service = AudioService()
2.3 — Identity Fusion in websocket.py
backend/app/api/websocket.py

Import audio_service
Add _fuse_identities(ocr_card_info, audio_attrs, ocr_confidence, audio_confidence) -> Dict: for each field (grade, year, set_name, rookie), if OCR missing → use audio; if both present and audio_weight > ocr_weight → use audio. Add audio_confidence field to result.
In process_frame: after OCR, call audio_service.get_latest() then _fuse_identities()
In start_analysis: call audio_service.start()
In stop_analysis: call audio_service.stop()
Include audio_status: {is_active, audio_confidence, transcript_preview} in analysis_result emit
2.4 — Frontend Audio Indicator
frontend/src/types/index.ts: Add audio_status?: {is_active: bool, audio_confidence: number, transcript_preview?: string} to AnalysisResult

frontend/src/App.tsx: Add audioActive state; set from result.audio_status?.is_active. Show "MIC ON/OFF" badge in header when isAnalyzing.

Phase 2 Verification
Backend logs: "Whisper model loaded (base)"
Speak card description; within 10s audio_service.get_latest() has non-empty attributes
Cover capture region; audio-only attributes populate card_info
MIC indicator in header goes active when analyzing
Confirm audio_confidence appears in analysis_result WebSocket payload
Phase 3: Robustness
3.1 — Gray State for All Failure Paths
backend/app/services/roi_calculator.py

All early-return paths use _build_gray_result(). Add: current_bid <= 0 → "No bid detected"; not player_name → "Card not identified"; empty prices → "No market data"
calc_roi_analysis always includes signal, comp_count, and insufficient_data_reason keys
3.2 — Session Log Service
backend/app/services/session_log_service.py (new file)

SessionLogService(db_path="session_log.db")
Table: analysis_log(id PK, session_id TEXT, payload TEXT, created_at TEXT)
log(session_id, payload): insert + prune to last 50 per session
get_session(session_id) -> List[Dict]: return ordered by created_at DESC
Singleton: session_log = SessionLogService()
3.3 — Last-Known Card TTL
backend/app/api/websocket.py

Constant LAST_KNOWN_CARD_TTL_SECONDS = 30
In process_frame: if card_info.player_name found → update _session_state["last_known_card"] + last_known_timestamp. If not found → if within TTL, carry forward last_known_card; else if audio has grade or year, build minimal card_info from audio only.
3.4 — Structured Logging
backend/app/api/websocket.py

In start_analysis: session_id = str(uuid.uuid4()), store in _session_state; emit session_started event to frontend
After emitting analysis_result: call session_log.log(session_id, payload)
backend/app/api/routes.py: Add GET /session/{session_id}/history endpoint returning session_log.get_session(session_id)

frontend/src/services/socketService.ts: Add onSessionStarted(callback) listener

frontend/src/App.tsx: Store sessionId state; set from session_started event

3.5 — Failure Wrapping in websocket.py
Wrap OCR, pricing, and ROI calls in try/except:

OCR exception → ocr_result = {"texts": [], "confidence": 0.0, ...} + log warning
OCR confidence below settings.OCR_CONFIDENCE_THRESHOLD → skip to TTL logic (3.3)
Pricing exception → pricing_data = {"count": 0, "prices": [], ...} + log error
ROI always returns a dict (never raises after 3.1), but wrap defensively
Phase 3 Verification
Cover region for 35s → signal stays on last-known card for 30s, then GRAY
Invalid eBay key → GRAY "No market data", not a 500 error
sqlite3 session_log.db "SELECT count(*) FROM analysis_log;" — rows accumulate
GET /api/session/{id}/history returns JSON array
Phase 4: Demo Polish
4.1 — Enhanced History Panel
frontend/src/components/AnalysisDisplay.tsx

Use existing history prop (already passed from App.tsx)
Add HistoryPanel section at bottom: grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))
Each history-item: left border colored by roi_analysis.signal, shows player name, grade, bid, recommendation text
Signal dot: 10px circle with signal color
frontend/src/App.css: .history-panel, .history-grid, .history-item, .history-signal-dot, .history-player, .history-meta, .history-rec styles

4.2 — VOD Replay Mode
backend/app/services/screen_capture.py

Add VODReplayService class:
load_video(video_path) -> Dict: use cv2.VideoCapture, return {success, frame_count, fps, duration_seconds}
start_replay_stream(process_callback, target_fps=5) async: read frames, skip by frame_skip = int(video_fps / target_fps), convert BGR→RGB, call same process_callback as live capture
stop_replay()
Singleton: vod_replay = VODReplayService()
backend/app/api/websocket.py: Add load_vod and start_vod_replay Socket.IO events; reuse the same process_frame callback from start_analysis

frontend/src/services/socketService.ts: Add loadVOD(path), startVODReplay(), onVODLoaded(cb)

frontend/src/App.tsx: Add vodMode toggle button; when enabled, show text input for file path + "Load VOD" + "Replay" buttons

4.3 — Signal Animation + Confidence Bar
frontend/src/App.css


@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(0,200,81,0.7); }
  70% { box-shadow: 0 0 0 12px rgba(0,200,81,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,200,81,0); }
}
.signal-banner-GREEN { animation: pulse-green 2s infinite; }
.confidence-bar-container { width:100%; height:6px; background:rgba(255,255,255,0.2); border-radius:3px; margin-top:10px; }
.confidence-bar-fill { height:100%; border-radius:3px; transition:width 0.5s ease; background:rgba(255,255,255,0.8); }
frontend/src/components/AnalysisDisplay.tsx: Apply signal-banner-${signal} class to banner div; add confidence bar inside the banner using roiAnalysis?.confidence

Phase 4 Verification
Run 5 analyses → history panel shows 5 colored items
Load a .mp4 VOD path → vod_loaded event received → click Replay → analysis results flow
Force STRONG_BUY → green banner pulses
Confidence bar width changes smoothly between frames
New Files
File	Phase
backend/app/services/cache_service.py	1
backend/app/services/audio_service.py	2
backend/app/services/session_log_service.py	3
Key Cross-Cutting Notes
websocket.py is the central orchestration point — every phase touches it. Make changes incrementally per phase to avoid merge conflicts with yourself.
Pydantic ↔ TypeScript contract: every field added to card.py models must mirror frontend/src/types/index.ts. Mismatches cause silent serialization issues.
PaddleOCR on macOS ARM: paddlepaddle==2.6.1 is CPU-only. If pip fails, try pip install paddlepaddle -f https://www.paddlepaddle.org.cn/whl/mac/cpu/stable.html
Whisper fp16=False: required on CPU — Whisper defaults to fp16 which fails on CPU-only machines.
VOD replay reuses process_frame callback directly — this means all caching, session logging, and ROI logic applies identically to replay sessions, which is the intended behavior for demo reproducibility.
User approved the plan
Here's the implementation plan across all 4 phases:

Phase 1 — Core Loop (foundation for everything else)

Swap OCR to PaddleOCR with EasyOCR fallback; add dual-region cropping (top 20% for card info, bottom 25% for bid)
Replace eBay's fragile in-memory dict cache with SQLite (3-hour TTL, stable MD5 key); add rapidfuzz fuzzy filtering on returned listing titles; use Claude to build optimal search queries; retry with broader query on zero results
Add INSUFFICIENT_DATA/GRAY signal state to ROI calculator; add signal field to all return paths; widen yellow zone for thin data (<6 comps)
Frontend: large GREEN/YELLOW/RED/GRAY banner at the top of AnalysisDisplay — glanceable at auction speed
Phase 2 — Audio Recognition

New AudioService: pyaudio + Whisper base model on 7-second chunks in background daemon threads; regex extraction of grade/year/set/rookie/bid from transcript
Identity fusion in websocket.py: merge OCR and audio attributes with confidence weighting; audio wins when OCR confidence is lower
Frontend: MIC ON/OFF indicator in header
Phase 3 — Robustness

Gray state for every failure path (no bid detected, card not identified, no market data, <3 comps)
SQLite session log (last 50 analyses per session) + REST endpoint for replay
30-second last-known-card TTL: carry forward the last identified card during momentary OCR failures
Try/except wrapping around OCR, pricing, and ROI calls — no 500s, always emit a GRAY signal
Phase 4 — Demo Polish

History panel with mini signal-colored dots at the bottom of AnalysisDisplay
VOD replay mode: VODReplayService using cv2.VideoCapture, reusing the exact same process_frame callback — fully reproducible demos from saved Whatsnot VODs
GREEN pulse animation, confidence bar in the signal banner
3 new files to create: cache_service.py, audio_service.py, session_log_service.py. Everything else is modifications to existing files.