"""Branch analysis service — diffs a feature branch against a base and summarises changes via LLM."""

import logging
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from app.ports import LLMPort

logger = logging.getLogger(__name__)


@dataclass
class BranchDiff:
    """Raw diff data extracted from git."""
    branch: str
    base: str
    changed_files: list[str] = field(default_factory=list)
    added_lines: int = 0
    removed_lines: int = 0
    touched_modules: list[str] = field(default_factory=list)  # top-level dirs
    diff_stat: str = ""   # human-readable `git diff --stat` output


@dataclass
class BranchAnalysisResult:
    """Full branch analysis with diff metadata and LLM summary."""
    branch: str
    base: str
    changed_files: list[str]
    added_lines: int
    removed_lines: int
    touched_modules: list[str]
    diff_stat: str
    risk_score: float        # 0–100 heuristic (size of diff × file count)
    llm_summary: str
    llm_risk_notes: str


class BranchAnalysisService:
    """Analyses a git branch by diffing it against a base branch."""

    def __init__(self, llm_port: LLMPort) -> None:
        self._llm = llm_port

    def analyse(
        self,
        repo_root: Path,
        branch: str,
        base: str = "main",
    ) -> BranchAnalysisResult:
        diff = self._extract_diff(repo_root, branch, base)
        risk_score = self._compute_risk_score(diff)
        summary, risk_notes = self._summarise_with_llm(diff)

        return BranchAnalysisResult(
            branch=diff.branch,
            base=diff.base,
            changed_files=diff.changed_files,
            added_lines=diff.added_lines,
            removed_lines=diff.removed_lines,
            touched_modules=diff.touched_modules,
            diff_stat=diff.diff_stat,
            risk_score=risk_score,
            llm_summary=summary,
            llm_risk_notes=risk_notes,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _run_git(self, args: list[str], cwd: Path) -> str:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
        return result.stdout if result.returncode == 0 else ""

    def _extract_diff(self, repo_root: Path, branch: str, base: str) -> BranchDiff:
        # Changed file names
        name_only = self._run_git(
            ["diff", f"{base}...{branch}", "--name-only"],
            repo_root,
        )
        changed_files = [f for f in name_only.strip().splitlines() if f]

        # --stat output
        stat = self._run_git(
            ["diff", f"{base}...{branch}", "--stat"],
            repo_root,
        )

        # Added / removed line counts from --numstat
        numstat = self._run_git(
            ["diff", f"{base}...{branch}", "--numstat"],
            repo_root,
        )
        added = removed = 0
        for line in numstat.strip().splitlines():
            parts = line.split("\t")
            if len(parts) >= 2:
                try:
                    added += int(parts[0]) if parts[0] != "-" else 0
                    removed += int(parts[1]) if parts[1] != "-" else 0
                except ValueError:
                    pass

        # Top-level directory = module
        modules: list[str] = sorted(
            {f.split("/")[0] for f in changed_files if "/" in f} |
            {f for f in changed_files if "/" not in f}
        )

        return BranchDiff(
            branch=branch,
            base=base,
            changed_files=changed_files,
            added_lines=added,
            removed_lines=removed,
            touched_modules=modules,
            diff_stat=stat[:2000],  # cap for prompt size
        )

    def _compute_risk_score(self, diff: BranchDiff) -> float:
        """Heuristic risk: large diffs touching many files are riskier."""
        file_factor = min(len(diff.changed_files) / 20, 1.0)  # cap at 20 files → 100%
        line_factor = min((diff.added_lines + diff.removed_lines) / 500, 1.0)  # cap at 500 lines
        return round((file_factor * 0.4 + line_factor * 0.6) * 100, 1)

    def _summarise_with_llm(self, diff: BranchDiff) -> tuple[str, str]:
        """Ask the LLM for a human summary and risk notes."""
        if not diff.changed_files:
            return ("Nenhuma alteração detectada nesta branch.", "Sem riscos identificados.")

        # Build a pseudo-chunk so we can reuse LLMPort.generate_answer
        file_list = "\n".join(f"- {f}" for f in diff.changed_files[:40])
        context_chunk = {
            "chunk_id": "branch-diff",
            "text": (
                f"Branch: {diff.branch}  →  base: {diff.base}\n"
                f"Arquivos alterados ({len(diff.changed_files)}):\n{file_list}\n\n"
                f"Estatísticas:\n{diff.diff_stat}\n"
                f"+{diff.added_lines} linhas adicionadas, -{diff.removed_lines} removidas"
            ),
            "metadata": {"file_path": "git-diff", "start_line": 0, "end_line": 0},
            "score": 1.0,
        }

        summary = self._llm.generate_answer(
            question=(
                "Resuma o que esta branch faz com base nos arquivos alterados e nas estatísticas do diff. "
                "Liste os módulos tocados, o tipo de mudança (feature, bugfix, refactor, etc.) "
                "e o impacto esperado no sistema. Seja objetivo, máximo 3 parágrafos."
            ),
            context_chunks=[context_chunk],
        )

        risk_notes = self._llm.generate_answer(
            question=(
                "Com base nos arquivos alterados desta branch, quais são os principais riscos para a estabilidade "
                "do sistema? Considere: cobertura de testes, módulos críticos tocados, volume de mudanças. "
                "Responda em bullet points, máximo 5 itens."
            ),
            context_chunks=[context_chunk],
        )

        return summary, risk_notes
