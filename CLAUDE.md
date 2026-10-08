# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Joshinator is a watch-only bidding co-pilot for live sports-card auctions on Whatnot (spelled "Whatsnot" throughout the code; whether that's intentional is unconfirmed, so don't mass-rename it). It captures a screen region (plus optional audio), identifies the card, pulls eBay sold comps, computes ROI against the current bid, and shows one signal: GREEN/YELLOW/RED, or GRAY with a stated reason when data is insufficient. It never places bids. Product intent and design principles are in `PRODUCT.md`; deeper references are in `docs/ARCHITECTURE.md` (Socket.IO event tables, payload shape, config) and `docs/DEV.md` (env vars, troubleshooting).

## Commands

```bash
# First-time setup (portaudio, backend/venv, Python deps incl. macOS ARM PaddlePaddle, backend/.env, npm install, run scripts)
bash setup-demo.sh

# Backend — port 3001. Target MUST be socket_app; app.main:app has no Socket.IO and the frontend gets connect_error
cd backend && source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload

# Frontend — port 3000 (CRA; there is no `dev` script)
cd frontend && npm start
npm run build

# Frontend tests
npm test -- --watchAll=false
npm test -- --testPathPattern=App.test
```

The backend venv is `backend/venv`, not the root `.venv`. pytest isn't in `requirements.txt`, and `backend/test_claude.py` is a standalone script that needs a real `ANTHROPIC_API_KEY`: `cd backend && python test_claude.py`. `frontend/src/App.test.tsx` is still the CRA "learn react" placeholder, so it fails.

## Architecture

**One process, one port.** `backend/app/main.py` wraps the FastAPI app in `socketio.ASGIApp(sio, app)`. REST lives under `/api/` (`routes.py`, `claude_routes.py`), but the product runs over Socket.IO events registered in `backend/app/api/websocket.py`. That file is the orchestrator: event handlers, the per-frame pipeline, regex parsing of OCR text, and confidence scoring all live there.

**Per-frame pipeline** (`process_frame` inside `start_analysis`):
1. `screen_capture` grabs the region at `CAPTURE_FPS` and every frame is emitted as `frame` for the preview. Only every `PROCESS_EVERY_N_FRAMES`th frame continues.
2. `ocr_service.extract_text_dual_region` runs PaddleOCR, falling back to EasyOCR and then a mock. `parse_whatsnot_card_info` / `parse_whatsnot_auction_info` turn the text into card and auction fields.
3. `_fuse_identities` merges OCR fields with Whisper audio attributes (`audio_service.get_latest()`), weighted by confidence.
4. Last-known-card carry-forward: if no player is found, the previous card is reused for 30s (`LAST_KNOWN_CARD_TTL_SECONDS`). If there's still no card, the pipeline emits a `status` ping and skips pricing.
5. `pricing_service.get_card_prices`: SQLite cache (MD5 key, 3h TTL) → Claude-built eBay query → eBay sold listings → on zero results, retry without grade/card_number → `rapidfuzz` filter on titles → stats.
6. `roi_calculator.calculate_roi_analysis` produces the signal. It must never raise, and every return path (including `_build_gray_result`) must fill the full TS contract fields.
7. `claude_service.generate_deal_recommendation` adds narrative only and never overrides the signal.
8. The pipeline emits `analysis_result`, then `session_log.log()` writes to SQLite (last 50 per session). Logging errors are swallowed so they can't break the loop.

**The VOD replay path (`start_vod_replay` → `process_vod_frame`) is a near-copy of the live pipeline.** Any pipeline change has to be made in both functions.

**Services are module-level singletons** that are imported directly, with no DI. Each one degrades gracefully when its dependency is missing: no Anthropic key means Claude is skipped, no Whisper means audio is off, no OCR engine means the mock is used. Keep that behavior. SQLite files (`pricing_cache.db`, `session_log.db`) are created in the process working directory, which is normally `backend/`.

**Signal contract** (`roi_calculator.py`, also stated in `PRODUCT.md`): GREEN when ROI ≥ 30% (35% with fewer than 6 comps); YELLOW from −10% up to the green threshold; RED below −10%; GRAY when there's no card, no bid, or fewer than `MIN_COMPS_FOR_SIGNAL` (3) comps, always with a reason. Suggested max bid is 80% of fair value. Grade multipliers: PSA 10 = 2.5×, PSA 9 = 1.8×, PSA 8 = 1.3×, raw = 1.0×.

**Backend ↔ frontend contract.** `frontend/src/types/index.ts` is the single source of truth for payload types, and `backend/app/models/card.py` mirrors it. When you add or rename a field in the `analysis_result` payload, update `websocket.py`, `roi_calculator.py`, `types/index.ts`, and `AnalysisDisplay.tsx` together.

**Frontend.** `App.tsx` holds all state and Socket.IO wiring through `services/socketService.ts` (hardcoded `http://localhost:3001`). `AnalysisDisplay.tsx` renders the signal banner, metrics, and history. All styles are in `App.css`. `App.tsx` initializes `analysisResult` / `analysisHistory` from `MOCK_RESULTS` (`ocr_engine: 'mock'`), so the UI shows fake cards until the backend sends a real result. That's intentional for demos and offline UI work.

## Config

`backend/app/config.py` uses Pydantic `BaseSettings` loaded from `backend/.env` (template: `backend/.env.example`). Pricing needs `EBAY_APP_ID` / `EBAY_DEV_ID` / `EBAY_CERT_ID`; without them the signal stays GRAY. `ANTHROPIC_API_KEY` is optional. The pipeline is tuned with `CAPTURE_FPS`, `PROCESS_EVERY_N_FRAMES`, `OCR_CONFIDENCE_THRESHOLD`, `MIN_COMPS_FOR_SIGNAL`, `FUZZY_MATCH_THRESHOLD`, and `PRICING_CACHE_TTL_HOURS`.

## Design work

UI changes should follow `PRODUCT.md`. The signal has to be readable at a glance in peripheral vision, and signal state must be carried by a label and shape as well as color. `docs/UI-UX-Optimization.md` and the `docs/*-Joshinator-Screenshot.png` files show the current UI.
