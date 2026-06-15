"""Webhook controller — GitHub push event receiver + admin CRUD."""

import hashlib
import hmac
import json
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel

from app.domain.enums import Role
from app.middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])

_require_admin = Depends(require_role(Role.ADMIN))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_webhook_repo():
    from app.dependencies import get_settings_cached
    from app.infrastructure.webhook_repository import WebhookRepository
    return WebhookRepository(get_settings_cached())


# ── Admin CRUD ────────────────────────────────────────────────────────────────

class WebhookOut(BaseModel):
    id: str
    repository_id: str
    repository_url: str
    provider: str
    active: bool
    created_at: str
    last_triggered_at: Optional[str] = None
    # secret is NOT exposed after creation


class WebhookCreated(WebhookOut):
    secret: str   # only returned once at creation time


class CreateWebhookRequest(BaseModel):
    repository_id: str
    repository_url: str
    provider: str = "github"


@router.get("/api/admin/webhooks", response_model=list[WebhookOut], dependencies=[_require_admin])
def list_webhooks() -> list[WebhookOut]:
    """List all registered webhooks (admin only)."""
    repo = _get_webhook_repo()
    return [
        WebhookOut(
            id=w.id, repository_id=w.repository_id, repository_url=w.repository_url,
            provider=w.provider, active=w.active,
            created_at=w.created_at, last_triggered_at=w.last_triggered_at,
        )
        for w in repo.list_all()
    ]


@router.post("/api/admin/webhooks", response_model=WebhookCreated, dependencies=[_require_admin])
def create_webhook(body: CreateWebhookRequest) -> WebhookCreated:
    """Register a new webhook and return the HMAC secret (shown only once)."""
    from app.dependencies import get_metadata_adapter
    metadata = get_metadata_adapter()
    if not metadata.get_repository(body.repository_id):
        raise HTTPException(status_code=404, detail="Repository not found")

    repo = _get_webhook_repo()
    w = repo.create(
        repository_id=body.repository_id,
        repository_url=body.repository_url,
        provider=body.provider,
    )
    logger.info("Webhook created id=%s repo=%s", w.id, w.repository_id)
    return WebhookCreated(
        id=w.id, repository_id=w.repository_id, repository_url=w.repository_url,
        provider=w.provider, active=w.active,
        created_at=w.created_at, last_triggered_at=w.last_triggered_at,
        secret=w.secret,
    )


@router.delete("/api/admin/webhooks/{webhook_id}", dependencies=[_require_admin])
def delete_webhook(webhook_id: str) -> dict:
    """Delete a webhook by ID."""
    repo = _get_webhook_repo()
    deleted = repo.delete(webhook_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Webhook not found")
    logger.info("Webhook deleted id=%s", webhook_id)
    return {"deleted": True, "id": webhook_id}


# ── GitHub push event receiver ────────────────────────────────────────────────

@router.post("/api/webhooks/github/{webhook_id}", include_in_schema=True)
async def receive_github_webhook(
    webhook_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict:
    """Receive a GitHub push webhook, verify HMAC SHA-256, and trigger re-indexation."""
    webhook_repo = _get_webhook_repo()
    webhook = webhook_repo.get(webhook_id)
    if not webhook or not webhook.active:
        raise HTTPException(status_code=404, detail="Webhook not found or inactive")

    # Verify HMAC SHA-256 signature
    raw_body = await request.body()
    sig_header = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_github_signature(raw_body, webhook.secret, sig_header):
        logger.warning("Webhook %s: invalid HMAC signature", webhook_id)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Parse event type
    event = request.headers.get("X-GitHub-Event", "push")
    if event not in ("push", "ping"):
        return {"status": "ignored", "event": event}

    if event == "ping":
        webhook_repo.touch(webhook_id)
        return {"status": "ok", "event": "ping"}

    try:
        payload = json.loads(raw_body)
        ref = payload.get("ref", "")
        pusher = payload.get("pusher", {}).get("name", "")
        logger.info("Webhook %s: push event ref=%s pusher=%s", webhook_id, ref, pusher)
    except Exception:
        payload = {}

    # Trigger background re-indexation
    background_tasks.add_task(
        _trigger_reindex,
        repository_id=webhook.repository_id,
        repository_url=webhook.repository_url,
        webhook_id=webhook_id,
    )
    webhook_repo.touch(webhook_id)
    return {"status": "accepted", "repository_id": webhook.repository_id}


def _verify_github_signature(body: bytes, secret: str, signature_header: str) -> bool:
    """Timing-safe HMAC SHA-256 verification."""
    if not signature_header.startswith("sha256="):
        return False
    mac = hmac.new(secret.encode("utf-8"), body, hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature_header)


def _trigger_reindex(repository_id: str, repository_url: str, webhook_id: str) -> None:
    """Background task: re-run the indexing pipeline for a webhook-triggered push."""
    try:
        from app.dependencies import get_repo_service
        svc = get_repo_service()
        svc.run_index(repository_id=repository_id, repository_url=repository_url)
        logger.info("Webhook %s: re-indexation of %s completed", webhook_id, repository_id)
    except Exception as exc:
        logger.error("Webhook %s: re-indexation failed for %s: %s", webhook_id, repository_id, exc)
