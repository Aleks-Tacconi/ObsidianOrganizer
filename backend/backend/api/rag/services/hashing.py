"""SHA-256 hashing utilities for change detection."""

import hashlib


def file_content_hash(path: str) -> str:
    """Return the hex SHA-256 digest of the file at *path*."""
    sha = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(8192), b""):
            sha.update(block)
    return sha.hexdigest()


def text_hash(text: str) -> str:
    """Return the hex SHA-256 digest of *text*."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
