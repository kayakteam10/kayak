#!/bin/bash
echo "📦 Installing dependencies for all services..."

cd services/flight-service && npm install
cd ../hotel-service && npm install
cd ../car-service && npm install
cd ../booking-service && npm install
cd ../payment-billing-service && npm install
cd ../platform-service && npm install
cd ../review-service && npm install

echo "✅ All dependencies installed."
