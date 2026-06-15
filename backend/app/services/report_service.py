"""Report service — generates an HTML summary report for a repository."""

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório CodeCompass — {repo_name}</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; }}
  body {{ font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
         margin: 0; padding: 24px; }}
  h1, h2, h3 {{ margin: 0 0 8px; }}
  h1 {{ color: #7c3aed; font-size: 1.8rem; }}
  h2 {{ color: #a78bfa; font-size: 1.1rem; border-bottom: 1px solid #334155;
        padding-bottom: 4px; margin-top: 24px; }}
  .meta {{ color: #94a3b8; font-size: 0.85rem; margin-bottom: 24px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
           gap: 12px; margin-bottom: 16px; }}
  .card {{ background: #1e293b; border-radius: 8px; padding: 16px; }}
  .card-value {{ font-size: 2rem; font-weight: 700; color: #7c3aed; }}
  .card-label {{ font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 8px; }}
  th {{ text-align: left; color: #94a3b8; font-weight: 600; padding: 6px 10px;
        border-bottom: 1px solid #334155; }}
  td {{ padding: 6px 10px; border-bottom: 1px solid #1e293b; }}
  tr:hover td {{ background: #1e293b; }}
  .badge {{ display: inline-block; border-radius: 4px; padding: 2px 6px;
            font-size: 0.75rem; font-weight: 600; }}
  .badge-critical {{ background: #7f1d1d; color: #fca5a5; }}
  .badge-high     {{ background: #78350f; color: #fcd34d; }}
  .badge-med      {{ background: #1c1917; color: #a8a29e; }}
  .badge-low      {{ background: #052e16; color: #86efac; }}
  .status-completed {{ color: #4ade80; }}
  .status-failed    {{ color: #f87171; }}
  footer {{ margin-top: 32px; color: #475569; font-size: 0.78rem; text-align: center; }}
</style>
</head>
<body>
<h1>&#128218; Relatório CodeCompass</h1>
<div class="meta">
  Repositório: <strong>{repo_url}</strong> &nbsp;|&nbsp;
  Status: <span class="status-{status}">{status}</span> &nbsp;|&nbsp;
  Gerado em: {generated_at}
</div>

<h2>&#128200; Estatísticas Gerais</h2>
<div class="grid">
  <div class="card">
    <div class="card-value">{source_files}</div>
    <div class="card-label">Arquivos-fonte</div>
  </div>
  <div class="card">
    <div class="card-value">{chunks}</div>
    <div class="card-label">Chunks indexados</div>
  </div>
  <div class="card">
    <div class="card-value">{vectors}</div>
    <div class="card-label">Vectores</div>
  </div>
  <div class="card">
    <div class="card-value">{elapsed}s</div>
    <div class="card-label">Tempo de indexação</div>
  </div>
  <div class="card">
    <div class="card-value">{size_kb} KB</div>
    <div class="card-label">Tamanho total</div>
  </div>
</div>

{languages_section}

{hotspots_section}

<footer>CodeCompass &copy; {year} &mdash; Gerado automaticamente</footer>
</body>
</html>
"""

_LANG_SECTION = """\
<h2>&#128196; Linguagens Detectadas</h2>
<table>
<thead><tr><th>Linguagem</th><th>Arquivos</th></tr></thead>
<tbody>
{lang_rows}
</tbody>
</table>
"""

_HOTSPOT_SECTION = """\
<h2>&#128293; Top Hotspots (Dívida Técnica)</h2>
<table>
<thead><tr><th>Arquivo</th><th>Score</th><th>Churn</th><th>LOC</th><th>Risco</th></tr></thead>
<tbody>
{hotspot_rows}
</tbody>
</table>
"""


def _risk_badge(score: float) -> str:
    if score >= 75:
        return '<span class="badge badge-critical">Crítico</span>'
    if score >= 50:
        return '<span class="badge badge-high">Alto</span>'
    if score >= 25:
        return '<span class="badge badge-med">Médio</span>'
    return '<span class="badge badge-low">Baixo</span>'


class ReportService:
    """Generates an HTML report aggregating repository stats and hotspots."""

    def generate(
        self,
        repository_id: str,
        stats: dict[str, Any],
        status: str,
        repository_url: str,
        hotspots: list[dict[str, Any]] | None = None,
    ) -> str:
        """Render and return the HTML report as a string."""
        repo_name = repository_url.rstrip("/").split("/")[-1] if "/" in repository_url else repository_id
        now = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

        # Languages section
        lang_counts: dict[str, int] = stats.get("languages", {})
        if lang_counts:
            lang_rows = "\n".join(
                f"<tr><td>{lang}</td><td>{count}</td></tr>"
                for lang, count in sorted(lang_counts.items(), key=lambda x: -x[1])
            )
            languages_section = _LANG_SECTION.format(lang_rows=lang_rows)
        else:
            languages_section = ""

        # Hotspots section
        if hotspots:
            rows = []
            for h in hotspots[:25]:
                rel_path = h.get("relative_path", h.get("file_path", ""))
                score = round(h.get("hotspot_score", 0), 1)
                churn = h.get("churn", 0)
                loc = h.get("loc", 0)
                rows.append(
                    f"<tr><td>{rel_path}</td><td>{score}</td><td>{churn}</td>"
                    f"<td>{loc}</td><td>{_risk_badge(score)}</td></tr>"
                )
            hotspots_section = _HOTSPOT_SECTION.format(hotspot_rows="\n".join(rows))
        else:
            hotspots_section = ""

        html = _HTML_TEMPLATE.format(
            repo_name=repo_name,
            repo_url=repository_url,
            status=status,
            generated_at=now,
            source_files=stats.get("source_files", "—"),
            chunks=stats.get("chunks", "—"),
            vectors=stats.get("vectors", "—"),
            elapsed=stats.get("elapsed_seconds", "—"),
            size_kb=stats.get("total_size_kb", "—"),
            languages_section=languages_section,
            hotspots_section=hotspots_section,
            year=datetime.now(timezone.utc).year,
        )
        return html
