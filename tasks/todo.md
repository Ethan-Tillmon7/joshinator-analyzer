# Joshinator — Implementation Checklist

## Phase 1: Core Loop

- [x] 1.1 — Add PaddleOCR, rapidfuzz dependencies to `backend/requirements.txt`
- [x] 1.2 — Rewrite `ocr_service.py`: PaddleOCR primary, EasyOCR fallback, dual-region crop
- [x] 1.3 — Create `backend/app/services/cache_service.py` (SQLite pricing cache)
- [x] 1.4 — Harden `backend/app/services/pricing_service.py`: SQLite cache, fuzzy filter, Claude query, zero-result broadening
- [x] 1.5 — Update `backend/app/services/roi_calculator.py`: INSUFFICIENT_DATA, signal field, gray result builder
- [x] 1.6 — Update `backend/app/models/card.py`: align Pydantic models with frontend types
- [x] 1.7 — Update `backend/app/config.py`: add cache TTL, min comps, fuzzy threshold settings
- [x] 1.8 — Wire dual-region OCR in `backend/app/api/websocket.py`
- [x] 1.9 — Frontend types: add `signal`, `INSUFFICIENT_DATA` to `types/index.ts`
- [x] 1.10 — Frontend UI: signal banner in `AnalysisDisplay.tsx` + `App.css` styles

## Phase 2: Audio Recognition

- [x] 2.1 — Add openai-whisper, sounddevice, pyaudio to `backend/requirements.txt`
- [x] 2.2 — Create `backend/app/services/audio_service.py` (Whisper base, 7s chunks, attribute extraction)
- [x] 2.3 — Wire identity fusion in `backend/app/api/websocket.py` (`_fuse_identities`, audio start/stop, `audio_status` in emit)
- [x] 2.4 — Frontend: `audio_status` type in `types/index.ts`, MIC ON/OFF badge in `App.tsx` + `App.css`

## Phase 3: Robustness

- [x] 3.1 — `roi_calculator.py`: complete TypeScript contract fields (`break_even_price`, `profit_margin`, `risk_factors`, `risk_level`, `deal_score`) in all return paths including gray
- [x] 3.2 — Create `backend/app/services/session_log_service.py` (SQLite, last 50 per session)
- [x] 3.3 — `websocket.py`: `session_id = uuid4()` on `start_analysis`, emit `session_started`, call `session_log.log()` after each `analysis_result` emit
- [x] 3.4 — `routes.py`: `GET /api/session/{session_id}/history` endpoint
- [x] 3.5 — Frontend: `onSessionStarted` in `socketService.ts`, `sessionId` state in `App.tsx`, display in footer

## Phase 4: Demo Polish

- [x] 4.1 — Enhanced history panel in `AnalysisDisplay.tsx` with signal-colored mini items
- [x] 4.2 — `VODReplayService` in `screen_capture.py`; `load_vod` + `start_vod_replay` Socket.IO events; VOD mode UI in `App.tsx`
- [x] 4.3 — Signal animation + confidence bar verified end-to-end (wired in Phase 1)
