#!/bin/bash
# Download Kaggle datasets for AI service
# Usage: bash scripts/download_kaggle_datasets.sh

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}📦 Kaggle Dataset Download Script${NC}"
echo "=========================================="

# Check if Kaggle CLI is installed
if ! command -v kaggle &> /dev/null; then
    echo -e "${YELLOW}⚠️  Kaggle CLI not found. Installing...${NC}"
    pip install kaggle
fi

# Verify Kaggle API credentials
if [ ! -f ~/.kaggle/kaggle.json ]; then
    echo -e "${RED}❌ Kaggle API credentials not found!${NC}"
    echo "Please download your kaggle.json from https://www.kaggle.com/settings"
    echo "And place it in ~/.kaggle/kaggle.json"
    echo ""
    echo "mkdir -p ~/.kaggle"
    echo "mv ~/Downloads/kaggle.json ~/.kaggle/"
    echo "chmod 600 ~/.kaggle/kaggle.json"
    exit 1
fi

# Ensure correct permissions
chmod 600 ~/.kaggle/kaggle.json

# Create data directories
DATA_DIR="services/ai-service/data/raw"
mkdir -p "$DATA_DIR"
echo -e "${GREEN}✅ Created data directory: $DATA_DIR${NC}"

# Download datasets
echo ""
 echo -e "${YELLOW}📥 Downloading Inside Airbnb NYC...${NC}"
if ! kaggle datasets download -d dominoweir/inside-airbnb-nyc -p "$DATA_DIR" --unzip 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Primary dataset unavailable, trying alternate...${NC}"
    kaggle datasets download -d ahmedmagdee/inside-airbnb -p "$DATA_DIR" --unzip || {
        echo -e "${RED}❌ Failed to download Airbnb dataset${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✅ Downloaded Inside Airbnb${NC}"

echo ""
echo -e "${YELLOW}📥 Downloading Flight Price Prediction...${NC}"
kaggle datasets download -d shubhambathwal/flight-price-prediction -p "$DATA_DIR" --unzip || {
    echo -e "${RED}❌ Failed to download Flight dataset${NC}"
    exit 1
}
echo -e "${GREEN}✅ Downloaded Flight Price Prediction${NC}"

echo ""
echo -e "${YELLOW}📥 Downloading Global Airports...${NC}"
kaggle datasets download -d samvelkoch/global-airports-iata-icao-timezone-geo -p "$DATA_DIR" --unzip || {
    echo -e "${RED}❌ Failed to download Airports dataset${NC}"
    exit 1
}
echo -e "${GREEN}✅ Downloaded Global Airports${NC}"

echo ""
echo -e "${YELLOW}📥 Downloading Hotel Booking Demand...${NC}"
kaggle datasets download -d mojtaba142/hotel-booking -p "$DATA_DIR" --unzip || {
    echo -e "${RED}❌ Failed to download Hotel Booking dataset${NC}"
    exit 1
}
echo -e "${GREEN}✅ Downloaded Hotel Booking Demand${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All datasets downloaded successfully!${NC}"
echo ""

# Run preprocessing
echo -e "${YELLOW}🔧 Running data preprocessing...${NC}"
cd services/ai-service
python scripts/preprocess_datasets.py || {
    echo -e "${RED}❌ Preprocessing failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}🎉 Dataset download and preprocessing complete!${NC}"
