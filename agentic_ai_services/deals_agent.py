# agentic_ai_service/deals_agent.py
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import pandas as pd
from sqlmodel import Session, SQLModel, create_engine, select, delete

from .models import HotelDeal, FlightDeal

DB_URL = "sqlite:///./agentic_ai_deals.db"
engine = create_engine(DB_URL, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def _bool_from_amenities(amenities: str, keyword: str) -> bool:
    if not isinstance(amenities, str):
        return False
    return keyword.lower() in amenities.lower()


def load_hotel_deals_from_csv(csv_path: Path) -> Iterable[HotelDeal]:
    """
    Expects an Inside-Airbnb-like CSV with at least:
    listing_id, date, price, availability_365/availability, amenities, neighbourhood, city
    """
    df = pd.read_csv(csv_path)
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = (
        df["price"]
        .astype(str)
        .str.replace(r"[\$,]", "", regex=True)
        .astype(float)
    )

    # 30-day rolling average by listing
    cutoff = df["date"].max() - timedelta(days=30)
    recent = df[df["date"] >= cutoff]
    avg_30d = recent.groupby("listing_id")["price"].mean().rename("avg_30d_price")
    merged = df.merge(avg_30d, on="listing_id", how="left")

    # Take the most recent row per listing as the "current offer"
    merged.sort_values(["listing_id", "date"], ascending=[True, False], inplace=True)
    current = merged.drop_duplicates(subset=["listing_id"], keep="first")

    for _, row in current.iterrows():
        price = float(row["price"])
        avg_price = float(row["avg_30d_price"])
        is_deal = price <= 0.85 * avg_price

        yield HotelDeal(
            listing_id=str(row["listing_id"]),
            city=str(row.get("city", "")),
            neighbourhood=str(row.get("neighbourhood", "")),
            price=price,
            avg_30d_price=avg_price,
            is_deal=bool(is_deal),
            is_pet_friendly=_bool_from_amenities(row.get("amenities", ""), "pet"),
            near_transit=_bool_from_amenities(row.get("amenities", ""), "transit"),
            has_breakfast=_bool_from_amenities(row.get("amenities", ""), "breakfast"),
            rooms_left=int(row.get("availability_365", 10)),
            source="airbnb",
        )


def load_flight_deals_from_csv(csv_path: Path) -> Iterable[FlightDeal]:
    """
    Expects a flight price CSV with at least:
    airline, source, destination, duration, price, total_stops, dep_time
    (adapt columns to your chosen dataset).
    """
    df = pd.read_csv(csv_path)

    def to_minutes(d: str) -> int:
        # e.g. "2h 30m"
        if isinstance(d, (int, float)):
            return int(d)
        parts = str(d).lower().replace("h", " ").replace("m", "").split()
        mins = 0
        if len(parts) >= 1:
            mins += int(parts[0]) * 60
        if len(parts) >= 2:
            mins += int(parts[1])
        return mins

    df["duration_minutes"] = df["duration"].apply(to_minutes)

    today = datetime.utcnow().date()
    depart_date = today + timedelta(days=30)

    rows = []
    for _, row in df.iterrows():
        origin = str(row["source"])
        dest = str(row["destination"])
        route_key = f"{origin}_{dest}_{depart_date.isoformat()}"

        is_red_eye = False  # You can refine this using dep_time if present

        rows.append(
            FlightDeal(
                route_key=route_key,
                origin=origin,
                destination=dest,
                depart_date=depart_date,
                airline=str(row["airline"]),
                stops=int(row.get("total_stops", 0)),
                duration_minutes=int(row["duration_minutes"]),
                price=float(row["price"]),
                is_red_eye=is_red_eye,
                seats_left=int(row.get("seats_left", 20)),
                source="kaggle",
            )
        )

    return rows


async def refresh_deals_once(
    hotel_csv: Path, flight_csv: Path | None = None
) -> None:
    """
    One full refresh cycle: truncate existing deals, recompute from CSVs, store.
    """
    init_db()
    with Session(engine) as session:
        session.exec(delete(HotelDeal))
        session.exec(delete(FlightDeal))
        session.commit()

        for deal in load_hotel_deals_from_csv(hotel_csv):
            session.add(deal)

        if flight_csv is not None:
            for deal in load_flight_deals_from_csv(flight_csv):
                session.add(deal)

        session.commit()


async def scheduled_refresh_loop(
    hotel_csv: Path, flight_csv: Path | None = None, interval_seconds: int = 900
) -> None:
    """
    Periodic refresh. Run this in a separate process (or thread) from FastAPI.
    """
    while True:
        print("[DealsAgent] Starting refresh cycle...")
        await refresh_deals_once(hotel_csv, flight_csv)
        print("[DealsAgent] Refresh completed.")
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    # Example standalone run:
    hotel_csv = Path("data/hotels.csv")
    flight_csv = Path("data/flights.csv")
    asyncio.run(scheduled_refresh_loop(hotel_csv, flight_csv))
