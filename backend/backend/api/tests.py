import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from .models import Grade, Note, PrimaryTag, SubTag


class GradeApiTests(TestCase):
    def setUp(self):
        super().setUp()
        self.module = PrimaryTag.objects.create(name="COMP101", color="#111111")  # pylint: disable=E1101
        self.module_info = self.module.module_info

    def test_create_grade_persists_valid_weighted_grade(self):
        response = self.client.post(
            "/api/grades/",
            data={
                "name": "Midterm",
                "percentage": 15,
                "scored": 50,
                "module_info_id": self.module_info.pk,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Grade.objects.count(), 1)  # pylint: disable=E1101
        self.assertEqual(Grade.objects.get().name, "Midterm")  # pylint: disable=E1101

    def test_create_grade_rejects_invalid_score(self):
        response = self.client.post(
            "/api/grades/",
            data={
                "name": "Midterm",
                "percentage": 15,
                "scored": 120,
                "module_info_id": self.module_info.pk,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["scored"], ["Score must be between 0 and 100."]
        )

    def test_create_grade_rejects_total_weight_above_one_hundred(self):
        Grade.objects.create(  # pylint: disable=E1101
            module_info=self.module_info,
            name="Coursework",
            percentage=70,
            scored=80,
        )

        response = self.client.post(
            "/api/grades/",
            data={
                "name": "Final",
                "percentage": 40,
                "scored": 70,
                "module_info_id": self.module_info.pk,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["percentage"],
            ["Tracked grade weights cannot exceed 100% for a module."],
        )


class VaultTagToolsApiTests(TestCase):
    def setUp(self):
        super().setUp()
        cs101 = PrimaryTag.objects.create(name="CS101", color="#000000")  # pylint: disable=E1101
        SubTag.objects.create(name="Sorting", parent=cs101)  # pylint: disable=E1101
        SubTag.objects.create(name="Graphs", parent=cs101)  # pylint: disable=E1101

        math200 = PrimaryTag.objects.create(name="MATH200", color="#000000")  # pylint: disable=E1101
        SubTag.objects.create(name="LinearAlgebra", parent=math200)  # pylint: disable=E1101

        phys101 = PrimaryTag.objects.create(name="PHYS101", color="#000000")  # pylint: disable=E1101
        SubTag.objects.create(name="Kinematics", parent=phys101)  # pylint: disable=E1101

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
                "---\ntags:\n  - CS101\n  - Sorting\n  - Graphs\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "math-linear.md").write_text(
                "---\ntags:\n  - MATH200\n  - LinearAlgebra\n---\ncontent\n",
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
                "---\ntags:\n  - PHYS101\n  - Kinematics\n---\ncontent\n",
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
            self.assertEqual(body["tag"], "CS101|Sorting")
            self.assertTrue(body["updated"])

            updated = file_path.read_text(encoding="utf-8")
            self.assertIn("  - Existing\n", updated)
            self.assertIn("  - CS101\n", updated)
            self.assertIn("  - Sorting\n", updated)

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
                updated.startswith("---\ntags:\n  - MATH200\n  - LinearAlgebra\n---\n")
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
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
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
            self.assertEqual(updated.count("CS101"), 1)
            self.assertEqual(updated.count("Sorting"), 1)

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

            first_content = first.read_text(encoding="utf-8")
            second_content = second.read_text(encoding="utf-8")
            self.assertIn("CS101", first_content)
            self.assertIn("Sorting", first_content)
            self.assertIn("CS101", second_content)
            self.assertIn("Sorting", second_content)

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


class PrimaryTagSidebarSummaryApiTests(TestCase):
    def test_primary_tags_list_includes_completion_summary(self):
        complete_module = PrimaryTag.objects.create(  # pylint: disable=E1101
            name="Complete Module", color="#112233"
        )
        incomplete_module = PrimaryTag.objects.create(  # pylint: disable=E1101
            name="Incomplete Module", color="#445566"
        )
        PrimaryTag.objects.create(  # pylint: disable=E1101
            name="Empty Module", color="#778899"
        )

        first_topic = SubTag.objects.create(  # pylint: disable=E1101
            name="Topic A", parent=complete_module
        )
        second_topic = SubTag.objects.create(  # pylint: disable=E1101
            name="Topic B", parent=complete_module
        )
        SubTag.objects.create(name="Topic C", parent=incomplete_module)  # pylint: disable=E1101

        first_complete = Note.objects.create(  # pylint: disable=E1101
            name="Lecture 1",
            description="",
            date=timezone.now(),
            completed=True,
            primary_tag=complete_module,
        )
        second_complete = Note.objects.create(  # pylint: disable=E1101
            name="Lecture 2",
            description="",
            date=timezone.now(),
            completed=True,
            primary_tag=complete_module,
        )
        Note.objects.create(  # pylint: disable=E1101
            name="Lecture 3",
            description="",
            date=timezone.now(),
            completed=True,
            primary_tag=incomplete_module,
        )
        Note.objects.create(  # pylint: disable=E1101
            name="Lecture 4",
            description="",
            date=timezone.now(),
            completed=False,
            primary_tag=incomplete_module,
        )

        first_complete.subtags.add(first_topic)
        second_complete.subtags.add(second_topic)

        response = self.client.get("/api/primary-tags/")

        self.assertEqual(response.status_code, 200)
        payload = {item["name"]: item for item in response.json()}

        self.assertEqual(payload["Complete Module"]["note_count"], 2)
        self.assertEqual(payload["Complete Module"]["completed_note_count"], 2)
        self.assertTrue(payload["Complete Module"]["is_complete"])

        self.assertEqual(payload["Incomplete Module"]["note_count"], 2)
        self.assertEqual(payload["Incomplete Module"]["completed_note_count"], 1)
        self.assertFalse(payload["Incomplete Module"]["is_complete"])

        self.assertEqual(payload["Empty Module"]["note_count"], 0)
        self.assertEqual(payload["Empty Module"]["completed_note_count"], 0)
        self.assertFalse(payload["Empty Module"]["is_complete"])

    def test_primary_tag_detail_includes_completion_summary(self):
        module = PrimaryTag.objects.create(name="Algorithms", color="#abcdef")  # pylint: disable=E1101
        Note.objects.create(  # pylint: disable=E1101
            name="Search",
            description="",
            date=timezone.now(),
            completed=True,
            primary_tag=module,
        )

        response = self.client.get(f"/api/primary-tags/{module.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["note_count"], 1)
        self.assertEqual(payload["completed_note_count"], 1)
        self.assertTrue(payload["is_complete"])

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

    # --- category-membership ---

    def test_category_membership_rejects_non_post(self):
        response = self.client.get("/api/category-membership/")

        self.assertEqual(response.status_code, 405)

    def test_category_membership_rejects_malformed_json(self):
        response = self.client.post(
            "/api/category-membership/",
            data="{bad-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid JSON body")

    def test_category_membership_requires_module_and_topic(self):
        response = self.client.post(
            "/api/category-membership/",
            data={"module": "CS101"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_category_membership_returns_in_and_not_in_lists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault_path = Path(temp_dir)
            (vault_path / "in-cat.md").write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "other-topic.md").write_text(
                "---\ntags:\n  - CS101\n  - Graphs\n---\ncontent\n",
                encoding="utf-8",
            )
            (vault_path / "no-tags.md").write_text(
                "plain content\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/category-membership/",
                    data={"module": "CS101", "topic": "Sorting"},
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            data = response.json()
            in_names = [f["name"] for f in data["in_category"]]
            not_in_names = [f["name"] for f in data["not_in_category"]]
            self.assertIn("in-cat.md", in_names)
            self.assertIn("other-topic.md", not_in_names)
            self.assertIn("no-tags.md", not_in_names)
            self.assertNotIn("other-topic.md", in_names)

    # --- remove-tags-bulk ---

    def test_remove_tags_bulk_rejects_non_post(self):
        response = self.client.get("/api/remove-tags-bulk/")

        self.assertEqual(response.status_code, 405)

    def test_remove_tags_bulk_rejects_malformed_json(self):
        response = self.client.post(
            "/api/remove-tags-bulk/",
            data="{bad-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Invalid JSON body")

    def test_remove_tags_bulk_removes_tag_from_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            first = Path(temp_dir) / "first.md"
            second = Path(temp_dir) / "second.md"
            first.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n  - Graphs\n---\ncontent\n",
                encoding="utf-8",
            )
            second.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/remove-tags-bulk/",
                    data={
                        "paths": [str(first), str(second)],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["removed_count"], 2)
            self.assertEqual(payload["failed_count"], 0)

            first_content = first.read_text(encoding="utf-8")
            self.assertNotIn("\n  - Sorting\n", first_content)
            self.assertIn("\n  - Graphs\n", first_content)
            self.assertIn("\n  - CS101\n", first_content)

            second_content = second.read_text(encoding="utf-8")
            self.assertNotIn("\n  - Sorting\n", second_content)
            self.assertNotIn("\n  - CS101\n", second_content)

    def test_remove_tags_bulk_reports_invalid_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            valid = Path(temp_dir) / "valid.md"
            valid.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/remove-tags-bulk/",
                    data={
                        "paths": [str(valid), "/etc/passwd"],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["removed_count"], 1)
            self.assertEqual(payload["failed_count"], 1)

    def test_remove_tags_bulk_also_removes_module_tag_when_no_other_topics(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            no_other_topics = Path(temp_dir) / "no-other-topics.md"
            has_other_topics = Path(temp_dir) / "has-other-topics.md"
            no_other_topics.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )
            has_other_topics.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n  - Graphs\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/remove-tags-bulk/",
                    data={
                        "paths": [str(no_other_topics), str(has_other_topics)],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            no_other_topics_content = no_other_topics.read_text(encoding="utf-8")
            has_other_topics_content = has_other_topics.read_text(encoding="utf-8")

            self.assertNotIn("\n  - Sorting\n", no_other_topics_content)
            self.assertNotIn("\n  - CS101\n", no_other_topics_content)
            self.assertNotIn("\n  - Sorting\n", has_other_topics_content)
            self.assertIn("\n  - CS101\n", has_other_topics_content)
            self.assertIn("\n  - Graphs\n", has_other_topics_content)

    def test_apply_tags_bulk_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            outside_file = Path(temp_dir).parent / "outside-apply.md"
            outside_file.write_text("plain\n", encoding="utf-8")
            traversal_path = f"{temp_dir}/../outside-apply.md"

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags-bulk/",
                    data={
                        "paths": [traversal_path],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["applied_count"], 0)
            self.assertEqual(payload["failed_count"], 1)
            self.assertEqual(payload["results"][0]["error"], "Invalid path")

    def test_remove_tags_bulk_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            outside_file = Path(temp_dir).parent / "outside-remove.md"
            outside_file.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )
            traversal_path = f"{temp_dir}/../outside-remove.md"

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/remove-tags-bulk/",
                    data={
                        "paths": [traversal_path],
                        "module": "CS101",
                        "topic": "Sorting",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["removed_count"], 0)
            self.assertEqual(payload["failed_count"], 1)
            self.assertEqual(payload["results"][0]["error"], "Invalid path")

    def test_scan_vault_tags_includes_nested_markdown_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            nested_dir = Path(temp_dir) / "Semester1" / "Week1"
            nested_dir.mkdir(parents=True, exist_ok=True)
            (nested_dir / "nested-note.md").write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.get("/api/scan-vault-tags/")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                response.json()["modules"],
                [{"module": "CS101", "topics": ["Sorting"]}],
            )

    def test_category_membership_includes_nested_markdown_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            nested_in = Path(temp_dir) / "A" / "in-cat.md"
            nested_out = Path(temp_dir) / "B" / "not-in-cat.md"
            nested_in.parent.mkdir(parents=True, exist_ok=True)
            nested_out.parent.mkdir(parents=True, exist_ok=True)

            nested_in.write_text(
                "---\ntags:\n  - CS101\n  - Sorting\n---\ncontent\n",
                encoding="utf-8",
            )
            nested_out.write_text(
                "---\ntags:\n  - CS101\n  - Graphs\n---\ncontent\n",
                encoding="utf-8",
            )

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/category-membership/",
                    data={"module": "CS101", "topic": "Sorting"},
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            in_paths = [item["path"] for item in payload["in_category"]]
            not_in_paths = [item["path"] for item in payload["not_in_category"]]

            self.assertIn(str(nested_in), in_paths)
            self.assertIn(str(nested_out), not_in_paths)

    def test_apply_tags_normalizes_spaces_in_module_and_topic_names(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "spacey.md"
            file_path.write_text("plain\n", encoding="utf-8")

            with patch("api.views.VAULT", f"{temp_dir}/"):
                response = self.client.post(
                    "/api/apply-tags/",
                    data={
                        "path": str(file_path),
                        "module": "Computer And Network Security",
                        "topic": "Security Policies and UNIX Access Control Mechanisms",
                    },
                    content_type="application/json",
                )

            self.assertEqual(response.status_code, 200)
            updated = file_path.read_text(encoding="utf-8")
            self.assertIn("ComputerAndNetworkSecurity", updated)
            self.assertIn("SecurityPoliciesandUNIXAccessControlMechanisms", updated)


class SectionReorderingApiTests(TestCase):
    def setUp(self):
        super().setUp()
        self.module = PrimaryTag.objects.create(name="COMP202", color="#123456")  # pylint: disable=E1101
        self.module_info = self.module.module_info
        self.first_topic = SubTag.objects.create(name="Intro", parent=self.module)  # pylint: disable=E1101
        self.second_topic = SubTag.objects.create(name="Advanced", parent=self.module)  # pylint: disable=E1101
        self.first_section = self.module_info.sections.get(subtag=self.first_topic)
        self.second_section = self.module_info.sections.get(subtag=self.second_topic)

    def test_section_reorder_endpoint_persists_module_section_order(self):
        response = self.client.post(
            "/api/sections/reorder/",
            data={
                "module_info_id": self.module_info.pk,
                "section_ids": [self.second_section.id, self.first_section.id],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        module_response = self.client.get(f"/api/module-info/{self.module_info.pk}/")
        self.assertEqual(module_response.status_code, 200)
        self.assertEqual(
            [
                section["subtag"]["name"]
                for section in module_response.json()["sections"]
            ],
            ["Advanced", "Intro"],
        )

    def test_note_reorder_endpoint_persists_section_note_order(self):
        first_note = Note.objects.create(  # pylint: disable=E1101
            name="Lecture 1",
            description="",
            date=timezone.now(),
            completed=False,
            primary_tag=self.module,
        )
        second_note = Note.objects.create(  # pylint: disable=E1101
            name="Lecture 2",
            description="",
            date=timezone.now() + timedelta(days=1),
            completed=False,
            primary_tag=self.module,
        )
        first_note.subtags.add(self.first_topic)
        second_note.subtags.add(self.first_topic)

        response = self.client.post(
            f"/api/sections/{self.first_section.id}/reorder-notes/",
            data={"note_ids": [second_note.id, first_note.id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        module_response = self.client.get(f"/api/module-info/{self.module_info.pk}/")
        self.assertEqual(module_response.status_code, 200)
        notes = module_response.json()["sections"][0]["notes"]
        self.assertEqual([note["name"] for note in notes], ["Lecture 2", "Lecture 1"])
