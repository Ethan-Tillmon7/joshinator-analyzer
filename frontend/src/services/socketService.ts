// frontend/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { AnalysisResult } from '../types';

class SocketService {
  private socket: Socket | null = null;
  
  connect(): Socket {
    this.socket = io('http://localhost:3001');
    
    this.socket.on('connect', () => {
      console.log('Connected to backend');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from backend');
    });
    
    return this.socket;
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  selectRegion(): void {
    if (this.socket) {
      this.socket.emit('select_region');
    }
  }
  
  startAnalysis(): void {
    if (this.socket) {
      this.socket.emit('start_analysis');
    }
  }
  
  stopAnalysis(): void {
    if (this.socket) {
      this.socket.emit('stop_analysis');
    }
  }
  
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
  
  onError(callback: (error: { message: string }) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }
}

// Create and export a named instance to fix ESLint warning
const socketServiceInstance = new SocketService();
export default socketServiceInstance;