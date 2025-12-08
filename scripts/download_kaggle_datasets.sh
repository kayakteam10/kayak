#!/bin/bash
# Download Kaggle datasets for AI service
# Usage: bash scripts/download_kaggle_datasets.sh

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📦 Kaggle Dataset Download Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Kaggle CLI is installed
if ! command -v kaggle &> /dev/null; then
    echo -e "${YELLOW}⚠️  Kaggle CLI not found. Installing...${NC}"
    python3 -m pip install kaggle
fi

# Verify Kaggle API credentials
if [ ! -f ~/.kaggle/kaggle.json ]; then
    echo -e "${RED}❌ Kaggle API credentials not found!${NC}"
    echo ""
    echo -e "${YELLOW}🔐 Setup Instructions:${NC}"
    echo "1. Go to https://www.kaggle.com/settings"
    echo "2. Scroll to 'API' section"
    echo "3. Click 'Create New Token'"
    echo "4. Download kaggle.json"
    echo ""
    echo -e "${YELLOW}📝 Then run these commands:${NC}"
    echo "  mkdir -p ~/.kaggle"
    echo "  mv ~/Downloads/kaggle.json ~/.kaggle/"
    echo "  chmod 600 ~/.kaggle/kaggle.json"
    echo ""
    exit 1
fi

# Ensure correct permissions
chmod 600 ~/.kaggle/kaggle.json

# Create data directories
DATA_DIR="services/ai-service/data/raw"
mkdir -p "$DATA_DIR"
echo -e "${GREEN}✅ Created data directory: $DATA_DIR${NC}"
echo ""

# Dataset 1: Inside Airbnb NYC (Hotels)
echo -e "${BLUE}[1/7]${NC} ${YELLOW}Downloading Inside Airbnb NYC (Hotels)...${NC}"
if ! kaggle datasets download -d dominoweir/inside-airbnb-nyc -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${YELLOW}      ⚠️  Primary source unavailable, trying alternate...${NC}"
    if ! kaggle datasets download -d ahmedmagdee/inside-airbnb -p "$DATA_DIR" --unzip 2>/dev/null; then
        echo -e "${RED}      ❌ Failed (optional dataset, continuing...)${NC}"
    else
        echo -e "${GREEN}      ✅ Downloaded from alternate source${NC}"
    fi
else
    echo -e "${GREEN}      ✅ Downloaded Inside Airbnb NYC${NC}"
fi
echo ""

# Dataset 2: Hotel Booking Demand
echo -e "${BLUE}[2/7]${NC} ${YELLOW}Downloading Hotel Booking Demand...${NC}"
if ! kaggle datasets download -d mojtaba142/hotel-booking -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${RED}      ❌ Failed to download Hotel Booking Demand${NC}"
else
    echo -e "${GREEN}      ✅ Downloaded Hotel Booking Demand${NC}"
fi
echo ""

# Dataset 3: Flight Price Prediction (India)
echo -e "${BLUE}[3/7]${NC} ${YELLOW}Downloading Flight Price Prediction (EaseMyTrip)...${NC}"
if ! kaggle datasets download -d shubhambathwal/flight-price-prediction -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${YELLOW}      ⚠️  Primary flight dataset unavailable, trying alternate...${NC}"
    # Try alternate flight dataset
    if ! kaggle datasets download -d dilwong/flightprices -p "$DATA_DIR" --unzip 2>/dev/null; then
        echo -e "${RED}      ❌ Failed both flight datasets${NC}"
    else
        echo -e "${GREEN}      ✅ Downloaded Expedia Flight Prices (alternate)${NC}"
    fi
else
    echo -e "${GREEN}      ✅ Downloaded Flight Price Prediction${NC}"
fi
echo ""

# Dataset 4: Global Airports
echo -e "${BLUE}[4/7]${NC} ${YELLOW}Downloading Global Airports (IATA/ICAO)...${NC}"
if ! kaggle datasets download -d samvelkoch/global-airports-iata-icao-timezone-geo -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${RED}      ❌ Failed to download Global Airports${NC}"
else
    echo -e "${GREEN}      ✅ Downloaded Global Airports${NC}"
fi
echo ""

# Dataset 5: OpenFlights (Airlines, Airports, Routes)
echo -e "${BLUE}[5/7]${NC} ${YELLOW}Downloading OpenFlights Database...${NC}"
if ! kaggle datasets download -d elmoallistair/airlines-airport-and-routes -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${YELLOW}      ⚠️  OpenFlights optional, continuing...${NC}"
else
    echo -e "${GREEN}      ✅ Downloaded OpenFlights${NC}"
fi
echo ""

# Dataset 6: US Flight Delays (Optional)
echo -e "${BLUE}[6/7]${NC} ${YELLOW}Downloading US Flight Delays 2015 (Optional)...${NC}"
if ! kaggle datasets download -d usdot/flight-delays -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${YELLOW}      ⚠️  Large dataset, skipping (optional)${NC}"
else
    echo -e "${GREEN}      ✅ Downloaded US Flight Delays${NC}"
fi
echo ""

# Dataset 7: Expedia Hotel Recommendations (Optional/Stretch)
echo -e "${BLUE}[7/7]${NC} ${YELLOW}Checking for Expedia Hotel Recommendations (Optional)...${NC}"
echo -e "${YELLOW}      ℹ️  Competition dataset - manual download required if needed${NC}"
echo -e "${YELLOW}      📍 URL: https://www.kaggle.com/competitions/expedia-hotel-recommendations${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      ✅ Dataset Download Complete     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# List downloaded files
echo -e "${YELLOW}📂 Downloaded files:${NC}"
ls -lh "$DATA_DIR" | tail -n +2 | awk '{print "   " $9 " (" $5 ")"}'
echo ""

# Run preprocessing
echo -e "${BLUE}🔧 Running data preprocessing...${NC}"
cd services/ai-service
if python3 scripts/preprocess_datasets.py; then
    echo -e "${GREEN}✅ Preprocessing complete!${NC}"
else
    echo -e "${RED}❌ Preprocessing failed (check Python environment)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 All Done! Data is ready to use   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📊 Processed data location:${NC}"
echo "   services/ai-service/data/processed/"
echo ""
