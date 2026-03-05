"""Unit tests for api.rag.services.hashing."""

import hashlib
import tempfile

from django.test import SimpleTestCase

from ..services.hashing import file_content_hash, text_hash


class TextHashTests(SimpleTestCase):
    def test_returns_hex_string(self):
        result = text_hash("hello")
        self.assertIsInstance(result, str)
        # SHA-256 hex digest is always 64 characters
        self.assertEqual(len(result), 64)

    def test_matches_hashlib_directly(self):
        text = "some content to hash"
        expected = hashlib.sha256(text.encode("utf-8")).hexdigest()
        self.assertEqual(text_hash(text), expected)

    def test_different_inputs_produce_different_hashes(self):
        self.assertNotEqual(text_hash("abc"), text_hash("xyz"))

    def test_empty_string(self):
        result = text_hash("")
        self.assertEqual(len(result), 64)

    def test_deterministic(self):
        self.assertEqual(text_hash("repeat"), text_hash("repeat"))


class FileContentHashTests(SimpleTestCase):
    def test_hashes_file_contents(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as tmp:
            tmp.write(b"# Test note\n\nContent here.\n")
            tmp_path = tmp.name

        result = file_content_hash(tmp_path)
        self.assertEqual(len(result), 64)

    def test_matches_manual_sha256(self):
        content = b"# Heading\n\nParagraph.\n"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        expected = hashlib.sha256(content).hexdigest()
        self.assertEqual(file_content_hash(tmp_path), expected)

    def test_different_files_produce_different_hashes(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as a:
            a.write(b"file A")
            path_a = a.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as b:
            b.write(b"file B")
            path_b = b.name

        self.assertNotEqual(file_content_hash(path_a), file_content_hash(path_b))

    def test_file_not_found_raises(self):
        with self.assertRaises((FileNotFoundError, OSError)):
            file_content_hash("/nonexistent/path/to/file.md")
