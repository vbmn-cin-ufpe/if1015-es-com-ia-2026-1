"""LLM client for generating answers using multiple LLM providers."""

import logging
from typing import Any

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

# Try importing various LLM clients
try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


class LlmClient:
    """Client for interacting with multiple LLM providers.
    
    Supports:
    - Abacus AI (OpenAI-compatible API)
    - Anthropic Claude (direct)
    - OpenAI (direct)
    - Any OpenAI-compatible endpoint
    
    Falls back to simple context preview for development/testing.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None
        self._provider = settings.llm_provider.lower()
        
        if not settings.llm_api_key:
            logger.warning(f"LLM_API_KEY not configured, using fallback stub")
            return
        
        # Initialize based on provider
        if self._provider == "abacus":
            self._init_abacus()
        elif self._provider == "anthropic":
            self._init_anthropic()
        elif self._provider == "openai":
            self._init_openai()
        else:
            logger.warning(f"Unknown provider '{self._provider}', using fallback")

    def _init_abacus(self) -> None:
        """Initialize Abacus AI client (OpenAI-compatible)."""
        if OpenAI is None:
            logger.warning("openai package not installed, cannot use Abacus AI")
            return
        
        try:
            # Abacus AI uses OpenAI-compatible API
            base_url = self._settings.llm_api_base_url or "https://api.abacus.ai/v1"
            self._client = OpenAI(
                api_key=self._settings.llm_api_key,
                base_url=base_url,
            )
            logger.info(f"Initialized Abacus AI client with model: {self._settings.llm_model}")
        except Exception as e:
            logger.warning(f"Failed to initialize Abacus AI client: {e}")
            self._client = None

    def _init_anthropic(self) -> None:
        """Initialize Anthropic Claude client (direct)."""
        if Anthropic is None:
            logger.warning("anthropic package not installed, cannot use Anthropic")
            return
        
        try:
            self._client = Anthropic(api_key=self._settings.llm_api_key)
            logger.info(f"Initialized Anthropic client with model: {self._settings.llm_model}")
        except Exception as e:
            logger.warning(f"Failed to initialize Anthropic client: {e}")
            self._client = None

    def _init_openai(self) -> None:
        """Initialize OpenAI client (direct or custom base URL)."""
        if OpenAI is None:
            logger.warning("openai package not installed, cannot use OpenAI")
            return
        
        try:
            kwargs = {"api_key": self._settings.llm_api_key}
            if self._settings.llm_api_base_url:
                kwargs["base_url"] = self._settings.llm_api_base_url
            
            self._client = OpenAI(**kwargs)
            logger.info(f"Initialized OpenAI client with model: {self._settings.llm_model}")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client: {e}")
            self._client = None

    def generate_answer(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        """Generate answer based on question and retrieved context."""
        if not context_chunks:
            return "Não encontrei contexto suficiente para responder. Tente reformular sua pergunta."
        
        if self._client is None:
            return self._generate_fallback(question, context_chunks)
        
        # Route to appropriate generator based on provider
        if self._provider == "anthropic":
            return self._generate_with_anthropic(question, context_chunks)
        elif self._provider in ["abacus", "openai"]:
            return self._generate_with_openai_compatible(question, context_chunks)
        else:
            return self._generate_fallback(question, context_chunks)

    def _generate_with_anthropic(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        """Generate answer using Anthropic Claude API (Messages API)."""
        # Build context from retrieved chunks
        context_parts = []
        for i, chunk in enumerate(context_chunks[:5], 1):
            file_path = chunk.get("metadata", {}).get("file_path", "unknown")
            start_line = chunk.get("metadata", {}).get("start_line", 0)
            text = chunk.get("text", "")
            context_parts.append(
                f"[Fonte {i}] {file_path} (linha {start_line}):\n```\n{text}\n```"
            )
        
        context_text = "\n\n".join(context_parts)
        
        # Create prompt following Claude best practices
        system_prompt = """Você é um assistente especializado em onboarding de desenvolvedores em codebases legados. 
Sua função é ajudar novos desenvolvedores a entender código existente, explicando:
- O que o código faz
- Por que foi implementado dessa forma
- Como diferentes partes se relacionam
- Conceitos e padrões utilizados

Baseie suas respostas SOMENTE no contexto fornecido. Se o contexto não contém informação suficiente, 
diga isso claramente. Use linguagem clara e exemplos quando relevante."""

        user_prompt = f"""Com base no código recuperado da codebase, responda a seguinte pergunta:

{question}

Contexto recuperado da codebase:
{context_text}

Forneça uma resposta clara e objetiva baseada no contexto acima."""

        try:
            response = self._client.messages.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
            )
            
            # Extract text from response
            answer = ""
            for block in response.content:
                if hasattr(block, "text"):
                    answer += block.text
            return answer.strip() if answer else "Desculpe, não consegui gerar uma resposta."
        
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {e}")
            return f"Erro ao gerar resposta: {str(e)}. Usando resposta de fallback:\n\n{self._generate_fallback(question, context_chunks)}"

    def _generate_with_openai_compatible(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        """Generate answer using OpenAI-compatible API (Abacus AI, OpenAI, etc.)."""
        # Build context from retrieved chunks
        context_parts = []
        for i, chunk in enumerate(context_chunks[:5], 1):
            file_path = chunk.get("metadata", {}).get("file_path", "unknown")
            start_line = chunk.get("metadata", {}).get("start_line", 0)
            text = chunk.get("text", "")
            context_parts.append(
                f"[Fonte {i}] {file_path} (linha {start_line}):\n```\n{text}\n```"
            )
        
        context_text = "\n\n".join(context_parts)
        
        # Create system prompt
        system_prompt = """Você é um assistente especializado em onboarding de desenvolvedores em codebases legados. 
Sua função é ajudar novos desenvolvedores a entender código existente, explicando:
- O que o código faz
- Por que foi implementado dessa forma
- Como diferentes partes se relacionam
- Conceitos e padrões utilizados

Baseie suas respostas SOMENTE no contexto fornecido. Se o contexto não contém informação suficiente, 
diga isso claramente. Use linguagem clara e exemplos quando relevante."""

        user_prompt = f"""Com base no código recuperado da codebase, responda a seguinte pergunta:

{question}

Contexto recuperado da codebase:
{context_text}

Forneça uma resposta clara e objetiva baseada no contexto acima."""

        try:
            # OpenAI-compatible Chat Completions API
            response = self._client.chat.completions.create(
                model=self._settings.llm_model,
                max_tokens=self._settings.llm_max_tokens,
                temperature=self._settings.llm_temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
            )
            
            # Extract text from response
            answer = response.choices[0].message.content
            return answer.strip() if answer else "Desculpe, não consegui gerar uma resposta."
        
        except Exception as e:
            logger.error(f"Error calling {self._provider} API: {e}")
            return f"Erro ao gerar resposta: {str(e)}. Usando resposta de fallback:\n\n{self._generate_fallback(question, context_chunks)}"

    def _generate_fallback(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        """Fallback response when Claude API is not available."""
        best = context_chunks[0]
        file_path = best.get("metadata", {}).get("file_path", "unknown")
        start_line = best.get("metadata", {}).get("start_line", 0)
        preview = best["text"][:600]
        
        return f"""[MODO FALLBACK - Configure LLM_API_KEY para respostas reais]

Pergunta: {question}

Contexto mais relevante encontrado:
Arquivo: {file_path} (linha {start_line})

```
{preview}
```

{len(context_chunks)} fonte(s) recuperada(s) da codebase."""