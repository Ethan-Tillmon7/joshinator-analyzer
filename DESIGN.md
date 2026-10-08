---
name: Joshinator
description: A watch-only bidding co-pilot that presents each auction lot as a live game card, the way an iOS Live Activity shows a score.
colors:
  bg: "#000000"
  card: "#1c1c1e"
  card-2: "#2c2c2e"
  card-3: "#3a3a3c"
  label: "#ffffff"
  label-2: "#aeaeb2"
  label-3: "#8e8e93"
  fill: "rgb(120 120 128 / 0.24)"
  fill-strong: "rgb(120 120 128 / 0.36)"
  separator: "rgb(84 84 88 / 0.6)"
  material: "rgb(18 18 20 / 0.72)"
  material-thick: "rgb(30 30 32 / 0.86)"
  green: "#30d158"
  yellow: "#ffd60a"
  red: "#ff453a"
  red-ink: "#ff6961"
  gray-pill: "#3a3a3c"
  on-signal: "#000000"
  focus: "#0a84ff"
  light-bg: "#f2f2f7"
  light-card: "#ffffff"
  light-card-3: "#e5e5ea"
  light-label: "#000000"
  light-label-2: "#4c4c52"
  light-label-3: "#6c6c70"
  light-green: "#34c759"
  light-yellow: "#ffcc00"
  light-red: "#ff3b30"
  light-green-ink: "#248a3d"
  light-yellow-ink: "#a37e00"
  light-red-ink: "#d70015"
  light-focus: "#007aff"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "clamp(3rem, 19cqi, 5.5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  verdict:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "clamp(1.625rem, 10.5cqi, 2.75rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  title-large:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.022em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.022em"
    fontFeature: "tnum"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.016em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.006em"
  callout:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "-0.012em"
  subhead:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.38
  footnote:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  caption-2:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.01em"
rounded:
  card: "1.375rem"
  sheet: "1.25rem"
  pill: "1.125rem"
  row: "1rem"
  group: "0.875rem"
  control: "0.625rem"
  inset: "0.5rem"
  tag: "0.375rem"
  capsule: "999px"
spacing:
  hair: "0.125rem"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  inset: "0.875rem"
  lg: "1rem"
  card-x: "1.125rem"
  xl: "1.5rem"
  gutter: "1.75rem"
  toolbar-h: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.label}"
    textColor: "{colors.on-signal}"
    typography: "{typography.callout}"
    rounded: "{rounded.capsule}"
    padding: "0 0.875rem"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "{colors.fill-strong}"
    textColor: "{colors.label}"
    typography: "{typography.callout}"
    rounded: "{rounded.capsule}"
    padding: "0 0.875rem"
    height: "2.25rem"
  button-plain:
    textColor: "{colors.label}"
    typography: "{typography.callout}"
    rounded: "{rounded.capsule}"
    padding: "0 0.75rem"
    height: "2rem"
  icon-button:
    textColor: "{colors.label-2}"
    rounded: "{rounded.capsule}"
    size: "2rem"
  activity-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    padding: "0.9375rem 1.125rem 1.125rem"
  verdict-pill-buy:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-signal}"
    typography: "{typography.verdict}"
    rounded: "{rounded.pill}"
    padding: "0.875rem 0.9375rem"
  verdict-pill-watch:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.on-signal}"
    typography: "{typography.verdict}"
    rounded: "{rounded.pill}"
    padding: "0.875rem 0.9375rem"
  verdict-pill-pass:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-signal}"
    typography: "{typography.verdict}"
    rounded: "{rounded.pill}"
    padding: "0.875rem 0.9375rem"
  verdict-pill-no-call:
    backgroundColor: "{colors.gray-pill}"
    textColor: "{colors.label}"
    typography: "{typography.verdict}"
    rounded: "{rounded.pill}"
    padding: "0.875rem 0.9375rem"
  island-pill:
    textColor: "{colors.on-signal}"
    typography: "{typography.footnote}"
    rounded: "{rounded.capsule}"
    padding: "0 0.625rem 0 0.5rem"
    height: "1.75rem"
  grouped-list:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.group}"
    padding: "0.6875rem 0.875rem"
  lot-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.row}"
    padding: "0.625rem 0.875rem"
  tag:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.caption}"
    rounded: "{rounded.tag}"
    padding: "0.125rem 0.4375rem"
  tag-grade:
    backgroundColor: "{colors.label}"
    textColor: "{colors.card}"
    typography: "{typography.caption}"
    rounded: "{rounded.tag}"
    padding: "0.125rem 0.4375rem"
  field-input:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 0.625rem"
    height: "2.25rem"
  segmented:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.control}"
    padding: "0.125rem"
