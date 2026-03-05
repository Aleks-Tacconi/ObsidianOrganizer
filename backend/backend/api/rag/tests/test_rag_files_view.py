"""Tests for GET /api/rag/files/ autocomplete endpoint."""

from unittest.mock import patch

from django.test import TestCase

from ...models import VectorIndex


class RagFilesViewTests(TestCase):
    def setUp(self):
        super().setUp()
        VectorIndex.objects.create(
            file_path="/vault/networking/tcp-basics.md",
            content_hash="a" * 64,
            chunk_count=5,
        )
        VectorIndex.objects.create(
            file_path="/vault/networking/udp-overview.md",
            content_hash="b" * 64,
            chunk_count=4,
        )
        VectorIndex.objects.create(
            file_path="/vault/os/scheduling.md",
            content_hash="c" * 64,
            chunk_count=7,
        )

    def test_returns_405_for_non_get(self):
        response = self.client.post("/api/rag/files/", data={})
        self.assertEqual(response.status_code, 405)

    def test_returns_filenames(self):
        response = self.client.get("/api/rag/files/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("files", payload)
        self.assertIn("tcp-basics.md", payload["files"])
        self.assertIn("udp-overview.md", payload["files"])
        self.assertIn("scheduling.md", payload["files"])

    def test_filters_by_query(self):
        response = self.client.get("/api/rag/files/?q=tcp")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["files"], ["tcp-basics.md"])

    def test_respects_limit_param(self):
        response = self.client.get("/api/rag/files/?limit=2")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertLessEqual(len(payload["files"]), 2)

    def test_invalid_limit_uses_default(self):
        response = self.client.get("/api/rag/files/?limit=bad")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["files"]), 1)

    def test_handles_backend_error(self):
        with patch(
            "api.rag.views._list_indexed_file_names", side_effect=Exception("boom")
        ):
            response = self.client.get("/api/rag/files/")
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.json())
