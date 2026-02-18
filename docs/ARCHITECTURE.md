# Joshinator — Code Architecture & Directory Map

## Stack

| Layer | Technology |
| --- | --- |
| Backend runtime | Python 3.11, FastAPI, Socket.IO (python-socketio async) |
| Real-time transport | Socket.IO over WebSocket (ASGI mount) |
| REST API | FastAPI router under `/api/` |
| Frontend | React 19, TypeScript, Create React App |
| Screen capture | `mss` (cross-platform screenshot library) |
| OCR | PaddleOCR (primary) → EasyOCR (fallback) → mock |
| Audio transcription | OpenAI Whisper (base, CPU) via `sounddevice` |
| Pricing data | eBay Finding API via `ebaysdk` |
| Fuzzy matching | `rapidfuzz` |
| AI analysis | Anthropic Claude API (`anthropic` SDK) |
| Persistence | SQLite (pricing cache + session log) |

---

## Backend Directory Map

```text
backend/
├── requirements.txt          All Python dependencies
├── .env.example              Environment variable template
└── app/
    ├── main.py               Entry point — FastAPI app + Socket.IO ASGI mount
    ├── config.py             Settings loaded from .env
    │
    ├── api/
    │   ├── websocket.py      *** Central orchestration — all real-time logic ***
    │   ├── routes.py         REST: GET /health, GET /session/{id}/history
    │   └── claude_routes.py  REST: POST /api/claude/analyze
    │
    ├── models/
    │   └── card.py           Pydantic models: CardIdentification, PricingData,
    │                         ClaudeAnalysis, DealRecommendation, Card, AnalysisResult
    │                         + SignalState enum (GREEN/YELLOW/RED/GRAY)
    │
    └── services/
        ├── screen_capture.py ScreenCaptureService (mss, frame→base64, stream loop)
        │                     VODReplayService (cv2.VideoCapture, frame-skip replay)
        ├── ocr_service.py    PaddleOCR/EasyOCR/mock, dual-region crop, preprocessing
        ├── audio_service.py  Whisper base, 7s chunks, attribute extraction
        ├── pricing_service.py eBay API, Claude query builder, fuzzy filter, stats
        ├── cache_service.py  SQLite pricing cache, MD5 key, 3h TTL, thread-safe
        ├── session_log_service.py analysis_log table, last 50 per session
        ├── roi_calculator.py Fair value, grade multipliers, signal/recommendation
        ├── claude_service.py Anthropic API wrapper, deal recommendation
        └── whatsnot_detector.py Legacy detector (largely superseded by websocket.py)
```

### `main.py` — Mount Pattern

```text
FastAPI app
  └── socket_app = socketio.ASGIApp(sio, app)  ← both served from same port
        ├── Socket.IO → websocket.py events
        └── FastAPI HTTP → routes.py + claude_routes.py
```

`uvicorn app.main:socket_app` is required — not `app.main:app`.

### `websocket.py` — Key Symbols

| Symbol | Purpose |
| --- | --- |
| `init_socketio(sio)` | Injects shared Socket.IO instance from `main.py`; registers all events |
| `_session_state` | Module-level dict: `{last_known_card, last_known_timestamp, session_id}` |
| `LAST_KNOWN_CARD_TTL_SECONDS = 30` | Carry-forward window during OCR failure |
| `_fuse_identities(ocr, audio, ocr_conf, audio_conf)` | Merges OCR + Whisper by confidence weight |
| `parse_whatsnot_card_info(text)` | Regex: player name, year, grade (PSA/BGS/SGC), card#, rookie, set |
| `parse_whatsnot_auction_info(text)` | Regex: current bid, time remaining, bid count |
| `calculate_detection_confidence(card, auction)` | Heuristic 0–1 score based on populated fields |

---

## Frontend Directory Map

```text
frontend/src/
├── App.tsx               Root — state, Socket.IO wiring, controls, layout
├── App.css               All styles (single file)
├── types/index.ts        All TypeScript interfaces (single source of truth)
├── services/
│   └── socketService.ts  Socket.IO client wrapper
└── components/
    ├── AnalysisDisplay.tsx  Signal banner, card info, ROI metrics, history panel
    └── StreamViewer.tsx     Live frame preview (base64 JPEG)
```

### `App.tsx` — State Variables

