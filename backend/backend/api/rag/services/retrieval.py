"""Vector similarity search against ChromaDB."""

from dataclasses import dataclass
from typing import Dict, List, Optional

from django.conf import settings

from ..llm.factory import get_llm_provider
from ..vectordb.chroma import ChromaStore


def _get_config() -> dict:
    return getattr(settings, "RAG_CONFIG", {})


@dataclass
class RetrievedChunk:
    """Single retrieved chunk with metadata."""

    text: str
    file_path: str
    relative_path: str
    file_name: str
    heading: str
    line_start: int
    line_end: int
    tags: str
    distance: float  # cosine distance (lower = more similar)


def retrieve(
    query: str,
    top_k: int = 0,
    scope_filter: Optional[Dict] = None,
) -> List[RetrievedChunk]:
    """Embed *query* and return the closest chunks from ChromaDB.

    Parameters
    ----------
    query:
        Natural language question.
    top_k:
        Maximum number of results. Defaults to ``RAG_CONFIG.TOP_K_RETRIEVAL``.
    scope_filter:
        Optional ChromaDB ``where`` filter, e.g.
        ``{"file_name": {"$in": ["note1.md", "note2.md"]}}``.
    """
    cfg = _get_config()
    if top_k <= 0:
        top_k = cfg.get("TOP_K_RETRIEVAL", 20)

    provider = get_llm_provider()
    store = ChromaStore()

    embedding_resp = provider.embed([query])
    query_embedding = embedding_resp.embeddings[0]

    raw = store.query(
        query_embedding=query_embedding,
        n_results=top_k,
        where=scope_filter,
    )

    chunks: List[RetrievedChunk] = []
    if not raw.get("ids") or not raw["ids"][0]:
        return chunks

    ids = raw["ids"][0]
    docs = raw["documents"][0] if raw.get("documents") else [""] * len(ids)
    metas = raw["metadatas"][0] if raw.get("metadatas") else [{}] * len(ids)
    dists = raw["distances"][0] if raw.get("distances") else [0.0] * len(ids)

    for doc, meta, dist in zip(docs, metas, dists):
        chunks.append(
            RetrievedChunk(
                text=doc,
                file_path=meta.get("file_path", ""),
                relative_path=meta.get("relative_path", ""),
                file_name=meta.get("file_name", ""),
                heading=meta.get("heading", ""),
                line_start=int(meta.get("line_start", 0)),
                line_end=int(meta.get("line_end", 0)),
                tags=meta.get("tags", ""),
                distance=dist,
            )
        )

    return chunks
