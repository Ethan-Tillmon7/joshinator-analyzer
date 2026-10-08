// frontend/src/lib/format.ts
// Shared formatting and the one signal → verdict mapping every surface uses.
import { ROIAnalysis } from '../types';

export type Signal = ROIAnalysis['signal'];

// The verdict word comes from the signal (the contract), never from `recommendation`.
export const VERDICT_WORD: Record<Signal, string> = {
  GREEN: 'BUY',
  YELLOW: 'WATCH',
  RED: 'PASS',
  GRAY: 'NO CALL',
};

export const toSignal = (raw: string | undefined | null): Signal =>
  raw === 'GREEN' || raw === 'YELLOW' || raw === 'RED' ? raw : 'GRAY';

const cents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const isKnownAmount = (amount: number | undefined | null): amount is number =>
  amount !== undefined && amount !== null && Number.isFinite(amount) && amount > 0;

// Prices, bids and values are never legitimately $0: the backend uses 0 for "unknown".
export const formatCurrency = (amount: number | undefined | null): string =>
  isKnownAmount(amount) ? cents.format(amount) : '—';

// Glance figures drop the cents. A ceiling rounds down so following it never overshoots.
export const formatCeiling = (amount: number | undefined | null): string =>
  isKnownAmount(amount) ? wholeDollars.format(Math.floor(amount)) : '—';

export const formatWhole = (amount: number | undefined | null): string =>
  isKnownAmount(amount) ? wholeDollars.format(Math.round(amount)) : '—';

export const formatPercentage = (percent: number | undefined | null): string => {
  if (percent === undefined || percent === null || !Number.isFinite(percent)) return '—';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
};

export const formatAge = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export const formatClockTime = (ms: number | undefined): string =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

// "PSA 9", "BGS 9.5", "SGC 10" → numeric grade; null when no number is present
export const parseGradeNumber = (grade: string | null | undefined): number | null => {
  const match = grade?.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

// Backend reasons say "2 comparable sale(s)"; read them as plain English.
export const humanizeReason = (reason: string | null | undefined): string =>
  (reason ?? '').replace(/(\d+) comparable sale\(s\)/g, (_m, n) => `${n} comparable ${n === '1' ? 'sale' : 'sales'}`);

const ENGINE_NAMES: Record<string, string> = {
  paddleocr: 'PaddleOCR',
  easyocr: 'EasyOCR',
  tesseract: 'Tesseract',
  mock: 'Demo data',
};

export const engineName = (engine: string | null | undefined): string =>
  (engine && ENGINE_NAMES[engine.toLowerCase()]) || engine || 'OCR';

// ── Zones ─────────────────────────────────────────────────────────────
// Mirrors ROICalculator._generate_recommendation (backend/app/services/roi_calculator.py):
// GREEN from ROI ≥ 15% (20% with fewer than 6 comps), RED below −10% (−15% with fewer than 6).
// ROI = (estimated − bid) / bid, so each threshold maps to a bid price.
export interface Zones {
  greenRoi: number;
  redRoi: number;
  buyEdge: number;  // bids at or under this read BUY
  passEdge: number; // bids over this read PASS
}

export const zonesFor = (estimated: number, compCount: number): Zones => {
  const thin = compCount < 6;
  const greenRoi = thin ? 20 : 15;
  const redRoi = thin ? -15 : -10;
  return {
    greenRoi,
    redRoi,
    buyEdge: estimated / (1 + greenRoi / 100),
    passEdge: estimated / (1 + redRoi / 100),
  };
};

// ── Lots ──────────────────────────────────────────────────────────────
// Reads arrive every processed frame; a new lot starts when the card itself changes.
export const lotKey = (result: { card_info?: { player_name?: string | null; card_number?: string | null; set_name?: string | null } | null }): string => {
  const card = result.card_info ?? {};
  return [card.player_name, card.card_number || card.set_name]
    .map(part => (part ?? '').trim().toLowerCase())
    .join('|');
};

export const formatLot = (lot: number | undefined): string =>
  lot ? `Lot ${String(lot).padStart(2, '0')}` : '';
