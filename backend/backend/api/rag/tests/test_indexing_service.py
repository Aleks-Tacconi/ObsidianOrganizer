"""Tests for indexing service progress and error handling."""

import tempfile
from unittest.mock import MagicMock, patch

from django.test import TestCase

from ..services.indexing import get_progress, index_vault


class IndexVaultErrorHandlingTests(TestCase):
    def setUp(self):
        progress = get_progress()
        progress.total_files = 0
        progress.processed_files = 0
        progress.skipped_files = 0
        progress.total_chunks = 0
        progress.errors = []
        progress.status = "idle"

    def test_initialization_failure_sets_error_status(self):
        with tempfile.TemporaryDirectory() as vault:
            with patch(
                "api.rag.services.indexing.get_llm_provider",
                side_effect=RuntimeError("Ollama unavailable"),
            ):
                progress = index_vault(vault=vault)

        self.assertEqual(progress.status, "error")
        self.assertGreaterEqual(len(progress.errors), 1)
        self.assertIn("Ollama unavailable", progress.errors[0])
        self.assertEqual(progress.total_files, 0)
        self.assertEqual(progress.processed_files, 0)
        self.assertEqual(progress.total_chunks, 0)

    def test_invalid_vault_path_sets_error_status(self):
        with patch(
            "api.rag.services.indexing.get_llm_provider", return_value=MagicMock()
        ):
            with patch(
                "api.rag.services.indexing.ChromaStore", return_value=MagicMock()
            ):
                progress = index_vault(vault="/definitely/not/a/real/vault/path")

        self.assertEqual(progress.status, "error")
        self.assertGreaterEqual(len(progress.errors), 1)
        self.assertIn("Vault path does not exist", progress.errors[0])

    def test_get_progress_uses_vault_file_count_when_vectorindex_empty(self):
        progress = get_progress()
        progress.status = "idle"
        progress.total_chunks = 0
        progress.total_files = 0

        mock_store = MagicMock()
        mock_store.count.return_value = 123

        with patch("api.rag.services.indexing.ChromaStore", return_value=mock_store):
            with patch(
                "api.rag.services.indexing.VectorIndex.objects.count", return_value=0
            ):
                with patch(
                    "api.rag.services.indexing._vault_markdown_files",
                    return_value=["a.md", "b.md", "c.md"],
                ):
                    resolved = get_progress()

        self.assertEqual(resolved.total_chunks, 123)
        self.assertEqual(resolved.total_files, 3)