| State | Type | Purpose |
| --- | --- | --- |
| `isConnected` | `boolean` | Socket.IO connection status |
| `isAnalyzing` | `boolean` | Capture loop running |
| `frameData` | `FrameData \| null` | Latest raw frame for StreamViewer |
| `analysisResult` | `AnalysisResult \| null` | Latest full analysis payload |
| `error` | `string \| null` | General error message |
| `connectionError` | `string \| null` | Socket connection error |
| `regionSelected` | `boolean` | Backend confirmed a region is set |
| `showRegionPanel` | `boolean` | Whether the region config panel is expanded |
| `regionInputs` | `{top, left, width, height}` | Current coordinate values in the region panel |
| `analysisHistory` | `AnalysisResult[]` | Last 10 results (in-memory history panel) |
| `audioActive` | `boolean` | Whisper audio service running |
| `sessionId` | `string \| null` | UUID from `session_started`, shown in footer |
| `vodMode` | `boolean` | VOD replay controls visible |
| `vodPath` | `string` | File path input for VOD |
| `vodStatus` | `string \| null` | Load/replay status text |

---

## Socket.IO Event Reference

### Client → Server

| Event | Payload | Description |
| --- | --- | --- |
| `select_region` | `{top?, left?, width?, height?}` | Set capture region. Coordinates applied via `set_custom_region()`; omit for default. |
| `start_analysis` | — | Begin live capture + analysis loop |
| `stop_analysis` | — | Stop capture, audio, and VOD replay |
| `load_vod` | `{path: string}` | Validate and load a video file |
| `start_vod_replay` | — | Begin VOD analysis loop |

### Server → Client

| Event | Payload | Description |
| --- | --- | --- |
| `connected` | `{message}` | Emitted on successful connect |
| `frame` | `{image: base64, timestamp: int}` | Raw frame for live preview |
| `analysis_result` | Full analysis dict (see below) | Output after every Nth frame |
| `session_started` | `{session_id: string}` | New session UUID on analysis start |
| `status` | `{message, ocr_text, timestamp}` | Heartbeat while scanning with no card found |
| `region_selected` | `{success, region?, message}` | Region confirmation — triggers "Region ✓" in UI |
| `analysis_stopped` | `{message}` | Acknowledgement of stop |
| `vod_loaded` | `{success, frame_count, fps, duration_seconds}` | VOD validation result |
| `vod_replay_complete` | `{message}` | Fired when video ends |
| `error` | `{message}` | Any pipeline error |

### `analysis_result` Payload Shape

```text
{
  card_info:      { player_name, year, set_name, card_number, grade,
                    grading_company, rookie, ocr_engine, audio_confidence }
  auction_info:   { current_bid, time_remaining, bid_count, seller }
  pricing_data:   { count, prices, average, median, min_price, max_price,
                    standard_deviation, sale_dates, sources, timeframe, query_used }
  roi_analysis:   { recommendation, signal, confidence, roi_potential,
                    suggested_max_bid, break_even_price, profit_margin,
                    fair_value_range, key_factors, risk_factors, risk_level,
                    deal_score, comp_count, insufficient_data_reason }
  claude_analysis: { ... }
  confidence:      float      # detection confidence 0-1
  timestamp:       int        # frame number
  audio_status:    { is_active, audio_confidence, transcript_preview }
}
```

---

## Persistent Storage

| File | Contents |
| --- | --- |
| `pricing_cache.db` | `pricing_cache` table — MD5-keyed eBay results, 3h TTL |
| `session_log.db` | `analysis_log` table — last 50 results per session |

Both are created automatically on first run in the process working directory.

---

## Key Config (`config.py`)

| Setting | Default | Effect |
| --- | --- | --- |
| `CAPTURE_FPS` | `5` | Screen capture rate |
| `PROCESS_EVERY_N_FRAMES` | `3` | Only every Nth frame runs the full pipeline |
| `OCR_CONFIDENCE_THRESHOLD` | `0.7` | Below this, OCR result is treated as unreliable |
| `PRICING_CACHE_TTL_HOURS` | `3` | How long eBay results are cached |
| `MIN_COMPS_FOR_SIGNAL` | `3` | Fewer than this → GRAY signal |
| `FUZZY_MATCH_THRESHOLD` | `70` | `token_sort_ratio` cutoff for listing filtering |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Claude model for analysis |

---

## Service Singletons

Every service is instantiated once at module load and imported directly — no DI container.

```python
ocr_service      = OCRService()
audio_service    = AudioService()       # loads Whisper on init
pricing_service  = PricingService()
cache_service    = SQLiteCacheService()
session_log      = SessionLogService()
roi_calculator   = ROICalculator()
screen_capture   = ScreenCaptureService()
vod_replay       = VODReplayService()
```
