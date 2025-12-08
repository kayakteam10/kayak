"""
Time-Series Pricing Module
Handles: Historical price tracking, trend detection, rolling averages, deal validation
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
from sqlmodel import Session, select, func

from .models import FlightDeal, HotelDeal
from .logger import get_logger

logger = get_logger("timeseries")


class PriceHistoryGenerator:
    """Generate realistic time-series price data for deals"""
    
    @staticmethod
    def generate_flight_history(
        current_price: float,
        days_back: int = 60,
        volatility: float = 0.10,
        trend: str = 'neutral'  # 'rising', 'falling', 'neutral'
    ) -> List[Dict]:
        """
        Generate mean-reverting price history with trend
        
        Args:
            current_price: Today's price (anchor)
            days_back: Historical days to generate
            volatility: Daily fluctuation (default ±10%)
            trend: Price trend direction
        
        Returns:
            List of {date, price, is_deal} dicts, ordered oldest→newest
        """
        
        prices = []
        base_price = current_price
        
        # Trend adjustment
        if trend == 'rising':
            # Prices were lower in the past, rising to current
            base_price = current_price * 0.85  # Start 15% lower
        elif trend == 'falling':
            # Prices were higher in the past, falling to current
            base_price = current_price * 1.15  # Start 15% higher
        
        # Generate daily prices with mean reversion
        for day_offset in range(days_back, 0, -1):
            date = datetime.utcnow() - timedelta(days=day_offset)
            
            # Mean-reverting random walk
            # Current price pulls toward base, but with daily noise
            if day_offset == days_back:
                price = base_price
            else:
                prev_price = prices[-1]['price']
                
                # Mean reversion: pull toward base_price
                reversion_force = (base_price - prev_price) * 0.3
                
                # Random noise
                noise = np.random.normal(0, volatility * base_price)
                
                # Trend drift
                if trend == 'rising':
                    drift = (current_price - base_price) / days_back
                elif trend == 'falling':
                    drift = -(base_price - current_price) / days_back
                else:
                    drift = 0
                
                price = prev_price + reversion_force + noise + drift
                price = max(price, base_price * 0.5)  # Floor at 50% of base
            
            # Detect deals (>15% below recent average)
            if len(prices) >= 7:
                recent_avg = np.mean([p['price'] for p in prices[-7:]])
                is_deal = price <= recent_avg * 0.85
            else:
                is_deal = False
            
            prices.append({
                'date': date.date().isoformat(),
                'price': round(price, 2),
                'is_deal': is_deal
            })
        
        # Add today's price
        prices.append({
            'date': datetime.utcnow().date().isoformat(),
            'price': current_price,
            'is_deal': current_price <= np.mean([p['price'] for p in prices[-30:]]) * 0.85
        })
        
        return prices
    
    @staticmethod
    def generate_hotel_history(
        current_price: float,
        days_back: int = 60,
        volatility: float = 0.08,  # Hotels less volatile
        seasonality: bool = True
    ) -> List[Dict]:
        """
        Generate hotel price history with seasonality
        
        Hotels have:
        - Lower volatility than flights (±8% vs ±10%)
        - Weekly seasonality (weekends higher)
        - Monthly seasonality (holidays higher)
        """
        
        prices = []
        base_price = current_price
        
        for day_offset in range(days_back, 0, -1):
            date = datetime.utcnow() - timedelta(days=day_offset)
            
            # Base calculation
            if day_offset == days_back:
                price = base_price
            else:
                prev_price = prices[-1]['price']
                reversion_force = (base_price - prev_price) * 0.2
                noise = np.random.normal(0, volatility * base_price)
                price = prev_price + reversion_force + noise
            
            # Seasonality adjustments
            if seasonality:
                # Weekend premium (Fri-Sat: +15%)
                if date.weekday() in [4, 5]:  # Friday, Saturday
                    price *= 1.15
                
                # Holiday premium (Dec 15-31: +25%, July 1-15: +20%)
                month = date.month
                day = date.day
                if month == 12 and day >= 15:
                    price *= 1.25
                elif month == 7 and day <= 15:
                    price *= 1.20
            
            price = max(price, base_price * 0.6)  # Floor at 60%
            
            # Deal detection
            if len(prices) >= 7:
                recent_avg = np.mean([p['price'] for p in prices[-7:]])
                is_deal = price <= recent_avg * 0.85
            else:
                is_deal = False
            
            prices.append({
                'date': date.date().isoformat(),
                'price': round(price, 2),
                'is_deal': is_deal
            })
        
        # Today
        prices.append({
            'date': datetime.utcnow().date().isoformat(),
            'price': current_price,
            'is_deal': current_price <= np.mean([p['price'] for p in prices[-30:]]) * 0.85
        })
        
        return prices


class PriceAnalyzer:
    """Analyze price trends and validate deals"""
    
    @staticmethod
    def calculate_rolling_average(
        price_history: List[Dict],
        window_days: int = 30
    ) -> float:
        """Calculate N-day rolling average"""
        if len(price_history) < window_days:
            window_days = len(price_history)
        
        recent_prices = [p['price'] for p in price_history[-window_days:]]
        return np.mean(recent_prices)
    
    @staticmethod
    def detect_trend(
        price_history: List[Dict],
        lookback_days: int = 14
    ) -> Dict:
        """
        Detect price trend (rising/falling/stable)
        
        Returns:
            {
                'trend': 'rising' | 'falling' | 'stable',
                'change_pct': float,
                'confidence': float (0-1)
            }
        """
        if len(price_history) < lookback_days:
            lookback_days = len(price_history)
        
        recent_prices = [p['price'] for p in price_history[-lookback_days:]]
        
        # Linear regression
        x = np.arange(len(recent_prices))
        y = np.array(recent_prices)
        
        # Fit line
        coeffs = np.polyfit(x, y, 1)
        slope = coeffs[0]
        
        # Calculate R² (confidence)
        y_pred = np.polyval(coeffs, x)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        # Determine trend
        avg_price = np.mean(recent_prices)
        change_pct = (slope * len(recent_prices) / avg_price) * 100
        
        if abs(change_pct) < 2:
            trend = 'stable'
        elif change_pct > 0:
            trend = 'rising'
        else:
            trend = 'falling'
        
        return {
            'trend': trend,
            'change_pct': round(change_pct, 1),
            'confidence': round(r_squared, 2)
        }
    
    @staticmethod
    def is_good_deal(
        current_price: float,
        price_history: List[Dict],
        threshold: float = 0.85
    ) -> Dict:
        """
        Validate if current price is a good deal vs history
        
        Returns:
            {
                'is_deal': bool,
                'vs_avg_30d': str (e.g., "19% below"),
                'vs_avg_60d': str,
                'percentile': int (0-100, lower is better),
                'explanation': str
            }
        """
        
        # 30-day average
        avg_30d = PriceAnalyzer.calculate_rolling_average(price_history, 30)
        pct_vs_30d = ((current_price - avg_30d) / avg_30d) * 100
        
        # 60-day average
        avg_60d = PriceAnalyzer.calculate_rolling_average(price_history, 60)
        pct_vs_60d = ((current_price - avg_60d) / avg_60d) * 100
        
        # Percentile ranking (what % of historical prices are higher?)
        all_prices = [p['price'] for p in price_history]
        percentile = (np.sum(np.array(all_prices) >= current_price) / len(all_prices)) * 100
        
        # Is it a deal?
        is_deal = current_price <= avg_30d * threshold
        
        # Generate explanation
        if is_deal:
            if pct_vs_60d <= -15:
                explanation = f"Excellent deal! {abs(pct_vs_60d):.0f}% below 60-day average"
            elif pct_vs_30d <= -10:
                explanation = f"Good deal: {abs(pct_vs_30d):.0f}% below recent average"
            else:
                explanation = f"Fair price: {abs(pct_vs_30d):.0f}% below typical rate"
        else:
            if pct_vs_30d > 10:
                explanation = f"Premium pricing: {pct_vs_30d:.0f}% above average"
            else:
                explanation = f"Typical rate: within {abs(pct_vs_30d):.0f}% of average"
        
        return {
            'is_deal': is_deal,
            'vs_avg_30d': f"{abs(pct_vs_30d):.0f}% {'below' if pct_vs_30d < 0 else 'above'}",
            'vs_avg_60d': f"{abs(pct_vs_60d):.0f}% {'below' if pct_vs_60d < 0 else 'above'}",
            'percentile': int(percentile),
            'explanation': explanation
        }
    
    @staticmethod
    def predict_best_booking_time(
        price_history: List[Dict],
        days_ahead: int = 7
    ) -> Dict:
        """
        Predict if prices will rise or fall in next N days
        
        Returns:
            {
                'recommendation': 'book_now' | 'wait' | 'uncertain',
                'confidence': float,
                'reasoning': str
            }
        """
        
        trend = PriceAnalyzer.detect_trend(price_history, lookback_days=14)
        current_price = price_history[-1]['price']
        avg_30d = PriceAnalyzer.calculate_rolling_average(price_history, 30)
        
        # Decision logic
        if trend['trend'] == 'rising' and trend['confidence'] > 0.6:
            recommendation = 'book_now'
            reasoning = f"Prices rising {trend['change_pct']:.1f}% - book before increase"
        
        elif trend['trend'] == 'falling' and trend['confidence'] > 0.6:
            recommendation = 'wait'
            reasoning = f"Prices falling {abs(trend['change_pct']):.1f}% - wait 2-3 days"
        
        elif current_price <= avg_30d * 0.85:
            recommendation = 'book_now'
            reasoning = f"Already 15%+ below average - good deal unlikely to improve"
        
        else:
            recommendation = 'uncertain'
            reasoning = f"Prices stable - book when convenient"
        
        return {
            'recommendation': recommendation,
            'confidence': trend['confidence'],
            'reasoning': reasoning
        }


class TimeSeriesService:
    """Main service for time-series pricing features"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def analyze_flight_price(self, flight_id: int) -> Dict:
        """
        Analyze flight price vs historical data
        
        Returns complete analysis including trend, deal validation, recommendation
        """
        
        flight = self.db.get(FlightDeal, flight_id)
        if not flight:
            return {'error': 'Flight not found'}
        
        # Generate historical prices (in production, fetch from DB)
        history = PriceHistoryGenerator.generate_flight_history(
            current_price=flight.price,
            days_back=60,
            trend='neutral'
        )
        
        # Analyze
        trend = PriceAnalyzer.detect_trend(history, lookback_days=14)
        deal_analysis = PriceAnalyzer.is_good_deal(flight.price, history)
        booking_rec = PriceAnalyzer.predict_best_booking_time(history)
        
        return {
            'flight_id': flight_id,
            'route': f"{flight.origin}→{flight.destination}",
            'current_price': flight.price,
            'trend': trend,
            'deal_analysis': deal_analysis,
            'booking_recommendation': booking_rec,
            'price_history': history[-7:]  # Last 7 days for UI
        }
    
    def analyze_hotel_price(self, hotel_id: int) -> Dict:
        """Analyze hotel price vs historical data"""
        
        hotel = self.db.get(HotelDeal, hotel_id)
        if not hotel:
            return {'error': 'Hotel not found'}
        
        # Generate historical prices with seasonality
        history = PriceHistoryGenerator.generate_hotel_history(
            current_price=hotel.price,
            days_back=60,
            seasonality=True
        )
        
        # Analyze
        trend = PriceAnalyzer.detect_trend(history, lookback_days=14)
        deal_analysis = PriceAnalyzer.is_good_deal(hotel.price, history)
        booking_rec = PriceAnalyzer.predict_best_booking_time(history)
        
        return {
            'hotel_id': hotel_id,
            'name': f"{hotel.neighbourhood}, {hotel.city}",
            'current_price': hotel.price,
            'trend': trend,
            'deal_analysis': deal_analysis,
            'booking_recommendation': booking_rec,
            'price_history': history[-7:]
        }
    
    def compare_to_market(
        self,
        flight_id: Optional[int] = None,
        hotel_id: Optional[int] = None
    ) -> str:
        """
        Generate user-facing explanation like:
        "This is 19% below its 60-day rolling average for these dates"
        """
        
        if flight_id:
            analysis = self.analyze_flight_price(flight_id)
            if 'error' in analysis:
                return analysis['error']
            
            deal = analysis['deal_analysis']
            trend = analysis['trend']
            
            explanation = (
                f"{deal['explanation']}. "
                f"Currently {deal['vs_avg_60d']} vs 60-day average. "
            )
            
            if trend['trend'] == 'rising':
                explanation += f"Prices trending up {trend['change_pct']}% - book soon."
            elif trend['trend'] == 'falling':
                explanation += f"Prices trending down {abs(trend['change_pct'])}% - may improve."
            
            return explanation
        
        elif hotel_id:
            analysis = self.analyze_hotel_price(hotel_id)
            if 'error' in analysis:
                return analysis['error']
            
            deal = analysis['deal_analysis']
            
            explanation = (
                f"{deal['explanation']}. "
                f"This rate ranks in the {deal['percentile']}th percentile "
                f"(lower is better) for the past 60 days."
            )
            
            return explanation
        
        return "No price data available"


# Utility function for chat endpoint
def explain_deal_quality(
    flight_id: Optional[int],
    hotel_id: Optional[int],
    db_session: Session
) -> str:
    """
    Quick function to answer "Is this a good deal?"
    
    Usage in chat endpoint:
        explanation = explain_deal_quality(bundle.flight_id, bundle.hotel_id, db)
    """
    
    service = TimeSeriesService(db_session)
    
    flight_exp = ""
    hotel_exp = ""
    
    if flight_id:
        flight_exp = service.compare_to_market(flight_id=flight_id)
    
    if hotel_id:
        hotel_exp = service.compare_to_market(hotel_id=hotel_id)
    
    if flight_exp and hotel_exp:
        return f"Flight: {flight_exp} Hotel: {hotel_exp}"
    elif flight_exp:
        return flight_exp
    elif hotel_exp:
        return hotel_exp
    else:
        return "Price history unavailable"
