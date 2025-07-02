import React, { useState, useEffect } from 'react';
import socketService from './services/socketService';
import StreamViewer from './components/StreamViewer';
import AnalysisDisplay from './components/AnalysisDisplay';
import { AnalysisResult } from './types';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameData, setFrameData] = useState<{ image: string; timestamp: number } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Connect to backend
    const socket = socketService.connect();
    
    socket.on('connected', () => {
      setIsConnected(true);
    });
    
    // Set up event listeners
    socketService.onFrame(setFrameData);
    socketService.onAnalysisResult(setAnalysisResult);
    socketService.onError((err) => setError(err.message));
    
    return () => {
      socketService.disconnect();
    };
  }, []);
  
  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setError(null);
    socketService.startAnalysis();
  };
  
  const handleStopAnalysis = () => {
    setIsAnalyzing(false);
    socketService.stopAnalysis();
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sports Card Auction Analyzer</h1>
        <div className="connection-status">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>
      
      <main className="App-main">
        <div className="controls">
          <button 
            onClick={handleStartAnalysis} 
            disabled={!isConnected || isAnalyzing}
            className="btn btn-primary"
          >
            Start Analysis
          </button>
          <button 
            onClick={handleStopAnalysis} 
            disabled={!isAnalyzing}
            className="btn btn-secondary"
          >
            Stop Analysis
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}
        
        <div className="content-grid">
          <div className="stream-section">
            <StreamViewer frameData={frameData} />
          </div>
          
          <div className="analysis-section">
            <AnalysisDisplay result={analysisResult} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
