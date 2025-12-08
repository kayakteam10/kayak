# DATA INTEGRATION PLAN - USA FOCUS

## DATASETS TO USE (USA-Related Only)

### ✅ FLIGHT DATA (50,000 rows)
**Source**: `flights_processed.csv` (US domestic flights only)
- **Origins**: 311 US airports (ATL, ORD, DFW, DEN, LAX, etc.)
- **Coverage**: 3,954 unique routes across USA
- **Airlines**: 14 US carriers (UA, AA, DL, WN, etc.)
- **Use For**: Deals Agent baseline + time series simulation

**Columns Extracted**:
- `airline`, `origin`, `destination`, `stops`, `duration`, `price`, `dep_time`, `is_red_eye`, `seats_left`

**Price Simulation Strategy**:
1. Use existing `price` as baseline (random $89-$599)
2. Apply mean-reverting time series: ±10% daily fluctuation
3. Random promo dips: -10% to -25% (15% of flights)
4. Scarcity flag: `seats_left < 5` = "Limited availability"
5. Red-eye discount: Additional -15% if `is_red_eye = 1`

### ✅ HOTEL DATA - NYC (14,723 rows)
**Sources Combined**:
1. `listings_processed.csv` (8,120 NYC Airbnb)
2. `listings_2_processed.csv` (5,017 NYC Airbnb - higher quality)
3. `hotel_booking_processed.csv` (1,586 NYC hotels)

**Columns Extracted**:
- `listing_id`, `city`, `neighbourhood`, `price`, `rooms_left`, `is_pet_friendly`, `near_transit`, `has_breakfast`

**Deal Detection Strategy** (per requirements):
1. **Compute avg_30d_price**: Use reviews.csv timestamps to simulate 30-day rolling avg
2. **Flag deals**: `price ≤ 0.85 × avg_30d_price` = "Deal detected"
3. **Limited availability**: `rooms_left < 5` = "Only X rooms left!"
4. **Tags**: Extract from columns:
   - `is_pet_friendly = 1` → "Pet-friendly"
   - `near_transit = 1` → "Near transit"
   - `has_breakfast = 1` → "Breakfast included"

**NYC Neighbourhood Coverage**: 227 unique neighbourhoods (Manhattan, Brooklyn, Queens, Bronx)

### ✅ REFERENCE DATA

**1. Airlines (14 carriers)**
- Map IATA codes to full names: UA → "United Air Lines Inc."
- Source: `airlines_processed.csv`

**2. Airports (322 US airports)**
- IATA codes + coordinates (latitude, longitude)
- City mapping: JFK/LGA → New York, LAX → Los Angeles
- Source: `airports_processed.csv`

**3. Routes (67,663 global routes)**
- Validate origin→destination pairs exist
- Check if route requires stops
- Source: `routes_processed.csv`

**4. NYC Neighbourhoods (230 areas)**
- Borough grouping: Manhattan, Brooklyn, Queens, Bronx, Staten Island
- Source: `neighbourhoods_processed.csv`

**5. Reviews (986K timestamps)**
- Calculate avg_30d_price for each listing
- Detect price trends (rising/falling)
- Source: `reviews_processed.csv`

---

## ❌ DATASETS TO SKIP (Not USA-Related)

1. **business_processed.csv** (93K rows) - Indian routes only (DEL, BOM, BLR, MAA, CCU, HYD)
2. **economy_processed.csv** (207K rows) - Indian routes only
3. **Clean_Dataset_processed.csv** (300K rows) - Indian routes only
4. **hotel_booking international** (71,831 rows) - Could use for future expansion to London, Paris, Tokyo, etc.

---

## IMPLEMENTATION PLAN

### Phase 1: Merge & Deduplicate USA Data
**Script**: `merge_usa_datasets.py`

```python
# FLIGHTS: Use flights_processed.csv (50K US domestic)
df_flights = pd.read_csv('flights_processed.csv')

# HOTELS: Merge 3 NYC sources
df_nyc_1 = pd.read_csv('listings_processed.csv')
df_nyc_2 = pd.read_csv('listings_2_processed.csv')
df_nyc_hotels = pd.read_csv('hotel_booking_processed.csv')
df_nyc_hotels = df_nyc_hotels[df_nyc_hotels['city'] == 'NYC']

# Deduplicate by listing_id, keep highest quality
df_hotels = pd.concat([df_nyc_1, df_nyc_2, df_nyc_hotels])
df_hotels = df_hotels.drop_duplicates(subset=['listing_id'], keep='first')

# Add neighbourhood details from reference
df_neighbourhoods = pd.read_csv('neighbourhoods_processed.csv')
```

### Phase 2: Enrich Flight Data (Deals Agent)
**Script**: `enrich_flights_with_deals.py`

