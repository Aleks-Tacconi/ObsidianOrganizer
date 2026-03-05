import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase


class VaultTagToolsApiTests(TestCase):
    def test_scan_vault_tags_rejects_non_get(self):
        response = self.client.post("/api/scan-vault-tags/", data={})

        self.assertEqual(response.status_code, 405)

    def test_untagged_files_rejects_non_get(self):
        response = self.client.post("/api/untagged-files/", data={})

        self.assertEqual(response.status_code, 405)

    def test_scan_vault_tags_groups_module_topics(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault_path = Path(temp_dir)
            (vault_path / "algorithms-intro.md").write_text(
                "---\ntags:\n  - CS101/Sorting\n  - CS101/Graphs\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "math-linear.md").write_text(
                "---\ntags:\n  - MATH200/LinearAlgebra\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.get("/api/scan-vault-tags/")

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(
                data["modules"],
                [
                    {"module": "CS101", "topics": ["Graphs", "Sorting"]},
                    {"module": "MATH200", "topics": ["LinearAlgebra"]},
                ],
            )

    def test_untagged_files_returns_files_without_module_topic_tag(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault_path = Path(temp_dir)
            (vault_path / "proper.md").write_text(
                "---\ntags:\n  - PHYS101/Kinematics\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "missing-topic.md").write_text(
                "---\ntags:\n  - PHYS101\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "no-frontmatter.md").write_text(
                "plain content\n", encoding="utf-8"
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.get("/api/untagged-files/")

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(
                data["files"],
                [
                    {
                        "name": "missing-topic.md",
                        "path": str(vault_path / "missing-topic.md"),
                    },
                    {
                        "name": "no-frontmatter.md",
                        "path": str(vault_path / "no-frontmatter.md"),
                    },
                ],
            )

    def test_apply_tags_updates_existing_frontmatter_tags(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "note.md"
            file_path.write_text(
                "---\ntags:\n  - Existing\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags/",
                    data={
                        "path": str(file_path),
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertEqual(body["tag"], "CS101/Sorting")
            self.assertTrue(body["updated"])

            updated = file_path.read_text(encoding="utf-8")
            self.assertIn("  - Existing\n", updated)
            self.assertIn("  - CS101/Sorting\n", updated)

    def test_apply_tags_creates_frontmatter_when_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "plain.md"
            file_path.write_text("hello\n", encoding="utf-8")

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags/",
                    data={
                        "path": str(file_path),
                        "module": "MATH200",
                        "topic": "LinearAlgebra",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            updated = file_path.read_text(encoding="utf-8")
            self.assertTrue(
                updated.startswith("---\ntags:\n  - MATH200/LinearAlgebra\n---\n")
            )

    def test_apply_tags_rejects_invalid_path(self):
        with patch("api.views.VAULT", "/tmp/vault/"):
            response = self.client.post(
                "/api/apply-tags/",
                data={"path": "/etc/passwd", "module": "CS101", "topic": "Sorting"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 400)

    def test_apply_tags_does_not_duplicate_existing_tag(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "note.md"
            file_path.write_text(
                "---\ntags:\n  - CS101/Sorting\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags/",
                    data={
                        "path": str(file_path),
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["updated"])
            updated = file_path.read_text(encoding="utf-8")
            self.assertEqual(updated.count("CS101/Sorting"), 1)

    def test_apply_tags_rejects_non_post(self):
        response = self.client.get("/api/apply-tags/")

        self.assertEqual(response.status_code, 405)

    def test_apply_tags_bulk_updates_multiple_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            first = Path(temp_dir) / "first.md"
            second = Path(temp_dir) / "second.md"
            first.write_text("plain\n", encoding="utf-8")
            second.write_text("plain\n", encoding="utf-8")

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags-bulk/",
                    data={
                        "paths": [str(first), str(second)],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["applied_count"], 2)
            self.assertEqual(payload["failed_count"], 0)

            self.assertIn("CS101/Sorting", first.read_text(encoding="utf-8"))
            self.assertIn("CS101/Sorting", second.read_text(encoding="utf-8"))

    def test_apply_tags_bulk_reports_invalid_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            valid = Path(temp_dir) / "valid.md"
            valid.write_text("plain\n", encoding="utf-8")
            invalid = "/etc/passwd"

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags-bulk/",
                    data={
                        "paths": [str(valid), invalid],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["applied_count"], 1)
            self.assertEqual(payload["failed_count"], 1)
            self.assertEqual(len(payload["results"]), 2)
            self.assertEqual(payload["results"][1]["error"], "Invalid path")

    def test_apply_tags_bulk_rejects_non_post(self):
        response = self.client.get("/api/apply-tags-bulk/")

        self.assertEqual(response.status_code, 405)

    def test_apply_tags_rejects_malformed_json(self):
        response = self.client.post(
            "/api/apply-tags/",
            data="{bad-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid JSON body")

    def test_apply_tags_bulk_rejects_malformed_json(self):
        response = self.client.post(
            "/api/apply-tags-bulk/",
            data="{bad-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid JSON body")
