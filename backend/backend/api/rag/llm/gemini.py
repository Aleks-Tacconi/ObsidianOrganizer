"""Gemini provider stub (extensibility placeholder)."""

from typing import List, Optional

from .base import BaseLLMProvider, EmbeddingResponse, LLMResponse


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str = "", model: str = "gemini-1.5-flash") -> None:
        self.api_key = api_key
        self.model = model

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        raise NotImplementedError("Gemini provider is not implemented yet.")

    def embed(self, texts: List[str]) -> EmbeddingResponse:
        raise NotImplementedError("Gemini embeddings are not implemented yet.")

    def health_check(self) -> dict:
        return {
            "healthy": False,
            "provider": "gemini",
            "error": "Gemini provider is not implemented yet.",
        }
