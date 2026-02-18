# Joshinator — Code Architecture & Directory Map

## Stack

| Layer | Technology |
|---|---|
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
| Persistence | SQLite (two databases: pricing cache, session log) |

---

## Backend Directory Map

```
backend/
├── requirements.txt          All Python dependencies
├── .env.example              Environment variable template
└── app/
    ├── main.py               Entry point — FastAPI app + Socket.IO ASGI mount
    ├── config.py             Settings loaded from .env (see Key Settings below)
    │
    ├── api/
    │   ├── websocket.py      *** Central orchestration — all real-time logic lives here ***
    │   ├── routes.py         REST endpoints: GET /health, GET /session/{id}/history
    │   └── claude_routes.py  REST endpoints for direct Claude API access
    │
    ├── models/
    │   └── card.py           Pydantic models: CardIdentification, PricingData,
    │                         ClaudeAnalysis, DealRecommendation, Card, AnalysisResult
    │                         + SignalState enum (GREEN/YELLOW/RED/GRAY)
    │
    ├── services/
    │   ├── screen_capture.py ScreenCaptureService (mss, frame→base64, stream loop)
    │   │                     VODReplayService (cv2.VideoCapture, frame-skip replay)
    │   ├── ocr_service.py    OCRService — PaddleOCR/EasyOCR/mock, dual-region crop,
    │   │                     image preprocessing (grayscale+threshold+denoise)
    │   ├── audio_service.py  AudioService — Whisper base model, 7s chunk capture,
    │   │                     attribute extraction, confidence scoring
    │   ├── pricing_service.py PricingService — eBay API, Claude query builder,
    │   │                     fuzzy filter, zero-result broadening, stats
    │   ├── cache_service.py  SQLiteCacheService — pricing cache, MD5 stable key,
    │   │                     3h TTL, thread-safe, purge_expired()
    │   ├── session_log_service.py SessionLogService — analysis_log table, last 50
    │   │                          per session, get_session() for REST endpoint
    │   ├── roi_calculator.py ROICalculator — fair value, grade multipliers,
    │   │                     signal/recommendation, risk assessment, deal score
    │   ├── claude_service.py ClaudeService — Anthropic API wrapper, deal recommendation
    │   │                     generation, is_available() guard
    │   └── whatsnot_detector.py  Legacy detector (largely superseded by websocket.py parsing)
    │
    └── utils/
        └── image_processing.py  Utility image helpers
```

### `websocket.py` — What It Contains

This file is the orchestration core. Every frame goes through it:

| Symbol | Purpose |
|---|---|
| `init_socketio(sio_instance)` | Called by `main.py` to inject the shared Socket.IO server; registers all event handlers |
| `_register_events()` | Registers `connect`, `disconnect`, `select_region`, `start_analysis`, `stop_analysis`, `load_vod`, `start_vod_replay` |
| `_session_state` | Module-level dict: `{last_known_card, last_known_timestamp, session_id}` — shared across frames within one capture session |
| `LAST_KNOWN_CARD_TTL_SECONDS = 30` | How long to carry forward the last detected card during OCR failure |
| `_fuse_identities(ocr, audio, ocr_conf, audio_conf)` | Merges OCR and Whisper card attributes by confidence weight |
| `parse_whatsnot_card_info(text)` | Regex extraction: player name, year, grade (PSA/BGS/SGC), card number, rookie flag, set name |
| `parse_whatsnot_auction_info(text)` | Regex extraction: current bid ($), time remaining, bid count |
| `extract_player_name(text)` | Pattern matching for `Title Case` names, filters grading company words |
| `extract_set_name(text)` | Keyword matching against known manufacturers (Topps, Panini, etc.) |
| `calculate_detection_confidence(card, auction)` | Heuristic 0–1 score based on which fields are populated |

### `main.py` — Mount Pattern

```
FastAPI app
  └── socket_app = socketio.ASGIApp(sio, app)  ← both served from same port
        ├── Socket.IO → websocket.py events
        └── FastAPI HTTP → routes.py + claude_routes.py
```

`uvicorn app.main:socket_app` is required (not `app.main:app`) so Socket.IO is in the ASGI chain.

---

## Frontend Directory Map

