"""Notification service — detects module changes and emails watchlist subscribers."""

import json
import logging
from typing import Any

from app.infrastructure.email_gateway import EmailGateway, EmailMessage, _base_template
from app.infrastructure.watchlist_repository import WatchlistRepository

logger = logging.getLogger(__name__)


def _module_change_html(
    repository_url: str,
    changed_modules: list[str],
    app_base_url: str,
) -> str:
    repo_name = repository_url.rstrip("/").split("/")[-1] if "/" in repository_url else repository_url
    modules_html = "".join(
        f'<div style="font-family:monospace;font-size:13px;color:#7c3aed;'
        f'background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;'
        f'padding:6px 12px;margin:4px 0;">{m}</div>'
        for m in changed_modules[:20]
    )
    content = f"""
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
      Módulos alterados detectados
    </h1>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
      O repositório <strong style="color:#4f46e5;">{repo_name}</strong> foi re-indexado
      e os módulos que você está monitorando foram modificados:
    </p>
    <div style="margin-bottom:20px;">{modules_html}</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;">
      <tr>
        <td align="center">
          <a href="{app_base_url}/graph"
             style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                    color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;
                    padding:12px 28px;border-radius:8px;">
            Ver no CodeCompass
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:#9ca3af;">
      Para parar de receber estas notificações, acesse <a href="{app_base_url}/watchlist" style="color:#6366f1;">Minhas Notificações</a> e remova o módulo da sua lista.
    </p>
    """
    return _base_template(content, preview_text=f"{len(changed_modules)} módulo(s) alterado(s) em {repo_name}")


class NotificationService:
    """Compares old and new graph snapshots, emails subscribers of changed modules."""

    def __init__(
        self,
        watchlist_repo: WatchlistRepository,
        email_gateway: EmailGateway,
        app_base_url: str = "http://localhost:5173",
    ) -> None:
        self._watchlist = watchlist_repo
        self._email = email_gateway
        self._base_url = app_base_url

    def notify_on_reindex(
        self,
        repository_id: str,
        repository_url: str,
        old_graph: dict[str, Any] | None,
        new_graph: dict[str, Any],
    ) -> int:
        """Detect changed modules and notify subscribers. Returns notification count."""
        if old_graph is None:
            return 0

        changed_paths = self._detect_changed_modules(old_graph, new_graph)
        if not changed_paths:
            return 0

        # Find unique watchers for these modules
        notified: set[str] = set()
        count = 0

        for module_path in changed_paths:
            watchers = self._watchlist.list_for_repo(repository_id, module_path)
            for watcher in watchers:
                if watcher.user_email in notified:
                    continue
                notified.add(watcher.user_email)
                # Collect all changed modules this user cares about
                user_modules = [
                    m for m in changed_paths
                    if any(
                        w.module_path == m or w.module_path == ""
                        for w in self._watchlist.list_for_repo(repository_id, m)
                        if w.user_id == watcher.user_id
                    )
                ]
                self._send_notification(
                    to=watcher.user_email,
                    repository_url=repository_url,
                    changed_modules=user_modules or [module_path],
                )
                count += 1

        logger.info(
            "[notifications] repo=%s changed_modules=%d notified=%d",
            repository_id, len(changed_paths), count,
        )
        return count

    def _detect_changed_modules(
        self,
        old_graph: dict[str, Any],
        new_graph: dict[str, Any],
    ) -> list[str]:
        """Return list of module paths that changed between snapshots."""
        def node_paths(graph: dict[str, Any]) -> dict[str, str]:
            return {
                n.get("id", n.get("path", n.get("label", ""))): json.dumps(
                    {k: n.get(k) for k in ("label", "path", "language")}, sort_keys=True
                )
                for n in graph.get("nodes", [])
            }

        old_nodes = node_paths(old_graph)
        new_nodes = node_paths(new_graph)

        changed = []
        for nid, sig in new_nodes.items():
            if nid not in old_nodes or old_nodes[nid] != sig:
                changed.append(nid)
        for nid in old_nodes:
            if nid not in new_nodes:
                changed.append(nid)
        return changed

    def _send_notification(
        self,
        to: str,
        repository_url: str,
        changed_modules: list[str],
    ) -> None:
        try:
            repo_name = repository_url.rstrip("/").split("/")[-1] if "/" in repository_url else repository_url
            module_list = "\n".join(f"  - {m}" for m in changed_modules[:20])
            self._email.send(EmailMessage(
                to=to,
                subject=f"CodeCompass — {len(changed_modules)} módulo(s) alterado(s) em {repo_name}",
                html_body=_module_change_html(repository_url, changed_modules, self._base_url),
                plain_body=(
                    f"CodeCompass — Módulos alterados detectados\n"
                    f"Repositório: {repository_url}\n\n"
                    f"Os seguintes módulos que você monitora foram alterados:\n{module_list}\n\n"
                    f"Acesse {self._base_url} para ver os detalhes.\n"
                ),
            ))
        except Exception as exc:
            logger.error("Failed to send change notification to %s: %s", to, exc)
