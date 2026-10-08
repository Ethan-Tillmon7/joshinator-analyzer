// frontend/src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Film,
  Link2,
  Link2Off,
  Mic,
  MicOff,
  Play,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Square,
  X,
} from 'lucide-react';
import socketService from './services/socketService';
import StreamViewer from './components/StreamViewer';
import AnalysisDisplay, { IdleState, Island, islandPropsFor } from './components/AnalysisDisplay';
import Evidence from './components/Evidence';
import EvidenceSheet from './components/EvidenceSheet';
import ResultsTicker from './components/ResultsTicker';
import { AnalysisResult, FrameData, SocketError } from './types';
import { DEMO_MODE, buildDemoResults, isDemoResult } from './mocks/demoResults';
import { formatClockTime, formatLot, lotKey } from './lib/format';
import { ResultSource, readVerdict } from './lib/verdict';
import { MATERIAL_HIDDEN, MATERIAL_SHOWN, SPRING } from './lib/motion';
import './App.css';

export type { ResultSource } from './lib/verdict';

const BACKEND_ADDRESS = 'localhost:3001';

// socket.io transport errors ("xhr poll error", "websocket error") mean the backend is unreachable.
function describeConnectionError(message: string | undefined): string {
  if (!message || /xhr poll error|websocket error|timeout|ECONNREFUSED/i.test(message)) {
    return `Can't reach the Joshinator backend at ${BACKEND_ADDRESS}. Start it with "uvicorn app.main:socket_app --port 3001", then retry.`;
  }
  return `Lost the backend connection (${message}). Retrying will reconnect without clearing your results.`;
}

// Demo lots are numbered oldest-first so the stack reads like a real session.
const stampDemo = (results: AnalysisResult[]): AnalysisResult[] =>
  results.map((r, i) => ({ ...r, lot_number: results.length - i }));
const DEMO_RESULTS = DEMO_MODE ? stampDemo(buildDemoResults()) : [];

const HISTORY_LIMIT = 10;
const UNDO_MS = 6000;

// An empty field stays empty (NaN) instead of silently becoming 0
const parseRegionValue = (raw: string): number => (raw.trim() === '' ? NaN : Math.round(Number(raw)));

const REGION_PRESETS = [
  { label: 'Stream window', region: { top: 80, left: 0, width: 1280, height: 720 } },
  { label: 'Full screen 1080p', region: { top: 0, left: 0, width: 1920, height: 1080 } },
  { label: 'Full screen 1440p', region: { top: 0, left: 0, width: 2560, height: 1440 } },
];

// A second monitor has room to keep the evidence open beside the card.
const WIDE_QUERY = '(min-width: 60rem)';

function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
};