---

# Design System: Joshinator

## Overview

**Creative North Star: "The Live Game Card"**

Every lot is a live game card, read the way an iOS Live Activity or Apple Sports shows a score. The card identity (player, set line, grade, lot number) is the matchup. The verdict pill and the MAX figure are the score. Bid, headroom and time are the footer. Finished lots stack below as completed game cards, and the evidence opens as a sheet that rises from the card on a narrow screen or sits beside it as an inspector on a wide one. The system is built inside Apple's interface and motion principles, which PRODUCT.md makes binding: system type with optical sizing, translucency only on functional chrome, critically damped springs, and accessibility media queries in every component.

The surface is dark-first and quiet. It uses system grounds (pure black page, near-black cards), label tiers for hierarchy, and one saturated object per screen state: the verdict pill. The pill carries a shape and a word as well as a color, so the call holds up in peripheral vision, in grayscale and for color-blind viewers. Light mode follows the system setting and swaps to grouped-gray grounds with darker signal inks. Density is moderate. The live card is generous and the evidence is compact grouped lists, so one glance gets the call and a deliberate look gets the proof.

The retired "Score Bug" world (broadcast plates, condensed display type, zero radius, stepped flicks) is a confirmed anti-reference. So is the research dashboard of KPI tiles, charts and section cards.

**Key Characteristics:**
- System grounds and label tiers; no brand hue besides the four signal colors.
- One solid, saturated verdict pill carrying shape, word and color together.
- MAX as the heaviest figure on screen: tabular, tightly tracked, sized by container query.
- Continuous rounded corners that nest: card, then pill, then grouped list, then control.
- Material translucency on chrome only (scrolled toolbar, setup popover, undo toast).
- Critically damped springs everywhere, with bounce only after a sheet flick.

## Colors

System gray grounds and label inks carry everything; the only chroma is the four-state signal set, and it always rides a solid layer.

### Primary
- **System Green** (`green`, light `light-green`): fills the BUY verdict pill and Island pill, and tints the Buy band on the evidence price axis at 26% over the group ground.
- **System Yellow** (`yellow`, light `light-yellow`): fills WATCH and tints the Watch band.
- **System Red** (`red`, light `light-red`): fills PASS and tints the Pass band.
- **Signal Inks** (`red-ink`; light `light-green-ink`, `light-yellow-ink`, `light-red-ink`): used when a signal has to read as a mark on a neutral ground, such as shapes in finished-lot rows, shapes inside axis bands, and the outline of a stale pill. In dark mode green and yellow inks equal their fills, and red ink lifts to a lighter coral so it stays legible on near-black.
- **No Call Gray** (`gray-pill`): the GRAY / NO CALL pill, with a 1.5px inset ring at 18% label ink so it reads as a real object, not an empty slot.
- **Signal Black** (`on-signal`): the word and shape on every saturated pill in both modes.

### Neutral
- **True Black** (`bg`; light `light-bg` grouped gray): the page.
- **Card Black** (`card`; light `light-card` white): the Live Activity card, finished-lot rows, notices and grouped lists in the inspector.
- **Raised** (`card-2`): the evidence button inside the card, thumbnails, the viewing bar, row hover, and sheet groups.
- **Pressed** (`card-3`; light `light-card-3`): row press, scrollbar thumb, evidence button hover.
- **Label tiers** (`label`, `label-2`, `label-3`; light equivalents): primary text, then secondary (metric labels, set lines, notes), then tertiary (placeholders, off-state status, footer). These are opaque grays tuned for contrast, not alpha tints. `prefers-contrast: more` lifts label-2 and label-3 and turns the separator opaque.
- **Fills** (`fill`, `fill-strong`): translucent gray for controls such as tags, segmented tracks, inputs, secondary buttons, the axis track and the MAX marker label.
- **Separator** (`separator`): 0.5px hairlines inside grouped lists and under the matchup row.
- **Materials** (`material`, `material-thick`): the scrolled toolbar (thin) and the setup popover and toast (thick), always with `blur(24–30px) saturate(180%)`.
- **Focus Blue** (`focus`; light `light-focus`): focus rings, caret, text selection, and the Undo action in the toast. It is never used as a fill.

