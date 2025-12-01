import asyncio
from pathlib import Path
from deals_agent import refresh_deals_once

async def main():
    print("Initializing database with dummy data...")
    await refresh_deals_once(
        Path("data/hotels.csv"),
        Path("data/flights.csv")
    )
    print("Database initialized!")

if __name__ == "__main__":
    asyncio.run(main())
