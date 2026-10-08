// frontend/src/mocks/demoResults.ts
//
// Demo data, loaded only when the app is opened with ?demo in the URL.
// Every number follows the real pipeline so the demo never teaches a wrong reading:
//   estimated      = mean of comparable sold prices
//   fair range     = estimated ± sample standard deviation
//   roi_potential  = (estimated − bid) / bid × 100
//   signal         = GREEN ≥ 30% · YELLOW −10%…30% · RED < −10% · GRAY < 3 comps
//   max bid        = 80% of estimated
//   break-even     = bid × 1.15 (resale fees)
//   profit_margin  = (estimated − bid) / estimated × 100
//   confidence     = base confidence × min(1, comps / 10)
// Factors use the backend's own wording; nothing here is a claim about a real player.
import { AnalysisResult } from '../types';

export const DEMO_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

type DemoSeed = Omit<AnalysisResult, 'received_at'>;

const SEEDS: DemoSeed[] = [
  // Mike Trout 2011 Topps Update RC PSA 9 · GREEN, $14.50 under max
  {
    card_info: {
      player_name: 'Mike Trout',
      year: '2011',
      set_name: 'Topps Update',
      card_number: 'US175',
      grade: 'PSA 9',
      parallel: null,
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: null,
      team: null,
      ocr_engine: 'mock',
    },
    auction_info: { current_bid: 125, time_remaining: '1:42', bid_count: 11 },
    pricing_data: {
      prices: [172, 165, 190, 158, 185, 168, 195, 162],
      sale_dates: [],
      average: 174.38,
      median: 170,
      min: 158,
      max: 195,
      count: 8,
      standard_deviation: 13.82,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold'],
      query_used: 'Mike Trout 2011 Topps Update US175 PSA 9',
    },
    roi_analysis: {
      signal: 'GREEN',
      recommendation: 'STRONG_BUY',
      confidence: 0.72,
      roi_potential: 39.5,
      suggested_max_bid: 139.5,
      break_even_price: 143.75,
      profit_margin: 28.3,
      fair_value_range: { min: 160.55, max: 188.2, estimated: 174.38 },
      key_factors: [
        'Moderate market data available',
        'Excellent profit potential',
        'High grade — good demand',
        'Rookie card — higher collectibility',
      ],
      risk_factors: [],
      risk_level: 'low',
      deal_score: 90,
      comp_count: 8,
      insufficient_data_reason: null,
    },
    confidence: 0.92,
    timestamp: 5,
    analysis_version: 'mock',
  },

  // Shohei Ohtani 2018 Topps Update RC PSA 10 · GREEN, $18 under max
  {
    card_info: {
      player_name: 'Shohei Ohtani',
      year: '2018',
      set_name: 'Topps Update',
      card_number: 'US1',
      grade: 'PSA 10',
      parallel: null,
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: null,
      team: null,
      ocr_engine: 'mock',
    },
    auction_info: { current_bid: 88, time_remaining: '0:31', bid_count: 7 },
    pricing_data: {
      prices: [135, 128, 142, 119, 138, 131, 145, 122],
      sale_dates: [],
      average: 132.5,
      median: 133,
      min: 119,
      max: 145,
      count: 8,
      standard_deviation: 9.24,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold'],
      query_used: 'Shohei Ohtani 2018 Topps Update US1 PSA 10',
    },
    roi_analysis: {
      signal: 'GREEN',
      recommendation: 'STRONG_BUY',
      confidence: 0.72,
      roi_potential: 50.6,
      suggested_max_bid: 106,
      break_even_price: 101.2,
      profit_margin: 33.6,
      fair_value_range: { min: 123.26, max: 141.74, estimated: 132.5 },
      key_factors: [
        'Moderate market data available',
        'Excellent profit potential',
        'Premium grade — strong demand',
        'Rookie card — higher collectibility',
      ],
      risk_factors: [],
      risk_level: 'low',
      deal_score: 90,
      comp_count: 8,
      insufficient_data_reason: null,
    },
    confidence: 0.93,
    timestamp: 4,
    analysis_version: 'mock',
  },

  // Ronald Acuña Jr. 2018 Topps Chrome RC PSA 10 · YELLOW, bid already $38.90 over max
  {
    card_info: {
      player_name: 'Ronald Acuña Jr.',
      year: '2018',
      set_name: 'Topps Chrome',
      card_number: 'HMT31',
      grade: 'PSA 10',
      parallel: null,
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: null,
      team: null,
      ocr_engine: 'mock',
    },
    auction_info: { current_bid: 210, time_remaining: '3:15', bid_count: 18 },
    pricing_data: {
      prices: [218, 205, 230, 198, 215, 225, 208, 212],
      sale_dates: [],
      average: 213.88,
      median: 213.5,
      min: 198,
      max: 230,
      count: 8,
      standard_deviation: 10.49,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold'],
      query_used: 'Ronald Acuna Jr 2018 Topps Chrome HMT31 PSA 10',
    },
    roi_analysis: {
      signal: 'YELLOW',
      recommendation: 'WATCH',
      confidence: 0.24,
      roi_potential: 1.8,
      suggested_max_bid: 171.1,
      break_even_price: 241.5,
      profit_margin: 1.8,
      fair_value_range: { min: 203.38, max: 224.37, estimated: 213.88 },
      key_factors: [
        'Moderate market data available',
        'Modest profit potential',
        'Premium grade — strong demand',
        'Rookie card — higher collectibility',
      ],
      risk_factors: [],
      risk_level: 'medium',
      deal_score: 47,
      comp_count: 8,
      insufficient_data_reason: null,
    },
    confidence: 0.78,
    timestamp: 3,
    analysis_version: 'mock',
  },

  // Fernando Tatis Jr. 2019 Topps Chrome RC PSA 10 · GRAY, too few comps to call
  {
    card_info: {
      player_name: 'Fernando Tatis Jr.',
      year: '2019',
      set_name: 'Topps Chrome',
      card_number: '204',
      grade: 'PSA 10',
      parallel: null,
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: null,
      team: null,
      ocr_engine: 'mock',
    },
    auction_info: { current_bid: 62, time_remaining: '2:08', bid_count: 9 },
    pricing_data: {
      prices: [82, 78],
      sale_dates: [],
      average: 80,
      median: 80,
      min: 78,
      max: 82,
      count: 2,
      standard_deviation: 2.83,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold'],
      query_used: 'Fernando Tatis Jr 2019 Topps Chrome 204 PSA 10',
    },
    roi_analysis: {
      signal: 'GRAY',
      recommendation: 'INSUFFICIENT_DATA',
      confidence: 0,
      roi_potential: 0,
      suggested_max_bid: 0,
      break_even_price: 0,
      profit_margin: 0,
      fair_value_range: { min: 0, max: 0, estimated: 0 },
      key_factors: [],
      risk_factors: [],
      risk_level: 'high',
      deal_score: 0,
      comp_count: 0,
      insufficient_data_reason: 'Only 2 comparable sale(s) found (need 3)',
    },
    confidence: 0.84,
    timestamp: 2,
    analysis_version: 'mock',
  },

  // Juan Soto 2018 Topps Chrome RC PSA 9 · RED, bid well above fair value
  {
    card_info: {
      player_name: 'Juan Soto',
      year: '2018',
      set_name: 'Topps Chrome',
      card_number: 'HMT53',
      grade: 'PSA 9',
      parallel: null,
      rookie: true,
      auto: false,
      patch: false,
      manufacturer: 'Topps',
      sport: 'Baseball',
      position: null,
      team: null,
      ocr_engine: 'mock',
    },
    auction_info: { current_bid: 95, time_remaining: '4:50', bid_count: 14 },
    pricing_data: {
      prices: [72, 68, 75, 65, 71, 74, 69, 73],
      sale_dates: [],
      average: 70.88,
      median: 71.5,
      min: 65,
      max: 75,
      count: 8,
      standard_deviation: 3.36,
      timeframe: 'Last 90 days',
      sources: ['eBay Sold'],
      query_used: 'Juan Soto 2018 Topps Chrome HMT53 PSA 9',
    },
    roi_analysis: {
      signal: 'RED',
      recommendation: 'PASS',
      confidence: 0.64,
      roi_potential: -25.4,
      suggested_max_bid: 56.7,
      break_even_price: 109.25,
      profit_margin: -34.0,
      fair_value_range: { min: 67.52, max: 74.23, estimated: 70.88 },
      key_factors: [
        'Moderate market data available',
        'Currently above market value',
        'High grade — good demand',
        'Rookie card — higher collectibility',
      ],
      risk_factors: [],
      risk_level: 'medium',
      deal_score: 28,
      comp_count: 8,
      insufficient_data_reason: null,
    },
    confidence: 0.89,
    timestamp: 1,
    analysis_version: 'mock',
  },
];

// Stamp arrival times relative to page load so "updated" reads naturally in demos.
export function buildDemoResults(now: number = Date.now()): AnalysisResult[] {
  return SEEDS.map((seed, i) => ({ ...seed, received_at: now - i * 95_000 }));
}

export const isDemoResult = (result: AnalysisResult | null | undefined): boolean =>
  result?.analysis_version === 'mock';