### Named Rules
**The One Saturated Object Rule.** At full saturation, signal color fills only the verdict pill and its Island. Everywhere else it appears as a shape in signal ink or as a 26% band on the price axis. Text, cards and controls stay on system grays.

**The Signal On Solid Rule.** Signal color always sits on a solid layer and never on a material, so the verdict stays legible over a changing background.

**The Alarm Without Color Rule.** OVER and high risk never turn red. The value inverts to a label-ink plate (label background, card-colored text), so the alarm reads by form and the red stays reserved for PASS.

## Typography

**Display Font:** system-ui (SF Pro on Apple platforms, with -apple-system, Helvetica Neue and Segoe UI fallbacks)
**Body Font:** the same stack
**Label/Mono Font:** none; keyboard hints use the same stack at caption-2 weight

**Character:** One family, with hierarchy built from weight, size and tracking together. Large figures get heavy weight, tight leading and strongly negative tracking. Body text sits near zero tracking with `font-optical-sizing: auto`. All sizes are in rem so the layout follows the user's text size.

### Hierarchy
- **Display** (700, `clamp(3rem, 19cqi, 5.5rem)`, 0.95): the MAX figure only. It steps down by character count (data-len 6–9) so it never wraps.
- **Verdict** (800, `clamp(1.625rem, 10.5cqi, 2.75rem)`, 0.95, uppercase): the word inside the verdict pill (BUY, WATCH, PASS, NO CALL), stepped down for 7 and 8 characters.
- **Title Large** (700, 1.375rem): the evidence inspector title.
- **Title** (700, 1.25rem): section titles such as "This session".
- **Metric** (700, 1.5rem, 1.1; 1.3125rem in a narrow card): Bid, Under/Over and Time values.
- **Headline** (600–700, 1.0625rem, 1.25): player name, reason line, evidence section headings, sheet title, setup group titles, wordmark (700).
- **Body** (400, 1rem, 1.4): base text and inputs.
- **Callout** (600, 0.9375rem): buttons, lot-row player, evidence rows.
- **Subhead** (400–500, 0.875rem, 1.38): notes, proof line, captions, details, in label-2.
- **Footnote** (600, 0.8125rem): metric labels, status line, set line, lot meta. The Island and lot-row verdict words use it at 800, uppercase.
- **Caption** (600–700, 0.75rem): tags, field labels, axis marker labels, risk badge, footer.
- **Caption 2** (700, 0.6875rem, +0.01em, uppercase): axis band words and kbd hints only.

### Named Rules
**The Tabular Money Rule.** Every price, bid, count, percentage and clock uses `font-variant-numeric: tabular-nums`. Glance figures drop the cents, and a ceiling rounds down so following it never overshoots.

**The Tracking Follows Size Rule.** Tracking tightens as size grows: −0.04em on MAX, −0.025em on the verdict word, about −0.02em on titles, −0.006em on body. Only the tiny axis band words open up (+0.01em).

## Layout

The default layout is a single centered column (max 36rem, 1rem side padding plus safe-area insets) holding notices, the viewing bar, the Live Activity card and the session stack, with 1rem between blocks. At ≥60rem the board becomes two columns, `minmax(24rem, 32rem)` and `minmax(0, 50rem)`, with a 1.75rem gap and a 92rem maximum width. The left stage is sticky under the toolbar and scrolls on its own with a 2rem bottom mask fade, while the evidence reads as an inspector on the right. When the inspector is at least 44rem wide (container query), the evidence splits into two columns, with the title and the comps section spanning both. Below 60rem, the evidence moves into the bottom sheet.

