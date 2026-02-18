from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel
from datetime import datetime


class SignalState(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"
    GRAY = "GRAY"


class CardIdentification(BaseModel):
    """Card identification from OCR."""
    player_name: Optional[str] = None
    year: Optional[str] = None
    set_name: Optional[str] = None
    card_number: Optional[str] = None
    grade: Optional[str] = None
    grading_company: Optional[str] = None
    rookie: bool = False
    parallel: Optional[str] = None
    auto: bool = False
    confidence: float = 0.0
    ocr_engine: str = "unknown"
    audio_confidence: float = 0.0        # populated in Phase 2
    last_seen_timestamp: Optional[float] = None  # used for TTL in Phase 3


class PricingData(BaseModel):
    """Pricing information from eBay and other sources."""
    count: int = 0
    prices: List[float] = []
    average: float = 0.0
    median: float = 0.0
    min_price: float = 0.0
    max_price: float = 0.0
    standard_deviation: float = 0.0
    sale_dates: List[str] = []
    sources: List[str] = ["eBay Sold"]
    timeframe: str = "Last 90 days"
    query_used: Optional[str] = None
    ebay_sold_avg: Optional[float] = None
    psa_apr: Optional[float] = None
    market_price: Optional[float] = None
    last_updated: datetime = datetime.now()


class ClaudeAnalysis(BaseModel):
    """AI analysis results from Claude."""
    market_value_estimate: Optional[str] = None
    value_trend: Optional[str] = None
    rarity_assessment: Optional[str] = None
    investment_potential: Optional[str] = None
    key_factors: List[str] = []
    comparable_sales: Optional[str] = None
    recommendation: Optional[str] = None
    confidence: Optional[str] = None
    analysis_timestamp: datetime = datetime.now()


class DealRecommendation(BaseModel):
    """Deal recommendation from Claude."""
    recommendation: Optional[str] = None  # BUY/PASS/WATCH
    confidence: Optional[str] = None
    fair_value_range: Dict[str, float] = {"min": 0, "max": 0}
    deal_quality: Optional[str] = None
    max_bid_suggestion: Optional[float] = None
    reasoning: Optional[str] = None
    risk_factors: List[str] = []
    upside_potential: Optional[str] = None
    timestamp: datetime = datetime.now()


class Card(BaseModel):
    """Complete card data model."""
    identification: CardIdentification
    pricing: PricingData
    claude_analysis: Optional[ClaudeAnalysis] = None
    deal_recommendation: Optional[DealRecommendation] = None
    image_path: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    processing_timestamp: datetime = datetime.now()

    @property
    def roi_potential(self) -> Optional[float]:
        if (self.deal_recommendation and
                self.deal_recommendation.fair_value_range.get("min") and
                self.pricing.market_price):
            fair_min = self.deal_recommendation.fair_value_range["min"]
            current = self.pricing.market_price
            if current > 0:
                return ((fair_min - current) / current) * 100
        return None

    @property
    def is_good_deal(self) -> Optional[bool]:
        if self.deal_recommendation:
            return self.deal_recommendation.recommendation in ["BUY"]
        return None

    @property
    def confidence_score(self) -> float:
        scores = [self.identification.confidence]
        if self.claude_analysis and self.claude_analysis.confidence:
            confidence_map = {"high": 0.9, "medium": 0.7, "low": 0.4}
            ai_confidence = confidence_map.get(self.claude_analysis.confidence.lower(), 0.5)
            scores.append(ai_confidence)
        return sum(scores) / len(scores) if scores else 0.0


class AnalysisResult(BaseModel):
    """Result of a complete card analysis."""
    card: Card
    processing_time: float
    errors: List[str] = []
    warnings: List[str] = []

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def is_complete(self) -> bool:
        return (
            self.card.identification.player_name is not None and
            self.card.pricing.market_price is not None and
            self.card.claude_analysis is not None
        )
