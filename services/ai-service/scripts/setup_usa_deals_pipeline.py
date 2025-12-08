#!/usr/bin/env python3
"""
ONE-COMMAND USA DEALS PIPELINE
Production-ready script to process all raw data and load to database

Usage:
    python scripts/setup_usa_deals_pipeline.py [--skip-merge] [--skip-enrich] [--clear-db]

This script:
1. Merges USA-only datasets (flights.csv + NYC hotels)
2. Enriches with deal detection, price simulation, amenities
3. Loads to database with proper schema mapping
4. Verifies data integrity

Run this ONCE in production after deploying with raw CSV files.
"""

import argparse
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
from tqdm import tqdm

# Paths
DATA_DIR = Path('/app/data')
RAW_DIR = DATA_DIR / 'raw'
PROCESSED_DIR = DATA_DIR / 'processed'
FINAL_DIR = DATA_DIR / 'final'

# Database
DB_URL = 'mysql+pymysql://root:rootpassword@mysql:3306/kayak_db'

def step1_merge_usa_data():
    """Merge USA-only datasets: flights.csv (50K US domestic) + NYC hotels"""
    print("\n" + "="*70)
    print("STEP 1: MERGING USA DATASETS")
    print("="*70)
    
    # Load US flights
    print("📊 Loading US domestic flights...")
    flights = pd.read_csv(PROCESSED_DIR / 'flights_processed.csv')
    print(f"   ✅ Loaded {len(flights):,} flights from {flights['origin'].nunique()} origins")
    
    # Load NYC hotels (3 sources, deduplicate)
    print("📊 Loading NYC hotels...")
    listings1 = pd.read_csv(PROCESSED_DIR / 'listings_processed.csv')
    listings2 = pd.read_csv(PROCESSED_DIR / 'listings_2_processed.csv')
    hotel_booking = pd.read_csv(PROCESSED_DIR / 'hotel_booking_processed.csv')
    
    # Filter hotel_booking to NYC only
    hotel_booking_nyc = hotel_booking[hotel_booking['city'] == 'NYC'].copy()
    
    # Combine and deduplicate
    hotels_combined = pd.concat([listings1, listings2, hotel_booking_nyc], ignore_index=True)
    hotels = hotels_combined.drop_duplicates(subset=['listing_id'], keep='first')
    
    print(f"   ✅ Combined {len(hotels_combined):,} → {len(hotels):,} unique NYC hotels")
    
    # Save
    flights.to_csv(FINAL_DIR / 'flights_usa.csv', index=False)
    hotels.to_csv(FINAL_DIR / 'hotels_nyc.csv', index=False)
    
    print(f"\n✅ MERGED: {len(flights):,} flights + {len(hotels):,} hotels = {len(flights) + len(hotels):,} total")
    return len(flights), len(hotels)

def step2_enrich_flights():
    """Apply deal detection to flights"""
    print("\n" + "="*70)
    print("STEP 2: ENRICHING FLIGHTS WITH DEALS")
    print("="*70)
    
    df = pd.read_csv(FINAL_DIR / 'flights_usa.csv')
    
    # Price simulation
    print("💰 Simulating dynamic pricing...")
    np.random.seed(42)
    df['baseline_price'] = df['price']
    df['current_price'] = df['baseline_price'] * np.random.uniform(0.90, 1.10, len(df))
    
    # Apply promos (15% of flights)
    promo_mask = np.random.random(len(df)) < 0.15
    df.loc[promo_mask, 'current_price'] *= np.random.uniform(0.75, 0.90, promo_mask.sum())
    
    # Red-eye discount
    df.loc[df['is_red_eye'] == 1, 'current_price'] *= 0.85
    
    df['deal_percentage'] = ((df['baseline_price'] - df['current_price']) / df['baseline_price'] * 100).clip(0, 100)
    df['is_deal'] = df['deal_percentage'] > 5
    
    # Scarcity
    df['limited_availability'] = df['seats_left'] < 5
    
    # Tags
    def make_tags(row):
        tags = []
        if row['deal_percentage'] > 20:
            tags.append(f"{int(row['deal_percentage'])}% below average")
        elif row['deal_percentage'] > 10:
            tags.append(f"{int(row['deal_percentage'])}% discount")
        if row['is_red_eye']:
            tags.append('red-eye flight')
        if row['stops'] == 0:
            tags.append('non-stop')
        return ', '.join(tags) if tags else 'non-stop'
    
    df['why_this_deal'] = df.apply(make_tags, axis=1)
    
    df.to_csv(FINAL_DIR / 'flights_enriched.csv', index=False)
    
    deals = (df['is_deal'] == True).sum()
    print(f"✅ Enriched {len(df):,} flights | {deals:,} deals ({deals/len(df)*100:.1f}%)")
    return len(df), deals