```
frontend/src/
├── App.tsx               Root component — all state, Socket.IO wiring, controls, layout
├── App.css               All styles (single file: layout, components, signal banner,
│                         confidence bar, history panel, VOD controls, MIC indicator)
│
├── types/
│   └── index.ts          Single source of truth for all TypeScript interfaces:
│                         FrameData, SocketError, CardInfo, OCRResult, AuctionInfo,
│                         FairValueRange, ROIAnalysis, PriceData, MarketTrends,
│                         AnalysisResult, SocketEvents, AppState, OCRConfig,
│                         PricingConfig, AnalysisConfig
│
├── services/
│   └── socketService.ts  Thin Socket.IO client wrapper — connect/disconnect,
│                         emit methods, on* listener registration methods
│
└── components/
    ├── AnalysisDisplay.tsx  Full analysis panel:
    │                        - Signal banner (top, full-width, colored, pulsing on GREEN)
    │                        - Card info grid
    │                        - Auction status
    │                        - ROI metrics (roi_potential, suggested_max_bid,
    │                          break_even_price, profit_margin)
    │                        - Fair value range bar
    │                        - Market intelligence (eBay stats, recent sales)
    │                        - Key factors + risk assessment
    │                        - Session history panel (bottom, signal-colored grid)
    └── StreamViewer.tsx     Live frame preview (base64 JPEG → img element)
```

### `App.tsx` — State Variables

| State | Type | Purpose |
|---|---|---|
| `isConnected` | `boolean` | Socket.IO connection status |
| `isAnalyzing` | `boolean` | Whether capture loop is running |
| `frameData` | `FrameData \| null` | Latest raw frame (forwarded to StreamViewer) |
| `analysisResult` | `AnalysisResult \| null` | Latest full analysis payload |
| `error` | `string \| null` | General error message |
| `connectionError` | `string \| null` | Socket connection error |
| `regionSelected` | `boolean` | Whether user has selected a capture region |
| `analysisHistory` | `AnalysisResult[]` | Last 10 results (in-memory, for history panel) |
| `audioActive` | `boolean` | Whether Whisper audio service is running |
| `sessionId` | `string \| null` | UUID from `session_started` event, shown in footer |
| `vodMode` | `boolean` | VOD replay controls visible |
| `vodPath` | `string` | File path input value for VOD replay |
| `vodStatus` | `string \| null` | Load/replay status text |

---

## Socket.IO Event Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `select_region` | — | Trigger region selection dialog |
| `start_analysis` | — | Begin live capture + analysis loop |
| `stop_analysis` | — | Stop capture, audio, and VOD replay |
| `load_vod` | `{path: string}` | Validate and load a video file |
| `start_vod_replay` | — | Begin VOD analysis loop |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `connected` | `{message}` | Emitted on successful connect |
| `frame` | `{image: base64, timestamp: int}` | Raw frame for live preview |
| `analysis_result` | Full analysis dict (see below) | Analysis output after every Nth frame |
| `session_started` | `{session_id: string}` | New session UUID on analysis start |
| `status` | `{message, ocr_text, timestamp}` | Heartbeat while scanning with no card found |
| `region_selected` | `{success, region?, message}` | Region selection result |
| `analysis_stopped` | `{message}` | Acknowledgement of stop |
| `vod_loaded` | `{success, frame_count, fps, duration_seconds}` | VOD validation result |
| `vod_replay_complete` | `{message}` | Fired when video ends |
| `error` | `{message}` | Any pipeline error |

### `analysis_result` Payload Shape

```
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
  claude_analysis: { ... }   # natural language market insight
  confidence:      float     # detection confidence (0–1)
  timestamp:       int       # frame number
  audio_status:    { is_active, audio_confidence, transcript_preview }
}
```

---

## Persistent Storage

| File | Format | Contents |
|---|---|---|
| `pricing_cache.db` | SQLite | `pricing_cache` table — MD5-keyed eBay results, 3h TTL |
| `session_log.db` | SQLite | `analysis_log` table — last 50 analysis results per session |

Both databases are created automatically on first run in the process working directory.

---

## Key Config Settings (`config.py`)

| Setting | Default | Effect |
|---|---|---|
| `CAPTURE_FPS` | `5` | Screen capture rate |
| `PROCESS_EVERY_N_FRAMES` | `3` | Only every Nth frame runs the full pipeline |
| `OCR_CONFIDENCE_THRESHOLD` | `0.7` | Below this, OCR result is treated as unreliable |
| `PRICING_CACHE_TTL_HOURS` | `3` | How long eBay results are cached |
| `MIN_COMPS_FOR_SIGNAL` | `3` | Fewer than this many eBay sales → GRAY signal |
| `FUZZY_MATCH_THRESHOLD` | `70` | `token_sort_ratio` cutoff for title filtering |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Which Claude model for analysis |

---

## Service Singletons

Every service is instantiated once at module load and imported wherever needed. There is no dependency injection container — imports are direct.

```
ocr_service      = OCRService()           # ocr_service.py
audio_service    = AudioService()         # audio_service.py (loads Whisper on init)
pricing_service  = PricingService()       # pricing_service.py
cache_service    = SQLiteCacheService()   # cache_service.py
session_log      = SessionLogService()    # session_log_service.py
roi_calculator   = ROICalculator()        # roi_calculator.py
screen_capture   = ScreenCaptureService() # screen_capture.py
vod_replay       = VODReplayService()     # screen_capture.py
```
