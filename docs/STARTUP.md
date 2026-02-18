# Joshinator — Quick Start

> Full detail on env vars, testing, REST endpoints, and troubleshooting: [DEV.md](DEV.md)

---

## Prerequisites

- **Python 3.11** — `brew install python@3.11`
- **Node.js 18+** — `brew install node`
- **portaudio** — `brew install portaudio`
- API keys: eBay (developer.ebay.com) · Anthropic (console.anthropic.com)

---

## 1. First-Time Setup

```bash
bash setup-demo.sh
nano backend/.env   # fill in ANTHROPIC_API_KEY + EBAY_* keys
```

---

## 2. Start the App

Two terminal tabs from the project root:

**Tab 1 — Backend** (port 3001):
```bash
cd backend && source venv/bin/activate
uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload
```

**Tab 2 — Frontend** (port 3000):
```bash
cd frontend && npm start
```

Open **[http://localhost:3000](http://localhost:3000)**. Or run both at once: `./run.sh`

> Use `app.main:socket_app`, not `app.main:app` — Socket.IO only exists in `socket_app`.

---

## 3. What Good Startup Looks Like

```
✅ EasyOCR loaded successfully (PaddleOCR unavailable)
INFO  SQLite cache initialized
INFO  SessionLogService initialized
```

Whisper warnings (`openai-whisper not available`) are non-fatal — audio features just disable.

---

## 4. Using the App

1. Open Whatsnot in your browser with a live auction visible
2. Click **Select Region** → a panel opens with preset buttons and coordinate inputs
   - Pick a preset ("Whatsnot Browser", "Full Screen 1080p") or enter your own values
   - Click **Apply** — the button shows "Region ✓"
3. Click **Start Analysis**
4. The signal banner flips from GRAY → **GREEN / YELLOW / RED** once a card is detected and priced

---

## 5. Stop

- Each terminal: `Ctrl+C`
- If using `./run.sh` with tmux: `tmux kill-session -t joshinator`
