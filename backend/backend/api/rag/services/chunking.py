"""Smart markdown chunking for RAG indexing."""

import re
from dataclasses import dataclass
from typing import List

from django.conf import settings


def _get_config() -> dict:
    return getattr(settings, "RAG_CONFIG", {})


@dataclass
class Chunk:
    """A single text chunk with positional metadata."""

    text: str
    line_start: int
    line_end: int
    heading: str  # nearest heading above this chunk


def _strip_frontmatter(lines: List[str]) -> List[str]:
    """Remove YAML frontmatter (``--- ... ---``) from the top of a file."""
    if not lines or lines[0].strip() != "---":
        return lines
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return lines[idx + 1 :]
    return lines


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)")


def chunk_markdown(
    text: str,
    max_tokens: int = 0,
    overlap: int = 0,
) -> List[Chunk]:
    """Split markdown *text* into chunks suitable for embedding.

    Strategy
    --------
    1.  Split by headings first (each heading starts a new section).
    2.  If a section exceeds *max_tokens* **characters** (a rough proxy
        for tokens), split it further at paragraph boundaries.
    3.  Apply a small character-level *overlap* so context is not lost at
        boundaries.

    Returns a list of :class:`Chunk` objects.
    """
    cfg = _get_config()
    if max_tokens <= 0:
        max_tokens = cfg.get("CHUNK_SIZE", 512)
    if overlap <= 0:
        overlap = cfg.get("CHUNK_OVERLAP", 64)

    raw_lines = text.splitlines(keepends=True)
    lines = _strip_frontmatter(raw_lines)
    # Compute line-number offset caused by stripping frontmatter.
    offset = len(raw_lines) - len(lines)

    sections: List[dict] = []
    current_heading = ""
    current_lines: List[str] = []
    current_start = 0

    for idx, line in enumerate(lines):
        match = _HEADING_RE.match(line)
        if match:
            # Flush previous section.
            if current_lines:
                sections.append(
                    {
                        "heading": current_heading,
                        "text": "".join(current_lines),
                        "line_start": current_start + offset,
                        "line_end": idx - 1 + offset,
                    }
                )
            current_heading = match.group(2).strip()
            current_lines = [line]
            current_start = idx
        else:
            current_lines.append(line)

    # Flush last section.
    if current_lines:
        sections.append(
            {
                "heading": current_heading,
                "text": "".join(current_lines),
                "line_start": current_start + offset,
                "line_end": len(lines) - 1 + offset,
            }
        )

    # Now split oversized sections on paragraph boundaries.
    chunks: List[Chunk] = []
    for section in sections:
        section_text = section["text"].strip()
        if not section_text:
            continue

        if len(section_text) <= max_tokens:
            chunks.append(
                Chunk(
                    text=section_text,
                    line_start=section["line_start"],
                    line_end=section["line_end"],
                    heading=section["heading"],
                )
            )
            continue

        # Split on blank lines (paragraph boundaries).
        paragraphs = re.split(r"\n{2,}", section_text)
        buf = ""
        buf_start = section["line_start"]
        running_line = section["line_start"]

        for para in paragraphs:
            para_lines = para.count("\n") + 1
            if buf and len(buf) + len(para) + 2 > max_tokens:
                chunks.append(
                    Chunk(
                        text=buf.strip(),
                        line_start=buf_start,
                        line_end=running_line - 1,
                        heading=section["heading"],
                    )
                )
                # Apply overlap: keep the tail of the previous buffer.
                tail = buf[-overlap:] if overlap else ""
                buf = tail + para
                buf_start = max(buf_start, running_line - (tail.count("\n")))
            else:
                if buf:
                    buf += "\n\n"
                buf += para
            running_line += para_lines

        if buf.strip():
            chunks.append(
                Chunk(
                    text=buf.strip(),
                    line_start=buf_start,
                    line_end=section["line_end"],
                    heading=section["heading"],
                )
            )

    return chunks
