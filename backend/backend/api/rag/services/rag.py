"""Main RAG orchestration — retrieve, rerank, generate."""

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from django.conf import settings

from ...models import VectorIndex
from ..llm.factory import get_llm_provider
from .reranker import rerank
from .retrieval import RetrievedChunk, retrieve

logger = logging.getLogger(__name__)

VAULT = getattr(settings, "VAULT_PATH", "/home/aleks/SecondBrain/")

SYSTEM_PROMPT = """\
You are a knowledgeable assistant that answers questions about the user's \
Obsidian vault notes. Use ONLY the provided note excerpts to answer. \
If excerpts are partial, still give the best direct answer you can from the
available evidence.

Start with a direct answer in 1-2 sentences, then add concise supporting
details.

Avoid meta phrasing such as "according to the provided excerpts", "it is
unclear", "cannot be determined", or "without further information" unless
there are truly zero relevant excerpts.

When you reference information from an excerpt, cite it inline using the format
[E1], [E2], etc. Every factual claim must have at least one excerpt citation.
Do not cite excerpts you did not use.
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


def _normalize_tag(value: str) -> str:
    """Strip all non-alphanumeric chars and lowercase for fuzzy tag comparison."""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _chunk_tag_set(tags_pipe: str) -> Set[str]:
    """Build a normalized set from a pipe-separated tag string."""
    result: Set[str] = set()
    for raw in tags_pipe.split("|"):
        raw = raw.strip()
        if not raw:
            continue
        result.add(_normalize_tag(raw))
        for part in raw.split("/"):
            if part:
                result.add(_normalize_tag(part))
    return result


def _expand_query_variants(query: str) -> List[str]:
    """Generate small lexical variants to improve recall for close synonyms."""
    variants: List[str] = [query]
    replacements = [
        ("poisoning", "spoofing"),
        ("spoofing", "poisoning"),
        ("mitm", "man in the middle"),
        ("man-in-the-middle", "mitm"),
        ("acl", "access control list"),
        ("acls", "access control lists"),
    ]

    lowered = query.lower()
    for source, target in replacements:
        if source in lowered:
            variants.append(re.sub(source, target, lowered))

    # Acronym expansion from note titles (e.g. arp -> address resolution protocol).
    try:
        indexed_files = [
            str(row.file_path)
            for row in VectorIndex.objects.all().only("file_path")  # pylint: disable=E1101
        ]
    except Exception:  # pylint: disable=W0718
        indexed_files = []

    acronym_map = _build_acronym_map_from_file_names(indexed_files)
    tokens = re.findall(r"[a-z0-9]+", lowered)
    for token in tokens:
        expanded = acronym_map.get(token)
        if expanded:
            variants.append(re.sub(rf"\b{re.escape(token)}\b", expanded, lowered))

    deduped: List[str] = []
    seen: Set[str] = set()
    for variant in variants:
        cleaned = variant.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        deduped.append(cleaned)
    return deduped


def _build_acronym_map_from_file_names(file_names: List[str]) -> Dict[str, str]:
    """Create acronym -> phrase map from note file names.

    Example: ``Address Resolution Protocol.md`` -> ``arp``.
    """
    stopwords = {"and", "or", "the", "a", "an", "of", "to", "for", "in"}
    mapping: Dict[str, str] = {}

    for file_name in file_names:
        stem = os.path.splitext(os.path.basename(file_name))[0]
        words = [w.lower() for w in re.findall(r"[A-Za-z0-9]+", stem)]
        words = [w for w in words if w and w not in stopwords]
        if len(words) < 2:
            continue
        acronym = "".join(word[0] for word in words)
        if 2 <= len(acronym) <= 6 and acronym not in mapping:
            mapping[acronym] = " ".join(words)

    return mapping


def _merge_retrieved_chunks(chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
    """Dedupe retrieved chunks by location, keeping best (lowest distance)."""
    by_key: Dict[tuple, RetrievedChunk] = {}
    for chunk in chunks:
        key = (chunk.file_path, chunk.line_start, chunk.line_end)
        existing = by_key.get(key)
        if existing is None or chunk.distance < existing.distance:
            by_key[key] = chunk
    return list(by_key.values())


def _find_title_matched_files(query: str, max_matches: int = 5) -> List[str]:
    """Return note file names whose title appears in the query text."""
    query_lower = query.lower()
    scored: List[tuple[int, str]] = []

    try:
        file_paths = [
            str(row.file_path)
            for row in VectorIndex.objects.all().only("file_path")  # pylint: disable=E1101
        ]
    except Exception:  # pylint: disable=W0718
        return []

    for path in file_paths:
        file_name = os.path.basename(path)
        stem = os.path.splitext(file_name)[0].lower()
        if len(stem) < 4:
            continue
        if stem in query_lower:
            scored.append((len(stem), file_name))

    scored.sort(key=lambda item: item[0], reverse=True)
    matches: List[str] = []
    seen: Set[str] = set()
    for _, file_name in scored:
        if file_name in seen:
            continue
        seen.add(file_name)
        matches.append(file_name)
        if len(matches) >= max_matches:
            break
    return matches


def _resolve_note_path(name: str, vault: str) -> Optional[str]:
    """Try to find a vault file matching *name*."""
    if not name.endswith(".md"):
        name = f"{name}.md"
    for root, _, files in os.walk(vault):
        for fname in files:
            if fname == name:
                return os.path.join(root, fname)
    return None


# Matches @Filename.md or @Filename With Spaces.md.
# Captures from the first non-whitespace after @ up to and including the
# trailing `.md`, allowing spaces inside the filename (Obsidian convention).
_AT_NOTE_RE = re.compile(r"@((?:[^\s@]|(?<=\w) (?=\w))+\.md)")


def _parse_force_notes(query: str) -> List[str]:
    """Extract ``@filename.md`` references from *query*.

    Handles filenames that contain spaces, e.g. ``@Access Control Lists.md``.
    """
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
            f"[E{idx}] {chunk.file_name} (lines {chunk.line_start}-{chunk.line_end})\n"
            f"{chunk.text}\n"
        )
    return "\n".join(parts)


_EXCERPT_REF_RE = re.compile(r"\[E(\d+)\]")


def _extract_used_excerpt_indexes(answer: str) -> List[int]:
    """Return excerpt indexes referenced by the LLM answer, preserving order."""
    ordered: List[int] = []
    seen: Set[int] = set()
    for match in _EXCERPT_REF_RE.findall(answer):
        idx = int(match)
        if idx in seen:
            continue
        seen.add(idx)
        ordered.append(idx)
    return ordered


def _replace_excerpt_refs_with_note_refs(
    answer: str, chunks: List[RetrievedChunk]
) -> str:
    """Convert ``[E#]`` citations into note+line references for the UI."""

    def repl(match: re.Match) -> str:
        idx = int(match.group(1)) - 1
        if idx < 0 or idx >= len(chunks):
            return match.group(0)
        chunk = chunks[idx]
        return f"[Note: {chunk.file_name}:{chunk.line_start}-{chunk.line_end}]"

    return _EXCERPT_REF_RE.sub(repl, answer)


def query_rag(
    query: str,
    scope_module: Optional[str] = None,
    scope_category: Optional[str] = None,
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
    top_k:
        Number of final chunks to feed the LLM (after reranking).
    """
    vault = getattr(settings, "VAULT_PATH", VAULT)

    # Parse @note.md references from the query itself.
    inline_notes = _parse_force_notes(query)
    clean_query = _strip_force_notes(query)
    all_force = list(set(inline_notes))

    # Build scope filter for ChromaDB.
    scope_filter: Optional[Dict] = None

    # Step 1: Retrieve from vector store with light query expansion.
    retrieval_query = clean_query or query
    query_variants = _expand_query_variants(retrieval_query)
    retrieved_batches: List[RetrievedChunk] = []
    for variant in query_variants:
        retrieved_batches.extend(retrieve(variant, scope_filter=scope_filter))

    title_matches = _find_title_matched_files(retrieval_query)
    if title_matches:
        retrieved_batches.extend(
            retrieve(
                retrieval_query,
                top_k=8,
                scope_filter={"file_name": {"$in": title_matches}},
            )
        )

    retrieved = _merge_retrieved_chunks(retrieved_batches)

    if scope_module or scope_category:
        module_key = _normalize_tag(scope_module or "")
        category_key = _normalize_tag(scope_category or "")
        filtered: List[RetrievedChunk] = []
        for chunk in retrieved:
            tag_set = _chunk_tag_set(chunk.tags)
            if module_key and module_key not in tag_set:
                continue
            if category_key and category_key not in tag_set:
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
        "Answer using the context above. "
        "Be direct and informative; avoid hedge language. "
        "Cite every factual statement with excerpt ids like [E1]. "
        "Only say information is unavailable when no relevant excerpt exists."
    )

    provider = get_llm_provider()
    llm_resp = provider.generate(
        prompt=user_prompt,
        system_prompt=SYSTEM_PROMPT,
    )

    # Step 5: Keep only chunks actually cited in the answer.
    used_indexes = _extract_used_excerpt_indexes(llm_resp.text)
    used_chunks: List[RetrievedChunk] = []
    for idx in used_indexes:
        if 1 <= idx <= len(final_chunks):
            used_chunks.append(final_chunks[idx - 1])

    if not used_chunks:
        used_chunks = final_chunks[:1]

    formatted_answer = _replace_excerpt_refs_with_note_refs(llm_resp.text, final_chunks)

    # Step 6: Build citations.
    citations: List[Citation] = []
    seen: set = set()
    for chunk in used_chunks:
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
        answer=formatted_answer,
        citations=citations,
        model_used=f"{llm_resp.provider}/{llm_resp.model}",
        chunks_retrieved=len(retrieved),
        chunks_after_rerank=len(reranked),
    )
