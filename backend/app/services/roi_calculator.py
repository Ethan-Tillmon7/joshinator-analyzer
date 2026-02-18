from typing import Dict, List
import statistics

from app.config import settings


class ROICalculator:
    GRADE_MULTIPLIERS = {
        "PSA 10": 2.5, "PSA 9": 1.8, "PSA 8": 1.3, "PSA 7": 1.0, "PSA 6": 0.7,
        "BGS 9.5": 2.2, "BGS 9": 1.6, "BGS 8.5": 1.2, "BGS 8": 1.0,
        "SGC 10": 2.0, "SGC 9": 1.5, "SGC 8": 1.1,
    }

    def calculate_roi_analysis(
        self, card_info: Dict, current_bid: float, pricing_data: Dict
    ) -> Dict:
        """Return a fully-populated ROI result dict including `signal` and `comp_count`."""

        if not card_info.get("player_name"):
            return self._build_gray_result("Card not identified")

        if not current_bid or current_bid <= 0:
            return self._build_gray_result("No bid detected")

        prices = pricing_data.get("prices", [])
        if not prices:
            return self._build_gray_result("No market data")

        if len(prices) < settings.MIN_COMPS_FOR_SIGNAL:
            return self._build_gray_result(
                f"Only {len(prices)} comparable sale(s) found "
                f"(need {settings.MIN_COMPS_FOR_SIGNAL})"
            )

        fair_value = self._calculate_fair_value(pricing_data, card_info)
        estimated = fair_value.get("estimated", 0)

        if estimated <= 0:
            return self._build_gray_result("Unable to estimate fair value")

        roi_potential = ((estimated - current_bid) / current_bid) * 100
        rec_data = self._generate_recommendation(roi_potential, pricing_data)

        return {
            **rec_data,
            "roi_potential": roi_potential,
            "fair_value_range": fair_value,
            "suggested_max_bid": estimated * 0.8,
            "key_factors": self._generate_key_factors(card_info, pricing_data, roi_potential),
            "insufficient_data_reason": None,
            "comp_count": len(prices),
        }

    # ------------------------------------------------------------------

    def _build_gray_result(self, reason: str) -> Dict:
        return {
            "recommendation": "INSUFFICIENT_DATA",
            "signal": "GRAY",
            "roi_potential": 0.0,
            "fair_value_range": {"min": 0, "max": 0, "estimated": 0},
            "confidence": 0.0,
            "suggested_max_bid": 0.0,
            "key_factors": [],
            "insufficient_data_reason": reason,
            "comp_count": 0,
        }

    def _calculate_fair_value(self, pricing_data: Dict, card_info: Dict) -> Dict:
        prices = pricing_data.get("prices", [])
        if not prices:
            return {"min": 0, "max": 0, "estimated": 0}

        recent_avg = statistics.mean(prices[:10])
        std_dev = statistics.stdev(prices) if len(prices) > 1 else recent_avg * 0.2

        multiplier = self._get_grade_multiplier(card_info.get("grade", ""))
        estimated = recent_avg * multiplier
        fair_min = max(0, (recent_avg - std_dev) * multiplier)
        fair_max = (recent_avg + std_dev) * multiplier

        return {"min": fair_min, "max": fair_max, "estimated": estimated}

    def _get_grade_multiplier(self, grade: str) -> float:
        grade_upper = grade.upper() if grade else ""
        for grade_key, multiplier in self.GRADE_MULTIPLIERS.items():
            if grade_key.upper() in grade_upper:
                return multiplier
        return 1.0

    def _generate_recommendation(self, roi_potential: float, pricing_data: Dict) -> Dict:
        price_count = len(pricing_data.get("prices", []))
        thin_data = price_count < 6

        # Widen the yellow zone when data is thin
        green_threshold = 35 if thin_data else 30
        buy_threshold = 20 if thin_data else 15
        watch_threshold = -15 if thin_data else -10

        if roi_potential >= green_threshold:
            recommendation, signal, base_confidence = "STRONG_BUY", "GREEN", 0.9
        elif roi_potential >= buy_threshold:
            recommendation, signal, base_confidence = "BUY", "GREEN", 0.7
        elif roi_potential >= 5:
            recommendation, signal, base_confidence = "WEAK_BUY", "YELLOW", 0.5
        elif roi_potential >= watch_threshold:
            recommendation, signal, base_confidence = "WATCH", "YELLOW", 0.3
        else:
            recommendation, signal, base_confidence = "PASS", "RED", 0.8

        data_quality = min(1.0, price_count / 10)
        return {
            "recommendation": recommendation,
            "signal": signal,
            "confidence": base_confidence * data_quality,
        }

    def _generate_key_factors(
        self, card_info: Dict, pricing_data: Dict, roi_potential: float
    ) -> List[str]:
        factors = []
        price_count = len(pricing_data.get("prices", []))

        if price_count >= 10:
            factors.append("Strong market data available")
        elif price_count >= 5:
            factors.append("Moderate market data available")
        else:
            factors.append("Limited market data — higher risk")

        if roi_potential > 25:
            factors.append("Excellent profit potential")
        elif roi_potential > 10:
            factors.append("Good profit potential")
        elif roi_potential > 0:
            factors.append("Modest profit potential")
        else:
            factors.append("Currently above market value")

        grade = card_info.get("grade", "")
        if "PSA 10" in grade or "BGS 9.5" in grade:
            factors.append("Premium grade — strong demand")
        elif "PSA 9" in grade or "BGS 9" in grade:
            factors.append("High grade — good demand")
        elif grade:
            factors.append(f"Graded card — {grade}")
        else:
            factors.append("Ungraded — condition risk")

        if card_info.get("rookie"):
            factors.append("Rookie card — higher collectibility")

        return factors


roi_calculator = ROICalculator()
