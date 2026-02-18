# Joshinator — Dev Reference

> Just need to get running? See [STARTUP.md](STARTUP.md).

---

## First-Time Setup

Run the setup script once from the project root:

```bash
bash setup-demo.sh
```

The script: installs portaudio, creates `backend/venv`, installs all Python deps (handles macOS ARM PaddlePaddle), verifies services, creates `backend/.env`, runs `npm install`, and writes `run.sh` / `run_backend.sh` / `run_frontend.sh`.

After it finishes, **edit `backend/.env`** and add your API keys.

### Manual Setup

```bash
brew install portaudio

cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in API keys

cd ../frontend && npm install
```

---

## Running the App

```bash
# Backend (port 3001) — Tab 1
cd backend && source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload

# Frontend (port 3000) — Tab 2
cd frontend && npm start

# Or both at once
./run.sh
```

> **Important**: target must be `app.main:socket_app`, not `app.main:app`.

---

## Using the App

1. Open Whatsnot in your browser with a live auction visible
2. Click **Select Region** — a panel expands with:
   - **Preset buttons**: "Whatsnot Browser" (1280×720 below browser toolbar), "Full Screen 1080p", "Full Screen 1440p"
   - **Coordinate inputs**: Top / Left / Width / Height — fine-tune to match your exact window position
   - Click **Apply** to send the coordinates to the backend. The button shows "Region ✓".
3. Click **Start Analysis**
4. The signal banner starts GRAY and flips to GREEN / YELLOW / RED once a card is recognized and priced

> **Finding your coordinates**: Position the Whatsnot window where you want it, then use a preset as a starting point and tweak Top/Left to align with where your browser chrome ends.

---

## Environment Variables (`backend/.env`)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | — | Without it, Claude analysis is skipped |
| `EBAY_APP_ID` | Required for pricing | — | From eBay Developer account |
| `EBAY_DEV_ID` | Required for pricing | — | From eBay Developer account |
| `EBAY_CERT_ID` | Required for pricing | — | From eBay Developer account |
| `CLAUDE_MODEL` | Optional | `claude-sonnet-4-20250514` | Any Claude model ID |
| `CAPTURE_FPS` | Optional | `5` | Frames per second to capture |
| `PROCESS_EVERY_N_FRAMES` | Optional | `3` | Pipeline runs on every Nth frame |
| `OCR_CONFIDENCE_THRESHOLD` | Optional | `0.7` | Minimum OCR confidence to trust |
| `PRICING_CACHE_DB` | Optional | `pricing_cache.db` | Path for pricing SQLite cache |
| `PRICING_CACHE_TTL_HOURS` | Optional | `3` | Hours before cache entry expires |
| `MIN_COMPS_FOR_SIGNAL` | Optional | `3` | Minimum eBay sales needed for a color signal |
| `FUZZY_MATCH_THRESHOLD` | Optional | `70` | Fuzzy match score (0–100) to keep a listing |

---

## Verifying Services on Startup

```
✅ EasyOCR loaded successfully (PaddleOCR unavailable)
INFO  SQLite cache initialized
INFO  SessionLogService initialized
```

If PaddleOCR fails on macOS Apple Silicon:
```bash
pip install paddlepaddle -f https://www.paddlepaddle.org.cn/whl/mac/cpu/stable.html
```

---

## Running Tests

```bash
# Backend
cd backend && source venv/bin/activate
pytest                                          # all tests
pytest test_claude.py -v                        # single file

# Frontend
cd frontend
npm test                                        # interactive watch mode
npm test -- --watchAll=false                    # single run
npm test -- --testPathPattern=App.test          # single file
```

---

## Inspecting the SQLite Databases

```bash
# Pricing cache
sqlite3 backend/pricing_cache.db \
  "SELECT cache_key, query, created_at FROM pricing_cache;"

# Session log — recent results
sqlite3 backend/session_log.db \
  "SELECT session_id, created_at FROM analysis_log ORDER BY created_at DESC LIMIT 20;"

# Count per session
sqlite3 backend/session_log.db \
  "SELECT session_id, count(*) FROM analysis_log GROUP BY session_id;"
```

---

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | API health / version |
| `GET` | `/api/health` | Simple health check |
| `GET` | `/api/session/{session_id}/history` | Last 50 analysis results for a session |
| `POST` | `/api/claude/analyze` | Direct Claude analysis (not used by main UI) |

---

## VOD Replay

Test the pipeline against a recorded stream without a live auction:

1. Record your screen during a Whatsnot session (QuickTime, OBS, etc.)
2. Start backend + frontend normally
3. Click **🎬 VOD** in the UI to toggle VOD mode
4. Paste the full path to your `.mp4`
5. Click **Load** — UI shows duration and frame count
6. Click **▶ Replay** — full pipeline runs on video frames, results saved to `session_log.db`

> If the file won't load: `ffmpeg -i input.mp4 -c:v libx264 output.mp4`

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'rapidfuzz'` | `pip install -r requirements.txt` aborted early due to a paddlepaddle version error, leaving deps uninstalled | `pip install rapidfuzz anthropic` then re-run `pip install -r requirements.txt` |
| `paddlepaddle==X.Y.Z` not found | Pinned version yanked from PyPI | `requirements.txt` now uses `>=2.6.2`; if on older checkout update the pin manually |
| `No module named '_tkinter'` | Stale `from PIL import Image, ImageTk` import in `screen_capture.py` | Already fixed — change to `from PIL import Image` if on an older checkout |
| `connect_error` in browser | Backend not running or wrong uvicorn target | Start with `app.main:socket_app`, not `app.main:app` |
| `npm run dev` fails | No `dev` script exists | Use `npm start` |
| `RpcIpcMessagePortClosedError` in frontend | TypeScript checker memory warning from CRA | Non-fatal — dev server still starts |
| Signal always GRAY | eBay keys missing, or capture region misses card title | Check `EBAY_*` in `.env`; adjust region coordinates in the Select Region panel |
| No audio transcription | Whisper or sounddevice not installed | `pip install openai-whisper sounddevice`; `brew install portaudio` |
| Pricing returns 0 results | Fuzzy threshold too high or bad query | Lower `FUZZY_MATCH_THRESHOLD` to 50; check `query_used` in the analysis payload |
