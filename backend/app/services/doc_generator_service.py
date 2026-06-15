"""Documentation generator service — produces module README via LLM using code + commit history."""

import logging
from pathlib import Path

from app.ports import LLMPort, VectorStorePort
from app.services.commit_history_service import CommitIngestionService, CommitDecision

logger = logging.getLogger(__name__)

_MAX_CHUNK_CHARS = 8_000   # context budget for code snippets


class DocGeneratorService:
    """Generates markdown documentation for a module using its code chunks and commit history."""

    def __init__(
        self,
        vector_store: VectorStorePort,
        llm_port: LLMPort,
        embedding_port,          # EmbeddingPort — avoid circular import with annotation
    ) -> None:
        self._vector_store = vector_store
        self._llm = llm_port
        self._embedding = embedding_port

    def generate_module_doc(
        self,
        repository_id: str,
        module_path: str,
        repo_root: Path | None = None,
    ) -> str:
        """Generate a markdown README for *module_path*.

        Retrieves relevant code chunks from the vector store (semantic search on
        the module name) and combines them with recent commit messages to give
        the LLM rich context about purpose and history.
        """
        # 1. Retrieve code chunks most similar to the module name
        query_embedding = self._embedding.embed_text(f"module {module_path}")
        raw_chunks = self._vector_store.query(
            repository_id=repository_id,
            embedding=query_embedding,
            top_k=10,
        )

        # Filter to chunks whose file_path contains the module token
        module_token = module_path.replace(".", "/").replace("\\", "/").lower()
        relevant = [
            c for c in raw_chunks
            if module_token in c.get("metadata", {}).get("file_path", "").lower()
        ] or raw_chunks[:6]  # fall back to top-k if none match

        # 2. Collect recent commit messages for this module (optional, needs repo_root)
        commit_context = ""
        if repo_root and repo_root.exists():
            try:
                import subprocess
                result = subprocess.run(
                    ["git", "log", "--oneline", "-20", "--", f"*{module_token}*"],
                    cwd=repo_root,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if result.returncode == 0 and result.stdout.strip():
                    commit_context = (
                        "\n\nHistórico de commits recentes relacionados:\n"
                        + result.stdout.strip()
                    )
            except Exception as exc:
                logger.debug("Could not fetch commits for doc gen: %s", exc)

        # 3. Add commit history as a pseudo-chunk if available
        context_chunks = list(relevant)
        if commit_context:
            context_chunks.append({
                "chunk_id": "commit-history",
                "text": commit_context,
                "metadata": {"file_path": "git-log", "start_line": 0, "end_line": 0},
                "score": 0.8,
            })

        # 4. Generate documentation via LLM
        question = (
            f"Gere um README.md completo e bem estruturado para o módulo `{module_path}`. "
            "Inclua as seguintes seções: "
            "**Visão Geral** (o que o módulo faz e por que existe), "
            "**Responsabilidades** (lista das principais funções/classes), "
            "**Dependências** (o que importa e o que exporta), "
            "**Exemplos de Uso** (como chamar as APIs principais, com código), "
            "**Histórico de Mudanças** (baseado nos commits, se disponível), "
            "**Pontos de Atenção** (edge cases, limitações ou dívida técnica visível). "
            "Escreva em Português do Brasil. Use Markdown completo com títulos, listas e blocos de código."
        )

        return self._llm.generate_answer(
            question=question,
            context_chunks=context_chunks,
        )