function App() {
  const isWide = useMediaQuery(WIDE_QUERY);

  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(DEMO_RESULTS[0] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [regionSelected, setRegionSelected] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>(DEMO_RESULTS.slice(1));
  const [audioActive, setAudioActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vodMode, setVodMode] = useState(false);
  const [vodPath, setVodPath] = useState('');
  const [vodStatus, setVodStatus] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [regionInputs, setRegionInputs] = useState({ top: 100, left: 100, width: 1200, height: 800 });
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<AnalysisResult | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches);
  const [clearedHistory, setClearedHistory] = useState<AnalysisResult[] | null>(null);
  const [cardOutOfView, setCardOutOfView] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // The live lot as of the last read, and the session's lot counter
  const liveRef = useRef<AnalysisResult | null>(DEMO_RESULTS[0] ?? null);
  const lotSeq = useRef(0);
  const demoLotSeq = useRef(DEMO_RESULTS.length);
  const demoCursor = useRef(1);
  const cardRef = useRef<HTMLDivElement>(null);

  // Wide screens keep the evidence beside the card; narrow ones fold it into a sheet.
  useEffect(() => {
    setEvidenceOpen(isWide);
  }, [isWide]);

  const handleFrameData = useCallback((data: FrameData) => {
    setFrameData(data);
  }, []);

  const handleAnalysisResult = useCallback((incoming: AnalysisResult) => {
    const prev = liveRef.current;
    const prevIsLive = !!prev && !isDemoResult(prev);
    const isNewLot = !prevIsLive || lotKey(prev!) !== lotKey(incoming);
    if (isNewLot) lotSeq.current += 1;
    const result: AnalysisResult = { ...incoming, received_at: Date.now(), lot_number: lotSeq.current };
    liveRef.current = result;
    setAnalysisResult(result);
    // A new card ends the previous lot: it joins the stack. Live lots replace demo history.
    if (isNewLot) {
      setAnalysisHistory(h => {
        const real = h.filter(r => !isDemoResult(r));
        return (prevIsLive ? [prev!, ...real] : real).slice(0, HISTORY_LIMIT);
      });
    }
    setAudioActive(!!result.audio_status?.is_active);
    setSelectedHistoryResult(null); // resume live view on new result
  }, []);

  const handleSocketError = useCallback((err: SocketError) => {
    setError(err.message);
    console.error('Socket error:', err.message);
  }, []);

  useEffect(() => {
    let mounted = true;

    try {
      const socket = socketService.connect();

      socket.on('connect', () => {
        if (mounted) {
          setIsConnected(true);
          setConnectionError(null);
        }
      });

      socket.on('disconnect', (reason: string) => {
        if (mounted) {
          setIsConnected(false);
          setIsAnalyzing(false);
          if (reason === 'io server disconnect') socket.connect();
        }
      });

      socket.on('connect_error', (error: Error) => {
        if (mounted) {
          setConnectionError(describeConnectionError(error?.message));
          setIsConnected(false);
        }
      });

      socket.on('region_selected', () => {
        if (mounted) setRegionSelected(true);
      });

      socketService.onFrame(handleFrameData);
      socketService.onAnalysisResult(handleAnalysisResult);
      socketService.onError(handleSocketError);
      socketService.onSessionStarted((data) => {
        if (mounted) setSessionId(data.session_id);
      });
      socketService.onVODLoaded((data) => {
        if (mounted) setVodStatus(`Loaded · ${data.duration_seconds.toFixed(1)}s, ${data.frame_count} frames`);
      });
      socketService.onVODReplayComplete(() => {
        if (mounted) { setIsAnalyzing(false); setVodStatus('Replay complete'); }
      });

    } catch (err) {
      if (mounted) {
        setConnectionError(describeConnectionError(undefined));
        console.error('Socket initialization error:', err);
      }
    }

    return () => {
      mounted = false;
      socketService.disconnect();
    };
  }, [handleFrameData, handleAnalysisResult, handleSocketError]);

  // Starting fresh files the current live lot into the stack instead of dropping it.
  const parkLiveLot = useCallback(() => {
    const prev = liveRef.current;
    if (prev && !isDemoResult(prev)) {
      setAnalysisHistory(h => [prev, ...h.filter(r => !isDemoResult(r) && r !== prev)].slice(0, HISTORY_LIMIT));
    } else {
      setAnalysisHistory(h => h.filter(r => !isDemoResult(r)));
    }
    liveRef.current = null;
    setAnalysisResult(null);
  }, []);

  const handleStartAnalysis = useCallback(() => {
    if (!isConnected) { setError('Not connected to the backend'); return; }
    if (!regionSelected) { setError('Set a capture region first'); return; }
    setIsAnalyzing(true);
    setVodMode(false);
    setError(null);
    parkLiveLot();
    setShowSetup(false);
    socketService.startAnalysis();
  }, [isConnected, regionSelected, parkLiveLot]);

  const handleStopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    socketService.stopAnalysis();
  }, []);

  const handleToggleSetup = useCallback(() => {
    if (!isConnected) { setError('Not connected to the backend'); return; }
    setShowSetup(prev => !prev);
  }, [isConnected]);

  const handleApplyRegion = useCallback(() => {
    const { top, left, width, height } = regionInputs;
    if (![top, left, width, height].every(Number.isFinite)) {
      setError('Region values must be whole numbers of pixels');
      return;
    }
    if (top < 0 || left < 0) {
      setError('Top and Left can\'t be negative: 0 is the top-left corner of your main display');
      return;
    }
    if (width < 100 || height < 100) {
      setError('Width and height must each be at least 100px so the card text is readable');
      return;
    }
    setError(null);
    setRegionSelected(false);
    socketService.selectRegion(regionInputs);
    setShowSetup(false);
  }, [regionInputs]);

  const clearError = useCallback(() => setError(null), []);
  const clearConnectionError = useCallback(() => setConnectionError(null), []);

  // Reconnect in place so the current verdict and history survive
  const handleRetryConnection = useCallback(() => {
    clearConnectionError();
    const socket = socketService.getSocket();
    if (socket) socket.connect();
  }, [clearConnectionError]);

  // Forgiveness over confirmation: Clear acts at once and offers Undo for a few seconds.
  const handleClearHistory = useCallback(() => {
    setClearedHistory(analysisHistory);
    setAnalysisHistory([]);
    setSelectedHistoryResult(null);
  }, [analysisHistory]);

  const handleUndoClear = useCallback(() => {
    if (clearedHistory) setAnalysisHistory(h => [...h, ...clearedHistory].slice(0, HISTORY_LIMIT));
    setClearedHistory(null);
  }, [clearedHistory]);

  useEffect(() => {
    if (!clearedHistory) return;
    const id = window.setTimeout(() => setClearedHistory(null), UNDO_MS);
    return () => window.clearTimeout(id);
  }, [clearedHistory]);

  // Demo only: N ends the current sample lot and calls the next one, to show a lot change.
  const advanceDemoLot = useCallback(() => {
    const pool = buildDemoResults();
    const seed = pool[demoCursor.current % pool.length];
    demoCursor.current += 1;
    demoLotSeq.current += 1;
    const next: AnalysisResult = { ...seed, received_at: Date.now(), lot_number: demoLotSeq.current };
    const prev = liveRef.current;
    liveRef.current = next;
    if (prev) setAnalysisHistory(h => [prev, ...h].slice(0, HISTORY_LIMIT));
    setAnalysisResult(next);
    setSelectedHistoryResult(null);
  }, []);

  const toggleEvidence = useCallback(() => setEvidenceOpen(v => !v), []);

  // Keyboard: S start/stop · R setup · E evidence · Esc back out · N next sample lot (demo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) {
        if (e.key === 'Escape' && isTypingTarget(e.target)) (e.target as HTMLElement).blur();
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (isAnalyzing) handleStopAnalysis();
        else if (isConnected && regionSelected) handleStartAnalysis();
      } else if (key === 'r') {
        if (isConnected && !isAnalyzing) { e.preventDefault(); setShowSetup(v => !v); }
      } else if (key === 'e') {
        e.preventDefault();
        toggleEvidence();
      } else if (key === 'n' && DEMO_MODE && !isAnalyzing) {
        e.preventDefault();
        advanceDemoLot();
      } else if (e.key === 'Escape') {
        if (!isWide && evidenceOpen) setEvidenceOpen(false);
        else if (selectedHistoryResult) setSelectedHistoryResult(null);
        else if (showSetup) setShowSetup(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAnalyzing, isConnected, regionSelected, selectedHistoryResult, showSetup, isWide, evidenceOpen,
      handleStartAnalysis, handleStopAnalysis, toggleEvidence, advanceDemoLot]);

  // Floating chrome earns its scroll-edge fade only once content passes under it.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // When the card scrolls under the toolbar, its Island takes the toolbar's center.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setCardOutOfView(!entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayedResult = selectedHistoryResult ?? analysisResult;

  const resultSource: ResultSource = selectedHistoryResult
    ? 'history'
    : isDemoResult(displayedResult)
      ? 'demo'
      : isConnected && isAnalyzing
        ? 'live'
        : 'paused';

  // What the card says before there's a result to call
  const idle: IdleState = !isConnected
    ? {
        phase: 'OFFLINE',
        headline: 'Backend not connected',
        detail: `Start it on port 3001, then retry.`,
        action: { label: 'Retry', onClick: handleRetryConnection },
      }
    : !regionSelected
      ? {
          phase: 'SETUP',
          headline: 'Set the capture region',
          detail: 'Point it at the part of your screen that shows the card and the bid.',
          action: { label: 'Set region', kbd: 'R', onClick: () => setShowSetup(true) },
        }
      : isAnalyzing
        ? {
            phase: 'WATCHING',
            headline: 'Looking for a card',
            detail: 'A call appears once a card and its bid are read off the stream.',
          }
        : {
            phase: 'READY',
            headline: 'Ready to watch',
            detail: 'Start when the lot is up. It reads the card, pulls sold comps and makes the call.',
            action: { label: 'Start', kbd: 'S', onClick: handleStartAnalysis },
          };

  const isReplaying = vodMode && isAnalyzing;
  const islandVerdict = displayedResult ? readVerdict(displayedResult, resultSource, Date.now()) : null;
  const showIsland = !isWide && cardOutOfView && isScrolled;
  const micOn = isAnalyzing && audioActive;
  const sheetTitle = displayedResult?.lot_number ? `Evidence · ${formatLot(displayedResult.lot_number)}` : 'Evidence';
  const evidence = <Evidence result={displayedResult} source={resultSource} showTitle={isWide} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className={`toolbar${isScrolled ? ' is-scrolled' : ''}${showIsland ? ' has-island' : ''}`}>
          <h1 className="wordmark">Joshinator</h1>

          <div className="toolbar-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {showIsland ? (
                <motion.button
                  key="island"
                  type="button"
                  className="toolbar-island"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  aria-label="Back to the verdict"
                  initial={MATERIAL_HIDDEN}
                  animate={MATERIAL_SHOWN}
                  exit={MATERIAL_HIDDEN}
                  transition={SPRING}
                >
                  {islandVerdict ? (
                    <Island {...islandPropsFor(islandVerdict)} />
                  ) : (
                    <Island signal="GRAY" word={idle.phase} />
                  )}
                </motion.button>
              ) : (
                <motion.ul
                  key="status"
                  className="status-list"
                  aria-label="Status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                >
                  <li className={`status-token ${isConnected ? 'is-on' : 'is-off'}`}>
                    {isConnected ? <Link2 size={15} strokeWidth={2.25} aria-hidden /> : <Link2Off size={15} strokeWidth={2.25} aria-hidden />}
                    <span className="status-token-label">Link</span>
                    <span className="visually-hidden">{isConnected ? ' connected' : ' disconnected'}</span>
                  </li>
                  <li className={`status-token ${micOn ? 'is-on' : 'is-off'}`}>
                    {micOn ? <Mic size={15} strokeWidth={2.25} aria-hidden /> : <MicOff size={15} strokeWidth={2.25} aria-hidden />}
                    <span className="status-token-label">Mic</span>
                    <span className="visually-hidden">{micOn ? ' on' : ' off'}</span>
                  </li>
                  <li
                    className={`status-token ${regionSelected ? 'is-on' : 'is-off'}`}
                    title={regionSelected ? `${regionInputs.width}×${regionInputs.height} at (${regionInputs.left}, ${regionInputs.top})` : 'No capture region set'}
                  >
                    <ScanLine size={15} strokeWidth={2.25} aria-hidden />
                    <span className="status-token-label">{regionSelected ? `${regionInputs.width}×${regionInputs.height}` : 'Region'}</span>
                    <span className="visually-hidden">{regionSelected ? ' capture region set' : ' not set'}</span>
                  </li>
                  {isReplaying && <li className="status-token status-flag">Replay</li>}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              onClick={handleToggleSetup}
              disabled={!isConnected || isAnalyzing}
              className={`btn btn-secondary${showSetup ? ' is-active' : ''}`}
              aria-expanded={showSetup}
              aria-controls="setup-popover"
            >
              <SlidersHorizontal size={15} strokeWidth={2.25} aria-hidden />
              <span className="btn-label">Setup</span><kbd>R</kbd>
            </button>
            {!isAnalyzing ? (
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!isConnected || !regionSelected}
                className="btn btn-primary"
                title={!regionSelected ? 'Set a capture region first' : 'Start watching the region'}
              >
                <Play size={14} strokeWidth={2.5} fill="currentColor" aria-hidden />
                Start<kbd>S</kbd>
              </button>
            ) : (
              <button type="button" onClick={handleStopAnalysis} className="btn btn-stop">
                <Square size={12} strokeWidth={2.5} fill="currentColor" aria-hidden />
                Stop<kbd>S</kbd>
              </button>
            )}
          </div>

        </header>

        <AnimatePresence>
          {showSetup && (
            <motion.section
              className="setup-popover"
              id="setup-popover"
              aria-label="Setup"
              initial={MATERIAL_HIDDEN}
              animate={MATERIAL_SHOWN}
              exit={MATERIAL_HIDDEN}
              transition={SPRING}
            >
              <div className="setup-group">
                <h2 className="setup-title">Capture region</h2>
                <div className="segmented" role="group" aria-label="Region presets">
                  {REGION_PRESETS.map(p => {
                    const active = (['top', 'left', 'width', 'height'] as const).every(k => regionInputs[k] === p.region[k]);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        className={`segment${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => setRegionInputs(p.region)}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <div className="setup-fields">
                  {(['top', 'left', 'width', 'height'] as const).map(field => (
                    <label key={field} className="field">
                      <span className="field-label">{field[0].toUpperCase() + field.slice(1)}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={field === 'width' || field === 'height' ? 100 : 0}
                        step={1}
                        value={Number.isFinite(regionInputs[field]) ? regionInputs[field] : ''}
                        onChange={e => setRegionInputs(r => ({ ...r, [field]: parseRegionValue(e.target.value) }))}
                      />
                    </label>
                  ))}
                </div>
                <div className="setup-preview">
                  <StreamViewer frameData={frameData} isAnalyzing={isAnalyzing} regionSelected={regionSelected} variant="preview" />
                  {frameData && <p className="setup-caption">Frame {frameData.timestamp}</p>}
                </div>
                <div className="setup-actions">
                  <button type="button" className="btn btn-plain btn-compact" onClick={() => setShowSetup(false)}>Cancel<kbd>Esc</kbd></button>
                  <button type="button" className="btn btn-primary btn-compact" onClick={handleApplyRegion}>Apply region</button>
                </div>
              </div>

              <div className="setup-group">
                <h2 className="setup-title">
                  <Film size={15} strokeWidth={2.25} aria-hidden />Replay a recording
                </h2>
                <label className="field field-wide">
                  <span className="field-label">Video file path</span>
                  <input
                    type="text"
                    placeholder="/path/to/recording.mp4"
                    value={vodPath}
                    onChange={e => { setVodPath(e.target.value); setVodMode(true); }}
                    disabled={isAnalyzing}
                  />
                </label>
                <div className="setup-actions">
                  {vodStatus && <span className="setup-caption" role="status">{vodStatus}</span>}
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    disabled={!vodPath || isAnalyzing}
                    onClick={() => { setVodMode(true); setVodStatus('Loading…'); socketService.loadVOD(vodPath); }}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    disabled={!vodStatus || isAnalyzing || !isConnected}
                    onClick={() => { setIsAnalyzing(true); setShowSetup(false); socketService.startVODReplay(); }}
                  >
                    Replay
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <main className={`board${isWide && evidenceOpen ? ' has-inspector' : ''}`}>
          <motion.div className="stage" layoutScroll>
            {connectionError && (
              <div className="notice" role="alert">
                <Link2Off className="notice-icon" size={18} strokeWidth={2.25} aria-hidden />
                <p className="notice-text">{connectionError}</p>
                <div className="notice-actions">
                  <button type="button" onClick={handleRetryConnection} className="btn btn-secondary btn-compact">
                    <RotateCw size={14} strokeWidth={2.25} aria-hidden />Retry
                  </button>
                  <button type="button" onClick={clearConnectionError} className="icon-btn" aria-label="Dismiss connection error">
                    <X size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="notice" role="alert">
                <p className="notice-text">{error}</p>
                <div className="notice-actions">
                  <button type="button" onClick={clearError} className="icon-btn" aria-label="Dismiss message">
                    <X size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {selectedHistoryResult && (
              <div className="viewing-bar" role="status">
                <span className="viewing-bar-text">
                  Viewing {formatLot(selectedHistoryResult.lot_number) || 'a past lot'} · {formatClockTime(selectedHistoryResult.received_at)}
                </span>
                <button type="button" className="btn btn-primary btn-compact" onClick={() => setSelectedHistoryResult(null)}>
                  Back to live<kbd>Esc</kbd>
                </button>
              </div>
            )}

              <div ref={cardRef}>
                <AnalysisDisplay
                  result={displayedResult}
                  isAnalyzing={isAnalyzing && !selectedHistoryResult}
                  source={resultSource}
                  idle={idle}
                  thumbnail={
                    selectedHistoryResult || resultSource === 'demo' ? undefined : (
                      <StreamViewer frameData={frameData} isAnalyzing={isAnalyzing} regionSelected={regionSelected} />
                    )
                  }
                  onOpenEvidence={isWide ? undefined : toggleEvidence}
                  evidenceExpanded={evidenceOpen}
                />
              </div>

              <ResultsTicker
                history={analysisHistory}
                selected={selectedHistoryResult}
                onSelect={setSelectedHistoryResult}
                onClear={handleClearHistory}
              />
          </motion.div>

          {isWide && evidenceOpen && (
            <aside className="inspector" aria-label="Evidence">
              {evidence}
            </aside>
          )}
        </main>

        <footer className="footer">
          <span>Watch-only. It never places bids.</span>
          {sessionId && <span title={sessionId}>Session {sessionId.slice(0, 8)}</span>}
          <span className="footer-keys" aria-label="Keyboard shortcuts">
            <span><kbd>S</kbd> Start/stop</span>
            <span><kbd>R</kbd> Setup</span>
            <span><kbd>E</kbd> Evidence</span>
            <span><kbd>Esc</kbd> Back</span>
            {DEMO_MODE && <span><kbd>N</kbd> Next sample lot</span>}
          </span>
        </footer>

        {!isWide && (
          <EvidenceSheet open={evidenceOpen} onClose={() => setEvidenceOpen(false)} title={sheetTitle}>
            {evidence}
          </EvidenceSheet>
        )}

        <AnimatePresence>
          {clearedHistory && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              transition={SPRING}
            >
              <span>Cleared {clearedHistory.length} {clearedHistory.length === 1 ? 'lot' : 'lots'}</span>
              <button type="button" className="btn btn-plain btn-compact toast-undo" onClick={handleUndoClear}>Undo</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default App;
