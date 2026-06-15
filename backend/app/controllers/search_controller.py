"""Semantic search API — full-codebase search using ChromaDB + embeddings."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.dependencies import get_chat_service, get_metadata_adapter

router = APIRouter(prefix="/api/repos", tags=["search"])


class SearchResult(BaseModel):
    chunk_id: str
    file_path: str
    start_line: int
    end_line: int
    score: float
    snippet: str
    language: str


class SearchResponse(BaseModel):
    repository_id: str
    query: str
    total: int
    results: list[SearchResult]


@router.get("/{repository_id}/search", response_model=SearchResponse)
def semantic_search(
    repository_id: str,
    q: str = Query(min_length=1, description="Natural language or keyword query"),
    top_k: int = Query(default=10, ge=1, le=50),
) -> SearchResponse:
    """Search the entire indexed codebase semantically.

    Uses the same ChromaDB vector store as chat, but returns raw code
    chunks ranked by embedding similarity — no LLM generation step.
    """
    metadata = get_metadata_adapter()
    repo_record = metadata.get_repository(repository_id)
    if repo_record is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo_record.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Repository must be indexed before searching (status: {repo_record.status})",
        )

    # Reuse the retrieval service wired inside ChatService
    chat_svc = get_chat_service()
    chunks = chat_svc._retrieval.retrieve(
        repository_id=repository_id,
        question=q,
        top_k=top_k,
    )

    results: list[SearchResult] = []
    for item in chunks:
        meta = item.get("metadata", {})
        content: str = meta.get("content", "") or ""
        # Truncate snippet to first 300 chars for readability
        snippet = content[:300].strip()
        if len(content) > 300:
            snippet += "…"

        results.append(SearchResult(
            chunk_id=item.get("chunk_id", ""),
            file_path=meta.get("file_path", ""),
            start_line=int(meta.get("start_line", 0)),
            end_line=int(meta.get("end_line", 0)),
            score=round(float(item.get("score", 0.0)), 4),
            snippet=snippet,
            language=meta.get("language", ""),
        ))

    return SearchResponse(
        repository_id=repository_id,
        query=q,
        total=len(results),
        results=results,
    )
