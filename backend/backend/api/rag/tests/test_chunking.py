"""Unit tests for api.rag.services.chunking."""

from django.test import SimpleTestCase

from ..services.chunking import chunk_markdown


class ChunkMarkdownTests(SimpleTestCase):
    # ── Basic structure ──────────────────────────────────────────────────────

    def test_empty_string_returns_no_chunks(self):
        chunks = chunk_markdown("")
        self.assertEqual(chunks, [])

    def test_whitespace_only_returns_no_chunks(self):
        chunks = chunk_markdown("   \n\n  ")
        self.assertEqual(chunks, [])

    def test_single_paragraph_returns_one_chunk(self):
        text = "Hello, this is a simple note with no headings."
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertEqual(len(chunks), 1)
        self.assertIn("simple note", chunks[0].text)

    def test_heading_creates_section_boundary(self):
        text = "# Section A\n\nContent A.\n\n# Section B\n\nContent B.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        # Each heading should produce a separate chunk.
        texts = [c.text for c in chunks]
        self.assertTrue(any("Content A" in t for t in texts))
        self.assertTrue(any("Content B" in t for t in texts))

    def test_heading_stored_in_chunk(self):
        text = "# My Heading\n\nSome content under the heading.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].heading, "My Heading")

    def test_no_heading_chunk_has_empty_heading(self):
        text = "Content without any heading at all."
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertEqual(chunks[0].heading, "")

    # ── Line numbers ─────────────────────────────────────────────────────────

    def test_line_numbers_are_set(self):
        text = "# Heading\n\nLine 2.\nLine 3.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertIsNotNone(chunks[0].line_start)
        self.assertIsNotNone(chunks[0].line_end)

    def test_line_start_lte_line_end(self):
        text = "# Heading\n\nSome content.\n\nMore content.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        for chunk in chunks:
            self.assertLessEqual(chunk.line_start, chunk.line_end)

    # ── Oversized sections ───────────────────────────────────────────────────

    def test_large_section_split_into_multiple_chunks(self):
        # 10 large paragraphs, each ~300 chars; max_tokens=400 forces splits
        paragraphs = ["A" * 300 for _ in range(10)]
        text = "# Big Section\n\n" + "\n\n".join(paragraphs)
        chunks = chunk_markdown(text, max_tokens=400)
        self.assertGreater(len(chunks), 1)

    def test_all_chunks_within_max_tokens_or_single_paragraph(self):
        # Any chunk that exceeds max_tokens must be a single paragraph
        # that couldn't be split further.
        paragraphs = ["B" * 50 for _ in range(20)]
        text = "# Section\n\n" + "\n\n".join(paragraphs)
        max_t = 200
        chunks = chunk_markdown(text, max_tokens=max_t)
        for chunk in chunks:
            # Each chunk is either within budget, or it is a single paragraph
            # (no double-newline split possible → unavoidable overflow).
            no_double_newline = "\n\n" not in chunk.text
            self.assertTrue(len(chunk.text) <= max_t or no_double_newline)

    # ── Frontmatter stripping ────────────────────────────────────────────────

    def test_frontmatter_is_stripped(self):
        text = "---\ntags:\n  - CS101\n---\n# Heading\n\nContent.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        for chunk in chunks:
            self.assertNotIn("tags:", chunk.text)
            self.assertNotIn("---", chunk.text)

    def test_content_after_frontmatter_preserved(self):
        text = "---\ntags:\n  - CS101\n---\n# Heading\n\nImportant content.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        all_text = " ".join(c.text for c in chunks)
        self.assertIn("Important content", all_text)

    def test_no_frontmatter_delimiter_treated_as_normal_content(self):
        text = "No front matter here.\n\nJust normal paragraphs.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        all_text = " ".join(c.text for c in chunks)
        self.assertIn("No front matter", all_text)

    # ── Heading levels ───────────────────────────────────────────────────────

    def test_h2_heading_creates_section(self):
        text = "## Subtopic\n\nContent under h2.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertEqual(chunks[0].heading, "Subtopic")

    def test_h3_heading_creates_section(self):
        text = "### Deep heading\n\nContent.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        self.assertEqual(chunks[0].heading, "Deep heading")

    def test_multiple_headings_produce_correct_count(self):
        text = "# A\n\nContent A.\n## B\n\nContent B.\n### C\n\nContent C.\n"
        chunks = chunk_markdown(text, max_tokens=512)
        headings = [c.heading for c in chunks]
        self.assertIn("A", headings)
        self.assertIn("B", headings)
        self.assertIn("C", headings)

    # ── Excalidraw payload stripping ────────────────────────────────────────

    def test_compressed_json_block_is_removed(self):
        text = (
            "# Diagram\n\n"
            "Intro text.\n\n"
            "```compressed-json\n"
            "N4KAkARALgngDgUwgLgAQQQDwMYEMA2AlgCYBOuA7hA\n"
            "```\n\n"
            "Key explanation remains.\n"
        )
        chunks = chunk_markdown(text, max_tokens=512)
        all_text = "\n".join(chunk.text for chunk in chunks)
        self.assertIn("Intro text", all_text)
        self.assertIn("Key explanation remains", all_text)
        self.assertNotIn("compressed-json", all_text)
        self.assertNotIn("N4KAkARAL", all_text)