def step3_enrich_hotels():
    """Apply deal detection to hotels"""
    print("\n" + "="*70)
    print("STEP 3: ENRICHING HOTELS WITH DEALS")
    print("="*70)
    
    df = pd.read_csv(FINAL_DIR / 'hotels_nyc.csv')
    
    # Simulate avg_30d_price
    print("💰 Calculating 30-day average prices...")
    np.random.seed(42)
    # Changed from 1.05-1.25 to 0.95-1.10 so hotels can be < 0.85 threshold (enable deals)
    df['avg_30d_price'] = df['price'] * np.random.uniform(0.95, 1.10, len(df))
    df['is_deal'] = df['price'] <= (df['avg_30d_price'] * 0.85)
    df['deal_percentage'] = ((df['avg_30d_price'] - df['price']) / df['avg_30d_price'] * 100).clip(0, 100)
    
    # Tags
    def make_tags(row):
        tags = []
        if row['is_pet_friendly']:
            tags.append('Pet-friendly')
        if row['near_transit']:
            tags.append('Near transit')
        if row['has_breakfast']:
            tags.append('Breakfast included')
        return ', '.join(tags) if tags else 'Standard'
    
    df['tags'] = df.apply(make_tags, axis=1)
    
    df.to_csv(FINAL_DIR / 'hotels_enriched.csv', index=False)
    
    deals = (df['is_deal'] == True).sum()
    print(f"✅ Enriched {len(df):,} hotels | {deals:,} deals ({deals/len(df)*100:.1f}%)")
    return len(df), deals

