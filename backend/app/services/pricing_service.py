from typing import Dict, List, Optional
import aiohttp
from ebaysdk.finding import Connection as Finding
from app.config import settings
import asyncio
from datetime import datetime, timedelta

class PricingService:
    def __init__(self):
        self.ebay_api = Finding(
            appid=settings.EBAY_APP_ID,
            config_file=None
        )
        self.cache = {}  # Simple in-memory cache
        self.cache_duration = timedelta(hours=1)
        
    async def get_card_prices(self, card_info: Dict) -> Dict:
        """Fetch card prices from eBay sold listings"""
        # Build search query
        query = self._build_search_query(card_info)
        
        # Check cache
        cache_key = str(card_info)
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if datetime.now() - cached_data['timestamp'] < self.cache_duration:
                return cached_data['data']
        
        try:
            # Search eBay sold listings
            prices = await self._search_ebay_sold(query)
            
            # Calculate statistics
            price_stats = self._calculate_price_stats(prices)
            
            # Cache results
            self.cache[cache_key] = {
                'data': price_stats,
                'timestamp': datetime.now()
            }
            
            return price_stats
            
        except Exception as e:
            print(f"Pricing error: {e}")
            return {
                "error": str(e),
                "prices": [],
                "average": 0,
                "median": 0
            }
    
    def _build_search_query(self, card_info: Dict) -> str:
        """Build eBay search query from card info"""
        parts = []
        
        if card_info.get("player_name"):
            parts.append(card_info["player_name"])
        if card_info.get("year"):
            parts.append(card_info["year"])
        if card_info.get("set_name"):
            parts.append(card_info["set_name"])
        if card_info.get("card_number"):
            parts.append(f"#{card_info['card_number']}")
        if card_info.get("grade"):
            parts.append(card_info["grade"])
            
        return " ".join(parts)
    
    async def _search_ebay_sold(self, query: str) -> List[float]:
        """Search eBay sold listings"""
        loop = asyncio.get_event_loop()
        
        # Run eBay API call in thread pool
        response = await loop.run_in_executor(
            None,
            self._ebay_api_call,
            query
        )
        
        prices = []
        if hasattr(response.reply, 'searchResult') and response.reply.searchResult:
            for item in response.reply.searchResult.item:
                try:
                    price = float(item.sellingStatus.currentPrice.value)
                    prices.append(price)
                except:
                    continue
                    
        return prices
    
    def _ebay_api_call(self, query: str):
        """Make eBay API call"""
        return self.ebay_api.execute('findCompletedItems', {
            'keywords': query,
            'categoryId': '212',  # Sports Trading Cards
            'sortOrder': 'EndTimeSoonest',
            'itemFilter': [
                {'name': 'SoldItemsOnly', 'value': 'true'},
                {'name': 'Condition', 'value': 'Used'}
            ],
            'paginationInput': {
                'entriesPerPage': 25
            }
        })
    
    def _calculate_price_stats(self, prices: List[float]) -> Dict:
        """Calculate price statistics"""
        if not prices:
            return {
                "count": 0,
                "prices": [],
                "average": 0,
                "median": 0,
                "min": 0,
                "max": 0
            }
        
        prices.sort()
        
        return {
            "count": len(prices),
            "prices": prices[:10],  # Top 10 most recent
            "average": sum(prices) / len(prices),
            "median": prices[len(prices) // 2],
            "min": min(prices),
            "max": max(prices)
        }

pricing_service = PricingService()
