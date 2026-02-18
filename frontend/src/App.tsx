// frontend/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Memoized callbacks to prevent unnecessary re-renders
  const handleFrameData = useCallback((data: FrameData) => {
    setFrameData(data);
  }, []);

  const handleAnalysisResult = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
    setAnalysisHistory(prev => [result, ...prev.slice(0, 9)]);
    setAudioActive(!!(result as any).audio_status?.is_active);
  }, []);

  const handleSocketError = useCallback((err: SocketError) => {
    setError(err.message);
    console.error('Socket error:', err.message);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Connect to backend
    try {
      const socket = socketService.connect();
      
      socket.on('connect', () => {
        if (mounted) {
          setIsConnected(true);
          setConnectionError(null);
          console.log('Successfully connected to backend');
        }
      });

      socket.on('disconnect', (reason: string) => {
        if (mounted) {
          setIsConnected(false);
          setIsAnalyzing(false);
          console.log('Disconnected from backend:', reason);
          
          // Auto-reconnect unless it's a manual disconnect
          if (reason === 'io server disconnect') {
            socket.connect();
          }
        }
      });

      socket.on('connect_error', (error: any) => {
        if (mounted) {
          setConnectionError(`Connection failed: ${error.message}`);
          setIsConnected(false);
        }
      });

      socket.on('region_selected', () => {
        if (mounted) {
          setRegionSelected(true);
          console.log('Screen region selected successfully');
        }
      });
      
      // Set up event listeners
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
    if (!isConnected) {
      setError('Not connected to backend');
      return;
    }
    
    if (!regionSelected) {
      setError('Please select a screen region first');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    socketService.startAnalysis();
    console.log('Starting analysis...');
  }, [isConnected, regionSelected]);
  
  const handleStopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    socketService.stopAnalysis();
    console.log('Stopping analysis...');
  }, []);

  const handleSelectRegion = useCallback(() => {
    if (!isConnected) {
      setError('Not connected to backend');
      return;
    }
    
    setRegionSelected(false);
    socketService.selectRegion();
    console.log('Selecting screen region...');
  }, [isConnected]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearConnectionError = useCallback(() => {
    setConnectionError(null);
  }, []);

  const handleRetryConnection = useCallback(() => {
    clearConnectionError();
    window.location.reload();
  }, [clearConnectionError]);

  const clearAnalysisHistory = useCallback(() => {
    setAnalysisHistory([]);
    console.log('Analysis history cleared');
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🃏 Joshinator</h1>
          <div className="header-info">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-indicator">
                {isConnected ? '🟢' : '🔴'}
              </span>
              <span className="status-text">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {regionSelected && (
              <div className="region-status">
                <span className="status-indicator">📱</span>
                <span className="status-text">Region Selected</span>
              </div>
            )}
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
          <div className="control-group">
            <button 
              onClick={handleSelectRegion}
              disabled={!isConnected}
              className={`btn btn-outline ${regionSelected ? 'btn-success' : ''}`}
              title="Select the screen region to monitor"
            >
              📱 {regionSelected ? 'Region Selected' : 'Select Region'}
            </button>
            
            <button 
              onClick={handleStartAnalysis} 
              disabled={!isConnected || isAnalyzing || !regionSelected}
              className="btn btn-primary"
              title="Start analyzing the selected region"
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🚀 Start Analysis'}
            </button>
            
            <button 
              onClick={handleStopAnalysis} 
              disabled={!isAnalyzing}
              className="btn btn-secondary"
              title="Stop the current analysis"
            >
              ⏹️ Stop Analysis
            </button>

            {analysisHistory.length > 0 && (
              <button
                onClick={clearAnalysisHistory}
                disabled={isAnalyzing}
                className="btn btn-outline btn-small"
                title="Clear analysis history"
              >
                🗑️ Clear History
              </button>
            )}
            <button
              onClick={() => { setVodMode(v => !v); setVodStatus(null); }}
              disabled={isAnalyzing}
              className={`btn btn-outline btn-small ${vodMode ? 'btn-success' : ''}`}
              title="Toggle VOD replay mode"
            >
              🎬 {vodMode ? 'VOD ON' : 'VOD'}
            </button>
          </div>

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
          
          <div className="status-info">
            {frameData && (
              <div className="frame-info">
                <span>📸 Frame #{frameData.timestamp}</span>
                <span className="timestamp">
                  {new Date(frameData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
            {analysisHistory.length > 0 && (
              <div className="history-info">
                <span>📊 {analysisHistory.length} analysis result{analysisHistory.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Connection Error */}
        {connectionError && (
          <div className="alert alert-error">
            <div className="alert-content">
              <strong>Connection Error:</strong> {connectionError}
              <button onClick={clearConnectionError} className="alert-close">×</button>
            </div>
            <div className="alert-actions">
              <button 
                onClick={handleRetryConnection} 
                className="btn btn-small"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}
        
        {/* General Error */}
        {error && (
          <div className="alert alert-warning">
            <div className="alert-content">
              <strong>Error:</strong> {error}
              <button onClick={clearError} className="alert-close">×</button>
            </div>
          </div>
        )}
        
        {/* Help Message */}
        {!isConnected && !connectionError && (
          <div className="alert alert-info">
            <div className="alert-content">
              <strong>Getting Started:</strong> Make sure the backend server is running on port 3001
            </div>
          </div>
        )}

        {/* Setup Guide */}
        {isConnected && !regionSelected && !isAnalyzing && (
          <div className="alert alert-info">
            <div className="alert-content">
              <strong>Setup Required:</strong> Click "Select Region" to choose the area of your screen to monitor for auction data
            </div>
          </div>
        )}
        
        <div className="content-grid">
          <div className="stream-section">
            <div className="section-header">
              <h2>📺 Live Stream</h2>
              <div className="section-status">
                {frameData ? (
                  <span className="status-active">🔴 Live</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">⏳ Waiting for frames...</span>
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
          
          <div className="analysis-section">
            <div className="section-header">
              <h2>📊 Analysis Results</h2>
              <div className="section-status">
                {analysisResult ? (
                  <span className="status-active">✅ Results Available</span>
                ) : isAnalyzing ? (
                  <span className="status-waiting">🔍 Processing...</span>
                ) : (
                  <span className="status-inactive">⚫ No Data</span>
                )}
              </div>
            </div>
            <AnalysisDisplay 
              result={analysisResult} 
              isAnalyzing={isAnalyzing}
              history={analysisHistory}
            />
          </div>
        </div>
        
        {/* Footer with app info */}
        <footer className="app-footer">
          <div className="footer-content">
            <span>Joshinator v1.0</span>
            <span>•</span>
            <span>Real-time OCR & ROI Analysis</span>
            <span>•</span>
            <span>
              {isConnected ? 
                `Connected to ${window.location.hostname}:3001` : 
                'Backend Offline'
              }
            </span>
            {analysisHistory.length > 0 && (
              <>
                <span>•</span>
                <span>{analysisHistory.length} analysis results stored</span>
              </>
            )}
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