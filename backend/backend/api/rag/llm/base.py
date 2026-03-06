"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class LLMResponse:
    """Standardised response from any LLM provider."""

    text: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)


@dataclass
class EmbeddingResponse:
    """Standardised embedding response from any provider."""

    embeddings: List[List[float]]
    model: str
    provider: str


class BaseLLMProvider(ABC):
    """Strategy interface that every LLM backend must implement."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Generate a text completion."""

    @abstractmethod
    def embed(self, texts: List[str]) -> EmbeddingResponse:
        """Return embedding vectors for *texts*."""

    @abstractmethod
    def health_check(self) -> dict:
        """Return ``{"healthy": True/False, ...}`` with provider-specific details."""
