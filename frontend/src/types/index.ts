// frontend/src/types/index.ts

// Basic frame data type
export interface FrameData {
  image: string;
  timestamp: number;
}

// Socket error type
export interface SocketError {
  message: string;
  code?: string;
}

export interface CardInfo {
  player_name: string | null;
  year: string | null;
  set_name: string | null;
  card_number: string | null;
  grade: string | null;
  rookie: boolean;
  auto: boolean;
  patch: boolean;
  parallel: string | null;
  manufacturer: string | null;
  sport: string | null;
  position: string | null;
  team: string | null;
  ocr_engine?: string;
  audio_confidence?: number;
}

export interface OCRResult {
  texts: Array<{
    text: string;
    confidence: number;
    bbox: number[][];
  }>;
  confidence: number;
  card_info: CardInfo;
  processing_time: number;
  ocr_engine: string;
}

// The backend OCR parser only guarantees current_bid, time_remaining, bid_count and seller.
// 0 / '' mean "not read off the stream", never a real value.
export interface AuctionInfo {
  current_bid: number;
  time_remaining: string;
  bid_count: number;
  seller?: string;
  starting_bid?: number;
  reserve_met?: boolean;
  bidding_velocity?: 'slow' | 'normal' | 'fast' | 'frenzied';
  platform?: string;
  auction_id?: string;
  seller_rating?: number;
  shipping_cost?: number;
}

export interface FairValueRange {
  min: number;
  max: number;
  estimated: number;
  confidence?: number;
}

export interface ROIAnalysis {
  recommendation: 'STRONG_BUY' | 'BUY' | 'WEAK_BUY' | 'WATCH' | 'PASS' | 'INSUFFICIENT_DATA' | 'UNKNOWN';
  signal: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';
  confidence: number;
  roi_potential: number;
  suggested_max_bid: number;
  break_even_price: number;
  profit_margin: number; // percent of estimated value, not dollars
  fair_value_range: FairValueRange;
  key_factors: string[];
  risk_factors: string[];
  risk_level: 'low' | 'medium' | 'high';
  deal_score: number;
  comp_count: number;
  insufficient_data_reason: string | null;
}

export interface PriceData {
  count: number;
  prices: number[];
  average: number;
  median: number;
  min: number;
  max: number;
  standard_deviation: number;
  sale_dates: string[];
  sources: string[];
  timeframe: string;
  query_used?: string;
  error?: string;
}

export interface MarketTrends {
  price_trend: number; // percentage change
  volume_trend: number;
  volatility: number;
  last_updated: string;
  seasonal_factor: number;
  market_sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface AnalysisResult {
  // Core OCR data
  confidence: number;
  card_info: CardInfo;
  
  // Auction information
  auction_info: AuctionInfo;
  
  // ROI and deal analysis
  roi_analysis: ROIAnalysis;
  
  // Market pricing data
  pricing_data: PriceData;
  
  // Market trends and indicators (not produced by the backend yet)
  market_trends?: MarketTrends;

  // Metadata
  timestamp: number; // backend frame counter, not a clock time
  processing_time?: number;
  analysis_version?: string; // 'mock' marks demo data

  // Stamped client-side when the result arrives (ms since epoch)
  received_at?: number;

  // Stamped client-side: the session lot this read belongs to (a new card starts a new lot)
  lot_number?: number;

  // Phase 2: audio
  audio_status?: {
    is_active: boolean;
    audio_confidence: number;
    transcript_preview?: string;
  };
}

// Additional utility types
export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  frame_data: (data: { image: string; timestamp: number }) => void;
  analysis_result: (result: AnalysisResult) => void;
  error: (error: { message: string; code?: string }) => void;
  status_update: (status: { 
    stage: string; 
    progress: number; 
    message: string;
  }) => void;
}

export interface AppState {
  isConnected: boolean;
  isAnalyzing: boolean;
  frameData: { image: string; timestamp: number } | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  connectionError: string | null;
}

// Configuration types
export interface OCRConfig {
  confidence_threshold: number;
  preprocessing_enabled: boolean;
  ocr_engine: 'easyocr' | 'tesseract' | 'paddleocr';
  gpu_enabled: boolean;
}

export interface PricingConfig {
  ebay_enabled: boolean;
  psa_enabled: boolean;
  point130_enabled: boolean;
  max_age_days: number;
  min_samples: number;
}

export interface AnalysisConfig {
  ocr: OCRConfig;
  pricing: PricingConfig;
  roi_threshold: number;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
}