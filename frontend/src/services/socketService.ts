// frontend/src/services/socketService.ts
import io from 'socket.io-client';
import { AnalysisResult } from '../types';

class SocketService {
  private socket: any = null;
  
  connect(): any {
    this.socket = io('http://localhost:3001');
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Screen capture region selection
  selectRegion(region?: { top: number; left: number; width: number; height: number }): void {
    if (this.socket) {
      this.socket.emit('select_region', region ?? {});
    }
  }

  // Start analysis
  startAnalysis(): void {
    if (this.socket) {
      this.socket.emit('start_analysis');
    }
  }

  // Stop analysis
  stopAnalysis(): void {
    if (this.socket) {
      this.socket.emit('stop_analysis');
    }
  }

  // Event listeners
  onFrame(callback: (data: { image: string; timestamp: number }) => void): void {
    if (this.socket) {
      this.socket.on('frame', callback);
    }
  }

  onAnalysisResult(callback: (result: AnalysisResult) => void): void {
    if (this.socket) {
      this.socket.on('analysis_result', callback);
    }
  }

  onRegionSelected(callback: (data: { success: boolean; region?: any; message: string }) => void): void {
    if (this.socket) {
      this.socket.on('region_selected', callback);
    }
  }

  onError(callback: (error: { message: string }) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  onSessionStarted(callback: (data: { session_id: string }) => void): void {
    if (this.socket) {
      this.socket.on('session_started', callback);
    }
  }

  // VOD replay
  loadVOD(path: string): void {
    if (this.socket) {
      this.socket.emit('load_vod', { path });
    }
  }

  startVODReplay(): void {
    if (this.socket) {
      this.socket.emit('start_vod_replay');
    }
  }

  onVODLoaded(callback: (data: { success: boolean; frame_count: number; fps: number; duration_seconds: number }) => void): void {
    if (this.socket) {
      this.socket.on('vod_loaded', callback);
    }
  }

  onVODReplayComplete(callback: (data: { message: string }) => void): void {
    if (this.socket) {
      this.socket.on('vod_replay_complete', callback);
    }
  }

  // Remove listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket(): any {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;