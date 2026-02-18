# Joshinator — Vision & How It Works

## What It Is

Joshinator is a **real-time bidding co-pilot** for Whatsnot live auction streams. You run it alongside a Whatsnot stream in your browser. It watches the stream, recognizes the card being auctioned, looks up what comparable copies have actually sold for on eBay, and shows a large color-coded signal telling you whether to bid — before the timer runs out.

The core insight: most auction losses happen because the buyer doesn't know the card's market value fast enough to bid confidently or walk away. The analyzer automates that lookup loop in real time.

---

## The Three Stages

### Stage 1 — Observe

The analyzer watches two inputs simultaneously:

**Screen capture**: A configurable region of your screen (the Whatsnot browser window) is captured at 5 FPS using `mss`. Every 3rd frame is sent through the analysis pipeline (the other frames are forwarded to the live preview only, to keep CPU load manageable).

**Audio capture** (optional, requires Whisper): System audio is recorded in 7-second chunks via `sounddevice` and transcribed by OpenAI Whisper (base model, CPU-safe). The auctioneer's spoken commentary — "PSA 9, 2021 Prizm, rookie" — often contains card attributes that are partially obscured or cut off on-screen. Audio runs in background daemon threads and feeds into the same card-identity object as OCR.

The two inputs are **fused by confidence weighting**: if OCR detects a grade and audio also detects one, the higher-confidence source wins. If OCR misses a field entirely, audio fills it.

A **30-second TTL** on the last known card prevents the signal from going blank during brief OCR failures (fast cuts, host moving the card, etc.).

### Stage 2 — Research

Once a card identity is established, the pipeline fetches market data:

**eBay query construction**: Claude is given the card info and asked to produce an optimized eBay search string (≤60 chars). This dramatically outperforms naive field concatenation by omitting noise words and prioritizing the most discriminating fields. If Claude is unavailable, a plain concatenation fallback is used.

**eBay Finding API**: Searches `findCompletedItems` in category 212 (Sports Trading Cards), `SoldItemsOnly=true`. Returns up to 25 recent sold listings.

**Fuzzy filtering**: Listing titles are matched against the search query using `rapidfuzz.fuzz.token_sort_ratio` (threshold: 70). This removes irrelevant results that happen to contain part of the player's name. A safety valve returns unfiltered results if everything is filtered out.

**Zero-result broadening**: If the primary search returns nothing, the query is retried without `card_number` and `grade` to catch listings that don't include those details.

**SQLite pricing cache**: Results are cached for 3 hours using a stable MD5 key derived from `{player_name, year, set_name, grade, card_number}`. This avoids redundant API calls when the same card appears repeatedly in a session.

### Stage 3 — Signal

The signal is the main output — a full-width banner at the top of the analysis panel:

| Signal | Color | Meaning |
|---|---|---|
| **GREEN** | `#00C851` | ROI ≥ 30% (or 35% with thin data). Strong or good buy. Pulses. |
| **YELLOW** | `#ffbb33` | ROI between −10% and +30%. Watch or weak buy. |
| **RED** | `#ff4444` | ROI < −10%. Overpriced, pass. |
| **GRAY** | `#9e9e9e` | Insufficient data — card not identified, no bid, or fewer than 3 comparable eBay sales. |

The banner also shows: player · grade, current bid, estimated fair value, suggested max bid (80% of estimated fair value), and a confidence bar. GRAY banners include the specific reason (e.g., "Only 2 comparable sale(s) found (need 3)").

**Thresholds widen with thin data**: When fewer than 6 comparable sales exist, the green threshold rises from 30% → 35% ROI and the watch zone widens, reflecting that estimates are less reliable.

**Grade multipliers**: Fair value is adjusted by PSA/BGS/SGC grade: PSA 10 = 2.5×, PSA 9 = 1.8×, PSA 8 = 1.3×, ungraded = 1.0×.

**Claude supplemental analysis** (`claude_service.py`): After the ROI signal is computed, Claude produces a natural-language deal recommendation with market insights. This is additive — it doesn't replace the signal, it elaborates on it.

---

## Session Logging

Every analysis result is persisted to `session_log.db` (SQLite), keeping the last 50 entries per session. Sessions are identified by a UUID generated when analysis starts and sent to the frontend via `session_started` event. The session ID appears abbreviated in the footer. Historical results are retrievable via `GET /api/session/{session_id}/history`.

The frontend also maintains an in-memory history of the last 10 results, displayed in a color-coded grid at the bottom of the analysis panel.

---

## VOD Replay Mode

For testing or reviewing past auctions, VOD mode replays a recorded `.mp4` through the exact same pipeline as live capture. The replay runs at `CAPTURE_FPS` using frame-skip math based on the video's native frame rate. All caching, session logging, and ROI logic apply identically, making replay results comparable to live results.

Toggle the 🎬 VOD button in the UI, provide the file path, load it, and hit Replay.

---

## What It Is Not

- It does not place bids — it is read-only, watch-only.
- It does not scrape Whatsnot — it reads your screen, which you are watching anyway.
- It does not store or transmit card images or personal data.
- The eBay pricing is for comparable sold listings, not current asking prices.
