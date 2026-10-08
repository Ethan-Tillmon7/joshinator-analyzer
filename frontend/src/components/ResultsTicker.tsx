// frontend/src/components/ResultsTicker.tsx
// The session's finished lots, newest first, stacked like finished game cards.
// A lot that just ended arrives here by morphing out of the live card (shared layoutId).
import React from 'react';
import { motion } from 'framer-motion';
import { AnalysisResult } from '../types';
import SignalShape from './SignalShape';
import { VERDICT_WORD, formatCeiling, formatClockTime, formatLot, formatWhole, toSignal } from '../lib/format';
import { SPRING } from '../lib/motion';

interface Props {
  history: AnalysisResult[];
  selected: AnalysisResult | null;
  onSelect: (result: AnalysisResult | null) => void;
  onClear: () => void;
}

const ResultsTicker: React.FC<Props> = ({ history, selected, onSelect, onClear }) => {
  // Layout only re-measures when the stack itself changes, never on a resize
  const stackKey = history.map(r => r.lot_number ?? r.received_at ?? 0).join(',');
  return (
  <section className={`session${selected ? ' has-selection' : ''}`} aria-labelledby="session-title">
    <header className="session-header">
      <h2 id="session-title" className="session-title">
        This session <span className="session-count">{history.length}</span>
      </h2>
      {history.length > 0 && (
        <button type="button" className="btn btn-plain btn-compact" onClick={onClear}>
          Clear
        </button>
      )}
    </header>

    {history.length === 0 ? (
      <p className="session-empty">Finished lots stack here, newest first.</p>
    ) : (
      <ol className="session-list">
        {history.map((result, i) => {
          const signal = toSignal(result.roi_analysis?.signal);
          const isGray = signal === 'GRAY';
          const player = result.card_info?.player_name || 'Card not identified';
          const grade = result.card_info?.grade || 'Raw';
          const isSelected = selected === result;
          const lot = result.lot_number;
          return (
            <motion.li
              key={lot ? `lot-${lot}` : `${result.received_at ?? 0}-${i}`}
              layoutId={lot ? `lot-${lot}` : undefined}
              layout
              layoutDependency={stackKey}
              transition={SPRING}
              className={`session-item${isSelected ? ' is-selected' : ''}`}
            >
              {/* layout lets the row counter-scale its content while it morphs out of the card */}
              <motion.button
                layout
                layoutDependency={stackKey}
                transition={SPRING}
                type="button"
                className={`lot-row${isSelected ? ' is-selected' : ''}`}
                data-signal={signal}
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : result)}
              >
                <span className="lot-verdict">
                  <SignalShape signal={signal} size={15} />
                  <span className="lot-word">{VERDICT_WORD[signal]}</span>
                </span>
                <span className="lot-name">
                  <span className="lot-player">{player}</span>
                  <span className="lot-meta">
                    {grade}{lot && <span className="lot-meta-lot"> · {formatLot(lot)}</span>} · {formatClockTime(result.received_at)}
                  </span>
                </span>
                <span className="lot-figures">
                  <span className="lot-figure"><span className="lot-figure-label">Max</span>{isGray ? '—' : formatCeiling(result.roi_analysis?.suggested_max_bid)}</span>
                  <span className="lot-figure is-secondary"><span className="lot-figure-label">Bid</span>{formatWhole(result.auction_info?.current_bid)}</span>
                </span>
              </motion.button>
            </motion.li>
          );
        })}
      </ol>
    )}
  </section>
  );
};

export default ResultsTicker;
