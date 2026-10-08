---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/components/AnalysisDisplay.tsx","frontend/src/components/ResultsTicker.tsx","frontend/src/components/SignalShape.tsx","frontend/src/components/StreamViewer.tsx","frontend/src/App.css","frontend/src/index.css"]
---

# Surface brief: Joshinator dashboard

Scope: the whole frontend app shell (App.tsx, AnalysisDisplay, ResultsTicker, SignalShape, StreamViewer, App.css, index.css). Mode: Operate. Full redesign under the binding Apple principles in PRODUCT.md; the Score Bug world (broadcast plates, Barlow, stepped flicks) is retired and is now an anti-reference.
Audience and job: Josh, mid-auction, eyes on the stream. One peripheral glance reads verdict, MAX, headroom and time; he bids up to MAX or passes. Setup undecided: 380–520px column primary, second monitor (≥960) and phone covered.
Constraints: watch-only copy; signal contract and TS payload contract unchanged; demo only under ?demo, labeled Sample data; a held verdict looks identical to a fresh one; live results older than 30s are stale; GRAY (NO CALL) hides prices and states its reason; S/R/E/Esc shortcuts kept; new copy avoids naming the platform.
Decisions: dark + light via system setting, dark-first; `motion` added for interruptible springs; evidence price line carries PASS/WATCH/BUY zone bands; Document PiP floating Island deferred (Island layout built now).

## Direction contract

THESIS: Each lot is a live game card, presented the way an iOS Live Activity / Apple Sports shows a score: the lot identity is the matchup, the verdict pill and MAX are the score, bid and clock are the footer. It refuses the research dashboard of KPI tiles, charts and sections, and the broadcast-plate costume it replaces.

OWN-WORLD: Apple system grounds (dark #000 / card #1c1c1e / raised #2c2c2e; light #f2f2f7 / #fff) with label tiers at 100/60/30% ink. Continuous-corner solid cards (~22px), the only saturated object a solid verdict pill in system green/yellow/red/gray carrying shape + word. SF Pro via system-ui with optical sizing; MAX heavy, tabular, negative tracking; rem sizing. Translucent toolbar and sheet chrome only, with scroll-edge fades, never dividers. Lucide line icons at one weight.

STORY: Josh sees the pill's color, shape and word, reads MAX, checks UNDER/OVER and time, and acts. Finished lots stack below as completed game cards (Lot 07…); evidence (comps on one zone-banded price axis, deal math, factors, what it read) opens as a sheet that grows from the card, or sits as an inspector on a wide screen.

FIRST VIEWPORT: Translucent toolbar (~52px): wordmark, LINK/MIC/REGION status, Setup, Start/Stop at right. Then the Live Activity card full width: matchup row (stream thumbnail, player, set line, grade, Lot N), score row (verdict pill left ~40%, MAX figure ~4–5rem right with its 80%-of-est. note and the reason line citing proof), footer row (BID · UNDER/OVER · TIME, freshness). Below, the finished-lot stack. At the narrowest width the card collapses to an Island pill: shape, word, MAX, time.

FORM: Live Activity (iOS Live Activities / Apple Sports), IMPECCABLE'S PICK, my #1 grounded candidate, chosen over the assigned Workout Zone; seed key ef32eb67. Carried raises: session lot numbers; dim-to-focus when viewing a past lot; reason line cites numeric proof; whole-cell reflow; one calibrated value axis for evidence with stale as dashed line form; comp ticks sized by sale recency. Signature: on a new lot the live card collapses and springs into the finished stack while the new card materializes (scale + blur together), interruptible; critically damped springs (response ~0.35s) everywhere, bounce only after a sheet flick; cross-fades under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
