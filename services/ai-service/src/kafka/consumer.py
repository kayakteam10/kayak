"""
Kafka Consumer

Async Kafka consumer for subscribing to events in the AI service.
Supports consumer groups for horizontal scaling and fault tolerance.
"""

import asyncio
import json
import logging
from typing import Callable, List, Optional

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

logger = logging.getLogger(__name__)


class KafkaConsumer:
    """
    Asynchronous Kafka consumer with message processing loop.
    
    Usage:
        async def message_handler(message):
            print(f"Received: {message}")
        
        consumer = KafkaConsumer(
            broker_url="kafka:9092",
            group_id="my-group",
            topics=["my-topic"]
        )
        await consumer.connect()
        await consumer.consume(message_handler)
    """
    
    def __init__(
        self,
        broker_url: str,
        group_id: str,
        topics: List[str],
        auto_offset_reset: str = "earliest"
    ):
        """
        Initialize Kafka consumer.
        
        Args:
            broker_url: Kafka broker connection string
            group_id: Consumer group ID for coordination
            topics: List of topics to subscribe to
            auto_offset_reset: Where to start reading ('earliest' or 'latest')
        """
        self.broker_url = broker_url
        self.group_id = group_id
        self.topics = topics
        self.auto_offset_reset = auto_offset_reset
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._running = False
        
        logger.info(
            f"Initialized Kafka consumer for group '{group_id}' "
            f"on topics: {', '.join(topics)}"
        )
    
    async def connect(self) -> None:
        """
        Connect to Kafka broker and subscribe to topics.
        
        Raises:
            KafkaError: If connection fails
        """
        if self._consumer is not None:
            logger.warning("Consumer already connected")
            return
        
        try:
            self._consumer = AIOKafkaConsumer(
                *self.topics,
                bootstrap_servers=self.broker_url,
                group_id=self.group_id,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset=self.auto_offset_reset,
                enable_auto_commit=True,
                auto_commit_interval_ms=1000,
                max_poll_records=100,
            )
            
            await self._consumer.start()
            logger.info(f"✅ Kafka consumer connected (group: {self.group_id})")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect Kafka consumer: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Kafka broker"""
        self._running = False
        
        if self._consumer is None:
            return
        
        try:
            await self._consumer.stop()
            self._consumer = None
            logger.info("Kafka consumer disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting Kafka consumer: {e}")
    
    async def consume(self, callback: Callable, continue_on_error: bool = True) -> None:
        """
        Start consuming messages and process them with callback function.
        
        Args:
            callback: Async function to process each message
            continue_on_error: If True, continue consuming even if callback raises exception
            
        Example callback:
            async def process_message(message: dict):
                print(f"Processing: {message}")
        """
        if self._consumer is None:
            raise RuntimeError("Consumer not connected. Call connect() first.")
        
        self._running = True
        logger.info(f"🔄 Starting message consumption loop...")
        
        try:
            async for msg in self._consumer:
                if not self._running:
                    break
                
                try:
                    # Log message metadata
                    logger.debug(
                        f"📥 Received message from {msg.topic} "
                        f"[partition={msg.partition}, offset={msg.offset}]"
                    )
                    
                    # Process message with callback
                    await callback(msg.value)
                    
                except Exception as e:
                    logger.error(
                        f"❌ Error processing message from {msg.topic}: {e}",
                        exc_info=True
                    )
                    
                    if not continue_on_error:
                        raise
                    
                    # Continue to next message
                    continue
                    
        except asyncio.CancelledError:
            logger.info("Consumer consumption loop cancelled")
            raise
        except Exception as e:
            logger.error(f"❌ Fatal error in consumption loop: {e}")
            raise
        finally:
            self._running = False
    
    async def stop(self) -> None:
        """Gracefully stop message consumption"""
        logger.info("Stopping consumer...")
        self._running = False
        await asyncio.sleep(0.5)  # Give time for current message to finish
    
    @property
    def connected(self) -> bool:
        """Check if consumer is connected"""
        return self._consumer is not None
