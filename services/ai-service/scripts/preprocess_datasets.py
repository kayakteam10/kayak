#!/usr/bin/env python3
"""
Dataset Preprocessing Script

Processes raw Kaggle datasets into clean CSV files optimized for AI service:
- Hotels (Inside Airbnb + Hotel Booking Demand)
- Flights (Flight Price Prediction)
- Airports (Global Airports)
"""

import argparse
import logging
import re
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def preprocess_airbnb_data(raw_dir: Path, output_dir: Path) -> None:
    """
    Process Inside Airbnb listings data.
    
    Extract: listing_id, date, price, availability, amenities, neighbourhood, city
    Add tags: is_pet_friendly, near_transit, has_breakfast
    """
    logger.info("📊 Processing Airbnb data...")
    
    # Try to find listings CSV (filename may vary)
    listings_files = list(raw_dir.glob("*listings*"))
    if not listings_files:
        logger.warning("⚠️  No listings file found in raw data")
        return
    
    listings_path = listings_files[0]
    logger.info(f"Reading {listings_path.name}")
    
    try:
        df = pd.read_csv(listings_path, low_memory=False)
        logger.info(f"Loaded {len(df)} listings")
        
        # Select and rename columns
        columns_map = {
            'id': 'listing_id',
            'price': 'price',
            'availability_365': 'availability_365',
            'amenities': 'amenities',
            'neighbourhood': 'neighbourhood',
            'neighbourhood_cleansed': 'neighbourhood',
        }
        
        # Use available columns
        available_cols = {k: v for k, v in columns_map.items() if k in df.columns}
        result = df[list(available_cols.keys())].copy()
        result.rename(columns=available_cols, inplace=True)
        
        # Clean price column (remove $, commas)
        if 'price' in result.columns:
            result['price'] = result['price'].astype(str).str.replace(r'[\$,]', '', regex=True)
            result['price'] = pd.to_numeric(result['price'], errors='coerce')
        
        # Add city (default to NYC if not present)
        result['city'] = 'NYC'
        
        # Parse amenities to extract tags
        if 'amenities' in result.columns:
            amenities_lower = result['amenities'].fillna('').astype(str).str.lower()
            
            result['is_pet_friendly'] = amenities_lower.str.contains(
                r'pet|dog|cat|animal', regex=True, case=False
            ).astype(int)
            
            result['near_transit'] = amenities_lower.str.contains(
                r'subway|metro|train|transit|station', regex=True, case=False
            ).astype(int)
            
            result['has_breakfast'] = amenities_lower.str.contains(
                r'breakfast|morning\s*meal|continental', regex=True, case=False
            ).astype(int)
        else:
            result['is_pet_friendly'] = 0
            result['near_transit'] = 0
            result['has_breakfast'] = 0
        
        # Add mock fields for consistency
        result['date'] = pd.Timestamp.now().strftime('%Y-%m-%d')
        result['rooms_left'] = np.random.randint(1, 20, size=len(result))
        
        # Drop rows with missing critical data
        result.dropna(subset=['listing_id', 'price'], inplace=True)
        
        # Save to processed
        output_path = output_dir / 'hotels.csv'
        result.to_csv(output_path, index=False)
        logger.info(f"✅ Saved {len(result)} hotels to {output_path}")
        
    except Exception as e:
        logger.error(f"❌ Error processing Airbnb data: {e}")
        raise


