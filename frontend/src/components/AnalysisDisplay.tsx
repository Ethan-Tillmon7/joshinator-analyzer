// frontend/src/components/AnalysisDisplay.tsx
// The Live Activity: the lot's verdict pill and max bid as the score, bid and clock as the footer,
// the card itself as the matchup. Collapses to an Island when its container gets too narrow.
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { AnalysisResult } from '../types';
import SignalShape from './SignalShape';
import { formatCeiling, formatLot, formatPercentage, formatWhole } from '../lib/format';
import { ResultSource, Verdict, readVerdict } from '../lib/verdict';
import { MATERIAL_HIDDEN, MATERIAL_SHOWN, SPRING } from '../lib/motion';

export type { ResultSource } from '../lib/verdict';

export interface IdleState {
  phase: 'OFFLINE' | 'SETUP' | 'READY' | 'WATCHING';
  headline: string;
  detail: string;
  action?: { label: string; kbd?: string; onClick: () => void; disabled?: boolean };
}

interface Props {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  source: ResultSource;
  idle?: IdleState;
  thumbnail?: React.ReactNode;
  // Narrow layouts open the evidence as a sheet from the card; wide layouts show it beside the card.
  onOpenEvidence?: () => void;
  evidenceExpanded?: boolean;
}

// Re-render on an interval so result age stays current.
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const PHASE_WORD: Record<IdleState['phase'], string> = {
  OFFLINE: 'OFFLINE',
  SETUP: 'SETUP',
  READY: 'READY',
  WATCHING: 'WATCHING',
};

// ── Pieces ────────────────────────────────────────────────────────────

const VerdictPill: React.FC<{ verdict: Pick<Verdict, 'signal' | 'word'>; stale?: boolean }> = ({ verdict, stale }) => (
  <div className={`verdict-pill pill-${verdict.signal}${stale ? ' is-stale' : ''}`}>
    {/* Re-keyed on the signal so a change lands once, never loops */}
    <motion.span
      key={verdict.signal}
      className="verdict-pill-face"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
    >
      <SignalShape signal={verdict.signal} size={28} />
      <span className="verdict-word" data-len={verdict.word.length}>{verdict.word}</span>
    </motion.span>
  </div>
);

const StatusLine: React.FC<{ kind: string; text: string; detail?: string; lot?: number }> = ({ kind, text, detail, lot }) => (
  <header className="activity-status">
    <span className={`status status-${kind}`}>
      <span className="status-dot" aria-hidden />
      {text}
    </span>
    {detail && <span className="status-detail">{detail}</span>}
    {lot ? <span className="activity-lot">{formatLot(lot)}</span> : null}
  </header>
);

// The compact form: shape, word, max and time on one capsule.
export const Island: React.FC<{
  signal: Verdict['signal'];
  word: string;
  max?: string;
  time?: string;
  stale?: boolean;
}> = ({ signal, word, max, time, stale }) => (
  <span className="island" data-signal={signal}>
    <span className={`island-pill pill-${signal}${stale ? ' is-stale' : ''}`}>
      <SignalShape signal={signal} size={14} />
      <span className="island-word">{word}</span>
    </span>
    {max && <span className="island-figure"><span className="island-label">Max</span>{max}</span>}
    {time && <span className="island-figure island-time">{time}</span>}
  </span>
);

export const islandPropsFor = (verdict: Verdict) => ({
  signal: verdict.signal,
  word: verdict.word,
  max: verdict.isGray ? undefined : formatCeiling(verdict.maxBid),
  time: verdict.timeLeft || undefined,
  stale: verdict.isStale,
});

// ── Card bodies ───────────────────────────────────────────────────────

const IdleBody: React.FC<{ idle: IdleState }> = ({ idle }) => (
  <>
    <StatusLine
      kind={idle.phase === 'WATCHING' ? 'watching' : 'idle'}
      text={idle.phase === 'OFFLINE' ? 'Offline' : idle.phase === 'WATCHING' ? 'Watching' : 'Not watching'}
      detail={idle.phase === 'WATCHING' ? 'No card read yet' : ''}
    />
    <div className="activity-score">
      <VerdictPill verdict={{ signal: 'GRAY', word: PHASE_WORD[idle.phase] }} />
      <div className="activity-reason">
        <p className="reason-headline">{idle.headline}</p>
        <p className="reason-detail">{idle.detail}</p>
        {idle.action && (
          <button
            type="button"
            className="btn btn-primary btn-compact"
            onClick={idle.action.onClick}
            disabled={idle.action.disabled}
          >
            {idle.action.label}
            {idle.action.kbd && <kbd>{idle.action.kbd}</kbd>}
          </button>
        )}
      </div>
    </div>
    <div className="activity-island" aria-hidden>
      <Island signal="GRAY" word={PHASE_WORD[idle.phase]} />
    </div>
  </>
);

