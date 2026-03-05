"""Main RAG orchestration — retrieve, rerank, generate."""

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from django.conf import settings

from ..llm.factory import get_llm_provider
from .reranker import rerank
from .retrieval import RetrievedChunk, retrieve

logger = logging.getLogger(__name__)

VAULT = getattr(settings, "VAULT_PATH", "/home/aleks/SecondBrain/")

SYSTEM_PROMPT = """\
You are a knowledgeable assistant that answers questions about the user's \
Obsidian vault notes. Use ONLY the provided note excerpts to answer. \
If the excerpts do not contain enough information, say so honestly.

When you reference information from a note, cite it inline using the format \
[Note: filename.md] so the user can verify the source. Be concise, accurate, \
and well-structured in your responses.
"""


@dataclass
class Citation:
    """A single citation pointing to a note location."""

    file_path: str
    file_name: str
    relative_path: str
    heading: str
    snippet: str
    line_start: int
    line_end: int
    relevance_score: float


@dataclass
class RAGResponse:
    """Complete response from a RAG query."""

    answer: str
    citations: List[Citation] = field(default_factory=list)
    model_used: str = ""
    chunks_retrieved: int = 0
    chunks_after_rerank: int = 0


def _resolve_note_path(name: str, vault: str) -> Optional[str]:
    """Try to find a vault file matching *name*."""
    if not name.endswith(".md"):
        name = f"{name}.md"
    for root, _, files in os.walk(vault):
        for fname in files:
            if fname == name:
                return os.path.join(root, fname)
    return None


_AT_NOTE_RE = re.compile(r"@(\S+\.md)")


def _parse_force_notes(query: str) -> List[str]:
    """Extract ``@filename.md`` references from *query*."""
    return _AT_NOTE_RE.findall(query)


def _strip_force_notes(query: str) -> str:
    """Remove ``@filename.md`` tokens from *query* so they don't pollute search."""
    return _AT_NOTE_RE.sub("", query).strip()


def _read_full_note(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return None


def _build_context(chunks: List[RetrievedChunk]) -> str:
    """Build the context block sent to the LLM."""
    parts: List[str] = []
    for idx, chunk in enumerate(chunks, 1):
        parts.append(
            f"--- Excerpt {idx} from [{chunk.file_name}] "
            f"(lines {chunk.line_start}-{chunk.line_end}) ---\n"
            f"{chunk.text}\n"
        )
    return "\n".join(parts)


def query_rag(
    query: str,
    scope_module: Optional[str] = None,
    scope_category: Optional[str] = None,
    force_notes: Optional[List[str]] = None,
    top_k: int = 0,
) -> RAGResponse:
    """Run the full RAG pipeline: retrieve -> rerank -> generate.

    Parameters
    ----------
    query:
        The user's natural-language question.
    scope_module:
        Limit retrieval to chunks from files tagged with this module.
    scope_category:
        Limit retrieval to chunks from files tagged with this category.
    force_notes:
        List of filenames (e.g. ``["lecture1.md"]``) to always include.
    top_k:
        Number of final chunks to feed the LLM (after reranking).
    """
    vault = getattr(settings, "VAULT_PATH", VAULT)

    # Parse @note.md references from the query itself.
    inline_notes = _parse_force_notes(query)
    clean_query = _strip_force_notes(query)
    all_force = list(set((force_notes or []) + inline_notes))

    # Build scope filter for ChromaDB.
    scope_filter: Optional[Dict] = None

    # Step 1: Retrieve from vector store.
    retrieved = retrieve(clean_query or query, scope_filter=scope_filter)

    if scope_module or scope_category:
        module_lower = (scope_module or "").lower()
        category_lower = (scope_category or "").lower()
        filtered: List[RetrievedChunk] = []
        for chunk in retrieved:
            tag_set = {tag.lower() for tag in chunk.tags.split("|") if tag}
            if module_lower and module_lower not in tag_set:
                continue
            if category_lower and category_lower not in tag_set:
                continue
            filtered.append(chunk)
        retrieved = filtered

    # Step 2: Inject forced notes.
    forced_chunks: List[RetrievedChunk] = []
    for note_name in all_force:
        note_path = _resolve_note_path(note_name, vault)
        if not note_path:
            continue
        content = _read_full_note(note_path)
        if not content:
            continue
        forced_chunks.append(
            RetrievedChunk(
                text=content[:2000],  # Cap forced note context.
                file_path=note_path,
                relative_path=os.path.relpath(note_path, vault),
                file_name=os.path.basename(note_path),
                heading="(full note)",
                line_start=0,
                line_end=content.count("\n"),
                tags="",
                distance=0.0,
            )
        )

    # Step 3: Rerank.
    reranked = rerank(clean_query or query, retrieved, top_k=top_k)
    final_chunks = forced_chunks + reranked

    if not final_chunks:
        return RAGResponse(
            answer="I couldn't find any relevant notes to answer your question. "
            "Try indexing your vault first or rephrasing the query.",
            model_used="",
            chunks_retrieved=len(retrieved),
            chunks_after_rerank=0,
        )

    # Step 4: Build prompt and generate.
    context = _build_context(final_chunks)
    user_prompt = (
        f"Context from Obsidian vault notes:\n\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer the question using the context above. "
        "Cite notes with [Note: filename.md] where appropriate."
    )

    provider = get_llm_provider()
    llm_resp = provider.generate(
        prompt=user_prompt,
        system_prompt=SYSTEM_PROMPT,
    )

    # Step 5: Build citations.
    citations: List[Citation] = []
    seen: set = set()
    for chunk in final_chunks:
        key = (chunk.file_path, chunk.line_start, chunk.line_end)
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            Citation(
                file_path=chunk.file_path,
                file_name=chunk.file_name,
                relative_path=chunk.relative_path,
                heading=chunk.heading,
                snippet=chunk.text[:300],
                line_start=chunk.line_start,
                line_end=chunk.line_end,
                relevance_score=round(1.0 - chunk.distance, 4),
            )
        )

    return RAGResponse(
        answer=llm_resp.text,
        citations=citations,
        model_used=f"{llm_resp.provider}/{llm_resp.model}",
        chunks_retrieved=len(retrieved),
        chunks_after_rerank=len(reranked),
    )
