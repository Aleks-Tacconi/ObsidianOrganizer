"""Ollama LLM provider implementation."""

from typing import List, Optional

import ollama as ollama_client

from .base import BaseLLMProvider, EmbeddingResponse, LLMResponse

DEFAULT_GENERATION_MODEL = "llama3.2"
DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"


class OllamaProvider(BaseLLMProvider):
    """Talks to a local Ollama instance."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        generation_model: str = DEFAULT_GENERATION_MODEL,
        embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    ) -> None:
        self.base_url = base_url
        self.generation_model = generation_model
        self.embedding_model = embedding_model
        self._client = ollama_client.Client(host=base_url)

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self._client.chat(
            model=self.generation_model,
            messages=messages,
            options={"temperature": temperature, "num_predict": max_tokens},
        )

        return LLMResponse(
            text=response.message.content or "",
            model=self.generation_model,
            provider="ollama",
            usage={
                "prompt_tokens": getattr(response, "prompt_eval_count", 0),
                "completion_tokens": getattr(response, "eval_count", 0),
            },
        )

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------
    def embed(self, texts: List[str]) -> EmbeddingResponse:
        response = self._client.embed(model=self.embedding_model, input=texts)
        return EmbeddingResponse(
            embeddings=response.embeddings,
            model=self.embedding_model,
            provider="ollama",
        )

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------
    def health_check(self) -> dict:
        try:
            models = self._client.list()
            model_names = [m.model for m in models.models]
            has_gen = any(self.generation_model in n for n in model_names)
            has_emb = any(self.embedding_model in n for n in model_names)
            return {
                "healthy": has_gen and has_emb,
                "provider": "ollama",
                "base_url": self.base_url,
                "models_available": model_names,
                "generation_model_ready": has_gen,
                "embedding_model_ready": has_emb,
            }
        except Exception as exc:  # pylint: disable=W0718
            return {
                "healthy": False,
                "provider": "ollama",
                "base_url": self.base_url,
                "error": str(exc),
            }
