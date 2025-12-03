#!/bin/bash

# Master Benchmark Execution Script
# Runs all 4 scenarios and generates the final report

set -e

echo "══════════════════════════════════════════════════"
echo "   KAYAK PERFORMANCE BENCHMARK SUITE"
echo "══════════════════════════════════════════════════"
echo ""
echo "This will run 4 scenarios (A, B, C, D)"
echo "Estimated time: ~5 minutes"
echo ""
read -p "Press Enter to start..."

# Make sure scripts are executable
chmod +x scripts/run_benchmark_scenario.sh
chmod +x scripts/generate_benchmark_report.py

# Run all scenarios
for scenario in A B C D; do
    echo ""
    ./scripts/run_benchmark_scenario.sh $scenario
    echo "Waiting 10 seconds before next scenario..."
    sleep 10
done

# Generate report
echo ""
echo "══════════════════════════════════════════════════"
echo "   GENERATING REPORT"
echo "══════════════════════════════════════════════════"

# Install Python dependencies if needed
if ! python3 -c "import matplotlib" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip3 install matplotlib
fi

python3 scripts/generate_benchmark_report.py

echo ""
echo "══════════════════════════════════════════════════"
echo "   BENCHMARK COMPLETE!"
echo "══════════════════════════════════════════════════"
echo "Report: performance_report.md"
echo "Raw data: results/"
echo ""
