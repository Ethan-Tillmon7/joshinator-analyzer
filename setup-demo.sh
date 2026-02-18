#!/usr/bin/env bash
# =============================================================================
# Joshinator — Setup Script
# Run once from the project root: bash setup-demo.sh
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✖ $*${RESET}" >&2; exit 1; }
header()  { echo -e "\n${BOLD}── $* ──────────────────────────────────────────${RESET}"; }

# ── Guard: must run from repo root ───────────────────────────────────────────
[[ -d "$BACKEND_DIR" && -d "$FRONTEND_DIR" ]] \
  || error "Run this script from the project root (where backend/ and frontend/ live)"

# =============================================================================
# 1. PREREQUISITES
# =============================================================================
header "Checking prerequisites"

# macOS portaudio (required by sounddevice / pyaudio for Whisper audio)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! brew list portaudio &>/dev/null 2>&1; then
    if command -v brew &>/dev/null; then
      info "Installing portaudio via Homebrew (required for audio capture)..."
      brew install portaudio
    else
      warn "Homebrew not found. Install portaudio manually: brew install portaudio"
      warn "Audio capture (Whisper) will be disabled without it."
    fi
  else
    success "portaudio already installed"
  fi
fi

# Python — prefer 3.11, accept 3.10+
PYTHON=""
for candidate in python3.11 python3.12 python3.10 python3; do
  if command -v "$candidate" &>/dev/null; then
    ver=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    major=$(echo "$ver" | cut -d. -f1)
    minor=$(echo "$ver" | cut -d. -f2)
    if [[ "$major" -eq 3 && "$minor" -ge 10 ]]; then
      PYTHON="$candidate"
      success "Python $ver found ($candidate)"
      break
    fi
  fi
done
[[ -n "$PYTHON" ]] || error "Python 3.10+ required. Install via: brew install python@3.11"

# Node.js 18+
if command -v node &>/dev/null; then
  node_ver=$(node -e "process.stdout.write(process.versions.node)")
  node_major=$(echo "$node_ver" | cut -d. -f1)
  if [[ "$node_major" -ge 18 ]]; then
    success "Node.js $node_ver found"
  else
    warn "Node.js $node_ver found — 18+ recommended. Consider: brew install node"
  fi
else
  error "Node.js not found. Install: brew install node"
fi

# npm
command -v npm &>/dev/null || error "npm not found (should come with Node.js)"

# =============================================================================
# 2. BACKEND PYTHON ENVIRONMENT
# =============================================================================
header "Setting up Python backend"

# Create venv if missing
if [[ ! -d "$VENV_DIR" ]]; then
  info "Creating Python virtual environment at backend/venv..."
  "$PYTHON" -m venv "$VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

info "Upgrading pip..."
"$VENV_PIP" install --quiet --upgrade pip

# PaddleOCR on macOS Apple Silicon needs a special index URL
if [[ "$OSTYPE" == "darwin"* ]] && [[ "$(uname -m)" == "arm64" ]]; then
  if ! "$VENV_PYTHON" -c "import paddle" &>/dev/null 2>&1; then
    info "Installing PaddlePaddle for macOS ARM (CPU)..."
    "$VENV_PIP" install --quiet paddlepaddle \
      -f https://www.paddlepaddle.org.cn/whl/mac/cpu/stable.html \
      || warn "PaddlePaddle ARM install failed — will fall back to EasyOCR"
  fi
fi

info "Installing Python dependencies (this may take several minutes on first run)..."
"$VENV_PIP" install --quiet -r "$BACKEND_DIR/requirements.txt"
success "Python dependencies installed"

# =============================================================================
# 3. VERIFY CRITICAL PYTHON SERVICES
# =============================================================================
header "Verifying backend services"

check_py() {
  local label="$1"; local module="$2"
  if "$VENV_PYTHON" -c "import $module" &>/dev/null 2>&1; then
    success "$label"
  else
    warn "$label — not available (optional, will degrade gracefully)"
  fi
}

check_py "FastAPI / uvicorn"        "uvicorn"
check_py "Socket.IO"                "socketio"
check_py "PaddleOCR (primary OCR)"  "paddleocr"
check_py "EasyOCR (fallback OCR)"   "easyocr"
check_py "Whisper (audio)"          "whisper"
check_py "sounddevice (audio)"      "sounddevice"
check_py "rapidfuzz (pricing)"      "rapidfuzz"
check_py "Anthropic Claude SDK"     "anthropic"
check_py "mss (screen capture)"     "mss"
check_py "OpenCV"                   "cv2"

# Verify the app itself imports cleanly
info "Checking app import..."
if PYTHONPATH="$BACKEND_DIR" "$VENV_PYTHON" -c "from app.main import socket_app" &>/dev/null 2>&1; then
  success "Backend app imports successfully"
else
  warn "Backend app import had issues — check logs when starting the server"
fi

# =============================================================================
# 4. ENVIRONMENT FILE
# =============================================================================
header "Environment configuration"

ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE" ]]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    success "Created backend/.env from .env.example"
  else
    cat > "$ENV_FILE" <<'ENVEOF'
# eBay API Credentials (developer.ebay.com)
EBAY_APP_ID=your_ebay_app_id_here
EBAY_DEV_ID=your_ebay_dev_id_here
EBAY_CERT_ID=your_ebay_cert_id_here

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096

# Screen Capture
CAPTURE_FPS=5
PROCESS_EVERY_N_FRAMES=3
OCR_CONFIDENCE_THRESHOLD=0.7

