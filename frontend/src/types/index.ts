export interface CardInfo {
  player_name: string | null;
  year: string | null;
  set_name: string | null;
  card_number: string | null;
  grade: string | null;
}

export interface OCRResult {
  texts: Array<{
    text: string;
    confidence: number;
    bbox: number[][];
  }>;
  confidence: number;
  card_info: CardInfo;
}

export interface PriceData {
  count: number;
  prices: number[];
  average: number;
  median: number;
  min: number;
  max: number;
  error?: string;
}

export interface AnalysisResult {
  ocr: OCRResult;
  pricing: PriceData;
  timestamp: number;
}
