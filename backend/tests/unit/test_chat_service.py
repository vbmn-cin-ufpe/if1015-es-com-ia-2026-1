"""Unit tests for ChatService.

All external dependencies (metadata, retrieval, LLM) are replaced with
MagicMock so no database or LLM call is made.
"""

from unittest.mock import MagicMock

import pytest

from app.services.chat_service import ChatService
from app.services.models import ChatAskResponse


# ── Fixtures ──────────────────────────────────────────────────────────────────


def _make_chunk(chunk_id="c1", file_path="src/main.py", start=1, end=10, score=0.9):
    return {
        "chunk_id": chunk_id,
        "score": score,
        "metadata": {
            "file_path": file_path,
            "start_line": str(start),
            "end_line": str(end),
        },
    }


def _make_repo(status="completed"):
    repo = MagicMock()
    repo.status = status
    return repo


def _make_service(repo=None, chunks=None, answer="mocked answer"):
    """Return a ChatService wired with controlled mocks."""
    metadata = MagicMock()
    metadata.get_repository.return_value = repo or _make_repo()

    retrieval = MagicMock()
    retrieval.retrieve.return_value = chunks or [_make_chunk()]

    llm = MagicMock()
    llm.generate_answer.return_value = answer

    return ChatService(metadata, retrieval, llm), metadata, retrieval, llm


# ── Happy path ────────────────────────────────────────────────────────────────


class TestChatServiceHappyPath:
    def test_returns_chataskresponse(self):
        svc, *_ = _make_service()
        result = svc.ask("repo1", "What does main.py do?")
        assert isinstance(result, ChatAskResponse)

    def test_answer_comes_from_llm(self):
        svc, _, _, llm = _make_service(answer="It initialises the app.")
        result = svc.ask("repo1", "question?")
        assert result.answer == "It initialises the app."

    def test_sources_mapped_from_chunks(self):
        chunks = [
            _make_chunk("c1", "src/a.py", 5, 15, 0.95),
            _make_chunk("c2", "src/b.py", 1, 8, 0.80),
        ]
        svc, *_ = _make_service(chunks=chunks)
        result = svc.ask("repo1", "question?")
        assert len(result.sources) == 2

        src = result.sources[0]
        assert src.chunk_id == "c1"
        assert src.file_path == "src/a.py"
        assert src.start_line == 5
        assert src.end_line == 15
        assert abs(src.score - 0.95) < 1e-6

    def test_retrieval_called_with_correct_args(self):
        svc, _, retrieval, _ = _make_service()
        svc.ask("repo42", "how does auth work?")
        retrieval.retrieve.assert_called_once_with(
            repository_id="repo42",
            question="how does auth work?",
            top_k=5,
        )

    def test_llm_called_with_question_and_chunks(self):
        chunks = [_make_chunk()]
        svc, _, _, llm = _make_service(chunks=chunks)
        svc.ask("repo1", "explain this")
        llm.generate_answer.assert_called_once_with(
            question="explain this",
            context_chunks=chunks,
        )

    def test_empty_chunks_returns_response_with_no_sources(self):
        svc, *_ = _make_service(chunks=[])
        result = svc.ask("repo1", "question?")
        assert result.sources == []

    def test_score_converted_to_float(self):
        chunks = [_make_chunk(score="0.75")]  # score as string
        svc, *_ = _make_service(chunks=chunks)
        result = svc.ask("repo1", "q")
        assert isinstance(result.sources[0].score, float)

    def test_line_numbers_converted_to_int(self):
        chunks = [_make_chunk(start="10", end="20")]
        svc, *_ = _make_service(chunks=chunks)
        result = svc.ask("repo1", "q")
        assert isinstance(result.sources[0].start_line, int)
        assert isinstance(result.sources[0].end_line, int)


# ── Error cases ───────────────────────────────────────────────────────────────


class TestChatServiceErrors:
    def test_repository_not_found_raises_valueerror(self):
        svc, metadata, *_ = _make_service()
        metadata.get_repository.return_value = None
        with pytest.raises(ValueError, match="repository not found"):
            svc.ask("nonexistent", "question?")

    def test_repository_not_indexed_raises_valueerror(self):
        svc, metadata, *_ = _make_service(repo=_make_repo(status="indexing"))
        with pytest.raises(ValueError, match="not indexed yet"):
            svc.ask("repo1", "question?")

    def test_pending_status_raises_valueerror(self):
        svc, metadata, *_ = _make_service(repo=_make_repo(status="pending"))
        with pytest.raises(ValueError):
            svc.ask("repo1", "question?")

    def test_failed_status_raises_valueerror(self):
        svc, metadata, *_ = _make_service(repo=_make_repo(status="failed"))
        with pytest.raises(ValueError):
            svc.ask("repo1", "question?")

    def test_metadata_queried_with_repository_id(self):
        svc, metadata, *_ = _make_service()
        svc.ask("specific-repo-id", "q")
        metadata.get_repository.assert_called_once_with("specific-repo-id")
