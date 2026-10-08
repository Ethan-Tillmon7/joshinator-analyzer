import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AnalysisDisplay from './AnalysisDisplay';
import Evidence from './Evidence';
import { buildDemoResults } from '../mocks/demoResults';
import { lotKey, parseGradeNumber, zonesFor } from '../lib/format';
import { AnalysisResult } from '../types';

const NOW = 1_700_000_000_000;
const [trout, , acuna, tatisGray, soto] = buildDemoResults(NOW);
const noop = () => {};

const asLive = (r: AnalysisResult, receivedAgoMs = 0): AnalysisResult => ({
  ...r,
  analysis_version: 'live',
  received_at: Date.now() - receivedAgoMs,
});

const verdict = () => screen.getByRole('region', { name: 'Verdict' });

describe('live activity card', () => {
  test('GREEN shows BUY with the max bid as a whole-dollar ceiling, never $0', () => {
    render(<AnalysisDisplay result={trout} isAnalyzing={false} source="demo" />);
    const card = within(verdict());
    expect(card.getByText('BUY', { selector: '.verdict-word' })).toBeInTheDocument();
    expect(card.getByText('$139', { selector: '.max-figure' })).toBeInTheDocument();
    expect(card.getByText('80% of est. $174')).toBeInTheDocument();
    expect(screen.queryByText(/\$0(\.00)?$/)).not.toBeInTheDocument();
  });

  test('the reason line cites its proof', () => {
    render(<AnalysisDisplay result={trout} isAnalyzing={false} source="demo" />);
    expect(screen.getByText('ROI +39.5% on 8 sold comps · 72% confidence')).toBeInTheDocument();
  });

  test('the verdict word follows the signal, not the recommendation', () => {
    render(<AnalysisDisplay result={soto} isAnalyzing={false} source="demo" />);
    expect(within(verdict()).getByText('PASS', { selector: '.verdict-word' })).toBeInTheDocument();
  });

  test('headroom flips to OVER when the bid passes the max', () => {
    render(<AnalysisDisplay result={acuna} isAnalyzing={false} source="demo" />);
    const card = within(verdict());
    expect(card.getByText('WATCH', { selector: '.verdict-word' })).toBeInTheDocument();
    expect(card.getByText('Over')).toBeInTheDocument();
    expect(card.getByText('$39')).toBeInTheDocument();
  });

  test('GRAY shows NO CALL with its reason and hides every price figure', () => {
    render(<AnalysisDisplay result={tatisGray} isAnalyzing={false} source="demo" />);
    const card = within(verdict());
    expect(card.getByText('NO CALL', { selector: '.verdict-word' })).toBeInTheDocument();
    expect(card.getByText('Only 2 comparable sales found (need 3)')).toBeInTheDocument();
    expect(card.queryByText('Max bid')).not.toBeInTheDocument();
    expect(card.queryByText(/^ROI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });

  test('missing values render as an em dash, not as zero', () => {
    const blank: AnalysisResult = {
      ...asLive(soto),
      auction_info: { current_bid: 0, time_remaining: '', bid_count: 0 },
    };
    render(<AnalysisDisplay result={blank} isAnalyzing={false} source="live" />);
    const card = within(verdict());
    expect(card.getByText('Bid').nextSibling).toHaveTextContent('—');
    expect(card.getByText('Time left').nextSibling).toHaveTextContent('—');
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });

  test('demo data is labelled Sample data, never Live', () => {
    render(<AnalysisDisplay result={trout} isAnalyzing={false} source="demo" />);
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  test('a live verdict older than 30s is marked stale', () => {
    render(<AnalysisDisplay result={asLive(acuna, 45_000)} isAnalyzing source="live" />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('Updated 45s ago')).toBeInTheDocument();
    expect(verdict()).toHaveClass('is-stale');
  });

  test('a past lot reads its time as Time at read', () => {
    render(<AnalysisDisplay result={{ ...soto, lot_number: 3 }} isAnalyzing={false} source="history" />);
    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(screen.getByText('Time at read')).toBeInTheDocument();
    expect(screen.getByText('Lot 03')).toBeInTheDocument();
  });

  test('the verdict is announced to assistive tech', () => {
    render(<AnalysisDisplay result={trout} isAnalyzing={false} source="demo" />);
    expect(screen.getByText('BUY. Max bid $139. Current bid $125.')).toBeInTheDocument();
  });

  test('narrow layouts get an evidence control that summarises the comps', () => {
    render(<AnalysisDisplay result={trout} isAnalyzing={false} source="demo" onOpenEvidence={noop} evidenceExpanded={false} />);
    const button = screen.getByRole('button', { name: /Evidence/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(within(button).getByText('8 sold · Fair $161–$188')).toBeInTheDocument();
  });

  test('with no result it shows the idle state it is given', () => {
    render(
      <AnalysisDisplay
        result={null}
        isAnalyzing={false}
        source="paused"
        idle={{ phase: 'OFFLINE', headline: 'Backend not connected', detail: 'Start it on port 3001, then retry.' }}
      />
    );
    expect(screen.getAllByText('OFFLINE').length).toBeGreaterThan(0);
    expect(screen.getByText('Backend not connected')).toBeInTheDocument();
  });
});

describe('evidence', () => {
  test('GRAY keeps the comps it found but drops the deal math and risk', () => {
    render(<Evidence result={tatisGray} source="demo" />);
    expect(screen.getByText('Sold comps')).toBeInTheDocument();
    expect(screen.queryByText('Deal math')).not.toBeInTheDocument();
    expect(screen.queryByText(/risk$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });

  test('profit margin renders as a percentage', () => {
    render(<Evidence result={soto} source="demo" />);
    expect(screen.getByText('-34.0%')).toBeInTheDocument();
  });

  test('a bid outside the fair range is stated, not pinned to the edge', () => {
    render(<Evidence result={trout} source="demo" />);
    expect(screen.getByText('Bid is $36 below the fair range.')).toBeInTheDocument();
  });

  test('the price axis states the zone edges it draws', () => {
    render(<Evidence result={trout} source="demo" />);
    expect(screen.getByText(/Buy at or under \$152 · Pass over \$194/)).toBeInTheDocument();
  });

  test('with nothing called yet it says what will appear', () => {
    render(<Evidence result={null} source="paused" />);
    expect(screen.getByText(/show up here once a lot is called/)).toBeInTheDocument();
  });
});

describe('helpers', () => {
  test('PSA grades parse to their number', () => {
    expect(parseGradeNumber('PSA 9')).toBe(9);
    expect(parseGradeNumber('BGS 9.5')).toBe(9.5);
    expect(parseGradeNumber(null)).toBeNull();
  });

  test('zones widen on thin data, mirroring the backend', () => {
    expect(zonesFor(115, 8).buyEdge).toBeCloseTo(100, 5);
    expect(zonesFor(120, 4).buyEdge).toBeCloseTo(100, 5);
    expect(zonesFor(90, 8).passEdge).toBeCloseTo(100, 5);
    expect(zonesFor(85, 4).passEdge).toBeCloseTo(100, 5);
  });

  test('a lot is the card, not the read', () => {
    const nextRead: AnalysisResult = { ...trout, auction_info: { ...trout.auction_info, current_bid: 140 } };
    expect(lotKey(trout)).toBe(lotKey(nextRead));
    expect(lotKey(trout)).not.toBe(lotKey(soto));
  });
});

describe('demo results follow the signal contract', () => {
  const results = buildDemoResults(NOW);

  test.each(results.filter(r => r.roi_analysis.signal !== 'GRAY').map(r => [r.card_info.player_name, r]))(
    '%s: signal, max bid and ROI agree with estimated value',
    (_name, r) => {
      const { roi_analysis: roi, auction_info: auction, pricing_data: pricing } = r as AnalysisResult;
      const est = roi.fair_value_range.estimated;
      const expectedRoi = ((est - auction.current_bid) / auction.current_bid) * 100;
      expect(roi.roi_potential).toBeCloseTo(expectedRoi, 0);
      expect(roi.suggested_max_bid).toBeCloseTo(est * 0.8, 1);
      const zones = zonesFor(est, pricing.prices.length);
      const expectedSignal = expectedRoi >= zones.greenRoi ? 'GREEN' : expectedRoi >= zones.redRoi ? 'YELLOW' : 'RED';
      expect(roi.signal).toBe(expectedSignal);
      // A GREEN call must leave room under the max bid
      if (roi.signal === 'GREEN') expect(auction.current_bid).toBeLessThan(roi.suggested_max_bid);
    }
  );

  test('demo results only cite eBay sold listings', () => {
    results.forEach(r => expect(r.pricing_data.sources).toEqual(['eBay Sold']));
  });
});
