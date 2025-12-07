#!/bin/bash
# Run AI Service Tests

set -e

echo "🧪 Running AI Service Tests..."
echo "=================================="

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install test dependencies
pip install -q pytest pytest-asyncio pytest-cov httpx

# Run tests with coverage
pytest tests/ \
    --verbose \
    --cov=src \
    --cov-report=term-missing \
    --cov-report=html:htmlcov \
    -W ignore::DeprecationWarning

echo ""
echo "=================================="
echo "✅ Tests complete!"
echo "Coverage report: htmlcov/index.html"