```python
# 1. Join airports for coordinates
df_airports = pd.read_csv('airports_processed.csv')
df_flights = df_flights.merge(
    df_airports[['IATA_CODE', 'CITY', 'LATITUDE', 'LONGITUDE']],
    left_on='origin', right_on='IATA_CODE'
)

# 2. Validate routes exist
df_routes = pd.read_csv('routes_processed.csv')
# Check if origin→destination is a known route

# 3. Simulate time series pricing
df_flights['baseline_price'] = df_flights['price']
df_flights['current_price'] = apply_mean_reversion(df_flights['baseline_price'])
df_flights['is_deal'] = random_promo_dips(15%)  # -10% to -25%
df_flights['deal_percentage'] = calculate_discount()

# 4. Add scarcity flags
df_flights['limited_availability'] = df_flights['seats_left'] < 5
```

### Phase 3: Enrich Hotel Data (Deals Agent)
**Script**: `enrich_hotels_with_deals.py`

```python
# 1. Calculate avg_30d_price from reviews
df_reviews = pd.read_csv('reviews_processed.csv')
# Group by listing_id, compute rolling 30-day avg price

# 2. Flag deals
df_hotels['avg_30d_price'] = merge_with_reviews()
df_hotels['is_deal'] = df_hotels['price'] <= 0.85 * df_hotels['avg_30d_price']
df_hotels['deal_percentage'] = (1 - df_hotels['price'] / df_hotels['avg_30d_price']) * 100

# 3. Add tags
df_hotels['tags'] = build_tags([
    ('is_pet_friendly', 'Pet-friendly'),
    ('near_transit', 'Near transit'),
    ('has_breakfast', 'Breakfast included')
])

# 4. Limited availability
df_hotels['limited_availability'] = df_hotels['rooms_left'] < 5
```

### Phase 4: Load to Database
**Script**: `load_usa_deals_to_db.py`

```python
# Clear existing data
DELETE FROM flight_deals;
DELETE FROM hotel_deals;

# Load enriched data
INSERT INTO flight_deals (...) VALUES (...);  # 50K flights
INSERT INTO hotel_deals (...) VALUES (...);   # 14.7K hotels

# Verify
SELECT COUNT(*), origin, destination FROM flight_deals GROUP BY origin, destination;
SELECT COUNT(*), city, neighbourhood FROM hotel_deals GROUP BY city, neighbourhood;
```

---

## CONCIERGE AGENT LOGIC

### Bundle Creation (from requirements)
1. **Query deals**: Filter by origin, destination, date range
2. **Compute Fit Score**:
   ```
   fit_score = (
       price_match * 0.4 +        # price vs budget/median
       amenity_match * 0.3 +      # pet/parking/breakfast tags
       location_match * 0.3       # neighbourhood proximity
   )
   ```
3. **Generate Explanations**:
   - **Why this**: "25% below avg price, pet-friendly, near subway" (≤25 words)
   - **What to watch**: "Non-refundable after 48h, only 3 rooms left"

### Bundle Response Format
```json
{
  "bundle_id": "BDL_12345",
  "fit_score": 0.87,
  "total_price": 450.00,
  "flight": {
    "airline": "United",
    "origin": "LAX",
    "destination": "JFK",
    "price": 250.00,
    "is_deal": true,
    "deal_percentage": 18.5,
    "seats_left": 3
  },
  "hotel": {
    "name": "Brooklyn Loft",
    "neighbourhood": "Williamsburg",
    "price": 200.00,
    "is_deal": true,
    "deal_percentage": 22.0,
    "rooms_left": 2,
    "tags": ["Pet-friendly", "Near transit", "Breakfast included"]
  },
  "explanation": {
    "why_this": "Flight 18% off + hotel 22% below avg, pet-friendly, subway nearby",
    "what_to_watch": "Non-refundable, only 2 rooms left, book within 24h"
  }
}
```

---

## DATA VOLUME SUMMARY (USA Only)

| Dataset | Rows | Use |
|---------|------|-----|
| **Flights** | 50,000 | Flight deals with 311 US origins |
| **Hotels (NYC)** | 14,723 | NYC accommodation deals |
| **Airlines** | 14 | Carrier name mapping |
| **Airports** | 322 | IATA codes + coordinates |
| **Routes** | 67,663 | Route validation |
| **Neighbourhoods** | 230 | NYC area mapping |
| **Reviews** | 986K | avg_30d_price calculation |

**Total Deal Records**: ~65K (50K flights + 15K hotels)

---

## NEXT STEPS

1. ✅ Create `merge_usa_datasets.py`
2. ✅ Create `enrich_flights_with_deals.py`
3. ✅ Create `enrich_hotels_with_deals.py`
4. ✅ Create `load_usa_deals_to_db.py`
5. ✅ Update `main.py` to use enriched deal logic
6. ✅ Test bundle creation: LAX→JFK + NYC hotel
7. ✅ Verify fit_score calculation
8. ✅ Test deal detection (price ≤ 0.85 × avg_30d)

---

## FUTURE EXPANSION (International)

If we want to add international destinations:
- Use `hotel_booking_processed.csv` cities: London (9.6K), Paris (8.4K), Barcelona (6.3K), etc.
- Validate with `routes_processed.csv` for US→International flights
- Map US origin → International destination (LAX→London, JFK→Paris)
