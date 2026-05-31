from typing import Any


class LlmClient:
    def generate_answer(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        if not context_chunks:
            return "Não encontrei contexto suficiente para responder."
        best = context_chunks[0]
        preview = best["text"][:600]
        return f"Pergunta: {question}\n\nCom base no código recuperado:\n{preview}"