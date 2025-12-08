"""
Google Vertex AI Gemini Client

Production-ready client using Vertex AI API.
Uses gemini-2.0-flash-exp for fast, accurate structured output.
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Install with: pip install google-generativeai")


class GeminiClient:
    """
    Google Vertex AI Gemini client for fast LLM inference.
    
    Model: gemini-2.5-flash (latest, fastest)
    Project: kayak-project
    
    Usage:
        client = GeminiClient(api_key="your-key")
        response = await client.generate("Extract travel intent: SFO to NYC Dec 20-22")
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize Gemini Vertex AI client.
        
        Args:
            api_key: Google Vertex AI API key. If None, reads from GEMINI_API_KEY env var.
            model: Model name. Default: gemini-2.5-flash
        """
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package not installed")
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        # Use gemini-3-pro-preview (latest preview model)
        self.model_name = model or os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
        
        # Configure with API key
        genai.configure(api_key=self.api_key)
        
        # Initialize model with JSON response format
        self.model = genai.GenerativeModel(
            self.model_name,
            generation_config={
                "temperature": 0.3,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
        )
        
        logger.info(f"✅ Initialized Vertex AI Gemini client ({self.model_name})")
    
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        json_mode: bool = True,
        **kwargs
    ) -> str:
        """
        Generate text completion from a prompt.
        
        Args:
            prompt: Input prompt text
            temperature: Sampling temperature (0.0-1.0), lower = more deterministic
            json_mode: If True, instructs model to return JSON
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response
        """
        try:
            logger.info(f"🤖 Gemini API Call START - Model: {self.model_name}")
            logger.info(f"📝 Prompt length: {len(prompt)} chars")
            logger.debug(f"📄 Prompt preview: {prompt[:200]}...")
            
            # Add JSON instruction if needed
            if json_mode and "json" not in prompt.lower():
                prompt = f"{prompt}\n\nIMPORTANT: Respond with valid JSON only, no markdown formatting."
            
            # Override temperature if specified
            generation_config = {
                "temperature": temperature,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": kwargs.get("max_tokens", 2048),
            }
            
            logger.info(f"⚙️  Generation config: temp={temperature}, max_tokens={generation_config['max_output_tokens']}")
            
            # Run in thread pool since genai is sync
            import time
            start_time = time.time()
            
            loop = asyncio.get_event_loop()
            logger.info("🔄 Calling Gemini API...")
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
            )
            
            elapsed = time.time() - start_time
            logger.info(f"✅ Gemini responded in {elapsed:.2f}s")
            
            # Access response properly - handle multi-part responses
            try:
                # Try simple text accessor first
                result = response.text.strip()
            except ValueError as ve:
                # If simple accessor fails, extract from parts
                logger.warning(f"⚠️  Simple text accessor failed, extracting from parts: {ve}")
                if response.candidates and len(response.candidates) > 0:
                    candidate = response.candidates[0]
                    if candidate.content and candidate.content.parts:
                        # Concatenate all text parts
                        result = "".join([part.text for part in candidate.content.parts if hasattr(part, 'text')]).strip()
                        logger.info(f"✅ Extracted text from {len(candidate.content.parts)} parts")
                    else:
                        logger.error("❌ No content parts found in candidate")
                        raise ValueError("No text content in Gemini response")
                else:
                    logger.error("❌ No candidates in response")
                    raise ValueError("No candidates in Gemini response")
            
            logger.info(f"📦 Response length: {len(result)} chars")
            logger.debug(f"📄 Response preview: {result[:200]}...")
            
            # Clean markdown code blocks if present
            if result.startswith("```json"):
                result = result.replace("```json", "").replace("```", "").strip()
                logger.debug("🧹 Cleaned ```json markers")
            elif result.startswith("```"):
                result = result.replace("```", "").strip()
                logger.debug("🧹 Cleaned ``` markers")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Gemini generation failed: {type(e).__name__}: {e}")
            logger.exception("Full traceback:")
            raise
    
    async def health_check(self) -> bool:
        """Check if Vertex AI Gemini API is accessible."""
        try:
            response = await self.generate("Say OK", temperature=0.0, json_mode=False)
            return len(response) > 0 and "ok" in response.lower()
        except Exception as e:
            logger.error(f"Gemini health check failed: {e}")
            return False


# Fallback compatibility
if not GEMINI_AVAILABLE:
    class GeminiClient:
        """Stub when google-generativeai not installed"""
        def __init__(self, *args, **kwargs):
            raise ImportError("google-generativeai not installed")
