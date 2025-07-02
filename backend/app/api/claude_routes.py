from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from ..services.claude_service import claude_service
from ..models.card import Card, DealRecommendation
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/claude", tags=["claude"])

@router.get("/status")
async def get_claude_status():
    """Check if Claude service is available."""
    return {
        "available": claude_service.is_available(),
        "model": "claude-sonnet-4-20250514" if claude_service.is_available() else None
    }

@router.post("/analyze-card")
async def analyze_card(card_data: Dict[str, Any]):
    """
    Analyze a card using Claude AI.
    
    Expects card data with fields like:
    - player_name
    - year
    - set_name
    - grade
    - current_price
    - recent_sales
    """
    if not claude_service.is_available():
        raise HTTPException(status_code=503, detail="Claude service not available")
    
    try:
        analysis = await claude_service.analyze_card_data(card_data)
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])
        
        return {
            "success": True,
            "analysis": analysis,
            "timestamp": card_data.get("timestamp")
        }
    
    except Exception as e:
        logger.error(f"Card analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/deal-recommendation")
async def get_deal_recommendation(request_data: Dict[str, Any]):
    """
    Get a deal recommendation for a current auction bid.
    
    Expects:
    - card_data: Card information
    - current_bid: Current auction price
    """
    if not claude_service.is_available():
        raise HTTPException(status_code=503, detail="Claude service not available")
    
    card_data = request_data.get("card_data", {})
    current_bid = request_data.get("current_bid", 0)
    
    if not current_bid:
        raise HTTPException(status_code=400, detail="current_bid is required")
    
    try:
        recommendation = await claude_service.generate_deal_recommendation(card_data, current_bid)
        
        if "error" in recommendation:
            raise HTTPException(status_code=500, detail=recommendation["error"])
        
        return {
            "success": True,
            "recommendation": recommendation,
            "card_data": card_data,
            "current_bid": current_bid
        }
    
    except Exception as e:
        logger.error(f"Deal recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@router.post("/market-trends")
async def analyze_market_trends(sales_data: Dict[str, Any]):
    """
    Analyze market trends from recent sales data.
    
    Expects:
    - recent_sales: List of recent sale records
    """
    if not claude_service.is_available():
        raise HTTPException(status_code=503, detail="Claude service not available")
    
    recent_sales = sales_data.get("recent_sales", [])
    
    if not recent_sales:
        raise HTTPException(status_code=400, detail="recent_sales data is required")
    
    try:
        trends = await claude_service.summarize_market_trends(recent_sales)
        
        if "error" in trends:
            raise HTTPException(status_code=500, detail=trends["error"])
        
        return {
            "success": True,
            "trends": trends,
            "sales_count": len(recent_sales)
        }
    
    except Exception as e:
        logger.error(f"Market trends analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trends analysis failed: {str(e)}")

@router.post("/quick-analysis")
async def quick_card_analysis(background_tasks: BackgroundTasks, card_data: Dict[str, Any]):
    """
    Quick analysis combining card identification, pricing, and AI insights.
    This would typically be called after OCR processing.
    """
    if not claude_service.is_available():
        # Return basic analysis without AI insights
        return {
            "success": True,
            "claude_available": False,
            "basic_analysis": {
                "player": card_data.get("player_name"),
                "estimated_value": card_data.get("current_price"),
                "note": "AI analysis unavailable - API key not configured"
            }
        }
    
    try:
        # Run Claude analysis in background for faster response
        background_tasks.add_task(
            _process_full_analysis,
            card_data
        )
        
        # Return immediate response
        return {
            "success": True,
            "claude_available": True,
            "status": "processing",
            "message": "AI analysis started - results will be available via WebSocket"
        }
    
    except Exception as e:
        logger.error(f"Quick analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

async def _process_full_analysis(card_data: Dict[str, Any]):
    """Background task for full card analysis."""
    try:
        # This would typically send results via WebSocket
        analysis = await claude_service.analyze_card_data(card_data)
        logger.info(f"Background analysis completed for {card_data.get('player_name')}")
        
        # TODO: Send results via WebSocket to frontend
        # await websocket_manager.broadcast_analysis_result(analysis)
        
    except Exception as e:
        logger.error(f"Background analysis failed: {str(e)}")

@router.get("/usage-stats")
async def get_usage_stats():
    """Get Claude API usage statistics (if available)."""
    if not claude_service.is_available():
        raise HTTPException(status_code=503, detail="Claude service not available")
    
    # This would require implementing usage tracking
    return {
        "message": "Usage tracking not yet implemented",
        "service_status": "active"
    }