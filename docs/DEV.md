# Joshinator — Dev Notes & Running the App

## First-Time Setup

Run the setup script once from the project root — it handles everything:

```bash
bash setup-demo.sh
```

The script:

- Installs `portaudio` via Homebrew if missing (required for Whisper audio)
- Finds Python 3.10+ and creates `backend/venv`
- Installs all Python dependencies (handles macOS ARM PaddlePaddle separately)
- Verifies each critical service (PaddleOCR, EasyOCR, Whisper, sounddevice, etc.)
- Creates `backend/.env` from `.env.example` if it doesn't exist
- Runs `npm install` in the frontend
- Writes `run.sh`, `run_backend.sh`, `run_frontend.sh` to the project root

After it finishes, **edit `backend/.env`** and add your API keys before starting.

### Manual Setup (if you prefer)

```bash
# macOS: audio capture dependency
brew install portaudio

# Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in API keys

# Frontend
cd ../frontend
npm install
```

---

## Running the App

Both servers must be running simultaneously. Open two terminal tabs.

**Tab 1 — Backend** (port 3001):
```bash
cd backend
source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload
```

**Tab 2 — Frontend** (port 3000):
```bash
cd frontend
npm start
```

Open `http://localhost:3000` in your browser.

> **Important**: The uvicorn target must be `app.main:socket_app`, not `app.main:app`.
> The Socket.IO server is only in the ASGI chain when using `socket_app`.

---

## Using the App

1. Make sure Whatsnot is open in your browser with a live auction visible
2. In the analyzer UI, click **Select Region** — this uses the default region (800×600 at 100,100 in headless mode); modify `screen_capture.py`'s `default_region` to match your browser window
3. Click **Start Analysis**
4. The signal banner will show GRAY until a card is recognized, then flip to GREEN/YELLOW/RED

---

## Environment Variables

All variables live in `backend/.env`. Unset optional variables gracefully degrade.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | — | Must start with `sk-ant-`. Without it, Claude analysis is skipped |
| `EBAY_APP_ID` | Required for pricing | — | From eBay Developer account |
| `EBAY_DEV_ID` | Required for pricing | — | From eBay Developer account |
| `EBAY_CERT_ID` | Required for pricing | — | From eBay Developer account |
| `CLAUDE_MODEL` | Optional | `claude-sonnet-4-20250514` | Any Claude model ID |
| `CAPTURE_FPS` | Optional | `5` | Frames per second to capture |
| `PROCESS_EVERY_N_FRAMES` | Optional | `3` | Pipeline runs on every Nth frame |
| `OCR_CONFIDENCE_THRESHOLD` | Optional | `0.7` | OCR minimum confidence to trust |
| `PRICING_CACHE_DB` | Optional | `pricing_cache.db` | Path for pricing SQLite cache |
| `PRICING_CACHE_TTL_HOURS` | Optional | `3` | Hours before cache entry expires |
| `MIN_COMPS_FOR_SIGNAL` | Optional | `3` | Minimum eBay sales needed for a color signal |
| `FUZZY_MATCH_THRESHOLD` | Optional | `70` | Fuzzy match score (0–100) to keep a listing |

---

## Verifying Services on Startup

Watch backend logs after `uvicorn` starts:

```
✅ PaddleOCR loaded successfully          # or EasyOCR, or mock warning
INFO  Whisper model loaded (base)         # audio available
INFO  SQLite cache initialized            # pricing_cache.db created
INFO  SessionLogService initialized       # session_log.db created
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
pytest                          # all tests
pytest test_claude.py -v        # single file

# Frontend
cd frontend
npm test                        # interactive watch mode
npm test -- --watchAll=false    # single run (CI)
npm test -- --testPathPattern=App.test  # single file
```

---

## Inspecting the SQLite Databases

```bash
# Pricing cache — what cards have been looked up
sqlite3 backend/pricing_cache.db "SELECT cache_key, query, created_at FROM pricing_cache;"

# Session log — recent analysis results
sqlite3 backend/session_log.db "SELECT session_id, created_at FROM analysis_log ORDER BY created_at DESC LIMIT 20;"

# Count per session
sqlite3 backend/session_log.db "SELECT session_id, count(*) FROM analysis_log GROUP BY session_id;"
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

## Adjusting the Capture Region

In headless mode (default), `select_capture_region()` returns the `default_region` at (100, 100) 800×600. To point it at your actual Whatsnot window, either:

**Option A** — Edit the default in code:
```python
# backend/app/services/screen_capture.py
self.default_region = {"top": 200, "left": 50, "width": 1280, "height": 720}
```

**Option B** — Use the helper at the bottom of `screen_capture.py`:
```python
setup_whatsnot_region()   # 1200×800 at (100, 50)
setup_fullscreen_region() # full primary monitor
```

**Option C** — Call `set_custom_region()` directly via the Socket.IO API or a quick Python REPL.

---

## VOD Replay Workflow

Use this to test the pipeline against a recorded Whatsnot stream without a live auction:

1. Record your screen during a Whatsnot session to `.mp4` (QuickTime, OBS, etc.)
2. Start the analyzer normally (backend + frontend)
3. Click **🎬 VOD** in the UI header to toggle VOD mode
4. Paste the full path to your `.mp4` file
5. Click **Load** — the UI shows duration and frame count if the file is valid
6. Click **▶ Replay** — the same full pipeline runs on the video frames
7. Results appear in the analysis panel and are saved to `session_log.db`

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `connect_error` in browser | Backend not running on port 3001 | Start uvicorn with `socket_app` target |
| Signal always GRAY | eBay keys missing or card not detected | Check `EBAY_*` env vars; verify region covers card title |
| No audio transcription | `openai-whisper` or `sounddevice` not installed | `pip install openai-whisper sounddevice`; `brew install portaudio` |
| PaddleOCR import error | Wrong platform build | Try the URL-based pip install for macOS CPU above |
| `File is not recognized as a video` in VOD | Unsupported codec | Re-encode with `ffmpeg -i input.mp4 -c:v libx264 output.mp4` |
| Pricing always returns 0 results | Fuzzy threshold too high or bad query | Lower `FUZZY_MATCH_THRESHOLD` to 50 and check `query_used` in payload |