# Pricing Cache
PRICING_CACHE_DB=pricing_cache.db
PRICING_CACHE_TTL_HOURS=3
MIN_COMPS_FOR_SIGNAL=3
FUZZY_MATCH_THRESHOLD=70
ENVEOF
    success "Created backend/.env with defaults"
  fi
  echo ""
  echo -e "${YELLOW}  ┌──────────────────────────────────────────────────────────────┐${RESET}"
  echo -e "${YELLOW}  │  Edit backend/.env and add your API keys before running:     │${RESET}"
  echo -e "${YELLOW}  │    • ANTHROPIC_API_KEY  — from console.anthropic.com        │${RESET}"
  echo -e "${YELLOW}  │    • EBAY_APP_ID etc.   — from developer.ebay.com           │${RESET}"
  echo -e "${YELLOW}  └──────────────────────────────────────────────────────────────┘${RESET}"
  echo ""
else
  success "backend/.env already exists"
  # Warn about placeholder values still in the file
  if grep -q "your_.*_here" "$ENV_FILE" 2>/dev/null; then
    warn "backend/.env still has placeholder values — fill in your API keys"
  fi
fi

# =============================================================================
# 5. FRONTEND
# =============================================================================
header "Setting up frontend"

info "Installing npm dependencies..."
(cd "$FRONTEND_DIR" && npm install --silent)
success "Frontend dependencies installed"

# =============================================================================
# 6. WRITE RUN SCRIPTS
# =============================================================================
header "Writing run scripts"

# ── run_backend.sh ──────────────────────────────────────────────────────────
cat > "$REPO_DIR/run_backend.sh" <<'EOF'
#!/usr/bin/env bash
# Start the Joshinator backend (port 3001)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$REPO_DIR/backend/venv"

[[ -d "$VENV_DIR" ]] \
  || { echo "Run setup-demo.sh first to install dependencies."; exit 1; }

source "$VENV_DIR/bin/activate"
cd "$REPO_DIR/backend"

echo "▸ Backend starting on http://localhost:3001"
exec uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload
EOF
chmod +x "$REPO_DIR/run_backend.sh"

# ── run_frontend.sh ──────────────────────────────────────────────────────────
cat > "$REPO_DIR/run_frontend.sh" <<'EOF'
#!/usr/bin/env bash
# Start the Joshinator frontend (port 3000)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -d "$REPO_DIR/frontend/node_modules" ]] \
  || { echo "Run setup-demo.sh first to install dependencies."; exit 1; }

cd "$REPO_DIR/frontend"
echo "▸ Frontend starting on http://localhost:3000"
exec npm start
EOF
chmod +x "$REPO_DIR/run_frontend.sh"

# ── run.sh — launch both together ────────────────────────────────────────────
cat > "$REPO_DIR/run.sh" <<'EOF'
#!/usr/bin/env bash
# Launch backend + frontend together.
# Uses tmux split-pane if available, otherwise runs both in the background
# and tails combined output to the terminal.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_all() {
  echo ""
  echo "Stopping servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

# ── tmux: nicest experience ───────────────────────────────────────────────────
if command -v tmux &>/dev/null && [[ -z "${TMUX:-}" ]]; then
  SESSION="joshinator"
  tmux new-session -d -s "$SESSION" -x 220 -y 50 \
    "bash '$REPO_DIR/run_backend.sh'; read" 2>/dev/null || true
  tmux split-window -h -t "$SESSION" \
    "sleep 2 && bash '$REPO_DIR/run_frontend.sh'; read" 2>/dev/null || true
  tmux select-pane -t "$SESSION:0.0"
  echo "▸ Launching in tmux session '$SESSION'"
  echo "  Attach: tmux attach -t $SESSION"
  echo "  Kill:   tmux kill-session -t $SESSION"
  tmux attach -t "$SESSION"
  exit 0
fi

# ── Fallback: background processes + combined log ────────────────────────────
LOG_BACKEND=$(mktemp /tmp/joshinator-backend.XXXXXX)
LOG_FRONTEND=$(mktemp /tmp/joshinator-frontend.XXXXXX)

echo "▸ Starting backend  → log: $LOG_BACKEND"
bash "$REPO_DIR/run_backend.sh" > "$LOG_BACKEND" 2>&1 &
BACKEND_PID=$!

echo "▸ Starting frontend → log: $LOG_FRONTEND"
sleep 2  # give backend a head start
bash "$REPO_DIR/run_frontend.sh" > "$LOG_FRONTEND" 2>&1 &
FRONTEND_PID=$!

trap stop_all INT TERM

echo ""
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo "  Press Ctrl+C to stop both servers."
echo ""

# Tail both logs interleaved
tail -f "$LOG_BACKEND" "$LOG_FRONTEND" &
TAIL_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
kill "$TAIL_PID" 2>/dev/null || true
rm -f "$LOG_BACKEND" "$LOG_FRONTEND"
EOF
chmod +x "$REPO_DIR/run.sh"

success "run_backend.sh, run_frontend.sh, run.sh written"

# =============================================================================
# 7. DONE
# =============================================================================
header "Setup complete"

echo ""
echo -e "${GREEN}${BOLD}All done. Here's how to run:${RESET}"
echo ""
echo -e "  ${BOLD}Both servers together (recommended):${RESET}"
echo -e "    ${CYAN}./run.sh${RESET}"
echo ""
echo -e "  ${BOLD}Individually:${RESET}"
echo -e "    ${CYAN}./run_backend.sh${RESET}   →  http://localhost:3001"
echo -e "    ${CYAN}./run_frontend.sh${RESET}  →  http://localhost:3000"
echo ""
echo -e "  ${BOLD}Then open:${RESET}  http://localhost:3000"
echo ""

if grep -q "your_.*_here" "$ENV_FILE" 2>/dev/null; then
  echo -e "${YELLOW}  ⚠  Remember to fill in your API keys in backend/.env before starting.${RESET}"
  echo ""
fi
