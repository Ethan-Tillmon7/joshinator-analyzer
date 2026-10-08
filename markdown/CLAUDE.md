# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Joshinator** is a real-time sports card auction analyzer for Whatsnot live streams. It captures a screen region, performs OCR to identify sports cards, looks up eBay pricing, calculates ROI, and uses Claude AI to generate deal recommendations — all displayed in a live React dashboard.

## Development Commands

### Backend (FastAPI + Python)

```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run the backend server (port 3001 via Socket.IO ASGI mount)
cd backend && uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload

# Run tests
cd backend && pytest

# Run a single test file
cd backend && pytest test_claude.py -v
```

### Frontend (React + TypeScript)

```bash
# Install dependencies
cd frontend && npm install

# Start dev server (port 3000)
cd frontend && npm start

# Build for production
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Run a single test
cd frontend && npm test -- --testPathPattern=App.test
```

### Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:

- `EBAY_APP_ID`, `EBAY_DEV_ID`, `EBAY_CERT_ID` — eBay API credentials
- `ANTHROPIC_API_KEY` — Claude API key
- `CLAUDE_MODEL` — defaults to `claude-sonnet-4-20250514`

## Architecture

### Communication Layer

The backend runs as a **Socket.IO app mounted inside FastAPI** (`main.py` mounts `socket_app` which wraps both the Socket.IO server and the ASGI FastAPI app). The frontend connects to `http://localhost:3001` via Socket.IO.

REST endpoints live under `/api/` (routes.py) and `/api/claude/` (claude_routes.py). Real-time analysis flows through WebSocket events in `websocket.py`.

### Analysis Pipeline (backend)

Each screen capture frame goes through this chain in `websocket.py`:

1. **`screen_capture.py`** — `mss` captures the configured region at `CAPTURE_FPS`, emitting base64 JPEG frames to the frontend via `frame` Socket.IO events.
2. **`ocr_service.py`** — EasyOCR extracts text; regex parsing in `websocket.py` (`parse_whatsnot_card_info`, `parse_whatsnot_auction_info`) extracts structured card/auction fields (player, year, grade, current bid, time remaining).
3. **`pricing_service.py`** — Queries eBay Finding API for recent sold listings; results cached for 1 hour.
4. **`roi_calculator.py`** — Applies grade multipliers (PSA/BGS/SGC) to calculate fair value range and generates a BUY/WATCH/PASS recommendation with a suggested max bid (80% of estimated value).
5. **`claude_service.py`** — Calls Claude API (async via thread pool) with card + pricing context to produce deal recommendations and market insights.

Results are emitted as `analysis_result` Socket.IO events.

### Data Models (`models/card.py`)

Key Pydantic models: `CardIdentification`, `PricingData`, `ClaudeAnalysis`, `DealRecommendation`, `Card`. `Card.roi_potential`, `Card.is_good_deal`, and `Card.confidence_score` are computed properties.

### Frontend Structure

- **`App.tsx`** — State management, Socket.IO wiring, region selection, start/stop controls, analysis history (last 10 results).
- **`StreamViewer.tsx`** — Canvas rendering of base64 JPEG frames.
- **`AnalysisDisplay.tsx`** — Full analysis UI: card info, auction state, ROI recommendation, price chart, fair value range, risk assessment.
- **`services/socketService.ts`** — Thin wrapper around `socket.io-client` connecting to `localhost:3001`.
- **`types/index.ts`** — All TypeScript interfaces (single source of truth for shared types).

### Key Configuration (`config.py`)

`Settings` is a Pydantic `BaseSettings` class loaded from `backend/.env`. Notable defaults: `CAPTURE_FPS=5`, `PROCESS_EVERY_N_FRAMES=3` (only every 3rd frame is analyzed), `OCR_CONFIDENCE_THRESHOLD=0.7`.
