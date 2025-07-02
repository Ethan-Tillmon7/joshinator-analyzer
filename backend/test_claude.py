#!/usr/bin/env python3
"""
Test script for Claude integration
Run from backend directory: python test_claude.py
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.claude_service import claude_service

async def test_claude_service():
    """Test the Claude service with sample card data."""
    
    print("Testing Claude Service Integration...")
    print(f"Claude available: {claude_service.is_available()}")
    
    if not claude_service.is_available():
        print("❌ Claude service not available. Check your API key in .env file.")
        return
    
    # Sample card data
    sample_card = {
        "player_name": "Michael Jordan",
        "year": "1986",
        "set_name": "Fleer",
        "grade": "PSA 9",
        "current_price": 1500.00,
        "recent_sales": [
            {"price": 1400, "date": "2024-12-15"},
            {"price": 1600, "date": "2024-12-10"},
            {"price": 1350, "date": "2024-12-05"}
        ]
    }
    
    print("\n🔍 Testing card analysis...")
    try:
        analysis = await claude_service.analyze_card_data(sample_card)
        print("✅ Card analysis successful!")
        print(f"Analysis: {analysis}")
    except Exception as e:
        print(f"❌ Card analysis failed: {e}")
    
    print("\n💰 Testing deal recommendation...")
    try:
        recommendation = await claude_service.generate_deal_recommendation(
            sample_card, 
            current_bid=1200.00
        )
        print("✅ Deal recommendation successful!")
        print(f"Recommendation: {recommendation}")
    except Exception as e:
        print(f"❌ Deal recommendation failed: {e}")
    
    print("\n📈 Testing market trends...")
    try:
        trends = await claude_service.summarize_market_trends(
            sample_card["recent_sales"]
        )
        print("✅ Market trends analysis successful!")
        print(f"Trends: {trends}")
    except Exception as e:
        print(f"❌ Market trends failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_claude_service())