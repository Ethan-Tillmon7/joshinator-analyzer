# backend/app/services/roi_calculator.py
from typing import Dict, List, Optional
import statistics

class ROICalculator:
    def __init__(self):
        self.grade_multipliers = {
            "PSA 10": 2.5,
            "PSA 9": 1.8,
            "PSA 8": 1.3,
            "PSA 7": 1.0,
            "PSA 6": 0.7,
            "BGS 9.5": 2.2,
            "BGS 9": 1.6,
            "BGS 8.5": 1.2,
            "BGS 8": 1.0,
            "SGC 10": 2.0,
            "SGC 9": 1.5,
            "SGC 8": 1.1
        }
        
    def calculate_roi_analysis(self, card_info: Dict, current_bid: float, pricing_data: Dict) -> Dict:
        """Calculate comprehensive ROI analysis"""
        analysis = {
            "recommendation": "UNKNOWN",
            "roi_potential": 0.0,
            "fair_value_range": {"min": 0, "max": 0},
            "confidence": 0.0,
            "suggested_max_bid": 0.0,
            "key_factors": []
        }
        
        if not pricing_data.get("prices") or current_bid <= 0:
            return analysis
        
        # Calculate fair value with grade adjustment
        fair_value = self._calculate_fair_value(pricing_data, card_info)
        analysis["fair_value_range"] = fair_value
        
        # Calculate ROI potential
        estimated_value = fair_value.get("estimated", 0)
        if estimated_value > 0:
            roi_potential = ((estimated_value - current_bid) / current_bid) * 100
            analysis["roi_potential"] = roi_potential
            
            # Generate recommendation
            recommendation_data = self._generate_recommendation(roi_potential, pricing_data)
            analysis.update(recommendation_data)
            
            # Calculate suggested max bid
            analysis["suggested_max_bid"] = estimated_value * 0.8
            
            # Generate key factors
            analysis["key_factors"] = self._generate_key_factors(
                card_info, pricing_data, roi_potential
            )
        
        return analysis
    
    def _calculate_fair_value(self, pricing_data: Dict, card_info: Dict) -> Dict:
        """Calculate fair value range based on recent sales and grade"""
        prices = pricing_data.get("prices", [])
        
        if not prices:
            return {"min": 0, "max": 0, "estimated": 0}
        
        # Base calculation on recent sales
        if len(prices) >= 3:
            recent_avg = statistics.mean(prices[:10])  # Last 10 sales
            std_dev = statistics.stdev(prices) if len(prices) > 1 else recent_avg * 0.2
        else:
            recent_avg = pricing_data.get("average", 0)
            std_dev = recent_avg * 0.2
        
        # Apply grade multiplier
        grade = card_info.get("grade", "")
        multiplier = self._get_grade_multiplier(grade)
        
        estimated = recent_avg * multiplier
        fair_min = max(0, (recent_avg - std_dev) * multiplier)
        fair_max = (recent_avg + std_dev) * multiplier
        
        return {
            "min": fair_min,
            "max": fair_max,
            "estimated": estimated
        }
    
    def _get_grade_multiplier(self, grade: str) -> float:
        """Get value multiplier based on card grade"""
        grade_upper = grade.upper()
        for grade_key, multiplier in self.grade_multipliers.items():
            if grade_key.upper() in grade_upper:
                return multiplier
        return 1.0  # Default for unknown grades
    
    def _generate_recommendation(self, roi_potential: float, pricing_data: Dict) -> Dict:
        """Generate buy/sell recommendation based on ROI"""
        if roi_potential >= 30:
            recommendation = "STRONG_BUY"
            confidence = 0.9
        elif roi_potential >= 15:
            recommendation = "BUY"
            confidence = 0.7
        elif roi_potential >= 5:
            recommendation = "WEAK_BUY"
            confidence = 0.5
        elif roi_potential >= -10:
            recommendation = "WATCH"
            confidence = 0.3
        else:
            recommendation = "PASS"
            confidence = 0.8
        
        # Adjust confidence based on data quality
        data_quality = min(1.0, len(pricing_data.get("prices", [])) / 10)
        adjusted_confidence = confidence * data_quality
        
        return {
            "recommendation": recommendation,
            "confidence": adjusted_confidence
        }
    
    def _generate_key_factors(self, card_info: Dict, pricing_data: Dict, roi_potential: float) -> List[str]:
        """Generate key factors affecting the deal"""
        factors = []
        
        # Data quality factor
        price_count = len(pricing_data.get("prices", []))
        if price_count >= 10:
            factors.append("Strong market data available")
        elif price_count >= 5:
            factors.append("Moderate market data available")
        else:
            factors.append("Limited market data - higher risk")
        
        # ROI factor
        if roi_potential > 25:
            factors.append("Excellent profit potential")
        elif roi_potential > 10:
            factors.append("Good profit potential")
        elif roi_potential > 0:
            factors.append("Modest profit potential")
        else:
            factors.append("Currently above market value")
        
        # Grade factor
        grade = card_info.get("grade", "")
        if "PSA 10" in grade or "BGS 9.5" in grade:
            factors.append("Premium grade - strong demand")
        elif "PSA 9" in grade or "BGS 9" in grade:
            factors.append("High grade - good demand")
        elif grade:
            factors.append(f"Graded card - {grade}")
        else:
            factors.append("Ungraded - condition risk")
        
        # Rookie factor
        if card_info.get("rookie"):
            factors.append("Rookie card - higher collectibility")
        
        return factors

# Global instance
roi_calculator = ROICalculator()