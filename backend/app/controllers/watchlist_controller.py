"""Watchlist controller — subscribe/unsubscribe to module changes + list."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth_middleware import AuthenticatedUser, require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["watchlist"])


def _get_watchlist_repo():
    from app.dependencies import get_settings_cached
    from app.infrastructure.watchlist_repository import WatchlistRepository
    return WatchlistRepository(get_settings_cached())


# ── Request / response models ─────────────────────────────────────────────────

class WatchRequest(BaseModel):
    module_path: str = ""   # empty string = watch entire repo


class WatchEntryOut(BaseModel):
    id: str
    repository_id: str
    module_path: str
    created_at: str


class WatchStatus(BaseModel):
    watching: bool
    entry: WatchEntryOut | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/repos/{repository_id}/watch", response_model=WatchEntryOut)
def watch_module(
    repository_id: str,
    body: WatchRequest,
    user: AuthenticatedUser = Depends(require_auth),
) -> WatchEntryOut:
    """Subscribe the current user to changes in a module (or the entire repo)."""
    from app.dependencies import get_metadata_adapter
    metadata = get_metadata_adapter()
    if not metadata.get_repository(repository_id):
        raise HTTPException(status_code=404, detail="Repository not found")

    repo = _get_watchlist_repo()
    entry = repo.watch(
        user_id=user.user_id,
        user_email=user.email,
        repository_id=repository_id,
        module_path=body.module_path,
    )
    logger.info("User %s watching repo=%s module=%s", user.user_id, repository_id, body.module_path or "(all)")
    return WatchEntryOut(
        id=entry.id,
        repository_id=entry.repository_id,
        module_path=entry.module_path,
        created_at=entry.created_at,
    )


@router.delete("/repos/{repository_id}/watch")
def unwatch_module(
    repository_id: str,
    module_path: str = "",
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    """Unsubscribe the current user from a module (or entire repo)."""
    repo = _get_watchlist_repo()
    removed = repo.unwatch(user.user_id, repository_id, module_path)
    if not removed:
        raise HTTPException(status_code=404, detail="Watch entry not found")
    return {"removed": True}


@router.get("/repos/{repository_id}/watch/status", response_model=WatchStatus)
def watch_status(
    repository_id: str,
    module_path: str = "",
    user: AuthenticatedUser = Depends(require_auth),
) -> WatchStatus:
    """Check if the current user is watching a given module."""
    repo = _get_watchlist_repo()
    entry = repo.get(user.user_id, repository_id, module_path)
    if entry is None:
        return WatchStatus(watching=False)
    return WatchStatus(
        watching=True,
        entry=WatchEntryOut(
            id=entry.id,
            repository_id=entry.repository_id,
            module_path=entry.module_path,
            created_at=entry.created_at,
        ),
    )


@router.get("/me/watchlist", response_model=list[WatchEntryOut])
def my_watchlist(user: AuthenticatedUser = Depends(require_auth)) -> list[WatchEntryOut]:
    """Return all watch subscriptions for the current user."""
    repo = _get_watchlist_repo()
    entries = repo.list_for_user(user.user_id)
    return [
        WatchEntryOut(
            id=e.id,
            repository_id=e.repository_id,
            module_path=e.module_path,
            created_at=e.created_at,
        )
        for e in entries
    ]
