import hashlib


class EmbeddingService:
    def __init__(self, dim: int = 32) -> None:
        self._dim = dim

    def embed_text(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [digest[i % len(digest)] / 255.0 for i in range(self._dim)]
        return values

    def embed_chunks(self, chunks: list[dict]) -> list[dict]:
        vectors: list[dict] = []
        for chunk in chunks:
            vectors.append(
                {
                    "chunk_id": chunk["chunk_id"],
                    "text": chunk["text"],
                    "metadata": chunk["metadata"],
                    "embedding": self.embed_text(chunk["text"]),
                }
            )
        return vectors