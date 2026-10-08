# Joshinator

Real-time bidding co-pilot for live sports-card auctions. See [docs/STARTUP.md](docs/STARTUP.md) for full setup.

## First-Time Setup

```bash
bash setup-demo.sh
nano backend/.env   # fill in ANTHROPIC_API_KEY + EBAY_* keys
```

## Start the App

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

Or run both at once: `./run.sh`

> Use `app.main:socket_app`, not `app.main:app`. Socket.IO only exists in `socket_app`.

## Localhost

| Service | URL |
| --- | --- |
| App (frontend) | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:3001](http://localhost:3001) |
| Health check | [http://localhost:3001/api/health](http://localhost:3001/api/health) |
