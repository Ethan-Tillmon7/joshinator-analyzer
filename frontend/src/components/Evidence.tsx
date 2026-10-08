// frontend/src/components/Evidence.tsx
// The proof behind the call, one step away: sold comps on one zone-banded price axis,
// the deal math, factors and risk, and what the reader actually read.
import React from 'react';
import SignalShape from './SignalShape';
import { AnalysisResult } from '../types';
import {
  formatCeiling,
  formatCurrency,
  formatPercentage,
  formatWhole,
  engineName,
  zonesFor,
} from '../lib/format';
import { ResultSource, Verdict, readVerdict } from '../lib/verdict';
import { useNow } from './AnalysisDisplay';

const DAY_MS = 86_400_000;

// Fresher sales read larger: newest third large, middle medium, oldest small.
// Without sale dates every tick is the same size, so size never implies a recency it can't show.
function recencySizes(comps: number[], dates: string[] | undefined): Array<'s' | 'm' | 'l'> {
  const ages = comps.map((_, i) => {
    const t = dates?.[i] ? Date.parse(dates[i]) : NaN;
    return Number.isFinite(t) ? (Date.now() - t) / DAY_MS : NaN;
  });
  const known = ages.filter(Number.isFinite).sort((a, b) => a - b);
  if (known.length < 3) return comps.map(() => 'm');
  const newCut = known[Math.floor(known.length / 3)];
  const oldCut = known[Math.floor((known.length * 2) / 3)];
  return ages.map(a => (!Number.isFinite(a) ? 'm' : a <= newCut ? 'l' : a >= oldCut ? 's' : 'm'));
}

const PriceAxis: React.FC<{ v: Verdict }> = ({ v }) => {
  const fair = v.fair!;
  const zones = zonesFor(v.estimated, v.compCount);
  const values = [fair.min, fair.max, v.estimated, v.maxBid, v.bid, zones.buyEdge, zones.passEdge, ...v.comps]
    .filter(n => Number.isFinite(n) && n > 0);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.08 || Math.max(1, lo * 0.05);
  const domainLo = Math.max(0, lo - pad);
  const span = hi + pad - domainLo;
  const pct = (n: number) => Math.min(100, Math.max(0, ((n - domainLo) / span) * 100));
  const at = (n: number) => `${pct(n)}%`;
  // Keep marker labels inside the axis ends
  const anchor = (n: number) => (pct(n) < 12 ? 'is-start' : pct(n) > 88 ? 'is-end' : '');
  const sizes = recencySizes(v.comps, v.pricing.sale_dates);

  const buyW = pct(zones.buyEdge);
  const watchW = pct(zones.passEdge) - buyW;
  const passW = 100 - pct(zones.passEdge);

  const label = [
    `Buy zone up to ${formatWhole(zones.buyEdge)}, pass zone over ${formatWhole(zones.passEdge)}`,
    `fair range ${formatCurrency(fair.min)} to ${formatCurrency(fair.max)}`,
    `max bid ${formatCeiling(v.maxBid)}`,
    v.bid > 0 ? `current bid ${formatWhole(v.bid)}` : 'current bid not read',
    `${v.comps.length} sold comps`,
  ].join(', ');

  return (
    <figure className="axis" role="img" aria-label={label}>
      <div className="axis-top">
        <span className={`axis-label axis-label-max ${anchor(v.maxBid)}`} style={{ left: at(v.maxBid) }}>
          Max {formatCeiling(v.maxBid)}
        </span>
      </div>
      <div className="axis-field">
        <div className="axis-zones">
          <span className="axis-zone zone-GREEN" style={{ width: `${buyW}%` }}>
            <SignalShape signal="GREEN" size={11} /><span className="axis-zone-word">Buy</span>
          </span>
          <span className="axis-zone zone-YELLOW" style={{ width: `${watchW}%` }}>
            <SignalShape signal="YELLOW" size={11} /><span className="axis-zone-word">Watch</span>
          </span>
          <span className="axis-zone zone-RED" style={{ width: `${passW}%` }}>
            <SignalShape signal="RED" size={11} /><span className="axis-zone-word">Pass</span>
          </span>
        </div>
        <div className="axis-track">
          <span className="axis-fair" style={{ left: at(fair.min), width: `${pct(fair.max) - pct(fair.min)}%` }} />
          {v.comps.map((p, i) => (
            <span key={i} className={`axis-comp size-${sizes[i]}`} style={{ left: at(p) }} />
          ))}
          <span className="axis-est" style={{ left: at(v.estimated) }} />
        </div>
        <span className="axis-rule axis-rule-max" style={{ left: at(v.maxBid) }} />
        {v.bid > 0 && (
          <span className={`axis-rule axis-rule-bid${v.isStale ? ' is-stale' : ''}`} style={{ left: at(v.bid) }} />
        )}
      </div>
      <div className="axis-bottom">
        {v.bid > 0 && (
          <span className={`axis-label axis-label-bid ${anchor(v.bid)}${v.isStale ? ' is-stale' : ''}`} style={{ left: at(v.bid) }}>
            Bid {formatWhole(v.bid)}
          </span>
        )}
      </div>
      <figcaption className="axis-legend">
        Buy at or under {formatWhole(zones.buyEdge)} · Pass over {formatWhole(zones.passEdge)} · from est. {formatWhole(v.estimated)} at{' '}
        {zones.greenRoi}% / {zones.redRoi}% ROI{v.compCount < 6 ? ' (thin data)' : ''}
      </figcaption>
    </figure>
  );
};

