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
Você é um assistente de engenharia de software especializado em onboarding de desenvolvedores.
Responda em Português do Brasil de forma clara, objetiva e bem estruturada.

Diretrizes:
- Use o contexto fornecido para embasar a resposta; se insuficiente, diga o que falta
- Use Markdown (##, ###, listas, código) para organizar a resposta
- Cite arquivos e funções específicos quando presentes no contexto
- Seja direto: visão geral primeiro, depois detalhes relevantes
- Não invente código ou comportamentos que não aparecem no contexto
"""

# Locale → system prompt language instruction mapping
_LOCALE_LANGUAGE_MAP: dict[str, str] = {
    "pt-BR": "Português do Brasil",
    "en-US": "English",
    "es-MX": "Spanish (Mexican Spanish / Español de México)",
}

_SYSTEM_PROMPT_TEMPLATE = """\
You are a software engineering assistant specialized in developer onboarding.
You MUST respond in {language} — this is mandatory.

Guidelines:
- Base your answer on the provided context; if insufficient, state what is missing
- Use Markdown (##, ###, lists, code blocks) to organize your response
- Reference specific files and functions when present in the context
- Be concise: overview first, then relevant details
- Do not invent code or behaviors not present in the context
"""


def _build_system_prompt(locale: str = "pt-BR") -> str:
    """Return a locale-aware system prompt for the LLM."""
    language = _LOCALE_LANGUAGE_MAP.get(locale, "Portuguese (Brazilian Portuguese)")
    return _SYSTEM_PROMPT_TEMPLATE.format(language=language)


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

    def generate_answer(self, question: str, context_chunks: list[dict[str, Any]], locale: str = "pt-BR") -> str:
        if not context_chunks:
            _no_context = {
                "pt-BR": "Não encontrei contexto suficiente para responder. Tente reformular sua pergunta.",
                "en-US": "I couldn't find enough context to answer. Please try rephrasing your question.",
                "es-MX": "No encontré suficiente contexto para responder. Por favor reformula tu pregunta.",
            }
            return _no_context.get(locale, _no_context["pt-BR"])

        if self._client is None:
            return self._generate_fallback(question, context_chunks)

        if self._provider == "abacus":
            return self._generate_with_abacus(question, context_chunks, locale)
        elif self._provider == "anthropic":
            return self._generate_with_anthropic(question, context_chunks, locale)
        elif self._provider == "openai":
            return self._generate_with_openai(question, context_chunks, locale)
        return self._generate_fallback(question, context_chunks)

    def generate_raw(self, prompt: str, system_prompt: str) -> str:
        """Generate a response using fully custom prompt and system prompt."""
        if self._client is None:
            return "[LLM não configurado — defina LLM_API_KEY para análise baseada em código]"
        try:
            if self._provider == "abacus":
                response = self._client.evaluate_prompt(
                    system_message=system_prompt,
                    prompt=prompt,
                    llm_name=self._settings.llm_model,
                )
                answer = response.content
                total = getattr(response, "total_tokens", 0)
                self._fire_usage(int(total * 0.75), total - int(total * 0.75))
                return answer.strip() if answer else ""
            elif self._provider == "anthropic":
                response = self._client.messages.create(
                    model=self._settings.llm_model,
                    max_tokens=600,
                    temperature=0.3,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                answer = "".join(b.text for b in response.content if hasattr(b, "text"))
                usage = getattr(response, "usage", None)
                if usage:
                    self._fire_usage(getattr(usage, "input_tokens", 0), getattr(usage, "output_tokens", 0))
                return answer.strip() if answer else ""
            elif self._provider == "openai":
                response = self._client.chat.completions.create(
                    model=self._settings.llm_model,
                    max_tokens=600,
                    temperature=0.3,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                )
                answer = response.choices[0].message.content
                usage = getattr(response, "usage", None)
                if usage:
                    self._fire_usage(getattr(usage, "prompt_tokens", 0), getattr(usage, "completion_tokens", 0))
                return answer.strip() if answer else ""
        except Exception as exc:
            logger.error("Error in generate_raw (%s): %s", self._provider, exc)
        return ""

    # ── Provider implementations ─────────────────────────────────────────────

    def _build_context(self, chunks: list[dict[str, Any]], max_chunks: int = 5) -> str:
        parts = []
        for i, chunk in enumerate(chunks[:max_chunks], 1):
            meta = chunk.get("metadata", {})
            file_path = meta.get("file_path", "unknown")
            start_line = meta.get("start_line", 0)
            end_line = meta.get("end_line", "?")
            text = chunk.get("text", "")[:500]  # cap each chunk at 500 chars
            lang = file_path.rsplit(".", 1)[-1] if "." in file_path else "text"
            parts.append(
                f"[{i}] {file_path} (L{start_line}–{end_line}):\n"
                f"```{lang}\n{text}\n```"
            )
        return "\n\n".join(parts)

    def _build_user_prompt(self, question: str, context: str) -> str:
        return (
            f"Question: {question}\n\n"
            f"Codebase context:\n{context}"
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

    def _generate_with_abacus(self, question: str, context_chunks: list[dict[str, Any]], locale: str = "pt-BR") -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        system = _build_system_prompt(locale)
        try:
            response = self._client.evaluate_prompt(
                system_message=system,
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
            return answer.strip() if answer else "Sorry, I couldn't generate a response."
        except Exception as exc:
            logger.error("Error calling Abacus AI: %s", exc)
            return self._generate_fallback(question, context_chunks)

    def _generate_with_anthropic(self, question: str, context_chunks: list[dict[str, Any]], locale: str = "pt-BR") -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        system = _build_system_prompt(locale)
        try:
            response = self._client.messages.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                system=system,
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
            return answer.strip() if answer else "Sorry, I couldn't generate a response."
        except Exception as exc:
            logger.error("Error calling Anthropic API: %s", exc)
            return self._generate_fallback(question, context_chunks)

    def _generate_with_openai(self, question: str, context_chunks: list[dict[str, Any]], locale: str = "pt-BR") -> str:
        context = self._build_context(context_chunks)
        prompt = self._build_user_prompt(question, context)
        system = _build_system_prompt(locale)
        try:
            response = self._client.chat.completions.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                messages=[
                    {"role": "system", "content": system},
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
            return answer.strip() if answer else "Sorry, I couldn't generate a response."
        except Exception as exc:
            logger.error("Error calling OpenAI API: %s", exc)
            return self._generate_fallback(question, context_chunks)

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