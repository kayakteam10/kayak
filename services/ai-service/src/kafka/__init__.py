"""
Kafka Package

Exports Kafka producer, consumer, and topic utilities.
"""

from .producer import KafkaProducer
from .consumer import KafkaConsumer
from .topics import (
    # Topic names
    RAW_SUPPLIER_FEEDS,
    DEALS_NORMALIZED,
    DEALS_SCORED,
    DEALS_TAGGED,
    DEAL_EVENTS,
    AI_RECOMMENDATION_CREATED,
    AI_BUNDLE_SELECTED,
    BOOKING_CREATED,
    # Functions
    create_topics,
)

__all__ = [
    "KafkaProducer",
    "KafkaConsumer",
    "RAW_SUPPLIER_FEEDS",
    "DEALS_NORMALIZED",
    "DEALS_SCORED",
    "DEALS_TAGGED",
    "DEAL_EVENTS",
    "AI_RECOMMENDATION_CREATED",
    "AI_BUNDLE_SELECTED",
    "BOOKING_CREATED",
    "create_topics",
]
