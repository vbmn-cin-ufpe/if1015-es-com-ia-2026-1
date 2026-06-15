"""Base entity with audit fields and soft-delete support."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class BaseEntity:
    """
    All persisted domain objects inherit from this class.
    Provides: created_at, updated_at, created_by, updated_by,
              deleted_at, deleted_by, is_deleted (soft-delete).
    """

    created_at: str = field(default_factory=_now)
    updated_at: str = field(default_factory=_now)
    created_by: Optional[str] = None   # user_id of creator
    updated_by: Optional[str] = None   # user_id of last updater
    deleted_at: Optional[str] = None   # set on soft-delete
    deleted_by: Optional[str] = None   # user_id who deleted

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self, by: Optional[str] = None) -> None:
        """Mark this entity as deleted without removing from DB."""
        now = _now()
        self.deleted_at = now
        self.deleted_by = by
        self.updated_at = now
        self.updated_by = by

    def touch(self, by: Optional[str] = None) -> None:
        """Update the updated_at/updated_by audit fields."""
        self.updated_at = _now()
        self.updated_by = by
