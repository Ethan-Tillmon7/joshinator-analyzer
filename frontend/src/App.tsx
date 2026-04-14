// frontend/src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import socketService from './services/socketService';
import StreamViewer from './components/StreamViewer';
import AnalysisDisplay from './components/AnalysisDisplay';
import { AnalysisResult, FrameData, SocketError } from './types';
import './App.css';

const MOCK_RESULTS: AnalysisResult[] = [
  // 1 — Mike Trout 2011 Topps Update RC PSA 9 · BUY
  {
    card_info: {
      player_name: 'Mike Trout',
      year: '2011',
      set_name: 'Topps Update',
      card_number: 'US175',
      grade: 'PSA 9',
      parallel: 'Base',
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: 'CF',
      team: 'Los Angeles Angels',
      ocr_engine: 'mock',
    },
    auction_info: {
      current_bid: 145.00,
      time_remaining: '1:42',
      bid_count: 11,
      bidding_velocity: 'fast',
      starting_bid: 1.00,
      reserve_met: true,
      platform: 'Whatsnot',
      auction_id: 'mock-001',
      seller_rating: 4.9,
      shipping_cost: 5.00,
    },
    pricing_data: {
      prices: [172, 165, 190, 158, 185, 168, 195, 162],
      sale_dates: ['1d ago', '2d ago', '3d ago', '4d ago', '5d ago', '6d ago', '8d ago', '9d ago'],
      average: 174.38,
      median: 170.00,
      min: 158,
      max: 195,
      count: 24,
      standard_deviation: 12.4,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold', 'PSA APR', '130Point'],
    },
    market_trends: {
      price_trend: 8.3,
      volume_trend: 3.1,
      volatility: 0.12,
      last_updated: '2 min ago',
      seasonal_factor: 1.05,
      market_sentiment: 'bullish',
    },
    roi_analysis: {
      signal: 'GREEN',
      recommendation: 'BUY',
      confidence: 0.87,
      roi_potential: 20.3,
      suggested_max_bid: 165.00,
      break_even_price: 152.00,
      profit_margin: 29.38,
      fair_value_range: { min: 158, max: 195, confidence: 0.87 },
      key_factors: [
        'Current bid is 17% below market average',
        'Rookie card with strong long-term demand',
        'PSA 9 is the most liquid grade for this card',
        'High bidding velocity — price may still climb',
        'Market trending up +8.3% over the last 30 days',
      ],
      risk_factors: [
        'Active bidding war may push price above fair value',
        'PSA 10 copies trade at a significant premium',
      ],
      risk_level: 'low',
      deal_score: 82,
      comp_count: 24,
      insufficient_data_reason: null,
    },
    confidence: 0.92,
    timestamp: 5,
    processing_time: 1.24,
    analysis_version: 'mock',
  },

  // 2 — Shohei Ohtani 2018 Topps Update RC PSA 10 · STRONG BUY
  {
    card_info: {
      player_name: 'Shohei Ohtani',
      year: '2018',
      set_name: 'Topps Update',
      card_number: 'US1',
      grade: 'PSA 10',
      parallel: 'Base',
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: 'SP/DH',
      team: 'Los Angeles Angels',
      ocr_engine: 'mock',
    },
    auction_info: {
      current_bid: 88.00,
      time_remaining: '0:31',
      bid_count: 7,
      bidding_velocity: 'normal',
      starting_bid: 1.00,
      reserve_met: true,
      platform: 'Whatsnot',
      auction_id: 'mock-002',
      seller_rating: 4.8,
      shipping_cost: 5.00,
    },
    pricing_data: {
      prices: [135, 128, 142, 119, 138, 131, 145, 122],
      sale_dates: ['2d ago', '3d ago', '3d ago', '5d ago', '6d ago', '7d ago', '9d ago', '11d ago'],
      average: 132.50,
      median: 131.50,
      min: 119,
      max: 145,
      count: 31,
      standard_deviation: 9.1,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold', 'PSA APR', '130Point'],
    },
    market_trends: {
      price_trend: 14.7,
      volume_trend: 8.2,
      volatility: 0.09,
      last_updated: '4 min ago',
      seasonal_factor: 1.12,
      market_sentiment: 'bullish',
    },
    roi_analysis: {
      signal: 'GREEN',
      recommendation: 'STRONG_BUY',
      confidence: 0.93,
      roi_potential: 50.6,
      suggested_max_bid: 120.00,
      break_even_price: 108.00,
      profit_margin: 44.50,
      fair_value_range: { min: 119, max: 145, confidence: 0.93 },
      key_factors: [
        'Bid is 34% below recent market average',
        'PSA 10 Ohtani RC demand accelerating post-WS win',
        'Highest sales volume of any comp in this grade',
        'Low volatility — price is stable and predictable',
        'Market up +14.7% — strong momentum',
      ],
      risk_factors: [
        'Short time remaining may not attract more bidders',
      ],
      risk_level: 'low',
      deal_score: 94,
      comp_count: 31,
      insufficient_data_reason: null,
    },
    confidence: 0.93,
    timestamp: 4,
    processing_time: 1.08,
    analysis_version: 'mock',
  },

  // 3 — Ronald Acuña Jr. 2018 Topps Chrome RC PSA 10 · WATCH
  {
    card_info: {
      player_name: 'Ronald Acuña Jr.',
      year: '2018',
      set_name: 'Topps Chrome',
      card_number: 'HMT31',
      grade: 'PSA 10',
      parallel: 'Base',
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: 'RF',
      team: 'Atlanta Braves',
      ocr_engine: 'mock',
    },
    auction_info: {
      current_bid: 210.00,
      time_remaining: '3:15',
      bid_count: 18,
      bidding_velocity: 'frenzied',
      starting_bid: 50.00,
      reserve_met: true,
      platform: 'Whatsnot',
      auction_id: 'mock-003',
      seller_rating: 5.0,
      shipping_cost: 5.00,
    },
    pricing_data: {
      prices: [218, 205, 230, 198, 215, 225, 208, 212],
      sale_dates: ['1d ago', '2d ago', '2d ago', '4d ago', '5d ago', '6d ago', '7d ago', '8d ago'],
      average: 213.88,
      median: 213.50,
      min: 198,
      max: 230,
      count: 19,
      standard_deviation: 10.2,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold', 'PSA APR', '130Point'],
    },
    market_trends: {
      price_trend: 2.1,
      volume_trend: -1.4,
      volatility: 0.17,
      last_updated: '1 min ago',
      seasonal_factor: 0.98,
      market_sentiment: 'neutral',
    },
    roi_analysis: {
      signal: 'YELLOW',
      recommendation: 'WATCH',
      confidence: 0.78,
      roi_potential: 1.8,
      suggested_max_bid: 200.00,
      break_even_price: 196.00,
      profit_margin: 3.88,
      fair_value_range: { min: 198, max: 230, confidence: 0.78 },
      key_factors: [
        'Bid is near market average — thin margin',
        'Frenzied bidding likely to push past fair value',
        'Moderate volatility reduces pricing confidence',
      ],
      risk_factors: [
        'Frenzied velocity — final price typically exceeds estimate',
        'ACL recovery timeline adds player risk',
        'Thin upside at current bid level',
      ],
      risk_level: 'medium',
      deal_score: 51,
      comp_count: 19,
      insufficient_data_reason: null,
    },
    confidence: 0.78,
    timestamp: 3,
    processing_time: 0.97,
    analysis_version: 'mock',
  },

  // 4 — Fernando Tatis Jr. 2019 Topps Chrome RC PSA 10 · BUY
  {
    card_info: {
      player_name: 'Fernando Tatis Jr.',
      year: '2019',
      set_name: 'Topps Chrome',
      card_number: '204',
      grade: 'PSA 10',
      parallel: 'Base',
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: 'SS',
      team: 'San Diego Padres',
      ocr_engine: 'mock',
    },
    auction_info: {
      current_bid: 62.00,
      time_remaining: '2:08',
      bid_count: 9,
      bidding_velocity: 'normal',
      starting_bid: 1.00,
      reserve_met: true,
      platform: 'Whatsnot',
      auction_id: 'mock-004',
      seller_rating: 4.7,
      shipping_cost: 5.00,
    },
    pricing_data: {
      prices: [82, 78, 91, 75, 85, 80, 88, 77],
      sale_dates: ['1d ago', '3d ago', '4d ago', '5d ago', '6d ago', '7d ago', '9d ago', '10d ago'],
      average: 82.00,
      median: 81.00,
      min: 75,
      max: 91,
      count: 28,
      standard_deviation: 5.7,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold', 'PSA APR', '130Point'],
    },
    market_trends: {
      price_trend: 5.9,
      volume_trend: 4.3,
      volatility: 0.11,
      last_updated: '6 min ago',
      seasonal_factor: 1.03,
      market_sentiment: 'bullish',
    },
    roi_analysis: {
      signal: 'GREEN',
      recommendation: 'BUY',
      confidence: 0.84,
      roi_potential: 24.2,
      suggested_max_bid: 75.00,
      break_even_price: 68.00,
      profit_margin: 20.00,
      fair_value_range: { min: 75, max: 91, confidence: 0.84 },
      key_factors: [
        'Bid is 24% below market average',
        'Return from suspension boosted demand significantly',
        'PSA 10 grade in high supply — easy to resell',
        'Low volatility indicates reliable price floor',
      ],
      risk_factors: [
        'Suspension history introduces long-term holding risk',
        'PSA 10 supply is relatively high, limiting scarcity premium',
      ],
      risk_level: 'low',
      deal_score: 78,
      comp_count: 28,
      insufficient_data_reason: null,
    },
    confidence: 0.84,
    timestamp: 2,
    processing_time: 1.11,
    analysis_version: 'mock',
  },

  // 5 — Juan Soto 2018 Topps Chrome RC PSA 9 · PASS
  {
    card_info: {
      player_name: 'Juan Soto',
      year: '2018',
      set_name: 'Topps Chrome',
      card_number: 'HMT53',
      grade: 'PSA 9',
      parallel: 'Base',
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: 'LF',
      team: 'New York Yankees',
      ocr_engine: 'mock',
    },
    auction_info: {
      current_bid: 95.00,
      time_remaining: '4:50',
      bid_count: 14,
      bidding_velocity: 'fast',
      starting_bid: 25.00,
      reserve_met: true,
      platform: 'Whatsnot',
      auction_id: 'mock-005',
      seller_rating: 4.6,
      shipping_cost: 5.00,
    },
    pricing_data: {
      prices: [72, 68, 75, 65, 71, 74, 69, 73],
      sale_dates: ['1d ago', '2d ago', '3d ago', '5d ago', '6d ago', '7d ago', '9d ago', '12d ago'],
      average: 70.88,
      median: 71.50,
      min: 65,
      max: 75,
      count: 16,
      standard_deviation: 3.4,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold', 'PSA APR', '130Point'],
    },
    market_trends: {
      price_trend: -3.2,
      volume_trend: -5.1,
      volatility: 0.08,
      last_updated: '3 min ago',
      seasonal_factor: 0.96,
      market_sentiment: 'bearish',
    },
    roi_analysis: {
      signal: 'RED',
      recommendation: 'PASS',
      confidence: 0.89,
      roi_potential: -25.3,
      suggested_max_bid: 65.00,
      break_even_price: 58.00,
      profit_margin: -24.12,
      fair_value_range: { min: 65, max: 75, confidence: 0.89 },
      key_factors: [
        'Current bid is 34% above market average',
        'Market trending down — prices softening',
        'PSA 9 Soto RC trades at a steep PSA 10 discount',
        'Low volatility confirms this price is an outlier',
      ],
      risk_factors: [
        'Bid already exceeds the high end of fair value range',
        'Declining volume trend suggests weakening demand',
        'Significant loss likely at current bid level',
      ],
      risk_level: 'high',
      deal_score: 18,
      comp_count: 16,
      insufficient_data_reason: null,
    },
    confidence: 0.89,
    timestamp: 1,
    processing_time: 0.88,
    analysis_version: 'mock',
  },
];

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(MOCK_RESULTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [regionSelected, setRegionSelected] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>(MOCK_RESULTS.slice(1));
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
          <h1>Joshinator</h1>
          <div className="header-info">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-indicator"></span>
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
                {regionSelected ? 'Region ✓' : 'Select Region'}
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
                  Start Analysis
                </button>
              ) : (
                <button
                  onClick={handleStopAnalysis}
                  className="btn btn-secondary"
                  title="Stop the current analysis"
                >
                  Stop
                </button>
              )}
            </div>
            <div className="controls-right">
              <button
                onClick={() => setShowHistorySidebar(v => !v)}
                className={`btn btn-outline btn-small ${showHistorySidebar ? 'btn-active' : ''}`}
                title="Toggle history sidebar"
              >
                History {analysisHistory.length > 0 && `(${analysisHistory.length})`}
              </button>
              <button
                onClick={() => { setVodMode(v => !v); setVodStatus(null); }}
                disabled={isAnalyzing}
                className={`btn btn-outline btn-small ${vodMode ? 'btn-success' : ''}`}
                title="Toggle VOD replay mode"
              >
                {vodMode ? 'VOD ON' : 'VOD'}
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
              <span className="frame-info">Frame #{frameData.timestamp}</span>
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
              <h2>Live Stream</h2>
              <div className="section-status">
                {frameData ? (
                  <span className="status-active">Live</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">Waiting...</span>
                ) : (
                  <span className="status-inactive">Inactive</span>
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
              <h2>Analysis {selectedHistoryResult ? '(History)' : 'Results'}</h2>
              <div className="section-status">
                {selectedHistoryResult ? (
                  <span className="status-waiting">Viewing past result</span>
                ) : displayedResult ? (
                  <span className="status-active">Results Available</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">Processing...</span>
                ) : (
                  <span className="status-inactive">No Data</span>
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
                      Clear
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
