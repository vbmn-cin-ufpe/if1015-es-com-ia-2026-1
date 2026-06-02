"""Service for chunking code files into manageable pieces."""

import hashlib
from pathlib import Path


class ChunkingService:
    """Service to split files into overlapping chunks for embedding."""

    def __init__(self, chunk_size: int = 80, overlap: int = 20) -> None:
        self._chunk_size = chunk_size
        self._overlap = overlap

    def build_chunks(self, repo_root: Path, files: list[Path]) -> list[dict]:
        chunks: list[dict] = []
        for file_path in files:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            lines = text.splitlines()
            if not lines:
                continue
            start = 0
            while start < len(lines):
                end = min(start + self._chunk_size, len(lines))
                body = "\n".join(lines[start:end]).strip()
                if body:
                    relative = file_path.relative_to(repo_root).as_posix()
                    raw_id = f"{relative}:{start+1}:{end}:{hashlib.sha256(body.encode()).hexdigest()[:12]}"
                    chunks.append(
                        {
                            "chunk_id": raw_id,
                            "text": body,
                            "metadata": {
                                "file_path": relative,
                                "start_line": start + 1,
                                "end_line": end,
                            },
                        }
                    )
                if end == len(lines):
                    break
                start = max(end - self._overlap, start + 1)
        return chunks