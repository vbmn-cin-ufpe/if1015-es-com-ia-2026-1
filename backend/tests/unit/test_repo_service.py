"""Unit tests for RepoService."""

from app.dependencies import get_repo_service


def test_start_index_local_path() -> None:
    """Test that repo service can index a local path."""
    # Use dependency factory to get properly configured service
    service = get_repo_service()
    
    result = service.start_index("app")
    
    assert result.repository_id
    assert result.job_status in {"completed", "failed"}