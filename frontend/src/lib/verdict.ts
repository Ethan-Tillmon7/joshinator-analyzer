// frontend/src/lib/verdict.ts
// One reading of a result that every surface (card, island, evidence, stack) shares.
import { AnalysisResult, AuctionInfo, CardInfo, FairValueRange, PriceData, ROIAnalysis } from '../types';
import { VERDICT_WORD, Signal, formatAge, formatClockTime, humanizeReason, toSignal } from './format';

export type ResultSource = 'live' | 'paused' | 'history' | 'demo';

// Matches the backend's last-known-card hold: after this, a live verdict is no longer current.
export const STALE_AFTER_MS = 30_000;

export type StatusKind = 'live' | 'stale' | 'demo' | 'past' | 'paused';

export interface Verdict {
  signal: Signal;
  word: string;
  isGray: boolean;
  reason: string;
  bid: number;
  maxBid: number;
  estimated: number;
  fair: FairValueRange | undefined;
  hasFairValue: boolean;
  headroom: number | null;
  isOver: boolean;
  timeLeft: string;
  confidencePct: number;
  compCount: number;
  comps: number[];
  sourceName: string;
  isStale: boolean;
  status: { kind: StatusKind; text: string; detail: string };
  card: Partial<CardInfo>;
  auction: Partial<AuctionInfo>;
  roi: Partial<ROIAnalysis>;
  pricing: Partial<PriceData>;
  setLine: string;
  lot?: number;
}

export function readVerdict(result: AnalysisResult, source: ResultSource, now: number): Verdict {
  const card: Partial<CardInfo> = result.card_info ?? {};
  const auction: Partial<AuctionInfo> = result.auction_info ?? {};
  const roi: Partial<ROIAnalysis> = result.roi_analysis ?? {};
  const pricing: Partial<PriceData> = result.pricing_data ?? {};

  const signal = toSignal(roi.signal);
  const isGray = signal === 'GRAY';
  const bid = auction.current_bid ?? 0;
  const maxBid = roi.suggested_max_bid ?? 0;
  const fair = roi.fair_value_range;
  const estimated = fair?.estimated ?? 0;
  const headroom = !isGray && bid > 0 && maxBid > 0 ? maxBid - bid : null;

  const ageMs = result.received_at ? now - result.received_at : null;
  const isStale = source === 'live' && ageMs !== null && ageMs > STALE_AFTER_MS;
  const status: Verdict['status'] =
    source === 'demo' ? { kind: 'demo', text: 'Sample data', detail: '' }
      : source === 'history' ? { kind: 'past', text: 'Past', detail: formatClockTime(result.received_at) }
        : isStale ? { kind: 'stale', text: 'Stale', detail: `Updated ${formatAge(ageMs ?? 0)}` }
          : source === 'live' ? { kind: 'live', text: 'Live', detail: ageMs !== null ? `Updated ${formatAge(ageMs)}` : '' }
            : { kind: 'paused', text: 'Paused', detail: ageMs !== null ? `Last read ${formatAge(ageMs)}` : '' };

  const comps = pricing.prices ?? [];
  const sources = pricing.sources ?? [];

  return {
    signal,
    word: VERDICT_WORD[signal],
    isGray,
    reason: humanizeReason(roi.insufficient_data_reason) || 'Not enough data to call this lot',
    bid,
    maxBid,
    estimated,
    fair,
    hasFairValue: !isGray && !!fair && fair.max > 0 && fair.max > fair.min,
    headroom,
    isOver: headroom !== null && headroom < 0,
    timeLeft: auction.time_remaining || '',
    confidencePct: Math.round(Math.min(1, Math.max(0, roi.confidence ?? 0)) * 100),
    compCount: pricing.count ?? comps.length,
    comps,
    sourceName: sources.length > 0 ? sources.join(', ') : 'eBay Sold',
    isStale,
    status,
    card,
    auction,
    roi,
    pricing,
    setLine: [card.year, card.set_name, card.card_number ? `#${card.card_number}` : null].filter(Boolean).join(' · '),
    lot: result.lot_number,
  };
}