The Live Activity card is a size container. At 25rem or less its rhythm tightens (smaller pill, metrics and thumbnail). At 19rem or less it collapses to its Island, a single capsule with shape, word, MAX and time. The toolbar is a 3-column grid (wordmark, centered status or Island, actions) with a 3.5rem minimum height. At 35rem or less the Island replaces the wordmark and button kbd hints hide. At 27rem or less button labels drop to icons, and the setup fields go from four columns to two.

Spacing is rem-based and mostly on quarter- and eighth-rem steps (0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.5, 1.75). Grouped-list content insets 0.875rem, which is also where hairlines start. On `pointer: coarse`, every control grows to a 2.75rem target (2.5rem for compact buttons and segments).

## Elevation & Depth

Depth comes mostly from tonal layering: true black, then card, then raised, then pressed. Cards sit on the page with no shadow. A single soft two-layer float shadow (`shadow-float`) is reserved for objects that hover above content: the Island when it rides in the toolbar, the setup popover, the bottom sheet and the toast. Translucent material is limited to chrome that content scrolls beneath. The toolbar is transparent at the scroll edge and fades its material in only once content passes under it. The sheet itself is solid.

### Shadow Vocabulary
- **Float, dark** (`box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.5), 0 0.125rem 0.375rem rgb(0 0 0 / 0.4)`): floating chrome and the sheet.
- **Float, light** (`box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.14), 0 0.125rem 0.375rem rgb(0 0 0 / 0.08)`): the same roles in light mode.
- **Segment lift** (`box-shadow: 0 0.125rem 0.375rem rgb(0 0 0 / 0.12)`): the active segment in the segmented control only.
- **Inset rings** (`box-shadow: inset 0 0 0 1–2px …`): outlines drawn inside the shape, used for the stop button, stale pills, the selected lot row, the demo status chip and high-contrast borders. They are not elevation.

### Named Rules
**The Material Is Chrome Rule.** Translucency (`blur + saturate(180%)`) belongs only to the scrolled toolbar, the setup popover and the toast. Cards, pills, lists and the sheet stay solid, and two light materials never stack.

**The Scroll-Edge Rule.** Where floating chrome meets scrolling content, a mask-image fade does the separating: the toolbar material fades out over 1.25rem below the bar, and the sheet body fades in over 0.75rem. Hairline separators belong inside grouped lists, inset 0.875rem from the leading edge, never as a line between chrome and content.

**The Accessibility Collapse Rule.** `prefers-reduced-transparency` turns every material solid. `prefers-contrast: more` turns them solid, removes the masks, and puts a 1px label-2 inset border on cards, rows, groups, notices and the sheet.

## Shapes

All corners are rounded, and radii nest so that an inner shape is always tighter than its container: card (1.375rem), then verdict pill (1.125rem), then group (0.875rem), then control (0.625rem), then inset (0.5rem), then tag (0.375rem). Sheet and popover corners use 1.25rem, and the sheet rounds only its top edge. Finished-lot rows use 1rem. Anything you press or that reports a status is a full capsule (999px): buttons, icon buttons, the Island, the viewing bar, the toast, status chips, counts and risk badges. Signal shapes are 24-unit SVGs with round-joined 2.5 strokes: a solid triangle for BUY, a solid diamond for WATCH, an inverted triangle for PASS and an open ring for NO CALL. Each stays distinct in grayscale and at 11px. Interface icons are Lucide line icons at strokeWidth 2.25.

## Components

### Buttons
Buttons are tactile and quiet, and feedback lands on the press.
- **Shape:** full capsule (999px), 2.25rem tall (compact 2rem; 2.75rem / 2.5rem on coarse pointers), callout type at 600.
- **Primary:** label-ink fill with ground-colored text, so it's white on black in dark mode and black on white in light mode. Hovering mixes 14% label-2 into the fill.
- **Secondary:** a fill-strong capsule. Hover or active (for example while Setup is open) mixes 12% label into it.
- **Stop:** transparent, with a 1.5px label inset ring.
- **Plain:** transparent, with a fill on hover. Used for Clear, Cancel and Undo; Undo uses focus-blue text.
- **Icon button:** a 2rem circle in label-2 that goes to fill and label on hover.
- **Press:** `scale(0.96)` (icon buttons 0.92) over 120ms ease-out, removed under reduced motion. Disabled buttons sit at 40% opacity.
- **Kbd hints:** a 1.125rem rounded chip at 14% currentColor inside the button. They hide at 35rem or less.

