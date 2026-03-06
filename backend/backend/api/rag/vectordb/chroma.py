"""ChromaDB client wrapper for persistent vector storage."""

from typing import Dict, List, Optional

from django.conf import settings


def _get_config() -> dict:
    return getattr(settings, "RAG_CONFIG", {})


class ChromaStore:
    """Manages a single ChromaDB collection for vault note chunks."""

    def __init__(self) -> None:
        import chromadb  # pylint: disable=C0415

        cfg = _get_config()
        persist_dir = cfg.get("CHROMA_PERSIST_DIR", "./chroma_db")
        collection_name = cfg.get("CHROMA_COLLECTION", "obsidian_vault")

        self._client = chromadb.PersistentClient(path=persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------
    def upsert(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
    ) -> None:
        """Insert or update chunks."""
        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

    def delete_by_file(self, file_path: str) -> None:
        """Remove all chunks that belong to *file_path*."""
        self._collection.delete(where={"file_path": file_path})

    def clear(self) -> None:
        """Drop and recreate the collection."""
        cfg = _get_config()
        collection_name = cfg.get("CHROMA_COLLECTION", "obsidian_vault")
        self._client.delete_collection(collection_name)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------
    def query(
        self,
        query_embedding: List[float],
        n_results: int = 20,
        where: Optional[Dict] = None,
    ) -> dict:
        """Return the top-*n_results* chunks closest to *query_embedding*.

        Returns the raw ChromaDB result dict with keys
        ``ids``, ``documents``, ``metadatas``, ``distances``.
        """
        kwargs: dict = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where
        return self._collection.query(**kwargs)

    def count(self) -> int:
        """Total chunks in the collection."""
        return self._collection.count()

    def stats(self) -> dict:
        """Basic statistics about the index."""
        total_chunks = self.count()
        return {
            "total_chunks": total_chunks,
            "collection": self._collection.name,
        }
