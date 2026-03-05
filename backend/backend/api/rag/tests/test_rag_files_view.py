"""Tests for GET /api/rag/files/ autocomplete endpoint."""

import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase

from ...models import VectorIndex


class RagFilesViewTests(TestCase):
    def setUp(self):
        super().setUp()
        self._temp_dir = tempfile.TemporaryDirectory()
        vault = Path(self._temp_dir.name)

        self.tcp_file = vault / "tcp-basics.md"
        self.udp_file = vault / "udp-overview.md"
        self.scheduling_file = vault / "scheduling.md"
        self.access_file = vault / "access-control.md"

        self.tcp_file.write_text(
            "---\ntags:\n  - Networking\n  - Protocols\n---\ncontent\n",
            encoding="utf-8",
        )
        self.udp_file.write_text(
            "---\ntags:\n  - Networking\n  - Protocols\n---\ncontent\n",
            encoding="utf-8",
        )
        self.scheduling_file.write_text(
            "---\ntags:\n  - OS\n  - Scheduling\n---\ncontent\n",
            encoding="utf-8",
        )
        self.access_file.write_text(
            (
                "---\n"
                "tags:\n"
                "  - ComputerAndNetworkSecurity\n"
                "  - SecurityPoliciesandUNIXAccessControlMechanisms\n"
                "---\n"
                "content\n"
            ),
            encoding="utf-8",
        )

        VectorIndex.objects.create(
            file_path=str(self.tcp_file),
            content_hash="a" * 64,
            chunk_count=5,
        )
        VectorIndex.objects.create(
            file_path=str(self.udp_file),
            content_hash="b" * 64,
            chunk_count=4,
        )
        VectorIndex.objects.create(
            file_path=str(self.scheduling_file),
            content_hash="c" * 64,
            chunk_count=7,
        )
        VectorIndex.objects.create(
            file_path=str(self.access_file),
            content_hash="d" * 64,
            chunk_count=3,
        )

    def tearDown(self):
        self._temp_dir.cleanup()
        super().tearDown()

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
        self.assertIn("access-control.md", payload["files"])

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

    def test_filters_by_scope_module(self):
        response = self.client.get("/api/rag/files/?scope_module=Networking")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("tcp-basics.md", payload["files"])
        self.assertIn("udp-overview.md", payload["files"])
        self.assertNotIn("scheduling.md", payload["files"])

    def test_filters_by_scope_module_and_category(self):
        response = self.client.get(
            "/api/rag/files/?scope_module=OS&scope_category=Scheduling"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["files"], ["scheduling.md"])

    def test_scope_matches_human_readable_label(self):
        response = self.client.get(
            "/api/rag/files/?scope_module=Computer%20And%20Network%20Security"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("access-control.md", payload["files"])

    def test_scope_matches_human_readable_category_label(self):
        response = self.client.get(
            (
                "/api/rag/files/?"
                "scope_module=Computer%20And%20Network%20Security"
                "&scope_category=Security%20Policies%20and%20UNIX%20Access%20Control%20Mechanisms"
            )
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["files"], ["access-control.md"])

    def test_falls_back_to_vault_scan_when_vectorindex_empty(self):
        VectorIndex.objects.all().delete()  # pylint: disable=E1101
        with patch("api.rag.views.settings.VAULT_PATH", str(Path(self._temp_dir.name))):
            response = self.client.get("/api/rag/files/?q=access")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["files"], ["access-control.md"])

    def test_handles_backend_error(self):
        with patch("api.rag.views._matches_scope", side_effect=Exception("boom")):
            response = self.client.get("/api/rag/files/")
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.json())
