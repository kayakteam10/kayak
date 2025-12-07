"""
Kafka Producer

Async Kafka producer for publishing events from the AI service.
Implements singleton pattern and retry logic for reliability.
"""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

logger = logging.getLogger(__name__)


class KafkaProducer:
    """
    Asynchronous Kafka producer with retry logic and error handling.
    
    Usage:
        producer = KafkaProducer(broker_url="kafka:9092")
        await producer.connect()
        await producer.send_message("my-topic", {"key": "value"})
        await producer.disconnect()
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern to reuse producer instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, broker_url: str):
        if hasattr(self, '_initialized'):
            return
        
        self.broker_url = broker_url
        self._producer: Optional[AIOKafkaProducer] = None
        self._initialized = True
        logger.info(f"Initialized Kafka producer for {broker_url}")
    
    async def connect(self) -> None:
        """
        Connect to Kafka broker.
        
        Raises:
            KafkaError: If connection fails
        """
        if self._producer is not None:
            logger.warning("Producer already connected")
            return
        
        try:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=self.broker_url,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                compression_type='gzip',
                acks='all',  # Wait for all in-sync replicas
                retries=3,
                max_in_flight_requests_per_connection=5,
            )
            
            await self._producer.start()
            logger.info("✅ Kafka producer connected")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect Kafka producer: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Kafka broker"""
        if self._producer is None:
            return
        
        try:
            await self._producer.stop()
            self._producer = None
            logger.info("Kafka producer disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting Kafka producer: {e}")
    
    async def send_message(
        self,
        topic: str,
        message: Dict[str, Any],
        key: Optional[str] = None,
        max_retries: int = 3
    ) -> None:
        """
        Send a message to a Kafka topic with retry logic.
        
        Args:
            topic: Kafka topic name
            message: Message payload (will be JSON serialized)
            key: Optional message key for partitioning
            max_retries: Maximum number of retry attempts
            
        Raises:
            KafkaError: If all retry attempts fail
        """
        if self._producer is None:
            raise RuntimeError("Producer not connected. Call connect() first.")
        
        for attempt in range(max_retries):
            try:
                await self._producer.send_and_wait(topic, value=message, key=key)
                
                logger.debug(
                    f"📤 Sent message to {topic}" +
                    (f" with key={key}" if key else "")
                )
                return
                
            except KafkaError as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(
                        f"Failed to send message to {topic} (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {wait_time}s... Error: {e}"
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"❌ Failed to send message to {topic} after {max_retries} attempts: {e}")
                    raise
    
    @property
    def connected(self) -> bool:
        """Check if producer is connected"""
        return self._producer is not None
