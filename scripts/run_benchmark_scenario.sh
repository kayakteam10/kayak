#!/bin/bash

# Kayak Benchmark Scenario Runner
# Usage: ./run_benchmark_scenario.sh [A|B|C|D]
# A = Base (No optimizations)
# B = Base + Cache
# C = Base + Cache + Kafka
# D = Full (Cache + Kafka + Compression)

SCENARIO=$1
RESULTS_DIR="results"
JMETER_PLAN="tests/performance/kayak_benchmark.jmx"

if [ -z "$SCENARIO" ]; then
    echo "Usage: $0 [A|B|C|D]"
    exit 1
fi

mkdir -p "$RESULTS_DIR"

echo "════════════════════════════════════════"
echo "  Running Scenario $SCENARIO"
echo "════════════════════════════════════════"

# Configure services based on scenario
case $SCENARIO in
    A)
        echo "Scenario A: Base (No Cache, No Kafka, No Compression)"
        ENABLE_CACHE=false
        ENABLE_KAFKA=false
        ENABLE_COMPRESSION=false
        ;;
    B)
        echo "Scenario B: Base + Cache"
        ENABLE_CACHE=true
        ENABLE_KAFKA=false
        ENABLE_COMPRESSION=false
        ;;
    C)
        echo "Scenario C: Base + Cache + Kafka"
        ENABLE_CACHE=true
        ENABLE_KAFKA=true
        ENABLE_COMPRESSION=false
        ;;
    D)
        echo "Scenario D: Full Optimizations"
        ENABLE_CACHE=true
        ENABLE_KAFKA=true
        ENABLE_COMPRESSION=true
        ;;
    *)
        echo "Invalid scenario: $SCENARIO"
        exit 1
        ;;
esac

# Update environment files
echo "Configuring services..."
cd services

for service in flight-service hotel-service car-service booking-service; do
    if [ -f "$service/.env" ]; then
        # Update existing .env
        sed -i.bak "s/^ENABLE_CACHE=.*/ENABLE_CACHE=$ENABLE_CACHE/" "$service/.env"
        sed -i.bak "s/^ENABLE_KAFKA=.*/ENABLE_KAFKA=$ENABLE_KAFKA/" "$service/.env"
        sed -i.bak "/^ENABLE_COMPRESSION=/d" "$service/.env"
        echo "ENABLE_COMPRESSION=$ENABLE_COMPRESSION" >> "$service/.env"
    else
        # Create new .env
        echo "ENABLE_CACHE=$ENABLE_CACHE" > "$service/.env"
        echo "ENABLE_KAFKA=$ENABLE_KAFKA" >> "$service/.env"
        echo "ENABLE_COMPRESSION=$ENABLE_COMPRESSION" >> "$service/.env"
    fi
done

cd ..

# Restart services with new configuration
echo "Restarting services..."
docker compose -f services/docker-compose.yml restart flight-service hotel-service car-service booking-service

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 20

# Verify Feature Flags
echo "🔍 Verifying Feature Flags in Logs (Last 30s)..."
echo "Flight Service:"
docker logs --since 30s kayak-flight-service 2>&1 | grep "Feature Flags" | tail -1
echo "Hotel Service:"
docker logs --since 30s kayak-hotel-service 2>&1 | grep "Feature Flags" | tail -1
echo "Car Service:"
docker logs --since 30s kayak-car-service 2>&1 | grep "Feature Flags" | tail -1
echo "Platform Service:"
docker logs --since 30s kayak-platform-service 2>&1 | grep "Compression" | tail -1

# Run JMeter test
echo "Starting JMeter test (60 seconds)..."
if command -v jmeter &> /dev/null; then
    # Cleanup previous results
    rm -rf "$RESULTS_DIR/scenario_$SCENARIO"
    rm -f "$RESULTS_DIR/scenario_$SCENARIO.jtl"
    
    jmeter -n -t "$JMETER_PLAN" -l "$RESULTS_DIR/scenario_$SCENARIO.jtl" -e -o "$RESULTS_DIR/scenario_$SCENARIO"
else
    echo "ERROR: JMeter not found. Please install Apache JMeter."
    exit 1
fi

echo "════════════════════════════════════════"
