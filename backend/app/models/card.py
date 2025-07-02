from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class CardIdentification(BaseModel):
    """Card identification from OCR."""
    player_name: Optional[str] = None
    year: Optional[str] = None
    set_name: Optional[str] = None
    card_number: Optional[str] = None
    grade: Optional[str] = None
    grading_company: Optional[str] = None
    confidence: float = 0.0

class PricingData(BaseModel):
    """Pricing information from various sources."""
    ebay_sold_avg: Optional[float] = None
    ebay_sold_recent: List[float] = []
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
    # Basic identification
    identification: CardIdentification
    
    # Pricing information
    pricing: PricingData
    
    # AI Analysis
    claude_analysis: Optional[ClaudeAnalysis] = None
    deal_recommendation: Optional[DealRecommendation] = None
    
    # Metadata
    image_path: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    processing_timestamp: datetime = datetime.now()
    
    # Calculated fields
    @property
    def roi_potential(self) -> Optional[float]:
        """Calculate potential ROI based on current bid vs market value."""
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
        """Determine if this is a good deal based on AI recommendation."""
        if self.deal_recommendation:
            return self.deal_recommendation.recommendation in ["BUY"]
        return None
    
    @property
    def confidence_score(self) -> float:
        """Overall confidence score combining OCR and AI confidence."""
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
        """Check if analysis is complete with all required data."""
        return (
            self.card.identification.player_name is not None and
            self.card.pricing.market_price is not None and
            self.card.claude_analysis is not None
        )