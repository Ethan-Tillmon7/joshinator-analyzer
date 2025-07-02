import { io, Socket } from 'socket.io-client';
import { AnalysisResult } from '../types';

class SocketService {
  private socket: Socket | null = null;
  
  connect(url: string = 'http://localhost:8000') {
    this.socket = io(url, {
      transports: ['websocket']
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    return this.socket;
  }
  
  startAnalysis() {
    if (this.socket) {
      this.socket.emit('start_analysis', {});
    }
  }
  
  stopAnalysis() {
    if (this.socket) {
      this.socket.emit('stop_analysis');
    }
  }
  
  onFrame(callback: (data: { image: string; timestamp: number }) => void) {
    if (this.socket) {
      this.socket.on('frame', callback);
    }
  }
  
  onAnalysisResult(callback: (result: AnalysisResult) => void) {
    if (this.socket) {
      this.socket.on('analysis_result', callback);
    }
  }
  
  onError(callback: (error: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

const socketService = new SocketService();
export default socketService;
