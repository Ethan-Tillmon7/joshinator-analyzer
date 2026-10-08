import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// No backend in tests: the socket never connects, so the app should say so plainly.
jest.mock('./services/socketService', () => {
  const socket = { on: jest.fn(), connect: jest.fn() };
  return {
    __esModule: true,
    default: {
      connect: () => socket,
      disconnect: jest.fn(),
      getSocket: () => socket,
      onFrame: jest.fn(),
      onAnalysisResult: jest.fn(),
      onError: jest.fn(),
      onSessionStarted: jest.fn(),
      onVODLoaded: jest.fn(),
      onVODReplayComplete: jest.fn(),
    },
  };
});

test('without a backend the card reads OFFLINE and Start is disabled', () => {
  render(<App />);
  expect(screen.getByText('OFFLINE', { selector: '.verdict-word' })).toBeInTheDocument();
  expect(screen.getByText('Backend not connected')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Start/ })).toBeDisabled();
  expect(screen.getByText('Watch-only. It never places bids.')).toBeInTheDocument();
});