### Chips
- **Tag:** a fill background with a 0.375rem radius in caption type. The grade tag inverts to a label-ink plate so the grade reads first.
- **Status chips:** capsules. "Sample data" in demo mode gets a 1px label-3 inset ring, and Replay gets a solid label-ink flag. The session count and risk badge are fill capsules, and high risk inverts to label ink.

### Cards / Containers
- **Corner Style:** 1.375rem on the Live Activity card, 1rem on lot rows, 0.875rem on grouped lists and notices.
- **Background:** card on the page. Inside the sheet, groups switch to white in light mode (`--sheet-group`) on a grouped-gray sheet.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Internal Padding:** card 0.9375rem / 1.125rem; grouped rows 0.6875rem / 0.875rem.

### Inputs / Fields
- **Style:** borderless, a fill background, a 0.625rem radius, 2.25rem tall, body type at 500 with tabular figures, and a caption label in label-2 above.
- **Focus:** a 2px focus-blue outline at 0 offset; elsewhere the global ring uses a 2px offset.
- **Disabled:** 50% opacity.
- **Segmented control:** a fill track with 0.125rem padding. The active segment is `segment-on` (#636366 dark, white light) with the segment lift.

### Navigation
- **Toolbar:** sticky, transparent until scrolled, then a thin material with a scroll-edge fade. It holds the wordmark (headline 700), Link / Mic / Region status tokens (footnote 600, label when on, label-3 when off, each with a Lucide icon), and Setup plus Start/Stop on the right. While a lot is live and the card is scrolled away, the Island rises into the toolbar's center slot as a floating capsule.
- **Setup popover:** a thick material panel with a 1.25rem radius and float shadow, anchored under the toolbar at the right and growing from its top-right origin.
- **Keyboard:** S start/stop, R setup, E evidence, Esc back; N steps sample lots in demo mode. Hints appear in the footer and on buttons.

### Live Activity Card (signature)
- **Status line:** a dot and word (Live, Stale, Paused, Past, Sample data) with an age detail and the lot number on the right. Inactive states show a hollow ring dot.
- **Matchup:** a 16:9 stream thumbnail (5.25rem wide, 0.5rem radius), the player in headline type, the set line in footnote, and tags. A 0.5px separator closes the row.
- **Score:** a 42/58 grid with the verdict pill (minimum 7.75rem tall) on the left and Max bid on the right, showing the display figure plus "80% of est." For GRAY, a reason line replaces MAX, because prices stay hidden. A proof line (ROI on N sold comps · confidence) follows.
- **Footer metrics:** Bid · Under/Over · Time, with the last column right-aligned. Time goes to label-2 when frozen (past or paused).
- **Evidence button:** a raised capsule-row with title, summary and chevron that opens the sheet.
- **Stale:** after 30s without a live update the pill loses its fill, keeps a 2px signal-ink ring with the shape and word, and MAX dims to label-2. A held verdict otherwise looks identical to a fresh one.

### Island
The compact verdict: a 1.75rem signal capsule (shape plus uppercase word at 800) followed by MAX and time. It appears in three places: in the toolbar while the card is scrolled away, inside a card that has collapsed to 19rem or less (2.25rem tall), and as the layout planned for a floating window. The Document Picture-in-Picture floating Island is deferred and not built.

### Session Stack
Finished lots appear newest first, each as a 1rem-radius row on a `5.5rem | 1fr | auto` grid: the signal shape in ink plus the word, the player and meta (grade · Lot NN · clock), and Max over Bid. The selected row gets a 1.5px label inset ring, and the other rows dim to 45% (dim-to-focus) while a past lot is open. A viewing bar (raised capsule) with a primary "Back to live" action marks that mode. Clear acts at once and offers Undo in a material toast.

### Evidence and Price Axis
Evidence is a set of headed grouped lists: Sold comps (axis, median/average/range stats, price grid or dated rows), Deal math, Factors & risk (risk rows get a trailing "Risk" label), and What it read. The price axis puts every value on one calibrated scale. Buy / Watch / Pass bands are 1.75rem tall with 0.5rem outer corners and 2px gaps, each tinted 26% signal over the group ground and carrying its shape and word. Below them is a fill-strong track with the fair-range capsule, 2px comp ticks, the estimate bar, a label-2 MAX rule with its fill label above, and a 2.5px label BID rule with an inverted label below. A stale bid becomes a dashed rule and a dashed-outline label. A legend states the band edges and their ROI thresholds.
- **Band thresholds mirror the backend code** (`zonesFor` ↔ `roi_calculator._generate_recommendation`): GREEN at ROI ≥15% (≥20% with fewer than 6 comps), RED below −10% (below −15% with fewer than 6 comps). **Open discrepancy:** PRODUCT.md and CLAUDE.md state 30% / 35%. The user hasn't reconciled this. The axis follows the code, and this document does not resolve the conflict.
- **Comp-tick recency sizing** (newest third large at 1.25rem, oldest small at 0.5rem) is built but inert. The backend's `sale_dates` is always empty, so every tick renders at medium (0.875rem) by design rather than implying a recency it can't show.

### Bottom Sheet
Below 60rem, evidence opens in a solid sheet (92% of the viewport tall, max 40rem wide, 1.25rem top corners, float shadow) with medium (56% visible) and large detents. It has a grabber (a tap toggles detents), a centered title and a fill close button. The sheet tracks the drag 1:1, lands on the detent nearest the momentum projection (`v/1000 · 0.998 / (1 − 0.998)`), and dismisses if the projection passes the bottom. The scrim scales from 0 to 40% black between the medium and large detents, and the sheet is modal only at the large detent. Focus moves in on open and returns on close.

### Motion
- **Default spring:** critically damped, `bounce: 0, visualDuration: 0.35s`, used for card swaps, the pill face, the stack, the popover, the toast and sheet detents. All motion is interruptible and starts from the on-screen value.
- **Flick spring:** `bounce: 0.2, visualDuration: 0.3s`, used only when a sheet release exceeds 500px/s.
- **Material entrance:** opacity 0 → 1, scale 0.96 → 1 and blur 8px → 0 move together. Exits mirror entrances; the outgoing live card fades and blurs in 0.15s so its morph never shows squashed content.
- **Lot handoff:** a finished live lot shares its `layoutId` with its new stack row and morphs into the stack while the next card materializes.
- **Signal change:** the pill face re-keys on the signal with scale 0.92 → 1 once. Nothing loops or pulses.
- **Reduced motion:** `MotionConfig reducedMotion="user"` turns transforms into cross-fades, the sheet fades over 0.2s, and press scales are removed.

## Do's and Don'ts

### Do:
- **Do** carry every signal state with its shape and word as well as its color: ▲ BUY, ◆ WATCH, ▼ PASS, ○ NO CALL, wherever a verdict appears.
- **Do** keep signal fills on solid layers, with signal-black (#000000) text on them in both modes.
- **Do** use tabular numerals for every money figure, count and clock, and round ceilings down.
- **Do** nest radii from card (1.375rem) to pill (1.125rem) to group (0.875rem) to control (0.625rem), and use capsules for anything pressable or status-like.
- **Do** separate floating chrome from content with a mask fade, and use 0.5px inset hairlines only inside grouped lists.
- **Do** animate with the default critically damped spring (0.35s) and reserve bounce for a flicked sheet.
- **Do** show staleness by form: drop the fill and keep the ring, shape and word, and dash the bid line.
- **Do** honor `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more` in every new component.

### Don't:
- **Don't** put signal color on a material, on text, or on any second large surface. The verdict pill is the only saturated object.
- **Don't** turn OVER or high risk red. Invert to a label-ink plate instead.
- **Don't** add a display or condensed web font. The system stack is binding.
- **Don't** bring back the Score Bug world: broadcast plates, zero radius, condensed type, stepped animations.
- **Don't** build the research-dashboard look of KPI tiles, charts and stacked section cards around the live card.
- **Don't** loop, pulse or repeat a signal-change animation.
- **Don't** apply translucency to cards, pills, lists or the sheet.
