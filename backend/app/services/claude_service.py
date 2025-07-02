import asyncio
import json
from typing import Dict, List, Optional, Any
from anthropic import Anthropic
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class ClaudeService:
    """Service for interacting with Claude AI for card analysis and insights."""
    
    def __init__(self):
        if not settings.has_anthropic_key:
            logger.warning("Anthropic API key not configured - Claude features will be disabled")
            self.client = None
        else:
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def is_available(self) -> bool:
        """Check if Claude service is available."""
        return self.client is not None
    
    async def analyze_card_data(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze card data and provide insights about value, market trends, etc.
        
        Args:
            card_data: Dictionary containing card information (name, year, grade, price, etc.)
        
        Returns:
            Dictionary with analysis results
        """
        if not self.is_available():
            return {"error": "Claude service not available"}
        
        try:
            # Prepare the prompt for Claude
            prompt = self._build_card_analysis_prompt(card_data)
            
            # Run the API call in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                self._call_claude_api,
                prompt
            )
            
            # Parse the response
            analysis = self._parse_analysis_response(response)
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing card with Claude: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}
    
    async def generate_deal_recommendation(self, card_data: Dict[str, Any], current_bid: float) -> Dict[str, Any]:
        """
        Generate a recommendation on whether a current bid is a good deal.
        
        Args:
            card_data: Card information
            current_bid: Current auction price
        
        Returns:
            Recommendation with reasoning
        """
        if not self.is_available():
            return {"error": "Claude service not available"}
        
        try:
            prompt = self._build_deal_recommendation_prompt(card_data, current_bid)
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._call_claude_api,
                prompt
            )
            
            recommendation = self._parse_recommendation_response(response)
            return recommendation
            
        except Exception as e:
            logger.error(f"Error generating deal recommendation: {str(e)}")
            return {"error": f"Recommendation failed: {str(e)}"}
    
    async def summarize_market_trends(self, recent_sales: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze recent sales data to identify market trends.
        
        Args:
            recent_sales: List of recent sale data
        
        Returns:
            Market trend analysis
        """
        if not self.is_available():
            return {"error": "Claude service not available"}
        
        try:
            prompt = self._build_market_trends_prompt(recent_sales)
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._call_claude_api,
                prompt
            )
            
            trends = self._parse_trends_response(response)
            return trends
            
        except Exception as e:
            logger.error(f"Error analyzing market trends: {str(e)}")
            return {"error": f"Trends analysis failed: {str(e)}"}
    
    def _call_claude_api(self, prompt: str) -> str:
        """Make synchronous call to Claude API."""
        try:
            message = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API call failed: {str(e)}")
            raise
    
    def _build_card_analysis_prompt(self, card_data: Dict[str, Any]) -> str:
        """Build prompt for general card analysis."""
        return f"""
Analyze this sports card data and provide detailed insights:

Card Information:
- Player: {card_data.get('player_name', 'Unknown')}
- Year: {card_data.get('year', 'Unknown')}
- Set: {card_data.get('set_name', 'Unknown')}
- Grade: {card_data.get('grade', 'Unknown')}
- Current Price: ${card_data.get('current_price', 0)}
- Recent Sales: {json.dumps(card_data.get('recent_sales', []), indent=2)}

Please provide analysis in JSON format with these fields:
{{
    "market_value_estimate": "estimated fair market value",
    "value_trend": "increasing/decreasing/stable",
    "rarity_assessment": "common/uncommon/rare/very_rare",
    "investment_potential": "poor/fair/good/excellent",
    "key_factors": ["list of factors affecting value"],
    "comparable_sales": "analysis of recent comparable sales",
    "recommendation": "buy/hold/sell recommendation with reasoning"
}}

Focus on actionable insights for auction bidding decisions.
"""
    
    def _build_deal_recommendation_prompt(self, card_data: Dict[str, Any], current_bid: float) -> str:
        """Build prompt for deal recommendation."""
        return f"""
Evaluate if this current bid represents a good deal:

Card: {card_data.get('player_name', 'Unknown')} {card_data.get('year', '')} {card_data.get('set_name', '')}
Grade: {card_data.get('grade', 'Unknown')}
Current Bid: ${current_bid}
Market Data: {json.dumps(card_data.get('pricing_data', {}), indent=2)}

Provide recommendation in JSON format:
{{
    "recommendation": "BUY/PASS/WATCH",
    "confidence": "high/medium/low",
    "fair_value_range": {{"min": 0, "max": 0}},
    "deal_quality": "excellent/good/fair/poor",
    "max_bid_suggestion": 0,
    "reasoning": "detailed explanation of recommendation",
    "risk_factors": ["potential risks"],
    "upside_potential": "percentage upside if applicable"
}}

Consider current market conditions, recent sales, and long-term value trends.
"""
    
    def _build_market_trends_prompt(self, recent_sales: List[Dict[str, Any]]) -> str:
        """Build prompt for market trend analysis."""
        return f"""
Analyze these recent sales to identify market trends:

Recent Sales Data:
{json.dumps(recent_sales, indent=2)}

Provide trend analysis in JSON format:
{{
    "overall_trend": "bullish/bearish/sideways",
    "price_momentum": "strong_up/up/flat/down/strong_down",
    "volume_analysis": "high/normal/low trading volume",
    "key_observations": ["important market observations"],
    "emerging_patterns": ["patterns in the data"],
    "recommended_actions": ["actionable recommendations"],
    "market_outlook": "short-term outlook for this segment"
}}

Focus on patterns that would help with auction bidding strategies.
"""
    
    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse Claude's card analysis response."""
        try:
            # Try to extract JSON from the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                # Fallback to plain text response
                return {
                    "analysis": response,
                    "format": "text"
                }
        except json.JSONDecodeError:
            return {
                "analysis": response,
                "format": "text",
                "error": "Could not parse JSON response"
            }
    
    def _parse_recommendation_response(self, response: str) -> Dict[str, Any]:
        """Parse Claude's deal recommendation response."""
        return self._parse_analysis_response(response)
    
    def _parse_trends_response(self, response: str) -> Dict[str, Any]:
        """Parse Claude's market trends response."""
        return self._parse_analysis_response(response)

# Global instance
claude_service = ClaudeService()