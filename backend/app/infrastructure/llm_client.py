"""LLM client for generating answers using multiple LLM providers."""

import logging
from typing import Any, Callable

from app.infrastructure.settings import Settings

# Signature: (tokens_in, tokens_out) → None
UsageCallback = Callable[[int, int], None]

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


SYSTEM_PROMPT = """\
Você é um assistente sênior especializado em engenharia de software e onboarding de desenvolvedores.
Seu objetivo é fornecer respostas DETALHADAS, ESTRUTURADAS e DIDÁTICAS sobre codebases.

Para cada pergunta você DEVE:
1. Explicar o que o código faz com clareza (visão geral primeiro)
2. Detalhar como cada parte funciona, incluindo fluxo de dados e responsabilidades
3. Identificar padrões de design ou arquitetura utilizados (ex: Hexagonal, Repository, MVC, etc.)
4. Apontar dependências e integrações relevantes entre módulos
5. Incluir exemplos concretos de uso ou chamadas de API quando visível no contexto
6. Destacar pontos de atenção, edge cases ou decisões de design que merecem destaque
7. Sugerir o próximo passo ou o que explorar depois para entender melhor

Formatação obrigatória:
- Use títulos Markdown (##, ###) para organizar seções
- Use listas com `-` para enumerar itens
- Use blocos de código (```) com a linguagem correta para exemplos de código
- Use **negrito** para termos técnicos importantes na primeira ocorrência
- Use `código inline` para nomes de arquivos, funções e variáveis
- Inclua uma seção **📌 Resumo** ao final com os pontos-chave

Regras:
- Baseie as respostas EXCLUSIVAMENTE no contexto fornecido; se insuficiente, diga explicitamente o que falta
- Escreva em Português do Brasil
- Seja específico: cite nomes de arquivos, funções e linhas quando presentes no contexto
- Não invente código que não aparece no contexto — apenas interprete o que foi fornecido
- Respostas devem ter profundidade técnica adequada a um desenvolvedor pleno
"""


class LlmClient:
    """Unified LLM client. Supports Abacus AI (native SDK), OpenAI, and Anthropic."""

    def __init__(self, settings: Settings, usage_callback: UsageCallback | None = None) -> None:
        self._settings = settings
        self._client = None
        self._provider = settings.llm_provider.lower()
        self._usage_callback = usage_callback  # called with (tokens_in, tokens_out) after each call

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

    def _build_context(self, chunks: list[dict[str, Any]], max_chunks: int = 8) -> str:
        parts = []
        for i, chunk in enumerate(chunks[:max_chunks], 1):
            meta = chunk.get("metadata", {})
            file_path = meta.get("file_path", "unknown")
            start_line = meta.get("start_line", 0)
            end_line = meta.get("end_line", "?")
            score = chunk.get("score", 0)
            text = chunk.get("text", "")
            lang = file_path.rsplit(".", 1)[-1] if "." in file_path else "text"
            parts.append(
                f"[Fonte {i} | relevância {score:.2f}] {file_path} (linhas {start_line}–{end_line}):\n"
                f"```{lang}\n{text}\n```"
            )
        return "\n\n".join(parts)

    def _build_user_prompt(self, question: str, context: str) -> str:
        return (
            f"## Pergunta do desenvolvedor\n\n"
            f"{question}\n\n"
            f"---\n\n"
            f"## Contexto recuperado da codebase\n\n"
            f"{context}\n\n"
            f"---\n\n"
            f"## Instruções para a resposta\n\n"
            f"Responda de forma COMPLETA e DETALHADA seguindo as instruções do sistema.\n"
            f"Organize a resposta com seções claras usando títulos Markdown.\n"
            f"Cite os arquivos/funções específicos do contexto acima quando relevante.\n"
            f"Finalize com uma seção **📌 Resumo** com os 3-5 pontos mais importantes."
        )

    def _fire_usage(self, tokens_in: int, tokens_out: int) -> None:
        if self._usage_callback is not None:
            try:
                self._usage_callback(tokens_in, tokens_out)
            except Exception as exc:
                logger.debug("Usage callback failed: %s", exc)

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """Rough token estimate when the API doesn't return exact counts."""
        return max(1, len(text.split()) * 4 // 3)

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
            total = getattr(response, "total_tokens", 0)
            # Abacus returns total; split ~75% in / 25% out as approximation
            t_in = int(total * 0.75)
            t_out = total - t_in
            self._fire_usage(t_in, t_out)
            logger.info("Abacus AI response: %d tokens (model=%s)", total, response.llm_name)
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
            usage = getattr(response, "usage", None)
            if usage:
                self._fire_usage(
                    getattr(usage, "input_tokens", 0),
                    getattr(usage, "output_tokens", 0),
                )
            else:
                self._fire_usage(self._estimate_tokens(prompt), self._estimate_tokens(answer or ""))
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
            usage = getattr(response, "usage", None)
            if usage:
                self._fire_usage(
                    getattr(usage, "prompt_tokens", 0),
                    getattr(usage, "completion_tokens", 0),
                )
            else:
                self._fire_usage(self._estimate_tokens(prompt), self._estimate_tokens(answer or ""))
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