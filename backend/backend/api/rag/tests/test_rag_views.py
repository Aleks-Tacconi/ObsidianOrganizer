"""Integration tests for RAG HTTP endpoints.

All external dependencies (Ollama, ChromaDB) are mocked so these tests
run without a live LLM or vector store.
"""

import json
from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import List
from unittest.mock import MagicMock, patch

from django.test import TestCase


# ── Minimal stubs for LLM/retrieval return types ────────────────────────────


@dataclass
class _EmbeddingResponse:
    embeddings: List[List[float]] = field(default_factory=lambda: [[0.1] * 4])


@dataclass
class _GenerationResponse:
    text: str = "This is a mock answer."
    provider: str = "ollama"
    model: str = "llama3.2"


def _chunk_stub(**overrides):
    data = {
        "text": "Sample chunk text.",
        "file_path": "/vault/note.md",
        "relative_path": "note.md",
        "file_name": "note.md",
        "heading": "Heading",
        "line_start": 1,
        "line_end": 5,
        "tags": "module1|category1",
        "distance": 0.1,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


# ── Helpers to build a mock provider and retrieve function ──────────────────


def _mock_provider():
    provider = MagicMock()
    provider.embed.return_value = _EmbeddingResponse()
    provider.generate.return_value = _GenerationResponse()
    provider.health_check.return_value = {
        "healthy": True,
        "provider": "ollama",
    }
    return provider


def _mock_retrieve(query, scope_filter=None):  # pylint: disable=W0613
    return [_chunk_stub()]


# ── Endpoint tests ───────────────────────────────────────────────────────────


class RagHealthViewTests(TestCase):
    def test_healthy_response(self):
        with patch("api.rag.views.get_llm_provider", return_value=_mock_provider()):
            response = self.client.get("/api/rag/health/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["healthy"])

    def test_rejects_post(self):
        response = self.client.post("/api/rag/health/", data={})
        self.assertEqual(response.status_code, 405)

    def test_unhealthy_provider_returns_200_with_healthy_false(self):
        provider = MagicMock()
        provider.health_check.return_value = {
            "healthy": False,
            "error": "Ollama not running",
        }
        with patch("api.rag.views.get_llm_provider", return_value=provider):
            response = self.client.get("/api/rag/health/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["healthy"])


class RagIndexStatusViewTests(TestCase):
    def test_returns_status_fields(self):
        response = self.client.get("/api/rag/index/status/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("total_files", data)
        self.assertIn("processed_files", data)
        self.assertIn("total_chunks", data)
        self.assertIn("errors", data)

    def test_rejects_post(self):
        response = self.client.post("/api/rag/index/status/", data={})
        self.assertEqual(response.status_code, 405)


class RagIndexStartViewTests(TestCase):
    def test_starts_indexing_thread(self):
        with patch("api.rag.views.index_vault") as mock_index:
            # Patch get_progress to report idle so start is not blocked.
            progress_mock = MagicMock()
            progress_mock.status = "idle"
            with patch("api.rag.views.get_progress", return_value=progress_mock):
                response = self.client.post(
                    "/api/rag/index/start/",
                    data=json.dumps({"force": False}),
                    content_type="application/json",
                )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "started")
        # index_vault is called in a thread; give it a moment then check it
        # was dispatched (the thread is daemonized so it may or may not have
        # run by now — we just verify the endpoint itself responds correctly).
        _ = mock_index  # referenced to satisfy lint

    def test_returns_409_when_already_running(self):
        progress_mock = MagicMock()
        progress_mock.status = "running"
        with patch("api.rag.views.get_progress", return_value=progress_mock):
            response = self.client.post(
                "/api/rag/index/start/",
                data=json.dumps({}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 409)

    def test_rejects_get(self):
        response = self.client.get("/api/rag/index/start/")
        self.assertEqual(response.status_code, 405)

    def test_missing_body_still_starts(self):
        """Empty body should be treated as force=False and start indexing."""
        progress_mock = MagicMock()
        progress_mock.status = "idle"
        with patch("api.rag.views.get_progress", return_value=progress_mock):
            with patch("api.rag.views.index_vault"):
                response = self.client.post(
                    "/api/rag/index/start/",
                    data="",
                    content_type="application/json",
                )
        self.assertEqual(response.status_code, 200)


class RagIndexClearViewTests(TestCase):
    def test_clears_index(self):
        with patch("api.rag.views.clear_index", return_value={"cleared": True}):
            response = self.client.delete("/api/rag/index/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["cleared"])

    def test_rejects_get(self):
        response = self.client.get("/api/rag/index/")
        self.assertEqual(response.status_code, 405)


class RagQueryViewTests(TestCase):
    def _post_query(self, payload: dict):
        return self.client.post(
            "/api/rag/query/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_requires_post(self):
        response = self.client.get("/api/rag/query/")
        self.assertEqual(response.status_code, 405)

    def test_rejects_missing_query_field(self):
        response = self._post_query({"top_k": 5})
        self.assertEqual(response.status_code, 400)

    def test_rejects_malformed_json(self):
        response = self.client.post(
            "/api/rag/query/",
            data="{bad-json",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_successful_query_returns_answer_and_citations(self):
        with (
            patch("api.rag.services.rag.retrieve", side_effect=_mock_retrieve),
            patch("api.rag.services.rag.rerank", return_value=[_chunk_stub()]),
            patch(
                "api.rag.services.rag.get_llm_provider", return_value=_mock_provider()
            ),
        ):
            response = self._post_query({"query": "What is TCP?"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)
        self.assertIn("citations", data)
        self.assertIsInstance(data["citations"], list)
        self.assertIn("model_used", data)

    def test_empty_query_string_returns_400(self):
        response = self._post_query({"query": "   "})
        self.assertEqual(response.status_code, 400)

    def test_scope_fields_accepted(self):
        with (
            patch("api.rag.services.rag.retrieve", side_effect=_mock_retrieve),
            patch("api.rag.services.rag.rerank", return_value=[_chunk_stub()]),
            patch(
                "api.rag.services.rag.get_llm_provider", return_value=_mock_provider()
            ),
        ):
            response = self._post_query(
                {
                    "query": "What is TCP?",
                    "scope_module": "Networking",
                    "scope_category": "Protocols",
                    "force_notes": [],
                    "top_k": 3,
                }
            )

        self.assertEqual(response.status_code, 200)

    def test_force_notes_payload_is_ignored(self):
        with patch("api.rag.views.query_rag") as mock_query_rag:
            mock_query_rag.return_value = SimpleNamespace(
                answer="ok",
                citations=[],
                model_used="ollama/llama3.2",
                chunks_retrieved=0,
                chunks_after_rerank=0,
            )

            response = self._post_query(
                {
                    "query": "What is TCP?",
                    "scope_module": "Networking",
                    "scope_category": "Protocols",
                    "force_notes": ["manual.md"],
                    "top_k": 3,
                }
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_query_rag.call_count, 1)
        _, kwargs = mock_query_rag.call_args
        self.assertNotIn("force_notes", kwargs)

    def test_only_cited_excerpts_are_returned_as_sources(self):
        provider = _mock_provider()
        provider.generate.return_value = _GenerationResponse(
            text="ARP resolves IP to MAC [E1].",
            provider="ollama",
            model="llama3.2",
        )

        with (
            patch(
                "api.rag.services.rag.retrieve",
                return_value=[
                    _chunk_stub(
                        file_name="Address Resolution Protocol.md",
                        line_start=7,
                        line_end=13,
                    ),
                    _chunk_stub(
                        file_name="Network Security.md",
                        line_start=20,
                        line_end=30,
                        file_path="/vault/network-security.md",
                        relative_path="network-security.md",
                    ),
                ],
            ),
            patch(
                "api.rag.services.rag.rerank",
                return_value=[
                    _chunk_stub(
                        file_name="Address Resolution Protocol.md",
                        line_start=7,
                        line_end=13,
                    ),
                    _chunk_stub(
                        file_name="Network Security.md",
                        line_start=20,
                        line_end=30,
                        file_path="/vault/network-security.md",
                        relative_path="network-security.md",
                    ),
                ],
            ),
            patch("api.rag.services.rag.get_llm_provider", return_value=provider),
        ):
            response = self._post_query({"query": "what is arp"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("[Note: Address Resolution Protocol.md:7-13]", data["answer"])
        self.assertEqual(len(data["citations"]), 1)
        self.assertEqual(
            data["citations"][0]["file_name"], "Address Resolution Protocol.md"
        )

    def test_citation_contains_expected_fields(self):
        with (
            patch("api.rag.services.rag.retrieve", side_effect=_mock_retrieve),
            patch("api.rag.services.rag.rerank", return_value=[_chunk_stub()]),
            patch(
                "api.rag.services.rag.get_llm_provider", return_value=_mock_provider()
            ),
        ):
            response = self._post_query({"query": "Explain TCP"})

        data = response.json()
        citation = data["citations"][0]
        for field_name in (
            "file_path",
            "file_name",
            "relative_path",
            "heading",
            "snippet",
            "line_start",
            "line_end",
            "relevance_score",
        ):
            self.assertIn(field_name, citation, msg=f"Missing field: {field_name}")

    def test_retries_generation_when_first_answer_is_uncited_and_meta(self):
        provider = _mock_provider()
        provider.generate.side_effect = [
            _GenerationResponse(
                text="According to the provided excerpts, ARP resolves IP to MAC.",
                provider="ollama",
                model="llama3.2",
            ),
            _GenerationResponse(
                text="ARP resolves IP to MAC [E1].",
                provider="ollama",
                model="llama3.2",
            ),
        ]

        with (
            patch("api.rag.services.rag.retrieve", side_effect=_mock_retrieve),
            patch("api.rag.services.rag.rerank", return_value=[_chunk_stub()]),
            patch("api.rag.services.rag.get_llm_provider", return_value=provider),
        ):
            response = self._post_query({"query": "What is ARP?"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(provider.generate.call_count, 2)
        self.assertIn("[Note: note.md:1-5]", data["answer"])
        self.assertNotIn("According to the provided excerpts", data["answer"])
