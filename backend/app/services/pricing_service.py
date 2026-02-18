import asyncio
import json
import logging
from typing import Dict, List, Tuple

from rapidfuzz import fuzz

from app.config import settings
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class PricingService:
    def __init__(self):
        self._ebay_api = None  # lazy-init so import errors don't break startup

    def _get_ebay_api(self):
        if self._ebay_api is None:
            from ebaysdk.finding import Connection as Finding
            self._ebay_api = Finding(appid=settings.EBAY_APP_ID, config_file=None)
        return self._ebay_api

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_card_prices(self, card_info: Dict) -> Dict:
        """Fetch card prices: SQLite cache → Claude query → eBay → fuzzy filter."""

        # 1. Cache hit
        cached = cache_service.get(card_info)
        if cached:
            logger.debug("Pricing cache hit for %s", card_info.get("player_name"))
            return cached

        # 2. Build query (Claude-assisted when available, plain fallback otherwise)
        query = await self._build_search_query_with_claude(card_info)

        try:
            # 3. Primary eBay search
            prices, titles = await self._search_ebay_sold_with_titles(query)

            # 4. Zero-result fallback: broaden by dropping grade and card_number
            if not prices:
                broad_info = {
                    k: v for k, v in card_info.items()
                    if k not in ("card_number", "grade")
                }
                broad_query = self._build_search_query(broad_info)
                logger.debug("Zero results — retrying with broader query: %s", broad_query)
                prices, titles = await self._search_ebay_sold_with_titles(broad_query)
                query = broad_query  # record what we actually used

            # 5. Fuzzy-filter: keep only listings matching the query well enough
            if titles:
                prices = self._fuzzy_filter_prices(query, prices, titles)

        except Exception as e:
            logger.error("eBay search failed: %s", e)
            prices, titles = [], []

        result = self._calculate_price_stats(prices, query)
        cache_service.set(card_info, result, query)
        return result

    # ------------------------------------------------------------------
    # Query construction
    # ------------------------------------------------------------------

    async def _build_search_query_with_claude(self, card_info: Dict) -> str:
        """Use Claude to build an optimised eBay search string (≤60 chars).
        Falls back to the plain concatenation method if Claude is unavailable."""
        try:
            from app.services.claude_service import claude_service
            if not claude_service.is_available():
                return self._build_search_query(card_info)

            prompt = (
                "Build a concise eBay sold listing search query for this sports card.\n"
                f"Card: {json.dumps(card_info)}\n"
                "Return ONLY the search string, no explanation. "
                "Prioritize player name, year, set, grade. "
                "Omit fields that add noise. Max 60 characters."
            )
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, claude_service._call_claude_api, prompt
            )
            query = result.strip().strip('"')[:60]
            logger.debug("Claude query: %s", query)
            return query
        except Exception as e:
            logger.warning("Claude query construction failed, using fallback: %s", e)
            return self._build_search_query(card_info)

    def _build_search_query(self, card_info: Dict) -> str:
        """Plain concatenation fallback — prioritise the most discriminating fields."""
        parts = []
        if card_info.get("player_name"):
            parts.append(card_info["player_name"])
        if card_info.get("year"):
            parts.append(card_info["year"])
        if card_info.get("set_name"):
            parts.append(card_info["set_name"])
        if card_info.get("grade"):
            parts.append(card_info["grade"])
        if card_info.get("card_number"):
            parts.append(f"#{card_info['card_number']}")
        return " ".join(parts)

    # ------------------------------------------------------------------
    # eBay search
    # ------------------------------------------------------------------

    async def _search_ebay_sold_with_titles(self, query: str) -> Tuple[List[float], List[str]]:
        """Search eBay completed/sold listings; return parallel (prices, titles) lists."""
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, self._ebay_api_call, query)

        prices: List[float] = []
        titles: List[str] = []

        if hasattr(response.reply, "searchResult") and response.reply.searchResult:
            for item in response.reply.searchResult.item:
                try:
                    price = float(item.sellingStatus.currentPrice.value)
                    title = str(item.title)
                    prices.append(price)
                    titles.append(title)
                except Exception:
                    continue

        return prices, titles

    def _ebay_api_call(self, query: str):
        return self._get_ebay_api().execute("findCompletedItems", {
            "keywords": query,
            "categoryId": "212",  # Sports Trading Cards
            "sortOrder": "EndTimeSoonest",
            "itemFilter": [
                {"name": "SoldItemsOnly", "value": "true"},
                {"name": "Condition", "value": "Used"},
            ],
            "paginationInput": {"entriesPerPage": 25},
        })

    # ------------------------------------------------------------------
    # Fuzzy filtering
    # ------------------------------------------------------------------

    def _fuzzy_filter_prices(
        self, query: str, prices: List[float], titles: List[str]
    ) -> List[float]:
        """Keep only prices whose listing title matches the query above the threshold.
        If everything is filtered out, return unfiltered (safety valve)."""
        threshold = settings.FUZZY_MATCH_THRESHOLD
        kept = [
            price for price, title in zip(prices, titles)
            if fuzz.token_sort_ratio(query.lower(), title.lower()) >= threshold
        ]
        return kept if kept else prices

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def _calculate_price_stats(self, prices: List[float], query: str = "") -> Dict:
        if not prices:
            return {
                "count": 0, "prices": [], "average": 0.0, "median": 0.0,
                "min_price": 0.0, "max_price": 0.0, "standard_deviation": 0.0,
                "sale_dates": [], "sources": ["eBay Sold"],
                "timeframe": "Last 90 days", "query_used": query,
            }

        prices_sorted = sorted(prices)
        n = len(prices_sorted)
        avg = sum(prices_sorted) / n
        median = prices_sorted[n // 2]
        variance = sum((p - avg) ** 2 for p in prices_sorted) / n
        std_dev = variance ** 0.5

        return {
            "count": n,
            "prices": prices_sorted[:10],  # most recent 10
            "average": avg,
            "median": median,
            "min_price": prices_sorted[0],
            "max_price": prices_sorted[-1],
            "standard_deviation": std_dev,
            "sale_dates": [],
            "sources": ["eBay Sold"],
            "timeframe": "Last 90 days",
            "query_used": query,
        }


pricing_service = PricingService()
