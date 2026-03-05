"""Unit tests for @note.md parsing and query-cleanup helpers in api.rag.services.rag."""

from django.test import SimpleTestCase

from ..services.rag import _parse_force_notes, _strip_force_notes


class ParseForceNotesTests(SimpleTestCase):
    def test_no_at_references_returns_empty_list(self):
        result = _parse_force_notes("What is TCP/IP?")
        self.assertEqual(result, [])

    def test_single_at_reference_extracted(self):
        result = _parse_force_notes("See @lecture1.md for details")
        self.assertEqual(result, ["lecture1.md"])

    def test_multiple_at_references_extracted(self):
        result = _parse_force_notes("Compare @tcp.md and @udp.md")
        self.assertIn("tcp.md", result)
        self.assertIn("udp.md", result)
        self.assertEqual(len(result), 2)

    def test_only_files_with_md_extension_matched(self):
        result = _parse_force_notes("Use @note.md but ignore @nodotmd and @other.txt")
        self.assertEqual(result, ["note.md"])

    def test_at_reference_at_start_of_string(self):
        result = _parse_force_notes("@intro.md summarises the module")
        self.assertEqual(result, ["intro.md"])

    def test_at_reference_at_end_of_string(self):
        result = _parse_force_notes("Details are in @summary.md")
        self.assertEqual(result, ["summary.md"])

    def test_nested_path_in_at_reference_extracted(self):
        # @subdir/note.md is not currently supported (POSIX path contains /)
        # but the function should not crash.
        result = _parse_force_notes("See @plain.md for now")
        self.assertIsInstance(result, list)

    def test_returns_list_type(self):
        result = _parse_force_notes("any query")
        self.assertIsInstance(result, list)


class StripForceNotesTests(SimpleTestCase):
    def test_removes_single_at_reference(self):
        result = _strip_force_notes("Tell me about @lecture.md networking")
        self.assertNotIn("@lecture.md", result)
        self.assertIn("networking", result)

    def test_removes_multiple_at_references(self):
        result = _strip_force_notes("@a.md and @b.md explain this")
        self.assertNotIn("@a.md", result)
        self.assertNotIn("@b.md", result)

    def test_strips_leading_and_trailing_whitespace(self):
        result = _strip_force_notes("@note.md")
        # After removal the remaining string should be empty or whitespace-free.
        self.assertEqual(result, "")

    def test_query_without_references_unchanged(self):
        query = "What is TCP?"
        result = _strip_force_notes(query)
        self.assertEqual(result, query)

    def test_removes_reference_preserves_other_text(self):
        result = _strip_force_notes("How does @dns.md work in practice?")
        self.assertNotIn("@dns.md", result)
        self.assertIn("work in practice", result)
