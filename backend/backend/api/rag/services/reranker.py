"""Cross-encoder reranker for improving chunk relevance."""

import logging
from typing import List

from django.conf import settings

logger = logging.getLogger(__name__)

_model = None


def _get_config() -> dict:
    return getattr(settings, "RAG_CONFIG", {})


def _load_model():
    """Lazy-load the cross-encoder model on first use."""
    global _model  # pylint: disable=W0603
    if _model is not None:
        return _model

    try:
        from sentence_transformers import CrossEncoder  # pylint: disable=C0415

        model_name = _get_config().get(
            "RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
        )
        logger.info("Loading reranker model: %s", model_name)
        _model = CrossEncoder(model_name)
        return _model
    except Exception as exc:  # pylint: disable=W0718
        logger.warning("Reranker unavailable: %s", exc)
        return None


def rerank(
    query: str,
    chunks: List,
    top_k: int = 0,
) -> List:
    """Re-score *chunks* with a cross-encoder and return the best *top_k*.

    Each element of *chunks* must have a ``.text`` attribute.
    If the reranker model cannot be loaded, the original list is returned
    truncated to *top_k*.
    """
    cfg = _get_config()
    if top_k <= 0:
        top_k = cfg.get("TOP_K_RERANK", 5)

    if not chunks:
        return []

    model = _load_model()
    if model is None:
        return chunks[:top_k]

    pairs = [[query, chunk.text] for chunk in chunks]
    scores = model.predict(pairs)

    scored = sorted(zip(chunks, scores), key=lambda pair: pair[1], reverse=True)
    return [chunk for chunk, _ in scored[:top_k]]
