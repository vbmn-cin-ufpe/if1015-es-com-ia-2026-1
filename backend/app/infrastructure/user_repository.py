"""User repository — persists User entities to PostgreSQL with in-memory fallback."""

import logging
import threading
from datetime import datetime, timezone
from typing import Optional

from app.domain.enums import Plan, Role
from app.domain.user import User
from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

try:
    import psycopg
except Exception:
    psycopg = None  # type: ignore


_CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id                    TEXT        PRIMARY KEY,
    email                 TEXT        NOT NULL UNIQUE,
    password_hash         TEXT,
    role                  TEXT        NOT NULL DEFAULT 'free',
    plan                  TEXT        NOT NULL DEFAULT 'free',
    social_provider       TEXT,
    social_id             TEXT,
    social_linked         BOOLEAN     NOT NULL DEFAULT FALSE,
    email_verified        BOOLEAN     NOT NULL DEFAULT FALSE,
    email_verify_token    TEXT,
    email_verify_expires  TIMESTAMPTZ,
    reset_token           TEXT,
    reset_token_expires   TIMESTAMPTZ,
    repos_indexed_count   INT         NOT NULL DEFAULT 0,
    questions_asked_count INT         NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by            TEXT,
    updated_by            TEXT,
    deleted_at            TIMESTAMPTZ,
    deleted_by            TEXT
);
"""

_CREATE_TOKENS_TABLE = """
CREATE TABLE IF NOT EXISTS auth_tokens (
    jti        TEXT        PRIMARY KEY,
    user_id    TEXT        NOT NULL,
    revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL
);
"""


def _row_to_user(row: tuple) -> User:
    (
        id_, email, pw_hash, role, plan,
        social_provider, social_id, social_linked,
        email_verified, ev_token, ev_expires,
        reset_token, reset_expires,
        repos_count, questions_count,
        created_at, updated_at, created_by, updated_by,
        deleted_at, deleted_by,
    ) = row
    u = User()
    u.id = id_
    u.email = email
    u.password_hash = pw_hash
    u.role = Role(role) if role else Role.FREE
    u.plan = Plan(plan) if plan else Plan.FREE
    u.social_provider = social_provider
    u.social_id = social_id
    u.social_linked = bool(social_linked)
    u.email_verified = bool(email_verified)
    u.email_verify_token = ev_token
    u.email_verify_expires = str(ev_expires) if ev_expires else None
    u.reset_token = reset_token
    u.reset_token_expires = str(reset_expires) if reset_expires else None
    u.repos_indexed_count = repos_count or 0
    u.questions_asked_count = questions_count or 0
    u.created_at = str(created_at) if created_at else ""
    u.updated_at = str(updated_at) if updated_at else ""
    u.created_by = created_by
    u.updated_by = updated_by
    u.deleted_at = str(deleted_at) if deleted_at else None
    u.deleted_by = deleted_by
    return u


class UserRepository:
    """CRUD for User entities backed by Postgres (or in-memory for dev)."""

    def __init__(self, settings: Settings) -> None:
        self._dsn = settings.postgres_dsn
        self._db_enabled = bool(self._dsn and psycopg is not None)
        self._lock = threading.Lock()
        self._mem_by_id: dict[str, User] = {}
        self._mem_by_email: dict[str, User] = {}
        self._revoked_jtis: set[str] = set()
        if self._db_enabled:
            self._init_db()

    def _init_db(self) -> None:
        with psycopg.connect(self._dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(_CREATE_USERS_TABLE)
                cur.execute(_CREATE_TOKENS_TABLE)
            conn.commit()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, user: User) -> User:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO users (
                            id, email, password_hash, role, plan,
                            social_provider, social_id, social_linked,
                            email_verified, email_verify_token, email_verify_expires,
                            reset_token, reset_token_expires,
                            repos_indexed_count, questions_asked_count,
                            created_at, updated_at, created_by, updated_by,
                            deleted_at, deleted_by
                        ) VALUES (
                            %s,%s,%s,%s,%s,
                            %s,%s,%s,
                            %s,%s,%s,
                            %s,%s,
                            %s,%s,
                            %s,%s,%s,%s,
                            %s,%s
                        )
                        """,
                        (
                            user.id, user.email, user.password_hash,
                            user.role.value, user.plan.value,
                            user.social_provider, user.social_id, user.social_linked,
                            user.email_verified, user.email_verify_token, user.email_verify_expires,
                            user.reset_token, user.reset_token_expires,
                            user.repos_indexed_count, user.questions_asked_count,
                            user.created_at, user.updated_at,
                            user.created_by, user.updated_by,
                            user.deleted_at, user.deleted_by,
                        ),
                    )
                conn.commit()
        else:
            with self._lock:
                self._mem_by_id[user.id] = user
                self._mem_by_email[user.email.lower()] = user
        return user

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_by_id(self, user_id: str) -> Optional[User]:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM users WHERE id=%s AND deleted_at IS NULL",
                        (user_id,),
                    )
                    row = cur.fetchone()
                    return _row_to_user(row) if row else None
        with self._lock:
            return self._mem_by_id.get(user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM users WHERE email=%s AND deleted_at IS NULL",
                        (email.lower(),),
                    )
                    row = cur.fetchone()
                    return _row_to_user(row) if row else None
        with self._lock:
            return self._mem_by_email.get(email.lower())

    def get_by_verify_token(self, token: str) -> Optional[User]:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM users WHERE email_verify_token=%s AND deleted_at IS NULL",
                        (token,),
                    )
                    row = cur.fetchone()
                    return _row_to_user(row) if row else None
        with self._lock:
            for u in self._mem_by_id.values():
                if u.email_verify_token == token:
                    return u
            return None

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, user: User) -> User:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE users SET
                            email=%s, password_hash=%s, role=%s, plan=%s,
                            social_provider=%s, social_id=%s, social_linked=%s,
                            email_verified=%s, email_verify_token=%s, email_verify_expires=%s,
                            reset_token=%s, reset_token_expires=%s,
                            repos_indexed_count=%s, questions_asked_count=%s,
                            updated_at=%s, updated_by=%s,
                            deleted_at=%s, deleted_by=%s
                        WHERE id=%s
                        """,
                        (
                            user.email, user.password_hash,
                            user.role.value, user.plan.value,
                            user.social_provider, user.social_id, user.social_linked,
                            user.email_verified, user.email_verify_token, user.email_verify_expires,
                            user.reset_token, user.reset_token_expires,
                            user.repos_indexed_count, user.questions_asked_count,
                            self._now(), user.updated_by,
                            user.deleted_at, user.deleted_by,
                            user.id,
                        ),
                    )
                conn.commit()
        else:
            with self._lock:
                self._mem_by_id[user.id] = user
                self._mem_by_email[user.email.lower()] = user
        return user

    def increment_repos_count(self, user_id: str) -> None:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET repos_indexed_count = repos_indexed_count + 1, updated_at=%s WHERE id=%s",
                        (self._now(), user_id),
                    )
                conn.commit()
        else:
            with self._lock:
                if user_id in self._mem_by_id:
                    self._mem_by_id[user_id].repos_indexed_count += 1

    def increment_questions_count(self, user_id: str) -> None:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET questions_asked_count = questions_asked_count + 1, updated_at=%s WHERE id=%s",
                        (self._now(), user_id),
                    )
                conn.commit()
        else:
            with self._lock:
                if user_id in self._mem_by_id:
                    self._mem_by_id[user_id].questions_asked_count += 1

    # ── Token blacklist ───────────────────────────────────────────────────────

    def revoke_token(self, jti: str, user_id: str, expires_at: str) -> None:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO auth_tokens (jti, user_id, revoked, expires_at) VALUES (%s,%s,TRUE,%s) ON CONFLICT (jti) DO UPDATE SET revoked=TRUE",
                        (jti, user_id, expires_at),
                    )
                conn.commit()
        else:
            with self._lock:
                self._revoked_jtis.add(jti)

    def is_token_revoked(self, jti: str) -> bool:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT revoked FROM auth_tokens WHERE jti=%s", (jti,))
                    row = cur.fetchone()
                    return bool(row and row[0])
        with self._lock:
            return jti in self._revoked_jtis

    # ── Admin helpers ─────────────────────────────────────────────────────────

    def list_all(self, include_deleted: bool = False) -> list:
        """Return all users (active by default, optionally including soft-deleted)."""
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    if include_deleted:
                        cur.execute("SELECT * FROM users ORDER BY created_at DESC")
                    else:
                        cur.execute(
                            "SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC"
                        )
                    return [_row_to_user(row) for row in cur.fetchall()]
        with self._lock:
            users = list(self._mem_by_id.values())
            if not include_deleted:
                users = [u for u in users if not getattr(u, "deleted_at", None)]
            return sorted(users, key=lambda u: getattr(u, "created_at", ""), reverse=True)

    def soft_delete(self, user_id: str, deleted_by: str = "") -> None:
        """Mark a user as deleted without removing the row."""
        now = self._now()
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET deleted_at=%s, deleted_by=%s, updated_at=%s WHERE id=%s",
                        (now, deleted_by, now, user_id),
                    )
                conn.commit()
        else:
            with self._lock:
                if user_id in self._mem_by_id:
                    u = self._mem_by_id[user_id]
                    u.deleted_at = now
                    u.deleted_by = deleted_by
