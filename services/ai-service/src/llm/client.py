"""
Ollama LLM Client

Async client for interacting with Ollama API (Llama 3.2 3B model).
Provides generate and chat methods with retry logic and health checks.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class OllamaClient:
    """
    Asynchronous Ollama client for LLM inference.
    
    Usage:
        client = OllamaClient(base_url="http://ollama:11434")
        response = await client.generate("What is the capital of France?")
        print(response)
    """
    
    def __init__(self, base_url: str = "http://ollama:11434"):
        """
        Initialize Ollama client.
        
        Args:
            base_url: Base URL of Ollama API
        """
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Initialized Ollama client: {base_url}")
    
    async def generate(
        self,
        prompt: str,
        model: str = "llama3.2:3b",
        temperature: float = 0.7,
        max_retries: int = 3,
        **kwargs
    ) -> str:
        """
        Generate text completion from a prompt.
        
        Args:
            prompt: Input prompt text
            model: Model name to use
            temperature: Sampling temperature (0.0-1.0)
            max_retries: Maximum retry attempts on failure
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response
            
        Raises:
            httpx.HTTPError: If all retry attempts fail
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "temperature": temperature,
            **kwargs
        }
        
        for attempt in range(max_retries):
            try:
                response = await self._client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                generated_text = result.get("response", "")
                
                logger.debug(
                    f"LLM generated {len(generated_text)} chars "
                    f"(took {result.get('total_duration', 0) / 1e9:.2f}s)"
                )
                
                return generated_text
                
            except httpx.HTTPError as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(
                        f"LLM request failed (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {wait_time}s... Error: {e}"
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"LLM request failed after {max_retries} attempts: {e}")
                    raise
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2:3b",
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """
        Multi-turn chat completion.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: Model name to use
            temperature: Sampling temperature
            **kwargs: Additional chat parameters
            
        Returns:
            Assistant's response text
            
        Example:
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "What is Python?"}
            ]
            response = await client.chat(messages)
        """
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "temperature": temperature,
            **kwargs
        }
        
        try:
            response = await self._client.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            message = result.get("message", {})
            return message.get("content", "")
            
        except httpx.HTTPError as e:
            logger.error(f"Chat request failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check if Ollama is running and model is available.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            url = f"{self.base_url}/api/tags"
            response = await self._client.get(url)
            response.raise_for_status()
            
            # Check if llama3.2:3b is available
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            
            if "llama3.2:3b" in model_names:
                logger.info("✅ Ollama health check passed")
                return True
            else:
                logger.warning(f"⚠️  Model llama3.2:3b not found. Available: {model_names}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ollama health check failed: {e}")
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