interface Props {
  result: AnalysisResult | null;
  source: ResultSource;
  // The inspector titles itself; the sheet carries the title in its own header.
  showTitle?: boolean;
}

const Evidence: React.FC<Props> = ({ result, source, showTitle = true }) => {
  const now = useNow(5000);

  if (!result) {
    return (
      <div className="evidence is-empty">
        {showTitle && <h2 className="evidence-title">Evidence</h2>}
        <p className="evidence-empty">Comps, deal math and what it read show up here once a lot is called.</p>
      </div>
    );
  }

  const v = readVerdict(result, source, now);
  const { roi, pricing, card } = v;
  const readPct = Math.round((result.confidence ?? 0) * 100);
  const audio = result.audio_status;

  let bidCaption = '';
  if (v.hasFairValue && v.fair && v.bid > 0) {
    if (v.bid < v.fair.min) bidCaption = `Bid is ${formatWhole(v.fair.min - v.bid)} below the fair range.`;
    else if (v.bid > v.fair.max) bidCaption = `Bid is ${formatWhole(v.bid - v.fair.max)} above the fair range.`;
    else bidCaption = 'Bid sits inside the fair range.';
  }

  const shown = Math.min(12, v.comps.length);

  return (
    <div className="evidence">
      {showTitle && (
        <h2 className="evidence-title">
          Evidence{v.lot ? <span className="evidence-title-lot"> · Lot {String(v.lot).padStart(2, '0')}</span> : null}
        </h2>
      )}

      <section className="ev-section" aria-labelledby="ev-comps">
        <h3 className="ev-heading" id="ev-comps">
          Sold comps
          <span className="ev-summary">
            {v.hasFairValue && v.fair ? `Fair ${formatWhole(v.fair.min)}–${formatWhole(v.fair.max)}` : `${v.compCount} sold`}
          </span>
        </h3>
        {v.hasFairValue && (
          <div className="ev-group ev-axis-group">
            <PriceAxis v={v} />
            {bidCaption && <p className="ev-caption">{bidCaption}</p>}
          </div>
        )}
        {v.comps.length > 0 ? (
          <>
            <dl className="ev-group ev-stats">
              <div><dt>Median</dt><dd>{formatWhole(pricing.median)}</dd></div>
              <div><dt>Average</dt><dd>{formatWhole(pricing.average)}</dd></div>
              <div><dt>Range</dt><dd>{formatWhole(pricing.min)}–{formatWhole(pricing.max)}</dd></div>
            </dl>
            {pricing.sale_dates?.some(Boolean) ? (
              <ol className="ev-group ev-rows" aria-label="Sold prices">
                {v.comps.slice(0, shown).map((price, i) => (
                  <li key={i} className="ev-row">
                    <span className="ev-row-label">{pricing.sale_dates?.[i] || '—'}</span>
                    <span className="ev-row-value">{formatCurrency(price)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="ev-group ev-price-grid" aria-label="Sold prices">
                {v.comps.slice(0, shown).map((price, i) => (
                  <li key={i}>{formatWhole(price)}</li>
                ))}
              </ol>
            )}
            <p className="ev-footnote">
              {v.compCount > shown ? `Showing ${shown} of ${v.compCount} · ` : ''}
              {v.sourceName}{pricing.timeframe ? ` · ${pricing.timeframe}` : ''}
              {pricing.query_used && <> · searched “{pricing.query_used}”</>}
            </p>
          </>
        ) : (
          <p className="ev-group ev-empty">No sold listings matched this card.</p>
        )}
      </section>

      {!v.isGray && (
        <section className="ev-section" aria-labelledby="ev-math">
          <h3 className="ev-heading" id="ev-math">
            Deal math<span className="ev-summary">ROI {formatPercentage(roi.roi_potential)}</span>
          </h3>
          <dl className="ev-group ev-rows">
            <div className="ev-row"><dt className="ev-row-label">Estimated value</dt><dd className="ev-row-value">{formatCurrency(v.estimated)}</dd></div>
            <div className="ev-row"><dt className="ev-row-label">Max bid · 80% of est.</dt><dd className="ev-row-value">{formatCurrency(v.maxBid)}</dd></div>
            <div className="ev-row"><dt className="ev-row-label">ROI at current bid</dt><dd className="ev-row-value">{formatPercentage(roi.roi_potential)}</dd></div>
            <div className="ev-row"><dt className="ev-row-label">Margin at current bid</dt><dd className="ev-row-value">{formatPercentage(roi.profit_margin)}</dd></div>
            <div className="ev-row"><dt className="ev-row-label">Break-even resale</dt><dd className="ev-row-value">{formatCurrency(roi.break_even_price)}</dd></div>
          </dl>
        </section>
      )}

      {!v.isGray && (
        <section className="ev-section" aria-labelledby="ev-factors">
          <h3 className="ev-heading" id="ev-factors">
            Factors &amp; risk
            {roi.risk_level && <span className={`risk-badge risk-${roi.risk_level}`}>{roi.risk_level} risk</span>}
          </h3>
          {((roi.key_factors?.length ?? 0) > 0 || (roi.risk_factors?.length ?? 0) > 0) ? (
            <ul className="ev-group ev-rows">
              {roi.key_factors?.map((factor, i) => <li key={`k${i}`} className="ev-row">{factor}</li>)}
              {roi.risk_factors?.map((risk, i) => <li key={`r${i}`} className="ev-row is-risk">{risk}</li>)}
            </ul>
          ) : (
            <p className="ev-group ev-empty">No factors reported for this lot.</p>
          )}
        </section>
      )}

      <section className="ev-section" aria-labelledby="ev-read">
        <h3 className="ev-heading" id="ev-read">
          What it read<span className="ev-summary">{readPct}% read</span>
        </h3>
        <dl className="ev-group ev-rows">
          <div className="ev-row"><dt className="ev-row-label">Player</dt><dd className="ev-row-value">{card.player_name || '—'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Year</dt><dd className="ev-row-value">{card.year || '—'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Set</dt><dd className="ev-row-value">{card.set_name || '—'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Card #</dt><dd className="ev-row-value">{card.card_number || '—'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Grade</dt><dd className="ev-row-value">{card.grade || 'Raw'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Parallel</dt><dd className="ev-row-value">{card.parallel || 'Base'}</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Read confidence</dt><dd className="ev-row-value">{readPct}%</dd></div>
          <div className="ev-row"><dt className="ev-row-label">Read by</dt><dd className="ev-row-value">{engineName(card.ocr_engine)}</dd></div>
          {audio && (
            <div className="ev-row">
              <dt className="ev-row-label">Audio</dt>
              <dd className="ev-row-value">{audio.is_active ? `${Math.round((audio.audio_confidence ?? 0) * 100)}% match` : 'Off'}</dd>
            </div>
          )}
        </dl>
        {audio?.transcript_preview && <p className="ev-footnote">Heard “{audio.transcript_preview}”</p>}
      </section>
    </div>
  );
};

export default Evidence;
