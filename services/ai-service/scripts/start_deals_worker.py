#!/usr/bin/env python3
"""
Deals Worker Startup Script

Runs the background deals agent worker that processes travel deals.
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.deals_agent import DealsWorker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment configuration
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root123")
DB_NAME = os.getenv("DB_NAME", "kayak_db")

# Database URL
if DB_HOST == "mysql":
    DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
else:
    DB_URL = "sqlite:///./agentic_ai_deals.db"


async def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("🤖 Deals Worker Starting...")
    logger.info(f"Kafka Broker: {KAFKA_BROKER}")
    logger.info(f"Database: {DB_URL}")
    logger.info("=" * 60)
    
    # Create worker
    worker = DealsWorker(
        kafka_broker=KAFKA_BROKER,
        db_url=DB_URL,
        batch_size=100
    )
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal...")
        asyncio.create_task(worker.stop())
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run worker
    try:
        await worker.run()
    except KeyboardInterrupt:
        logger.info("Worker interrupted")
    except Exception as e:
        logger.error(f"Worker failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
