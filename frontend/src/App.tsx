// frontend/src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import socketService from './services/socketService';
import StreamViewer from './components/StreamViewer';
import AnalysisDisplay from './components/AnalysisDisplay';
import { AnalysisResult, FrameData, SocketError } from './types';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [regionSelected, setRegionSelected] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [audioActive, setAudioActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vodMode, setVodMode] = useState(false);
  const [vodPath, setVodPath] = useState('');
  const [vodStatus, setVodStatus] = useState<string | null>(null);
  const [showRegionPanel, setShowRegionPanel] = useState(false);
  const [regionInputs, setRegionInputs] = useState({ top: 100, left: 100, width: 1200, height: 800 });
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<AnalysisResult | null>(null);

  const handleFrameData = useCallback((data: FrameData) => {
    setFrameData(data);
  }, []);

  const handleAnalysisResult = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
    setAnalysisHistory(prev => [result, ...prev.slice(0, 9)]);
    setAudioActive(!!(result as any).audio_status?.is_active);
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

      socket.on('connect_error', (error: any) => {
        if (mounted) {
          setConnectionError(`Connection failed: ${error.message}`);
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
        if (mounted) setVodStatus(`Loaded — ${data.duration_seconds.toFixed(1)}s, ${data.frame_count} frames`);
      });
      socketService.onVODReplayComplete(() => {
        if (mounted) { setIsAnalyzing(false); setVodStatus('Replay complete'); }
      });

    } catch (err) {
      if (mounted) {
        setConnectionError('Failed to initialize socket connection');
        console.error('Socket initialization error:', err);
      }
    }

    return () => {
      mounted = false;
      socketService.disconnect();
    };
  }, [handleFrameData, handleAnalysisResult, handleSocketError]);

  const handleStartAnalysis = useCallback(() => {
    if (!isConnected) { setError('Not connected to backend'); return; }
    if (!regionSelected) { setError('Please select a screen region first'); return; }
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    socketService.startAnalysis();
  }, [isConnected, regionSelected]);

  const handleStopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    socketService.stopAnalysis();
  }, []);

  const handleSelectRegion = useCallback(() => {
    if (!isConnected) { setError('Not connected to backend'); return; }
    setShowRegionPanel(prev => !prev);
  }, [isConnected]);

  const handleApplyRegion = useCallback(() => {
    if (regionInputs.width <= 0 || regionInputs.height <= 0) {
      setError('Width and height must be greater than 0');
      return;
    }
    setRegionSelected(false);
    socketService.selectRegion(regionInputs);
    setShowRegionPanel(false);
  }, [regionInputs]);

  const applyPreset = useCallback((preset: { top: number; left: number; width: number; height: number }) => {
    setRegionInputs(preset);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearConnectionError = useCallback(() => setConnectionError(null), []);

  const handleRetryConnection = useCallback(() => {
    clearConnectionError();
    window.location.reload();
  }, [clearConnectionError]);

  const analysisDisplayRef = useRef<HTMLDivElement>(null);

  const displayedResult = selectedHistoryResult ?? analysisResult;

  // Scroll analysis panel to top whenever the displayed result changes
  useEffect(() => {
    analysisDisplayRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [displayedResult]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🃏 Joshinator</h1>
          <div className="header-info">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-indicator">{isConnected ? '🟢' : '🔴'}</span>
              <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {isAnalyzing && (
              <div className="analyzing-indicator">
                <span className="spinner-small"></span>
                <span>Analyzing...</span>
              </div>
            )}
            {isAnalyzing && (
              <div className={`mic-indicator ${audioActive ? 'mic-on' : 'mic-off'}`}>
                <span>MIC</span>
                <span>{audioActive ? 'ON' : 'OFF'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="App-main">
        <div className="controls-section">
          {/* Primary row — core workflow */}
          <div className="controls-primary">
            <div className="controls-left">
              <button
                onClick={handleSelectRegion}
                disabled={!isConnected || isAnalyzing}
                className={`btn btn-outline ${regionSelected ? 'btn-success' : ''} ${showRegionPanel ? 'btn-active' : ''}`}
                title="Configure the screen region to capture"
              >
                📍 {regionSelected ? 'Region ✓' : 'Select Region'}
              </button>
              {regionSelected && !showRegionPanel && (
                <span className="region-coords-badge">
                  {regionInputs.width}×{regionInputs.height} @ ({regionInputs.left}, {regionInputs.top})
                </span>
              )}
              {!isAnalyzing ? (
                <button
                  onClick={handleStartAnalysis}
                  disabled={!isConnected || !regionSelected}
                  className="btn btn-primary"
                  title="Start analyzing the selected region"
                >
                  ▶ Start Analysis
                </button>
              ) : (
                <button
                  onClick={handleStopAnalysis}
                  className="btn btn-secondary"
                  title="Stop the current analysis"
                >
                  ⏹ Stop
                </button>
              )}
            </div>
            <div className="controls-right">
              <button
                onClick={() => setShowHistorySidebar(v => !v)}
                className={`btn btn-outline btn-small ${showHistorySidebar ? 'btn-active' : ''}`}
                title="Toggle history sidebar"
              >
                📋 History {analysisHistory.length > 0 && `(${analysisHistory.length})`}
              </button>
              <button
                onClick={() => { setVodMode(v => !v); setVodStatus(null); }}
                disabled={isAnalyzing}
                className={`btn btn-outline btn-small ${vodMode ? 'btn-success' : ''}`}
                title="Toggle VOD replay mode"
              >
                🎬 {vodMode ? 'VOD ON' : 'VOD'}
              </button>
            </div>
          </div>

          {/* Region config panel */}
          {showRegionPanel && (
            <div className="region-panel">
              <div className="region-presets">
                <span className="region-label">Presets:</span>
                <button className="btn btn-outline btn-small" onClick={() => applyPreset({ top: 80, left: 0, width: 1280, height: 720 })}>Whatsnot Browser</button>
                <button className="btn btn-outline btn-small" onClick={() => applyPreset({ top: 0, left: 0, width: 1920, height: 1080 })}>Full Screen (1080p)</button>
                <button className="btn btn-outline btn-small" onClick={() => applyPreset({ top: 0, left: 0, width: 2560, height: 1440 })}>Full Screen (1440p)</button>
              </div>
              <div className="region-inputs">
                <label>Top<input type="number" value={regionInputs.top} onChange={e => setRegionInputs(r => ({ ...r, top: +e.target.value }))} /></label>
                <label>Left<input type="number" value={regionInputs.left} onChange={e => setRegionInputs(r => ({ ...r, left: +e.target.value }))} /></label>
                <label>Width<input type="number" value={regionInputs.width} onChange={e => setRegionInputs(r => ({ ...r, width: +e.target.value }))} /></label>
                <label>Height<input type="number" value={regionInputs.height} onChange={e => setRegionInputs(r => ({ ...r, height: +e.target.value }))} /></label>
                <button className="btn btn-primary btn-small" onClick={handleApplyRegion}>Apply</button>
                <button className="btn btn-outline btn-small" onClick={() => setShowRegionPanel(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* VOD panel */}
          {vodMode && (
            <div className="vod-controls">
              <input
                className="vod-path-input"
                type="text"
                placeholder="/path/to/recording.mp4"
                value={vodPath}
                onChange={e => setVodPath(e.target.value)}
                disabled={isAnalyzing}
              />
              <button
                className="btn btn-outline btn-small"
                disabled={!vodPath || isAnalyzing}
                onClick={() => { setVodStatus('Loading…'); socketService.loadVOD(vodPath); }}
              >
                Load
              </button>
              <button
                className="btn btn-primary btn-small"
                disabled={!vodStatus || isAnalyzing || !isConnected}
                onClick={() => { setIsAnalyzing(true); socketService.startVODReplay(); }}
              >
                ▶ Replay
              </button>
              {vodStatus && <span className="vod-status">{vodStatus}</span>}
            </div>
          )}

          {/* Frame counter */}
          {frameData && (
            <div className="status-info">
              <span className="frame-info">📸 Frame #{frameData.timestamp}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {connectionError && (
          <div className="alert alert-error">
            <div className="alert-content">
              <strong>Connection Error:</strong> {connectionError}
              <button onClick={clearConnectionError} className="alert-close">×</button>
            </div>
            <div className="alert-actions">
              <button onClick={handleRetryConnection} className="btn btn-small">Retry Connection</button>
            </div>
          </div>
        )}
        {error && (
          <div className="alert alert-warning">
            <div className="alert-content">
              <strong>Error:</strong> {error}
              <button onClick={clearError} className="alert-close">×</button>
            </div>
          </div>
        )}
        {!isConnected && !connectionError && (
          <div className="alert alert-info">
            <div className="alert-content">
              <strong>Getting Started:</strong> Make sure the backend server is running on port 3001
            </div>
          </div>
        )}
        {isConnected && !regionSelected && !isAnalyzing && (
          <div className="alert alert-info">
            <div className="alert-content">
              <strong>Setup Required:</strong> Click "Select Region" to choose the area of your screen to monitor
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className={`content-grid ${showHistorySidebar ? 'sidebar-open' : ''}`}>
          <div className="stream-section">
            <div className="section-header">
              <h2>📺 Live Stream</h2>
              <div className="section-status">
                {frameData ? (
                  <span className="status-active">🔴 Live</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">⏳ Waiting...</span>
                ) : (
                  <span className="status-inactive">⚫ Inactive</span>
                )}
              </div>
            </div>
            <StreamViewer
              frameData={frameData}
              isAnalyzing={isAnalyzing}
              regionSelected={regionSelected}
            />
          </div>

          <div className="analysis-section" ref={analysisDisplayRef}>
            <div className="section-header">
              <h2>📊 Analysis {selectedHistoryResult ? '(History)' : 'Results'}</h2>
              <div className="section-status">
                {selectedHistoryResult ? (
                  <span className="status-waiting">📂 Viewing past result</span>
                ) : displayedResult ? (
                  <span className="status-active">✅ Results Available</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">🔍 Processing...</span>
                ) : (
                  <span className="status-inactive">⚫ No Data</span>
                )}
              </div>
            </div>
            <AnalysisDisplay
              result={displayedResult}
              isAnalyzing={isAnalyzing && !selectedHistoryResult}
            />
          </div>

          {/* History sidebar */}
          {showHistorySidebar && (
            <div className="history-sidebar">
              <div className="sidebar-header">
                <span>History</span>
                <button
                  className="sidebar-close"
                  onClick={() => { setShowHistorySidebar(false); setSelectedHistoryResult(null); }}
                >×</button>
              </div>

              {analysisHistory.length === 0 ? (
                <p className="sidebar-empty">No results yet</p>
              ) : (
                <>
                  {analysisHistory.map((result, i) => {
                    const signal = (result as any).roi_analysis?.signal ?? 'GRAY';
                    const player = (result as any).card_info?.player_name || 'Unknown';
                    const grade = (result as any).card_info?.grade || '';
                    const bid = (result as any).auction_info?.current_bid ?? 0;
                    return (
                      <div
                        key={i}
                        className={`sidebar-item ${selectedHistoryResult === result ? 'sidebar-item-active' : ''}`}
                        onClick={() => setSelectedHistoryResult(r => r === result ? null : result)}
                      >
                        <span className={`signal-pip signal-pip-${signal}`} />
                        <div className="sidebar-item-info">
                          <span className="sidebar-player" title={player}>{player}</span>
                          <span className="sidebar-meta">
                            {grade && `${grade} · `}${bid > 0 ? `$${bid}` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="sidebar-actions">
                    {selectedHistoryResult && (
                      <button className="btn btn-outline btn-small" onClick={() => setSelectedHistoryResult(null)}>
                        ← Live
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => { setAnalysisHistory([]); setSelectedHistoryResult(null); }}
                    >
                      🗑 Clear
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <footer className="app-footer">
          <div className="footer-content">
            <span>Joshinator v1.0</span>
            <span>•</span>
            <span>Real-time OCR & ROI Analysis</span>
            <span>•</span>
            <span>{isConnected ? `Connected to ${window.location.hostname}:3001` : 'Backend Offline'}</span>
            {sessionId && (
              <>
                <span>•</span>
                <span title={sessionId}>Session {sessionId.slice(0, 8)}</span>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
