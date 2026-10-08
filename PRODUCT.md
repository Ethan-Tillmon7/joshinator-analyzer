# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One specific buyer (Josh) who bids in live sports-card auctions on Whatsnot. He has seconds per lot: the card appears on stream, the timer starts, and he must decide whether to bid, how high to go, or walk away. He is watching the stream at the same time, so Joshinator competes with the auction for his attention.

Not designed for collectors or flippers in general. Broader audiences may come later, but decisions should serve this one user's live bidding first.

## Product Purpose

A real-time bidding co-pilot that runs alongside a live auction stream. It watches a screen region (and optionally the stream's audio), identifies the card being auctioned, pulls recent eBay sold comps, computes fair value and ROI against the current bid, and shows one color-coded signal (BUY / WATCH / PASS, or GRAY when there's not enough data) before the timer runs out.

Success means Josh uses it during real auctions and trusts the signal enough to act on it, by bidding confidently up to the suggested max or passing without second-guessing. Polish for demos comes after that.

## Positioning

It automates the market-value lookup that buyers otherwise do in their heads or by fumbling through eBay mid-auction. The mechanism is screen OCR plus audio transcription fused into one card identity, then Claude-built eBay queries, fuzzy-filtered sold comps, and grade-adjusted ROI. It produces a decision at auction speed, not a research report.

## Operating Context

- Used live, alongside a Whatsnot stream open in a browser. The physical setup (second monitor, side-by-side on one screen, or a separate device) is **not yet decided**.
- Inputs: a user-configured screen region captured at 5 FPS (every 3rd frame analyzed), plus optional system audio in 7-second Whisper chunks.
- The last identified card holds for 30 seconds, so the signal doesn't blank out during camera cuts or OCR misses.
- VOD replay mode runs recorded `.mp4` auctions through the same pipeline for testing and review.
- Session history: the last 10 results in the UI; the last 50 per session persisted in SQLite and available via `GET /api/session/{id}/history`.

## Capabilities and Constraints

- **Signal contract:** GREEN means ROI ≥ 30% (35% when there are fewer than 6 comps). YELLOW means ROI between −10% and the green threshold. RED means ROI < −10%. GRAY means insufficient data: card not identified, no bid, or fewer than 3 comps. A GRAY signal always states its specific reason.
- **Suggested max bid** = 80% of estimated fair value. Grade multipliers: PSA 10 = 2.5×, PSA 9 = 1.8×, PSA 8 = 1.3×, raw = 1.0×.
- Claude's natural-language analysis adds detail to the signal but never replaces it.
- It is read-only and watch-only. It never places bids, scrapes Whatsnot, or stores or transmits card images or personal data.
- Pricing comes from eBay *sold* listings (category 212), never from asking prices. Results are cached for 3 hours.
- Stack: FastAPI + Socket.IO backend; React 19 + TypeScript (CRA) frontend; `lucide-react` and `recharts` are available.
- Audio depends on Whisper and fails gracefully when unavailable. The UI shows a MIC ON/OFF status.
- **Open:** the codebase spells the platform "Whatsnot" throughout. The real platform is "Whatnot". Whether this spelling is intentional is unconfirmed.

## Brand Commitments

**Binding design reference: Apple's interface and motion principles**, as written in `.claude/skills/apple-design/SKILL.md` (WWDC *Designing Fluid Interfaces*, *The Details of UI Typography*, *Principles of Great Design*, translated for the web). The user made this binding on 2026-10-08. It pins the visual and interaction direction for every surface, including the dashboard redesign. Any visual world chosen later has to be built within it and can't replace it. For Joshinator, it means:

- **Type:** Use the system font stack (`system-ui`, i.e. SF on macOS) with optical sizing. Tracking and leading change with size: large text gets negative tracking and tight leading, body text sits near 0. Build hierarchy from weight, size and leading together. Size spacing in `rem` so the layout respects the user's text size. Money uses tabular numerals.
- **Materials:** Translucency is for functional chrome only, such as a status bar, the verdict strip, or a drawer that floats over content scrolling beneath it. It is never decoration on panels; the current glass panels don't qualify. The weight of a material encodes hierarchy. Never stack a light translucent surface on another. Where floating chrome meets content, use a scroll-edge fade, not a 1px divider. **Signal color lives on a solid layer, never on glass**, so the verdict stays legible against a changing background.
- **Motion:** Use springs. Critically damped (damping 1.0, response 0.3–0.4s) is the default. Bounce (damping about 0.8) is allowed only after a momentum gesture such as flicking a drawer. Every animation can be interrupted and starts from the on-screen value. Things exit the way they entered. Popovers and sheets grow from the control that opened them. Feedback starts on pointer-down. Signal changes animate once and never loop; a slow infinite pulse is out.
- **Multimodal feedback:** If sound or haptics are added (for example a cue when a lot turns GREEN), they follow causality, harmony and utility. They fire on the same frame as the visual change and are reserved for meaningful moments.
- **Accessibility signals are built into every component:**
  - `prefers-reduced-motion`: springs and slides become cross-fades.
  - `prefers-reduced-transparency`: materials become solid.
  - `prefers-contrast: more`: surfaces become near-solid with defined borders.
- **Foundations:** The eight principles are the vocabulary for design decisions: purpose, agency, responsibility, familiarity, flexibility, simplicity (not minimalism), craft, delight.
  - Forgiveness beats confirmation: undo a cleared history rather than asking first.
  - Every screen answers where am I, what's here, and how do I get back to live.

**Not pinned by this reference (still open):** the palette and accent colors, whether the theme is light, dark or both (this depends on the screen-setup decision), and the layout composition. The redesign decides these within the rules above.

## Evidence on Hand

- Mock analysis results (`MOCK_RESULTS` in `frontend/src/App.tsx`, tagged `ocr_engine: 'mock'`) for demos and offline UI work.
- Screenshots of the current UI: `docs/1-Joshinator-Screenshot.png` through `docs/3-Joshinator-Screenshot.png`.
- Product docs: `docs/VISION.md`, `docs/ARCHITECTURE.md`, `docs/UI-UX-Optimization.md`.
- There are no real-auction outcome data, accuracy benchmarks, or user testimonials. Don't fabricate win rates, savings, or accuracy figures.

## Product Principles

1. **The signal is the product.** Everything else on screen supports a decision that has to be made in seconds. Nothing gets in its way.
2. **Readable at a glance, while looking at something else.** Josh's eyes are on the stream. The verdict, the current bid, and the max bid must register in peripheral vision.
3. **Say when it doesn't know.** Insufficient data is shown honestly as GRAY with a reason. It never becomes a confident-looking guess.
4. **Show the evidence behind the call on demand.** Comps, fair-value range, confidence, and risk are one glance away for when there's time, never in front of the verdict.
5. **Watch-only, always.** The tool advises and never acts or collects. Copy and features shouldn't imply otherwise.

## Accessibility & Inclusion

Signal state is carried by color (green/yellow/red/gray). It must also be carried by a label and shape so it stays readable for color-vision deficiencies and in peripheral vision. No other product-specific requirement has been established.