def step4_load_to_database(clear_db=False):
    """Load enriched data to MySQL"""
    print("\n" + "="*70)
    print("STEP 4: LOADING TO DATABASE")
    print("="*70)
    
    engine = create_engine(DB_URL)
    
    if clear_db:
        print("🗑️  Clearing existing data...")
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM flight_deals"))
            conn.execute(text("DELETE FROM hotel_deals"))
            conn.commit()
        print("   ✅ Tables cleared")
    
    # Load flights
    print("\n📊 Loading flights...")
    df = pd.read_csv(FINAL_DIR / 'flights_enriched.csv')
    
    today = date.today()
    now = datetime.now()
    
    df_load = pd.DataFrame({
        'route_key': df['origin'] + '_' + df['destination'] + '_' + str(today),
        'origin': df['origin'],
        'destination': df['destination'],
        'depart_date': today,
        'return_date': today + timedelta(days=7),
        'airline': df['airline'],
        'stops': df['stops'],
        'duration_minutes': (df['duration'] * 60).astype(int),
        'price': df['current_price'] if 'current_price' in df.columns else df['price'],
        'is_red_eye': df['is_red_eye'],
        'is_direct': df['stops'] == 0,
        'seats_left': df['seats_left'],
        'deal_score': ((df['deal_percentage'] if 'deal_percentage' in df.columns else 0) * 100 / 25).clip(0, 100).astype(int),
        'tags': df['why_this_deal'] if 'why_this_deal' in df.columns else '',
        'source': 'kaggle',
        'created_at': now,
        'updated_at': now
    })
    
    batch_size = 1000
    loaded = 0
    with engine.connect() as conn:
        for i in tqdm(range(0, len(df_load), batch_size), desc="Flights"):
            batch = df_load.iloc[i:i+batch_size]
            batch.to_sql('flight_deals', conn, if_exists='append', index=False)
            loaded += len(batch)
            if (i // batch_size) % 10 == 0:
                conn.commit()
        conn.commit()
    
    print(f"   ✅ Loaded {loaded:,} flights")
    
    # Load hotels
    print("\n🏨 Loading hotels...")
    df = pd.read_csv(FINAL_DIR / 'hotels_enriched.csv')
    
    df_load = pd.DataFrame({
        'listing_id': df['listing_id'].astype(str),
        'city': df['city'],
        'neighbourhood': df['neighbourhood'],
        'price': df['price'],
        'avg_30d_price': df['avg_30d_price'] if 'avg_30d_price' in df.columns else df['price'],
        'is_deal': df['is_deal'] if 'is_deal' in df.columns else False,
        'is_pet_friendly': df['is_pet_friendly'],
        'near_transit': df['near_transit'],
        'has_breakfast': df['has_breakfast'],
        'is_refundable': False,
        'rooms_left': df['rooms_left'],
        'cancellation_policy': 'flexible',
        'deal_score': ((df['deal_percentage'] if 'deal_percentage' in df.columns else 0) * 100 / 25).clip(0, 100).astype(int),
        'tags': df['tags'] if 'tags' in df.columns else '',
        'source': 'airbnb',
        'created_at': now,
        'updated_at': now
    })
    
    loaded = 0
    with engine.connect() as conn:
        for i in tqdm(range(0, len(df_load), batch_size), desc="Hotels"):
            batch = df_load.iloc[i:i+batch_size]
            batch.to_sql('hotel_deals', conn, if_exists='append', index=False)
            loaded += len(batch)
            if (i // batch_size) % 10 == 0:
                conn.commit()
        conn.commit()
    
    print(f"   ✅ Loaded {loaded:,} hotels")
    
    return True

def step5_verify():
    """Verify loaded data"""
    print("\n" + "="*70)
    print("STEP 5: VERIFICATION")
    print("="*70)
    
    engine = create_engine(DB_URL)
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM flight_deals"))
        flight_count = result.fetchone()[0]
        
        result = conn.execute(text("SELECT COUNT(*) FROM hotel_deals"))
        hotel_count = result.fetchone()[0]
        
        print(f"\n✅ DATABASE VERIFICATION:")
        print(f"   Flights: {flight_count:,}")
        print(f"   Hotels: {hotel_count:,}")
        print(f"   TOTAL: {flight_count + hotel_count:,} deals")
        
        if flight_count == 50000 and hotel_count == 9706:
            print(f"\n🎉 SUCCESS! All data loaded correctly.")
            return True
        else:
            print(f"\n⚠️  WARNING: Expected 50,000 flights + 9,706 hotels")
            return False

def main():
    parser = argparse.ArgumentParser(description='USA Deals Pipeline - One-command setup')
    parser.add_argument('--skip-merge', action='store_true', help='Skip merging step (use existing files)')
    parser.add_argument('--skip-enrich', action='store_true', help='Skip enrichment step (use existing files)')
    parser.add_argument('--clear-db', action='store_true', help='Clear database before loading')
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("🚀 USA DEALS PIPELINE - PRODUCTION SETUP")
    print("="*70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Create directories
        FINAL_DIR.mkdir(parents=True, exist_ok=True)
        
        # Step 1: Merge
        if not args.skip_merge:
            step1_merge_usa_data()
        else:
            print("\n⏭️  SKIPPING: Merge step")
        
        # Step 2-3: Enrich
        if not args.skip_enrich:
            step2_enrich_flights()
            step3_enrich_hotels()
        else:
            print("\n⏭️  SKIPPING: Enrichment steps")
        
        # Step 4: Load to DB
        step4_load_to_database(clear_db=args.clear_db)
        
        # Step 5: Verify
        success = step5_verify()
        
        print("\n" + "="*70)
        if success:
            print("✅ PIPELINE COMPLETE - READY FOR PRODUCTION")
        else:
            print("⚠️  PIPELINE COMPLETE - CHECK WARNINGS ABOVE")
        print("="*70)
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
