"""OpenAI provider stub (extensibility placeholder)."""

from typing import List, Optional

from .base import BaseLLMProvider, EmbeddingResponse, LLMResponse


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str = "",
        generation_model: str = "gpt-4o-mini",
        embedding_model: str = "text-embedding-3-small",
    ) -> None:
        self.api_key = api_key
        self.generation_model = generation_model
        self.embedding_model = embedding_model

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        raise NotImplementedError("OpenAI provider is not implemented yet.")

    def embed(self, texts: List[str]) -> EmbeddingResponse:
        raise NotImplementedError("OpenAI embeddings are not implemented yet.")

    def health_check(self) -> dict:
        return {
            "healthy": False,
            "provider": "openai",
            "error": "OpenAI provider is not implemented yet.",
        }
