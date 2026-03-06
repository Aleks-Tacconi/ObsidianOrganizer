"""Factory for obtaining the configured LLM provider."""

from typing import Dict, Optional, Type

from .base import BaseLLMProvider
from .gemini import GeminiProvider
from .ollama import OllamaProvider
from .openai import OpenAIProvider

# Registry of known provider constructors keyed by name.
_PROVIDERS: Dict[str, Type[BaseLLMProvider]] = {
    "ollama": OllamaProvider,
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
}

# Module-level singleton so views can call ``get_llm_provider()`` cheaply.
_current_provider: Optional[BaseLLMProvider] = None
_current_provider_name: Optional[str] = None


def get_llm_provider(
    provider_name: str = "ollama",
    **kwargs,
) -> BaseLLMProvider:
    """Return the singleton provider, creating it on first call.

    Extra *kwargs* are forwarded to the provider constructor (e.g.
    ``base_url``, ``generation_model``).
    """
    global _current_provider, _current_provider_name  # pylint: disable=W0603

    if _current_provider is not None and _current_provider_name == provider_name:
        return _current_provider

    constructor = _PROVIDERS.get(provider_name)
    if constructor is None:
        available = ", ".join(sorted(_PROVIDERS))
        raise ValueError(
            f"Unknown LLM provider '{provider_name}'. Available: {available}"
        )

    _current_provider = constructor(**kwargs)
    _current_provider_name = provider_name
    return _current_provider


def reset_provider() -> None:
    """Discard the cached provider (useful in tests)."""
    global _current_provider, _current_provider_name  # pylint: disable=W0603
    _current_provider = None
    _current_provider_name = None
