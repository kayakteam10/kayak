"""
Kafka Topics Configuration

Centralized definition of all Kafka topics used by the AI service.
"""

# Deals Agent topics
RAW_SUPPLIER_FEEDS = "raw_supplier_feeds"
DEALS_NORMALIZED = "deals.normalized"
DEALS_SCORED = "deals.scored"
DEALS_TAGGED = "deals.tagged"
DEAL_EVENTS = "deal.events"

# Concierge Agent topics
AI_RECOMMENDATION_CREATED = "ai.recommendation.created"
AI_BUNDLE_SELECTED = "ai.bundle.selected"

# Integration topics (subscribe from other services)
BOOKING_CREATED = "booking.created"

# Topic configurations
TOPIC_CONFIGS = {
    RAW_SUPPLIER_FEEDS: {"partitions": 3, "replication_factor": 1},
    DEALS_NORMALIZED: {"partitions": 3, "replication_factor": 1},
    DEALS_SCORED: {"partitions": 3, "replication_factor": 1},
    DEALS_TAGGED: {"partitions": 3, "replication_factor": 1},
    DEAL_EVENTS: {"partitions": 3, "replication_factor": 1},
    AI_RECOMMENDATION_CREATED: {"partitions": 2, "replication_factor": 1},
    AI_BUNDLE_SELECTED: {"partitions": 2, "replication_factor": 1},
}


def create_topics(broker_url: str = "kafka:9092") -> None:
    """
    Create all required Kafka topics if they don't exist.
    
    Args:
        broker_url: Kafka broker connection string
    """
    from kafka import KafkaAdminClient
    from kafka.admin import NewTopic
    from kafka.errors import TopicAlreadyExistsError
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        admin = KafkaAdminClient(
            bootstrap_servers=broker_url,
            client_id="ai-service-admin"
        )
        
        topics = []
        for topic_name, config in TOPIC_CONFIGS.items():
            topics.append(
                NewTopic(
                    name=topic_name,
                    num_partitions=config["partitions"],
                    replication_factor=config["replication_factor"]
                )
            )
        
        try:
            admin.create_topics(new_topics=topics, validate_only=False)
            logger.info(f"✅ Created {len(topics)} Kafka topics")
        except TopicAlreadyExistsError:
            logger.info("ℹ️  Kafka topics already exist")
        
        admin.close()
        
    except Exception as e:
        logger.error(f"❌ Failed to create Kafka topics: {e}")
        raise