const ResultBody: React.FC<{
  v: Verdict;
  source: ResultSource;
  thumbnail?: React.ReactNode;
  onOpenEvidence?: () => void;
  evidenceExpanded?: boolean;
}> = ({ v, source, thumbnail, onOpenEvidence, evidenceExpanded }) => {
  const maxText = formatCeiling(v.maxBid);
  const proof = v.isGray
    ? null
    : `ROI ${formatPercentage(v.roi.roi_potential)} on ${v.compCount} sold ${v.compCount === 1 ? 'comp' : 'comps'} · ${v.confidencePct}% confidence`;
  const evidenceSummary = v.hasFairValue && v.fair
    ? `${v.compCount} sold · Fair ${formatWhole(v.fair.min)}–${formatWhole(v.fair.max)}`
    : `${v.compCount} sold`;
  const timeLabel = source === 'live' ? 'Time left' : 'Time at read';

  return (
    <>
      <StatusLine kind={v.status.kind} text={v.status.text} detail={v.status.detail} lot={v.lot} />

      <div className="activity-matchup" aria-label="Lot">
        {thumbnail && <div className="matchup-thumb">{thumbnail}</div>}
        <div className="matchup-body">
          <h2 className="matchup-player" title={v.card.player_name || undefined}>
            {v.card.player_name || 'Card not identified'}
          </h2>
          {v.setLine && <p className="matchup-set">{v.setLine}</p>}
        </div>
        <ul className="matchup-tags" aria-label="Card attributes">
          <li className="tag tag-grade">{v.card.grade || 'Raw'}</li>
          {v.card.rookie && <li className="tag">RC</li>}
          {v.card.auto && <li className="tag">Auto</li>}
          {v.card.patch && <li className="tag">Patch</li>}
          {v.card.parallel && <li className="tag">{v.card.parallel}</li>}
        </ul>
      </div>

      <div className="activity-score">
        <VerdictPill verdict={v} stale={v.isStale} />
        {v.isGray ? (
          <div className="activity-reason">
            <p className="reason-headline">{v.reason}</p>
            <p className="reason-detail">Prices stay hidden until there's enough to make a call.</p>
          </div>
        ) : (
          <div className="activity-max">
            <span className="metric-label">Max bid</span>
            <span className="max-figure" data-len={maxText.length}>{maxText}</span>
            <span className="max-note">80% of est. {formatWhole(v.estimated)}</span>
          </div>
        )}
      </div>

      {proof && <p className="activity-proof">{proof}</p>}

      <dl className="activity-metrics">
        <div className="metric">
          <dt className="metric-label">Bid</dt>
          <dd className="metric-value">{formatWhole(v.bid)}</dd>
        </div>
        {!v.isGray && (
          <div className={`metric metric-headroom${v.isOver ? ' is-over' : ''}`}>
            <dt className="metric-label">{v.headroom === null ? 'Room' : v.isOver ? 'Over' : 'Under'}</dt>
            <dd className="metric-value">{v.headroom === null ? '—' : formatWhole(Math.abs(v.headroom))}</dd>
          </div>
        )}
        <div className={`metric metric-time${source === 'live' ? '' : ' is-frozen'}`}>
          <dt className="metric-label">{timeLabel}</dt>
          <dd className="metric-value">{v.timeLeft || '—'}</dd>
        </div>
      </dl>

      {onOpenEvidence && (
        <button
          type="button"
          className="activity-evidence"
          onClick={onOpenEvidence}
          aria-expanded={!!evidenceExpanded}
          aria-controls="evidence-sheet"
        >
          <span className="activity-evidence-title">Evidence</span>
          <span className="activity-evidence-summary">{evidenceSummary}</span>
          <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
        </button>
      )}

      <div className="activity-island" aria-hidden>
        <Island {...islandPropsFor(v)} />
      </div>
    </>
  );
};

// ── Display ───────────────────────────────────────────────────────────

const AnalysisDisplay: React.FC<Props> = ({
  result,
  isAnalyzing,
  source,
  idle,
  thumbnail,
  onOpenEvidence,
  evidenceExpanded,
}) => {
  const now = useNow(1000);

  const fallback: IdleState = isAnalyzing
    ? { phase: 'WATCHING', headline: 'Looking for a card', detail: 'A call appears once a card and its bid are read off the stream.' }
    : { phase: 'READY', headline: 'Nothing to call yet', detail: 'Set a capture region, then start watching.' };
  const idleState = idle ?? fallback;

  const v = result ? readVerdict(result, source, now) : null;

  // A finished live lot hands its layout to its row in the session stack; a past lot being
  // reviewed never claims it, so the stack row and the card never share an id at once.
  const layoutId = v && v.lot && source !== 'history' ? `lot-${v.lot}` : undefined;
  const viewKey = v
    ? `${source === 'history' ? 'past' : 'now'}-${v.lot ?? result?.received_at ?? result?.timestamp}`
    : `idle-${idleState.phase}`;

  const announcement = !v
    ? `${idleState.phase}. ${idleState.headline}`
    : v.isGray
      ? `${v.word}. ${v.reason}`
      : `${v.word}. Max bid ${formatCeiling(v.maxBid)}. Current bid ${formatWhole(v.bid)}.`;

  return (
    <div className="analysis-display">
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.section
          key={viewKey}
          layoutId={layoutId}
          className={`activity${v?.isStale ? ' is-stale' : ''}${!v ? ' is-idle' : ''}`}
          data-signal={v ? v.signal : 'GRAY'}
          aria-label={v ? 'Verdict' : 'Status'}
          layoutDependency={viewKey}
          initial={MATERIAL_HIDDEN}
          animate={MATERIAL_SHOWN}
          // The outgoing card fades fast so its morph into the stack never shows squashed content
          exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.15 } }}
          transition={SPRING}
        >
          {v ? (
            <ResultBody
              v={v}
              source={source}
              thumbnail={thumbnail}
              onOpenEvidence={onOpenEvidence}
              evidenceExpanded={evidenceExpanded}
            />
          ) : (
            <IdleBody idle={idleState} />
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
};

export default AnalysisDisplay;
