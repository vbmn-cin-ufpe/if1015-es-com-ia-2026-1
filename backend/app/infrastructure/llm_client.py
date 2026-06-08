"""LLM client for generating answers using multiple LLM providers."""

import logging
from typing import Any

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

try:
    from abacusai import ApiClient as AbacusApiClient
except ImportError:
    AbacusApiClient = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None


SYSTEM_PROMPT = """Você é um assistente especializado em onboarding de desenvolvedores em codebases.
Sua função é ajudar novos desenvolvedores a entender código existente, explicando:
- O que o código faz e por que foi implementado dessa forma
- Como diferentes partes se relacionam
- Conceitos e padrões utilizados

Baseie suas respostas SOMENTE no contexto fornecido. Se o contexto não for suficiente,
diga isso claramente. Use linguagem clara e exemplos quando relevante."""


class LlmClient:
    """Unified LLM client. Supports Abacus AI (native SDK), OpenAI, and Anthropic."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None
        self._provider = settings.llm_provider.lower()

        if not settings.llm_api_key:
            logger.warning("LLM_API_KEY not configured, using fallback stub")
            return

        if self._provider == "abacus":
            self._init_abacus()
        elif self._provider == "anthropic":
            self._init_anthropic()
        elif self._provider == "openai":
            self._init_openai()
        else:
            logger.warning("Unknown LLM provider '%s', using fallback", self._provider)

    # ── Initializers ────────────────────────────────────────────────────────

    def _init_abacus(self) -> None:
        if AbacusApiClient is None:
            logger.warning("abacusai package not installed")
            return
        try:
            self._client = AbacusApiClient(self._settings.llm_api_key)
            logger.info("Initialized Abacus AI client (model=%s)", self._settings.llm_model)
        except Exception as exc:
            logger.warning("Failed to initialize Abacus AI client: %s", exc)

    def _init_anthropic(self) -> None:
        if Anthropic is None:
            logger.warning("anthropic package not installed")
            return
        try:
            self._client = Anthropic(api_key=self._settings.llm_api_key)
            logger.info("Initialized Anthropic client (model=%s)", self._settings.llm_model)
        except Exception as exc:
            logger.warning("Failed to initialize Anthropic client: %s", exc)

    def _init_openai(self) -> None:
        if OpenAI is None:
            logger.warning("openai package not installed")
            return
        try:
            kwargs: dict[str, Any] = {"api_key": self._settings.llm_api_key}
            if self._settings.llm_api_base_url:
                kwargs["base_url"] = self._settings.llm_api_base_url
            self._client = OpenAI(**kwargs)
            logger.info("Initialized OpenAI client (model=%s)", self._settings.llm_model)
        except Exception as exc:
            logger.warning("Failed to initialize OpenAI client: %s", exc)

    # ── Public API ───────────────────────────────────────────────────────────

    def generate_answer(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        if not context_chunks:
            return "Não encontrei contexto suficiente para responder. Tente reformular sua pergunta."

        if self._client is None:
            return self._generate_fallback(question, context_chunks)

        if self._provider == "abacus":
            return self._generate_with_abacus(question, context_chunks)
        elif self._provider == "anthropic":
            return self._generate_with_anthropic(question, context_chunks)
        elif self._provider == "openai":
            return self._generate_with_openai(question, context_chunks)
        return self._generate_fallback(question, context_chunks)

    # ── Provider implementations ─────────────────────────────────────────────

    def _build_context(self, chunks: list[dict[str, Any]], max_chunks: int = 5) -> str:
        parts = []
        for i, chunk in enumerate(chunks[:max_chunks], 1):
            meta = chunk.get("metadata", {})
            file_path = meta.get("file_path", "unknown")
            start_line = meta.get("start_line", 0)
            text = chunk.get("text", "")
            parts.append(f"[Fonte {i}] {file_path} (linha {start_line}):\n```\n{text}\n```")
        return "\n\n".join(parts)

    def _build_user_prompt(self, question: str, context: str) -> str:
        return (
            f"Com base no código recuperado da codebase, responda:\n\n"
            f"{question}\n\n"
            f"Contexto da codebase:\n{context}\n\n"
            f"Forneça uma resposta clara e objetiva."
        )

    def _generate_with_abacus(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        try:
            response = self._client.evaluate_prompt(
                system_message=SYSTEM_PROMPT,
                prompt=prompt,
                llm_name=self._settings.llm_model,
            )
            answer = response.content
            logger.info("Abacus AI response: %d tokens (model=%s)", response.total_tokens, response.llm_name)
            return answer.strip() if answer else "Desculpe, não consegui gerar uma resposta."
        except Exception as exc:
            logger.error("Error calling Abacus AI: %s", exc)
            return f"Erro ao gerar resposta: {exc}\n\n{self._generate_fallback(question, context_chunks)}"

    def _generate_with_anthropic(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        try:
            response = self._client.messages.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            answer = "".join(b.text for b in response.content if hasattr(b, "text"))
            return answer.strip() if answer else "Desculpe, não consegui gerar uma resposta."
        except Exception as exc:
            logger.error("Error calling Anthropic API: %s", exc)
            return f"Erro ao gerar resposta: {exc}\n\n{self._generate_fallback(question, context_chunks)}"

    def _generate_with_openai(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        try:
            response = self._client.chat.completions.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            answer = response.choices[0].message.content
            return answer.strip() if answer else "Desculpe, não consegui gerar uma resposta."
        except Exception as exc:
            logger.error("Error calling OpenAI API: %s", exc)
            return f"Erro ao gerar resposta: {exc}\n\n{self._generate_fallback(question, context_chunks)}"

    def _generate_fallback(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        best = context_chunks[0]
        meta = best.get("metadata", {})
        file_path = meta.get("file_path", "unknown")
        start_line = meta.get("start_line", 0)
        preview = best["text"][:600]
        return (
            f"[MODO FALLBACK - Configure LLM_API_KEY para respostas reais]\n\n"
            f"Pergunta: {question}\n\n"
            f"Contexto mais relevante:\nArquivo: {file_path} (linha {start_line})\n\n"
            f"```\n{preview}\n```\n\n"
            f"{len(context_chunks)} fonte(s) recuperada(s) da codebase."
        )