def preprocess_flight_data(raw_dir: Path, output_dir: Path) -> None:
    """
    Process flight price prediction data.
    
    Extract: airline, source, destination, duration, price, total_stops, dep_time
    Add: is_red_eye, seats_left
    """
    logger.info("✈️  Processing flight data...")
    
    # Find flight CSV
    flight_files = list(raw_dir.glob("*light*")) + list(raw_dir.glob("*Clean*"))
    if not flight_files:
        logger.warning("⚠️  No flight file found in raw data")
        return
    
    flight_path = flight_files[0]
    logger.info(f"Reading {flight_path.name}")
    
    try:
        df = pd.read_csv(flight_path, low_memory=False)
        logger.info(f"Loaded {len(df)} flights")
        
        # Map columns (handle different dataset formats)
        columns_map = {
            'airline': 'airline',
            'source': 'origin',
            'source_city': 'origin',
            'destination': 'destination',
            'destination_city': 'destination',
            'duration': 'duration',
            'price': 'price',
            'total_stops': 'stops',
            'stops': 'stops',
            'dep_time': 'dep_time',
            'departure_time': 'dep_time',
        }
        
        available_cols = {k: v for k, v in columns_map.items() if k in df.columns}
        result = df[list(available_cols.keys())].copy()
        result.rename(columns=available_cols, inplace=True)
        
        # Ensure required columns exist
        if 'airline' not in result.columns:
            result['airline'] = 'Unknown'
        if 'stops' not in result.columns:
            result['stops'] = 0
        
        # Convert duration to minutes
        if 'duration' in result.columns:
            # Handle formats like "2h 30m" or numeric
            def parse_duration(dur):
                if pd.isna(dur):
                    return np.nan
                if isinstance(dur, (int, float)):
                    return dur
                dur_str = str(dur).lower()
                hours = re.search(r'(\d+)h', dur_str)
                minutes = re.search(r'(\d+)m', dur_str)
                total = 0
                if hours:
                    total += int(hours.group(1)) * 60
                if minutes:
                    total += int(minutes.group(1))
                return total if total > 0 else np.nan
            
            result['duration_minutes'] = result['duration'].apply(parse_duration)
        else:
            result['duration_minutes'] = np.random.randint(60, 600, size=len(result))
        
        # Detect red-eye flights (22:00 - 05:00 departure)
        if 'dep_time' in result.columns:
            def is_red_eye(time_str):
                if pd.isna(time_str):
                    return 0
                try:
                    time_str = str(time_str).strip()
                    # Handle HH:MM format
                    if ':' in time_str:
                        hour = int(time_str.split(':')[0])
                    # Handle "Evening", "Night" categories
                    elif 'night' in time_str.lower() or 'late' in time_str.lower():
                        return 1
                    else:
                        hour = 12  # Default
                    return 1 if (hour >= 22 or hour <= 5) else 0
                except:
                    return 0
            
            result['is_red_eye'] = result['dep_time'].apply(is_red_eye)
        else:
            result['is_red_eye'] = 0
        
        # Add mock seats_left
        result['seats_left'] = np.random.randint(5, 50, size=len(result))
        
        # Drop rows with missing critical data
        result.dropna(subset=['origin', 'destination', 'price'], inplace=True)
        
        # Standardize IATA codes (uppercase, 3 letters)
        result['origin'] = result['origin'].astype(str).str.upper().str[:3]
        result['destination'] = result['destination'].astype(str).str.upper().str[:3]
        
        # Save
        output_path = output_dir / 'flights.csv'
        result.to_csv(output_path, index=False)
        logger.info(f"✅ Saved {len(result)} flights to {output_path}")
        
    except Exception as e:
        logger.error(f"❌ Error processing flight data: {e}")
        raise


def preprocess_airports_data(raw_dir: Path, output_dir: Path) -> None:
    """
    Process global airports data.
    
    Extract: iata_code, name, city, country, latitude, longitude
    """
    logger.info("🛫 Processing airports data...")
    
    # Find airports CSV
    airport_files = list(raw_dir.glob("*airport*")) + list(raw_dir.glob("*AIRPORT*"))
    if not airport_files:
        logger.warning("⚠️  No airports file found in raw data")
        return
    
    airport_path = airport_files[0]
    logger.info(f"Reading {airport_path.name}")
    
    try:
        df = pd.read_csv(airport_path, low_memory=False)
        logger.info(f"Loaded {len(df)} airports")
        
        # Map columns
        columns_map = {
            'iata': 'iata_code',
            'iata_code': 'iata_code',
            'name': 'name',
            'airport_name': 'name',
            'city': 'city',
            'country': 'country',
            'lat': 'latitude',
            'latitude': 'latitude',
            'lon': 'longitude',
            'longitude': 'longitude',
        }
        
        available_cols = {k: v for k, v in columns_map.items() if k in df.columns}
        result = df[list(available_cols.keys())].copy()
        result.rename(columns=available_cols, inplace=True)
        
        # Filter out airports without IATA codes
        if 'iata_code' in result.columns:
            result = result[result['iata_code'].notna()]
            result = result[result['iata_code'].str.len() == 3]
        
        # Drop duplicates
        result.drop_duplicates(subset=['iata_code'], inplace=True)
        
        # Save
        output_path = output_dir / 'airports.csv'
        result.to_csv(output_path, index=False)
        logger.info(f"✅ Saved {len(result)} airports to {output_path}")
        
    except Exception as e:
        logger.error(f"❌ Error processing airports data: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description='Preprocess Kaggle datasets for AI service')
    parser.add_argument('--raw-dir', type=str, default='data/raw',
                        help='Directory containing raw CSV files')
    parser.add_argument('--output-dir', type=str, default='data/processed',
                        help='Directory to save processed CSV files')
    parser.add_argument('--dataset', type=str, choices=['airbnb', 'flights', 'airports', 'all'],
                        default='all', help='Which dataset to process')
    
    args = parser.parse_args()
    
    raw_dir = Path(args.raw_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"🔧 Dataset Preprocessing")
    logger.info(f"Raw directory: {raw_dir}")
    logger.info(f"Output directory: {output_dir}")
    logger.info("=" * 50)
    
    if args.dataset in ['airbnb', 'all']:
        preprocess_airbnb_data(raw_dir, output_dir)
    
    if args.dataset in ['flights', 'all']:
        preprocess_flight_data(raw_dir, output_dir)
    
    if args.dataset in ['airports', 'all']:
        preprocess_airports_data(raw_dir, output_dir)
    
    logger.info("=" * 50)
    logger.info("✅ Preprocessing complete!")


if __name__ == "__main__":
    main()
