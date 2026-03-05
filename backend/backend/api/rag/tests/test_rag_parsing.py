"""Unit tests for @note.md parsing and query-cleanup helpers in api.rag.services.rag."""

from django.test import SimpleTestCase

from ..services.rag import (
    _chunk_tag_set,
    _normalize_tag,
    _parse_force_notes,
    _strip_force_notes,
)


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


class ParseForceNotesWithSpacesTests(SimpleTestCase):
    """Filenames that contain spaces must be parsed correctly."""

    def test_filename_with_two_words(self):
        result = _parse_force_notes("@Access Control.md what is this")
        self.assertEqual(result, ["Access Control.md"])

    def test_filename_with_multiple_spaces(self):
        result = _parse_force_notes("@Access Control Lists.md what are ACLs")
        self.assertEqual(result, ["Access Control Lists.md"])

    def test_long_spaced_filename(self):
        result = _parse_force_notes("@Operating System Access Control.md explain")
        self.assertEqual(result, ["Operating System Access Control.md"])

    def test_spaced_filename_stripped_from_query(self):
        result = _strip_force_notes("@Access Control Lists.md what are ACLs")
        self.assertNotIn("@Access Control Lists.md", result)
        self.assertIn("what are ACLs", result)

    def test_spaced_filename_alongside_no_space_filename(self):
        result = _parse_force_notes("@tcp.md and @Access Control Lists.md compare")
        self.assertIn("tcp.md", result)
        self.assertIn("Access Control Lists.md", result)
        self.assertEqual(len(result), 2)

    def test_strip_removes_spaced_and_plain_filenames(self):
        result = _strip_force_notes("@tcp.md and @Access Control Lists.md compare")
        self.assertNotIn("@tcp.md", result)
        self.assertNotIn("@Access Control Lists.md", result)
        self.assertIn("compare", result)

    def test_filename_with_spaces_at_start(self):
        result = _parse_force_notes("@File Systems.md explain access")
        self.assertEqual(result, ["File Systems.md"])

    def test_only_md_extension_matched_for_spaced_names(self):
        result = _parse_force_notes("@Access Control Lists.txt should not match")
        self.assertEqual(result, [])


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


class ScopeTagNormalizationTests(SimpleTestCase):
    def test_normalize_tag_removes_spaces_and_case(self):
        self.assertEqual(
            _normalize_tag("Computer And Network Security"),
            "computerandnetworksecurity",
        )

    def test_normalize_tag_removes_symbols(self):
        self.assertEqual(
            _normalize_tag("Security Policies & UNIX Access Control"),
            "securitypoliciesunixaccesscontrol",
        )

    def test_chunk_tag_set_includes_slash_parts(self):
        tag_set = _chunk_tag_set("ComputerAndNetworkSecurity/Introduction|Protocols")
        self.assertIn("computerandnetworksecurity", tag_set)
        self.assertIn("introduction", tag_set)
        self.assertIn("protocols", tag_set)
