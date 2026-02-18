UI/UX Optimization Plan — Joshinator
Context
The current UI has a solid foundation but several friction points: a flat button row with no hierarchy, a blank stream canvas with no instructions, an analysis panel that requires heavy scrolling past the signal banner, a region panel that hides the active region coordinates once applied, and a history panel buried at the bottom of the analysis display. The user wants five targeted improvements: control layout, stream placeholder, sticky signal banner, region panel polish, and history moved to a collapsible sidebar.

Changes Overview
1. Control Layout Reorganization
File: frontend/src/App.tsx, frontend/src/App.css

Split the flat button row into two rows:

Primary row — the core workflow: [📍 Select Region] + [▶ Start Analysis] / [⏹ Stop] (single toggling slot — only one of Start/Stop renders at a time)
Secondary row — ancillary: [📋 History (N)] toggle for sidebar + [🎬 VOD] toggle (small, right-aligned)
Remove Clear History button from controls; add a × inside the sidebar header instead
The region panel and VOD panel still drop below their respective rows when open

┌──────────────────────────────────────────────┐
│ [📍 Select Region ✓]   [▶ Start Analysis]    │  ← primary
│ [clear recent active region if any shown]    │
├──────────────────────────────────────────────┤
│                          [📋 History (3)] [🎬]│  ← secondary (right-aligned small)
└──────────────────────────────────────────────┘
State to add in App.tsx:

showHistorySidebar: boolean
selectedHistoryResult: AnalysisResult | null (null = show live result)
Pass to AnalysisDisplay: result={selectedHistoryResult ?? analysisResult}
Clear selectedHistoryResult whenever a new analysis_result event arrives (so live view resumes automatically).

2. Stream Viewer Placeholder
File: frontend/src/components/StreamViewer.tsx, frontend/src/App.css

Replace blank canvas with a contextual placeholder when frameData is null:


if (!frameData) → render .stream-placeholder div instead of canvas
  isAnalyzing = true  → spinner + "Waiting for frames..."
  isAnalyzing = false, regionSelected = true  → "▶ Click Start Analysis to begin"
  isAnalyzing = false, regionSelected = false → "📍 Select a region to get started"
The canvas only renders when frameData exists.

3. Sticky Signal Banner
File: frontend/src/App.css, frontend/src/components/AnalysisDisplay.tsx

Make the signal banner stay pinned to the top of the analysis panel as the user scrolls:


/* In .analysis-section (the right column wrapper in App.css) */
overflow-y: auto;
max-height: calc(100vh - 140px);   /* header + controls height */
position: relative;

/* In .signal-banner */
position: sticky;
top: 0;
z-index: 10;
Also add a thin box-shadow: 0 2px 8px rgba(0,0,0,0.4) to the banner so it visually separates from scrolled content beneath it.

4. Region Panel — Show Active Coordinates
File: frontend/src/App.tsx, frontend/src/App.css

After Apply is clicked, show the confirmed region dimensions inline next to the button (no panel expansion needed):


<button onClick={handleSelectRegion}>
  📍 {regionSelected ? 'Region ✓' : 'Select Region'}
</button>
{regionSelected && !showRegionPanel && (
  <span className="region-coords-badge">
    {regionInputs.width}×{regionInputs.height} @ ({regionInputs.left}, {regionInputs.top})
  </span>
)}
Style .region-coords-badge as a small muted monospace chip between the two primary buttons.

Also add basic validation in handleApplyRegion: if width or height is 0 or negative, show an error instead of emitting.

5. History Sidebar
Files: frontend/src/App.tsx, frontend/src/App.css

Layout
When showHistorySidebar is true, add a third column to .content-grid:


.content-grid               { grid-template-columns: 1fr 1fr; }
.content-grid.sidebar-open  { grid-template-columns: 1fr 1fr 260px; }
On mobile (≤768px): sidebar stacks below, or overlays the analysis panel.

Sidebar markup (added to App.tsx JSX, below content-grid or inside it as third child)

<div className="history-sidebar">
  <div className="sidebar-header">
    <span>History ({analysisHistory.length})</span>
    <button onClick={() => { setShowHistorySidebar(false); setSelectedHistoryResult(null); }}>×</button>
  </div>
  {analysisHistory.length === 0 && (
    <p className="sidebar-empty">No results yet</p>
  )}
  {analysisHistory.map((result, i) => (
    <div
      key={i}
      className={`sidebar-item ${selectedHistoryResult === result ? 'sidebar-item-active' : ''}`}
      onClick={() => setSelectedHistoryResult(r => r === result ? null : result)}
    >
      <span className={`signal-pip signal-pip-${result.roi_analysis?.signal ?? 'GRAY'}`} />
      <div className="sidebar-item-info">
        <span className="sidebar-player">{result.card_info?.player_name || 'Unknown'}</span>
        <span className="sidebar-meta">
          {result.card_info?.grade && `${result.card_info.grade} · `}
          ${result.auction_info?.current_bid ?? 0}
        </span>
      </div>
    </div>
  ))}
  {selectedHistoryResult && (
    <button className="sidebar-clear-selection" onClick={() => setSelectedHistoryResult(null)}>
      ← Back to live
    </button>
  )}
</div>
Remove the existing history panel from the bottom of AnalysisDisplay.tsx (or leave it; it becomes redundant but harmless — better to remove for cleanliness).

Critical Files
File	Changes
frontend/src/App.tsx	Button layout refactor, new state (showHistorySidebar, selectedHistoryResult), sidebar JSX, region-coords-badge, validation in handleApplyRegion
frontend/src/App.css	Primary/secondary control rows, stream-placeholder, sticky signal banner, content-grid sidebar column, sidebar styles
frontend/src/components/StreamViewer.tsx	Contextual placeholder replaces blank canvas
frontend/src/components/AnalysisDisplay.tsx	Remove history panel from bottom (now in sidebar), signal banner gets sticky CSS class
Verification
Start backend + frontend (./run.sh or two tabs)
Disconnected state — confirm Start/Stop layout is clean, secondary row visible
Connect — click Select Region, confirm panel opens, apply a preset, confirm region-coords-badge appears
Start Analysis — confirm stream shows "Waiting for frames..." then transitions to live canvas once frames arrive
Scroll the analysis panel — confirm signal banner stays pinned to the top
Click History toggle — sidebar slides in as third column; click an entry, confirm analysis panel shows historical result; click "← Back to live" to resume
New analysis result — confirm selectedHistoryResult clears automatically and live result resumes
Mobile — resize browser to <768px, confirm layout stacks and sidebar doesn't break