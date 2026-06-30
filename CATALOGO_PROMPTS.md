# Catálogo de Registros de Prompt — CodeCompass

## Metadados

- **Modelo alvo:** claude-sonnet-4-6 (via Abacus AI) / fallback: gpt-4o, claude-3-5-sonnet
- **Versão do catálogo:** 1.1
- **Última atualização:** 2026-06-30
- **Responsável:** Vinicius Henrique Silva (vhs@cin.ufpe.br)

---

## Registro #001

### Identificação

- **ID:** PROMPT-001
- **Nome:** Assistente RAG de Onboarding — Chat Principal
- **Versão:** 1.2
- **Responsável:** Victor Barros de Miranda Neves (vbmn@cin.ufpe.br)
- **Data:** 2026-05-15

### Objetivo

> Responder perguntas em linguagem natural sobre uma codebase indexada. É o prompt central da aplicação — usado a cada mensagem enviada pelo usuário no Chat. Resolve o problema de onboarding ao permitir que o dev novo faça perguntas como "O que faz o módulo de autenticação?" e receba respostas contextualizadas pelo código real do repositório.

### Contexto de uso

> Invocado pelo `LlmClient.generate_answer()` em `backend/app/infrastructure/llm_client.py` a cada chamada ao endpoint `POST /api/chat/{repo_id}`. Frequência: toda pergunta do usuário no chat. Latência típica: 3–8s.

### Template do prompt

```
[SYSTEM]
Você é um assistente especializado em onboarding de desenvolvedores em codebases.
Sua função é ajudar novos desenvolvedores a entender código existente, explicando:
- O que o código faz e por que foi implementado dessa forma
- Como diferentes partes se relacionam
- Conceitos e padrões utilizados

Baseie suas respostas SOMENTE no contexto fornecido. Se o contexto não for suficiente,
diga isso claramente. Use linguagem clara e exemplos quando relevante.

[USER]
Com base no código recuperado da codebase, responda:

{question}

Contexto da codebase:
{context_chunks}

Forneça uma resposta clara e objetiva.
```

### Parâmetros

| Parâmetro        | Tipo       | Descrição                                                                                            | Exemplo                                                                                          |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `question`       | string     | Pergunta do usuário em linguagem natural                                                             | `"O que faz o módulo de autenticação?"`                                                          |
| `context_chunks` | list[dict] | Lista de até 5 trechos de código recuperados via RAG, cada um com `text`, `file_path` e `start_line` | `[{"text": "def signup(...):", "metadata": {"file_path": "auth_service.py", "start_line": 12}}]` |

### Exemplo de execução

**Input:**

```
question: "Como funciona o sistema de embeddings? Qual modelo é usado?"

context_chunks:
[Fonte 1] backend/app/services/embedding_service.py (linha 45):
```

class EmbeddingService:
def embed_texts(self, texts: list[str]) -> list[list[float]]:
if self.\_provider == "openai":
return self.\_embed_openai(texts)
return self.\_embed_local(texts)

```
[Fonte 2] backend/app/infrastructure/settings.py (linha 28):
```

embedding_provider: str = Field(default="local")
embedding_model: str = Field(default="all-MiniLM-L6-v2")
embedding_dim: int = Field(default=384)

```

```

**Output obtido:**

```
O sistema de embeddings do CodeCompass suporta dois providers configuráveis via variável de ambiente `EMBEDDING_PROVIDER`:

1. **Local** (padrão): usa o modelo `all-MiniLM-L6-v2` da biblioteca `sentence-transformers`, produzindo vetores de 384 dimensões. Não requer chave de API.

2. **OpenAI**: usa o modelo `text-embedding-3-small`, produzindo vetores de 1536 dimensões. Requer `OPENAI_API_KEY`.

A troca entre providers é feita pela classe `EmbeddingService` que delega para `_embed_openai()` ou `_embed_local()` conforme a configuração.
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 78% (perguntas avaliadas como "úteis" em testes manuais com 20 perguntas sobre o próprio CodeCompass)
- **Casos onde falha:**
    - Perguntas sobre lógica de negócio não presente no código (ex: "por que escolheram PostgreSQL?")
    - Perguntas sobre código não indexado (arquivos fora dos 15 tipos suportados)
    - Perguntas altamente abstratas sem referência a um módulo específico
- **Estratégia de mitigação:** Instrução explícita no SYSTEM para declarar insuficiência de contexto em vez de alucinar; limitar a 5 chunks por chamada; fallback template-based quando LLM_API_KEY não configurada

### Histórico de versões

| Versão | Mudança                                                           | Motivo                                                 |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------ |
| 1.0    | Versão inicial em inglês                                          | Implementação base                                     |
| 1.1    | Tradução para português, adição de bullets explicativos no SYSTEM | Melhorar qualidade das respostas para devs brasileiros |
| 1.2    | Instrução "Baseie suas respostas SOMENTE no contexto fornecido"   | Reduzir alucinações observadas em testes               |

---

## Registro #002

### Identificação

- **ID:** PROMPT-002
- **Nome:** Explicação "Por Que?" — Decisões via Histórico de Commits
- **Versão:** 1.0
- **Responsável:** Arthur Luis de Farias Alves (alfa@cin.ufpe.br)
- **Data:** 2026-05-20

### Objetivo

> Responder perguntas sobre _decisões históricas_ de um módulo analisando commits classificados. Resolve a pergunta clássica do onboarding: "Por que esse código foi escrito assim?" ou "Por que houve tantas mudanças nesse módulo?". A IA sintetiza evidências de commits reais em uma narrativa coerente.

### Contexto de uso

> Invocado pelo `WhyExplanationService._synthesize_explanation()` em `backend/app/services/timeline_service.py` quando o usuário acessa o endpoint `GET /api/history/{repo_id}/why?module=&question=`. Frequência: on-demand, tipicamente 1–3x por sessão de onboarding.

### Template do prompt

```
[SYSTEM]
(herda PROMPT-001 — mesmo SYSTEM_PROMPT do LlmClient)

[USER]
Based on the commit history of module '{module_path}', answer: {question}

Evidence from commits:
[Fonte 1] {commit_timestamp} ({commit_category}) {commit_summary}
[Fonte 2] {commit_timestamp} ({commit_category}) {commit_summary}
...
```

### Parâmetros

| Parâmetro          | Tipo   | Descrição                            | Exemplo                                         |
| ------------------ | ------ | ------------------------------------ | ----------------------------------------------- |
| `module_path`      | string | Caminho relativo do módulo analisado | `"backend/app/services/auth_service.py"`        |
| `question`         | string | Pergunta sobre decisões do módulo    | `"Por que esse arquivo foi refatorado tanto?"`  |
| `commit_timestamp` | string | Data/hora do commit (ISO 8601)       | `"2026-04-15T14:32:00"`                         |
| `commit_category`  | string | Categoria classificada do commit     | `"refactor"`, `"bugfix"`, `"feature"`           |
| `commit_summary`   | string | Mensagem resumida do commit          | `"Extrair AuthService para remover duplicação"` |

### Exemplo de execução

**Input:**

```
module_path: "backend/app/services/embedding_service.py"
question: "Por que houve tantas mudanças nesse módulo?"

Evidence:
[2026-04-10] (feature) Add OpenAI embedding provider support
[2026-04-12] (performance) Add ThreadPoolExecutor for parallel embedding batches
[2026-04-14] (refactor) Extract EmbeddingService from ingestion pipeline
[2026-04-18] (bugfix) Fix dimension mismatch between local and openai embeddings
```

**Output obtido:**

```
O módulo `embedding_service.py` passou por intensa evolução porque é um componente central
com múltiplos fornecedores. Inicialmente suportava apenas embeddings locais; depois foi
necessário adicionar suporte ao provider OpenAI (feature), otimizar com paralelismo
via ThreadPoolExecutor para reduzir o tempo de indexação de ~220s para ~12s (performance),
e corrigir uma incompatibilidade de dimensões entre os dois providers (bugfix).
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 72% (sínteses coerentes com o histórico real)
- **Casos onde falha:** Repos com mensagens de commit pobres (ex: "fix", "update") — a IA não tem contexto suficiente
- **Estratégia de mitigação:** Classificação por padrão de keywords antes de chamar o LLM; fallback template-based detalhado quando LLM indisponível

### Histórico de versões

| Versão | Mudança        | Motivo                           |
| ------ | -------------- | -------------------------------- |
| 1.0    | Versão inicial | Implementação do endpoint `/why` |

---

## Registro #003

### Identificação

- **ID:** PROMPT-003
- **Nome:** Geração de Tour Guiado — Walkthrough de Módulo
- **Versão:** 1.1
- **Responsável:** Victor Barros de Miranda Neves (vbmn@cin.ufpe.br)
- **Data:** 2026-05-18

### Objetivo

> Gerar um walkthrough explicativo para os módulos mais críticos de uma codebase, identificados automaticamente por score de complexidade × churn × acoplamento. O dev novato recebe um "tour" passo a passo pelos módulos que mais precisa entender, sem precisar saber por onde começar.

### Contexto de uso

> Invocado pelo `TourGenerationService` em `backend/app/services/tour_service.py` no endpoint `POST /api/tours/{repo_id}/generate`. Executado uma vez por repositório; resultado armazenado no PostgreSQL. Pode ser regenerado manualmente.

### Template do prompt

```
[SYSTEM]
Você é um especialista em engenharia de software encarregado de criar material de
onboarding para novos desenvolvedores. Seu objetivo é explicar módulos de código
de forma clara, progressiva e acessível para alguém que nunca viu esse repositório.

[USER]
Crie um walkthrough de onboarding para o módulo '{module_name}' do repositório '{repo_name}'.

Informações do módulo:
- Score de importância: {importance_score:.2f} (0-1, quanto maior mais crítico)
- Complexidade ciclomática média: {avg_complexity:.1f}
- Frequência de mudança (commits/arquivo): {avg_churn:.1f}
- Acoplamento (imports/arquivo): {avg_coupling:.1f}

Arquivos principais do módulo:
{file_list}

Trecho de código representativo:
{code_sample}

Gere um walkthrough com:
1. O que este módulo faz (2-3 frases)
2. Por que é importante para o projeto
3. Conceitos-chave que o dev precisa entender
4. Pontos de atenção ou complexidades
5. Por onde começar a explorar
```

### Parâmetros

| Parâmetro          | Tipo   | Descrição                             | Exemplo                                             |
| ------------------ | ------ | ------------------------------------- | --------------------------------------------------- |
| `module_name`      | string | Nome/path do módulo                   | `"app/services"`                                    |
| `repo_name`        | string | Nome do repositório                   | `"codecompass"`                                     |
| `importance_score` | float  | Score 0-1 do ranqueamento             | `0.73`                                              |
| `avg_complexity`   | float  | Complexidade ciclomática média        | `4.2`                                               |
| `avg_churn`        | float  | Média de commits por arquivo          | `8.5`                                               |
| `avg_coupling`     | float  | Média de imports por arquivo          | `6.1`                                               |
| `file_list`        | string | Lista de arquivos do módulo           | `"embedding_service.py\nchat_service.py"`           |
| `code_sample`      | string | Trecho representativo (até 800 chars) | `"class EmbeddingService:\n    def embed_texts..."` |

### Exemplo de execução

**Input:** módulo `app/services` do repositório CodeCompass, score 0.71

**Output obtido:**

```
## Módulo: app/services

**O que faz:** Este módulo concentra toda a lógica de negócio do CodeCompass. É onde
o RAG pipeline é orquestrado, os embeddings são gerados, os commits são classificados
e os tours são produzidos.

**Por que é importante:** É o coração da aplicação — todas as chamadas dos controllers
passam por aqui antes de chegar à infraestrutura. Entender este módulo é entender 80%
do que o CodeCompass faz.

**Conceitos-chave:**
- RAG (Retrieval-Augmented Generation): busca semântica + LLM
- Arquitetura Hexagonal: os services dependem de ports (interfaces), não de implementações
- Pipeline de indexação: Git clone → chunking → embedding → ChromaDB

**Pontos de atenção:** O `embedding_service.py` tem dois providers (local e OpenAI)
com comportamentos diferentes de latência. O `tour_service.py` depende do sistema
de arquivos estar disponível.

**Por onde começar:** `chat_service.py` → `retrieval_service.py` → `embedding_service.py`
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 85% (walkthroughs avaliados como "úteis" pela equipe)
- **Casos onde falha:** Módulos com arquivos muito pequenos ou genéricos (ex: `__init__.py` puro) — pouco contexto para gerar explicação
- **Estratégia de mitigação:** Filtrar módulos com menos de 50 linhas totais; pré-selecionar trecho de código mais representativo (maior função, não o mais curto)

### Histórico de versões

| Versão | Mudança                                                         | Motivo                                                    |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| 1.0    | Versão inicial                                                  | Geração básica de walkthrough                             |
| 1.1    | Adição das métricas de complexidade/churn/acoplamento no prompt | Melhorar contextualização do tour com dados quantitativos |

---

## Registro #004

### Identificação

- **ID:** PROMPT-004
- **Nome:** Relatório de Qualidade de Onboarding
- **Versão:** 1.0
- **Responsável:** Getulio Junqueira de Queiroz Lima (gjql@cin.ufpe.br)
- **Data:** 2026-05-25

### Objetivo

> Gerar uma análise interpretada das métricas de onboarding coletadas (latência de resposta, taxa de conclusão de sessão, usefulness/correctness score do feedback). Transforma dados brutos em recomendações acionáveis para o tech lead que quer melhorar o processo de onboarding do time.

### Contexto de uso

> Invocado pelo `ReportingService.build_quality_report()` no endpoint `GET /api/metrics/{repo_id}/report`. Frequência: on-demand pelo admin/tech lead. Raramente chamado mais de 1x por semana.

### Template do prompt

```
[SYSTEM]
Você é um especialista em métricas de engenharia de software e melhoria de processos.
Analise as métricas de onboarding fornecidas e gere recomendações práticas e específicas.

[USER]
Analise as métricas de qualidade de onboarding do repositório para o período {period_start} a {period_end}:

Métricas coletadas:
- Total de sessões: {total_sessions}
- Taxa de conclusão do fluxo de onboarding: {completion_rate:.1%}
- Latência P50 de resposta: {p50_latency:.1f}s
- Latência P95 de resposta: {p95_latency:.1f}s
- Nota média de utilidade das respostas: {usefulness:.2f}/5.0
- Nota média de correção das respostas: {correctness:.2f}/5.0
- Cobertura de feedback: {feedback_coverage:.1%}

Classificação geral: {quality_label} ({overall_quality:.1%})

Gere:
1. Diagnóstico em 2-3 frases
2. Principais pontos de atenção
3. 3 recomendações concretas e priorizadas
```

### Parâmetros

| Parâmetro           | Tipo   | Descrição                      | Exemplo        |
| ------------------- | ------ | ------------------------------ | -------------- |
| `period_start`      | string | Início do período analisado    | `"2026-05-01"` |
| `period_end`        | string | Fim do período analisado       | `"2026-05-31"` |
| `total_sessions`    | int    | Total de sessões de onboarding | `47`           |
| `completion_rate`   | float  | Taxa de sessões completadas    | `0.68`         |
| `p50_latency`       | float  | Latência mediana em segundos   | `4.2`          |
| `p95_latency`       | float  | Latência P95 em segundos       | `12.8`         |
| `usefulness`        | float  | Nota média de utilidade (1-5)  | `3.8`          |
| `correctness`       | float  | Nota média de correção (1-5)   | `3.6`          |
| `feedback_coverage` | float  | % de respostas com feedback    | `0.42`         |
| `quality_label`     | string | Rótulo de qualidade calculado  | `"good"`       |

### Exemplo de execução

**Input:** 47 sessões, completion 68%, P50 4.2s, utilidade 3.8/5, correção 3.6/5

**Output obtido:**

```
**Diagnóstico:** O onboarding está funcionando de forma satisfatória com taxa de conclusão
de 68% e notas de utilidade acima da média. O principal gargalo é a latência P95 de 12.8s
que pode causar abandono em perguntas complexas.

**Pontos de atenção:**
- Latência P95 elevada (12.8s) — risco de frustração para 5% das perguntas
- Cobertura de feedback de apenas 42% — amostra insuficiente para conclusões robustas

**Recomendações:**
1. Implementar streaming de resposta para reduzir percepção de latência (impacto: alto)
2. Adicionar prompt de feedback ao final de cada resposta para aumentar cobertura acima de 70%
3. Investigar as perguntas com maior latência — provavelmente chunks muito grandes sendo recuperados
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 80%
- **Casos onde falha:** Períodos com muito poucos dados (< 10 sessões) — recomendações genéricas demais
- **Estratégia de mitigação:** Retornar mensagem de aviso quando `total_sessions < 10`; este prompt é invocado apenas quando há dados suficientes

### Histórico de versões

| Versão | Mudança        | Motivo                                 |
| ------ | -------------- | -------------------------------------- |
| 1.0    | Versão inicial | Implementação do endpoint de relatório |

---

## Registro #005

### Identificação

- **ID:** PROMPT-005
- **Nome:** Classificação de Commits por Categoria
- **Versão:** 2.0
- **Responsável:** Carlos Henrique da Silva Frey (chsf@cin.ufpe.br)
- **Data:** 2026-05-12

### Objetivo

> Classificar automaticamente mensagens de commit em categorias semânticas (bugfix, feature, refactor, performance, documentation, test, infrastructure, dependency, style, other). Alimenta a timeline de decisões e o endpoint "Por quê?". Crítico para a qualidade das explicações históricas.

### Contexto de uso

> Invocado pelo `DecisionClassificationService.classify_batch()` em `backend/app/services/commit_history_service.py` durante a fase de indexação de histórico. Na implementação atual, usa classificação por keywords (regex) antes de escalar para LLM. Chamado uma vez por repositório, batch de até 200 commits.

### Template do prompt

> **Nota:** A versão atual (2.0) usa classificação híbrida — primeiro tenta padrões de keywords; LLM é chamado apenas quando o confidence score do pattern matching fica abaixo de 0.6. A versão 1.0 chamava LLM para todos os commits.

```
[SYSTEM]
Você é um especialista em engenharia de software que analisa históricos de commits.
Classifique cada commit em exatamente UMA das categorias abaixo.
Responda SOMENTE com o JSON solicitado, sem texto adicional.

Categorias válidas: bugfix, feature, refactor, performance, documentation,
test, infrastructure, dependency, style, other

[USER]
Classifique os seguintes commits. Para cada um, retorne:
{"commit_id": "...", "category": "...", "confidence": 0.0-1.0, "summary": "resumo em português em 1 frase"}

Commits:
{commits_batch}
```

### Parâmetros

| Parâmetro       | Tipo   | Descrição                                                     | Exemplo                                                  |
| --------------- | ------ | ------------------------------------------------------------- | -------------------------------------------------------- |
| `commits_batch` | string | Lista formatada de commits (id + mensagem + arquivos tocados) | `"abc123: 'fix null pointer in auth' [auth_service.py]"` |

### Exemplo de execução

**Input:**

```
abc123: "fix null pointer in auth service when token expires" [auth_service.py, dependencies.py]
def456: "add OpenAI embedding provider with parallel batch processing" [embedding_service.py, settings.py]
ghi789: "refactor ingestion pipeline to use hexagonal architecture" [ingestion_service.py, ports.py, main.py]
```

**Output obtido:**

```json
[
    {
        "commit_id": "abc123",
        "category": "bugfix",
        "confidence": 0.95,
        "summary": "Corrige null pointer em auth_service quando token expira"
    },
    {
        "commit_id": "def456",
        "category": "feature",
        "confidence": 0.92,
        "summary": "Adiciona suporte a embeddings OpenAI com processamento paralelo em batch"
    },
    {
        "commit_id": "ghi789",
        "category": "refactor",
        "confidence": 0.88,
        "summary": "Refatora pipeline de indexação para arquitetura hexagonal"
    }
]
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 91% (validação manual em 50 commits do próprio CodeCompass)
- **Casos onde falha:** Commits com mensagens muito genéricas (`"wip"`, `"update"`, `"fix"`) — classificados como `other` com confiança baixa
- **Estratégia de mitigação:**
    - Versão 2.0 usa keyword matching primeiro (regras em `_CATEGORY_PATTERNS`) — evita chamadas LLM desnecessárias
    - LLM só é invocado para commits onde o confidence do keyword match < 0.6
    - `other` é categoria válida para commits ambíguos — não força classificação errada

### Histórico de versões

| Versão | Mudança                                                            | Motivo                                                  |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------- |
| 1.0    | Classificação 100% LLM, todos os commits                           | Implementação inicial                                   |
| 2.0    | Classificação híbrida: keyword matching + LLM apenas para ambíguos | Reduzir custo de tokens e latência de indexação em ~70% |

---

## Registro #006

### Identificação

- **ID:** PROMPT-006
- **Nome:** Análise de Grafo de Dependências — Explicação de Módulo
- **Versão:** 1.0
- **Responsável:** Alexandre de Souza Cabral (asc5@cin.ufpe.br)
- **Data:** 2026-05-22

### Objetivo

> Gerar uma explicação em linguagem natural do papel de um módulo dentro do grafo de dependências da codebase. O usuário vê o grafo de imports no frontend e pode clicar em um nó para obter uma explicação de "o que é esse módulo e por que tantos outros dependem dele?".

### Contexto de uso

> Invocado pelo `DependencyGraphService` no endpoint `GET /api/graph/{repo_id}/module/{module_path}`. Frequência: on-demand ao clicar em um nó do grafo. Tipicamente 3–10 chamadas por sessão de exploração do grafo.

### Template do prompt

```
[SYSTEM]
Você é um especialista em arquitetura de software que ajuda desenvolvedores a entender
a estrutura de uma codebase por meio de seu grafo de dependências.

[USER]
Explique o papel do módulo '{module_path}' na codebase '{repo_name}'.

Dados do grafo de dependências:
- Módulos que DEPENDEM deste: {dependents} ({in_degree} dependentes)
- Módulos dos quais este DEPENDE: {dependencies} ({out_degree} dependências)
- Centralidade no grafo (0-1): {centrality:.2f}
- Tipo de nó: {node_type}

Trecho de código do módulo:
{code_preview}

Explique em 3-5 frases:
1. O que este módulo faz
2. Por que outros módulos dependem dele (se alta centralidade)
3. Recomendação para o dev novato (deve entender antes ou depois de outros módulos?)
```

### Parâmetros

| Parâmetro      | Tipo   | Descrição                                         | Exemplo                                           |
| -------------- | ------ | ------------------------------------------------- | ------------------------------------------------- |
| `module_path`  | string | Path do módulo no repo                            | `"app/ports.py"`                                  |
| `repo_name`    | string | Nome do repositório                               | `"codecompass"`                                   |
| `dependents`   | string | Lista de módulos dependentes                      | `"chat_service, tour_service, ingestion_service"` |
| `in_degree`    | int    | Número de módulos que dependem deste              | `8`                                               |
| `dependencies` | string | Módulos dos quais este depende                    | `"(nenhum)"`                                      |
| `out_degree`   | int    | Número de dependências deste módulo               | `0`                                               |
| `centrality`   | float  | Centralidade no grafo (betweenness)               | `0.82`                                            |
| `node_type`    | string | Tipo: `"hub"`, `"leaf"`, `"bridge"`, `"isolated"` | `"hub"`                                           |
| `code_preview` | string | Primeiras 500 chars do arquivo                    | `"class LLMPort(Protocol):..."`                   |

### Exemplo de execução

**Input:** módulo `app/ports.py`, 8 dependentes, 0 dependências, centralidade 0.82

**Output obtido:**

```
O módulo `ports.py` define as interfaces (Protocols do Python) que desacoplam a lógica
de negócio das implementações concretas — é o coração da arquitetura hexagonal do projeto.

Oito módulos dependem dele porque todos os services e controllers acessam infraestrutura
(banco de dados, ChromaDB, LLM) exclusivamente através dessas interfaces, garantindo
testabilidade e substituibilidade de implementações.

**Para o dev novato:** entenda este módulo PRIMEIRO, antes de qualquer outro. Lendo
`ports.py` você terá uma visão completa das capacidades do sistema sem precisar entender
as implementações concretas.
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 88%
- **Casos onde falha:** Módulos com `isolated` type (sem dependentes nem dependências) — explicação tende a ser vaga
- **Estratégia de mitigação:** Para módulos isolados, pular chamada ao LLM e retornar explicação padrão baseada no nome do arquivo

### Histórico de versões

| Versão | Mudança        | Motivo                                              |
| ------ | -------------- | --------------------------------------------------- |
| 1.0    | Versão inicial | Implementação do endpoint de detalhe de nó do grafo |

---

## Resumo dos Prompts

| ID         | Nome                      | Endpoint                                 | Freq. de Uso         | Versão |
| ---------- | ------------------------- | ---------------------------------------- | -------------------- | ------ |
| PROMPT-001 | Chat RAG Principal        | `POST /api/chat/{repo_id}`               | Alta (toda pergunta) | 1.2    |
| PROMPT-002 | Explicação "Por Quê?"     | `GET /api/history/{repo_id}/why`         | Média (on-demand)    | 1.0    |
| PROMPT-003 | Tour Guiado — Walkthrough | `POST /api/tours/{repo_id}/generate`     | Baixa (1x por repo)  | 1.1    |
| PROMPT-004 | Relatório de Qualidade    | `GET /api/metrics/{repo_id}/report`      | Baixa (semanal)      | 1.0    |
| PROMPT-005 | Classificação de Commits  | Interno — pipeline de indexação          | Baixa (1x por repo)  | 2.0    |
| PROMPT-006 | Análise de Nó do Grafo    | `GET /api/graph/{repo_id}/module/{path}` | Média (por clique)   | 1.0    |
| PROMPT-007 | Análise de Branch         | `POST /api/repos/{id}/analyze-branch`    | Média (on-demand)    | 1.0    |
| PROMPT-008 | Gerador de Documentação   | `POST /api/repos/{id}/generate-doc`      | Baixa (on-demand)    | 1.0    |
| PROMPT-009 | Interpretação de Drift    | `POST /api/repos/{id}/graph/diff/interpret` | Baixa (on-demand) | 1.0    |
| PROMPT-010 | Análise de Dívida Técnica  | `POST /api/repos/{id}/tech-debt/analyse` | Baixa (on-demand)    | 1.0    |

---

## Registro #007

### Identificação

- **ID:** PROMPT-007
- **Nome:** Análise de Branch com Avaliação de Risco
- **Versão:** 1.0
- **Responsável:** Arthur Luis de Farias Alves (alfa@cin.ufpe.br)
- **Data:** 2026-06-05

### Objetivo

> Analisar as mudanças de uma feature branch em relação à base, calcular risk score com base nos arquivos alterados (complexidade + acoplamento), e gerar um resumo em linguagem natural com os principais riscos e impactos. Ajuda devs a revisar o que mudou antes de fazer merge.

### Contexto de uso

> Invocado pelo `BranchAnalysisService.analyze()` no endpoint `POST /api/repos/{id}/analyze-branch`. Recebe `branch_name` e `base_branch`. Frequência: on-demand, tipicamente antes de um PR review.

### Template do prompt

```
[SYSTEM]
Você é um engenheiro de software sênior experiente em code review e análise de risco.
Analise as mudanças de branch e forneça insights acionáveis e objetivos.
Responda em português.

[USER]
Analise as mudanças da branch '{branch}' em relação a '{base_branch}' no repositório '{repo_name}'.

Arquivos alterados ({files_changed} total):
{changed_files_list}

Risk score calculado: {risk_score:.0f}/100
(baseado em complexidade ciclomática média e acoplamento dos arquivos alterados)

Forneça:
1. Resumo das mudanças em 2-3 frases
2. Principais riscos identificados
3. Módulos mais críticos tocados
4. Recomendação de merge (safe/review/caution)
```

### Parâmetros

| Parâmetro           | Tipo   | Descrição                        | Exemplo                            |
| ------------------- | ------ | -------------------------------- | ---------------------------------- |
| `branch`            | string | Nome da feature branch           | `"feature/add-webhook-support"`    |
| `base_branch`       | string | Branch base para comparação      | `"main"`                           |
| `repo_name`         | string | Nome do repositório              | `"codecompass"`                    |
| `files_changed`     | int    | Total de arquivos alterados      | `12`                               |
| `changed_files_list`| string | Lista dos arquivos com métricas  | `"main.py (complexity: 8, in: 5)"` |
| `risk_score`        | float  | Score 0-100 calculado            | `67.0`                             |

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 83%
- **Casos onde falha:** Branches com apenas mudanças de docs/tests — risk score baixo mas LLM pode super-estimar risco
- **Estratégia de mitigação:** Filtrar arquivos `.md` e `test_*` do risk score antes de chamar o LLM

---

## Registro #008

### Identificação

- **ID:** PROMPT-008
- **Nome:** Gerador de Documentação de Módulo
- **Versão:** 1.0
- **Responsável:** Getulio Junqueira de Queiroz Lima (gjql@cin.ufpe.br)
- **Data:** 2026-06-05

### Objetivo

> Gerar documentação automática (no formato README.md) para um módulo específico, combinando análise estática do código indexado com o histórico de commits. Útil para projetos sem documentação ou com docs desatualizadas.

### Contexto de uso

> Invocado pelo `DocGeneratorService.generate()` no endpoint `POST /api/repos/{id}/generate-doc`. Recebe `module_path`. Frequência: on-demand pelo dev ou tech lead.

### Template do prompt

```
[SYSTEM]
Você é um escritor técnico especializado em documentação de software.
Gere documentação clara, precisa e útil para desenvolvedores.
Responda em português brasileiro com formatação Markdown.

[USER]
Gere um README.md detalhado para o módulo '{module_path}' do repositório '{repo_name}'.

Código-fonte (chunks mais relevantes):
{code_chunks}

Histórico recente de commits:
{recent_commits}

Métricas do módulo:
- Complexidade ciclomática média: {avg_complexity:.1f}
- Linhas de código: {loc}
- Linguagem: {language}

Inclua no README gerado:
1. Descrição e propósito do módulo
2. Responsabilidades principais
3. Como usar (exemplo de código se aplicável)
4. Dependências e integrações
5. Notas de manutenção (baseado no histórico de mudanças)
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 79%
- **Casos onde falha:** Módulos muito pequenos (< 30 linhas) — documentação superficial; código gerado não pode ser testado pelo LLM
- **Estratégia de mitigação:** Limitar invocação a módulos com `loc >= 30`; incluir instruções explícitas para basear o conteúdo apenas no código fornecido

---

## Registro #009

### Identificação

- **ID:** PROMPT-009
- **Nome:** Interpretação de Drift Arquitetural
- **Versão:** 1.0
- **Responsável:** Victor Barros de Miranda Neves (vbmn@cin.ufpe.br)
- **Data:** 2026-06-15

### Objetivo

> Interpretar em linguagem natural o resultado de uma comparação entre dois snapshots do grafo de dependências (drift report). Transforma dados estruturados (nós adicionados/removidos, arestas adicionadas/removidas, drift score) em um diagnóstico legível sobre o que mudou arquiteturalmente e o que isso implica.

### Contexto de uso

> Invocado pelo endpoint `POST /api/repos/{id}/graph/diff/interpret` em `dependency_graph_controller.py`. É chamado quando o usuário clica em "Interpretar com IA" após visualizar o diff de dois snapshots no `DriftTab.tsx`. Frequência: on-demand, geralmente 1x por sessão de análise de drift.

### Template do prompt

```
[SYSTEM]
Você é um arquiteto de software experiente especializado em análise de evolução de
sistemas. Analise as mudanças estruturais de dependências e forneça insights sobre
impactos e riscos. Responda SEMPRE em português brasileiro.

[USER]
Analise o drift arquitetural do repositório '{repo_name}' entre dois snapshots.

Resumo das mudanças estruturais:
- Drift score: {drift_score:.1f}% ({drift_label})
- Nós adicionados: {added_nodes} módulos novos
- Nós removidos: {removed_nodes} módulos deletados
- Arestas adicionadas: {added_edges} novas dependências
- Arestas removidas: {removed_edges} dependências removidas

Detalhes das mudanças:
{diff_details}

Forneça uma interpretação de 3-5 parágrafos cobrindo:
1. O que mudou estruturalmente e o nível de impacto
2. Riscos ou melhorias arquiteturais detectadas
3. Módulos que merecem atenção especial
4. Recomendação geral para o time
```

### Parâmetros

| Parâmetro       | Tipo   | Descrição                             | Exemplo                           |
| --------------- | ------ | ------------------------------------- | --------------------------------- |
| `repo_name`     | string | Nome do repositório                   | `"codecompass"`                   |
| `drift_score`   | float  | Percentual de elementos alterados     | `23.4`                            |
| `drift_label`   | string | Rótulo qualitativo do drift           | `"moderate"`, `"high"`, `"low"`   |
| `added_nodes`   | int    | Quantidade de novos módulos           | `3`                               |
| `removed_nodes` | int    | Quantidade de módulos removidos       | `1`                               |
| `added_edges`   | int    | Quantidade de novas dependências      | `7`                               |
| `removed_edges` | int    | Quantidade de dependências removidas  | `2`                               |
| `diff_details`  | string | Listagem dos elementos alterados      | `"+ webhook_controller.py\n+ ..."` |

### Exemplo de execução

**Input:** drift_score 18.5%, 2 nós adicionados, 0 removidos, 5 arestas adicionadas

**Output obtido:**

```
A evolução arquitetural registrada entre os dois snapshots indica uma expansão controlada
do sistema, com drift score de 18.5% classificado como moderado. Foram adicionados dois
novos módulos (webhook_controller e watchlist_controller) e cinco novas dependências,
sem remoção de módulos existentes — sinal de crescimento aditivo.

Os novos módulos se integram à camada de controllers com dependências para repositórios
de infraestrutura, seguindo o padrão hexagonal já estabelecido. As arestas adicionadas
são majoritariamente de controllers para adapters, o que é esperado e saudável.

Ponto de atenção: o webhook_controller passou a depender diretamente do ingestion_service,
criando acoplamento entre a camada de entrada externa e o pipeline de processamento.
Considerar se essa dependência deveria ser mediada por um port/interface.

Recomendação: o crescimento está dentro de parâmetros normais. Revisar o acoplamento
do webhook_controller antes do próximo sprint.
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 87%
- **Casos onde falha:** Drift score muito baixo (< 5%) — interpretação tende a ser trivial; drift score muito alto (> 50%) — análise pode ser superficial por excesso de mudanças
- **Estratégia de mitigação:** Para drift < 5%, retornar mensagem padrão sem chamar o LLM ("Mudanças mínimas detectadas — sem impacto arquitetural relevante"); para drift > 50%, incluir aviso explícito no prompt sobre mudança significativa

### Histórico de versões

| Versão | Mudança        | Motivo                                               |
| ------ | -------------- | ---------------------------------------------------- |
| 1.0    | Versão inicial | Implementação do endpoint de interpretação de drift  |

---

## Registro #010

### Identificação

- **ID:** PROMPT-010
- **Nome:** Análise de Dívida Técnica por Boas Práticas de Código
- **Versão:** 1.0
- **Responsável:** Victor Barros de Miranda Neves (vbmn@cin.ufpe.br)
- **Data:** 2026-06-30

### Objetivo

> Avaliar a dívida técnica de um repositório comparando os arquivos críticos identificados (top hotspots) com princípios reconhecidos da indústria: Clean Code, SOLID, DRY, KISS, YAGNI e Clean Architecture. Transforma métricas quantitativas (CC, churn, LOC, acoplamento) em diagnóstico qualitativo categorizado, com ações priorizadas para redução de dívida.

### Contexto de uso

> Invocado pelo `TechDebtService._generate_llm_summary()` em `backend/app/services/tech_debt_service.py`, acionado pelo endpoint `POST /api/repos/{id}/tech-debt/analyse`. Frequência: on-demand pelo usuário ao clicar em "Analisar Agora" no painel de Dívida Técnica. Não é chamado durante a indexação automática (apenas `take_snapshot()` sem LLM). Latência típica: 4–10s.

### Template do prompt

```
[SYSTEM]
Você é especialista em qualidade de software e arquitetura.
Analise dados de dívida técnica e responda em Português do Brasil de forma CONCISA.
Use Markdown simples: **negrito**, bullet com -, listas numeradas. Limite: ~450 tokens.

[USER]
Score médio de dívida: {avg_score:.1f}/100 | Tendência: {trend_label}
CC média: {avg_complexity:.1f} | Churn médio: {avg_churn:.1f} commits/arquivo |
LOC médio: {avg_loc:.0f} | Acoplamento: {coupling:.1f} imports/arquivo

Arquivos críticos analisados:
- {relative_path} | score: {hotspot_score:.0f} | CC: {complexity:.1f} | churn: {churn} commits | {loc} LOC
(... até 8 arquivos)

Avalie considerando: Clean Code, SOLID, DRY, KISS, YAGNI, Clean Architecture e Design Patterns.

Responda neste formato exato:
**Score de Dívida:** [0-100] - [2 frases de justificativa]

**Principais Problemas:**
- [Categoria SOLID/Clean Code/etc]: [descrição com arquivo de exemplo]
- [Categoria]: [descrição]
- [Categoria]: [descrição]

**Ações Priorizadas:**
1. [ação concreta] - Impacto: alto/médio/baixo
2. [ação concreta] - Impacto: alto/médio/baixo
3. [ação concreta] - Impacto: alto/médio/baixo

**Diagnóstico:** {trend_label} - [1 frase explicando o motivo]
```

### Parâmetros

| Parâmetro        | Tipo   | Descrição                                              | Exemplo                                         |
| ---------------- | ------ | ------------------------------------------------------ | ----------------------------------------------- |
| `avg_score`      | float  | Score médio de dívida do repositório (0–100)           | `62.3`                                          |
| `trend_label`    | string | Tendência da dívida (`melhorando`/`estável`/`degradando`) | `"degradando"`                               |
| `avg_complexity` | float  | Complexidade ciclomática média entre os hotspots       | `8.4`                                           |
| `avg_churn`      | float  | Média de commits por arquivo (últimos 6 meses)         | `14.2`                                          |
| `avg_loc`        | float  | Média de linhas de código por arquivo                  | `312`                                           |
| `coupling`       | float  | Média de imports por arquivo                           | `9.1`                                           |
| `files_lines`    | string | Lista formatada dos top-8 hotspot files com métricas   | `"- auth_service.py \| score: 84 \| CC: 12.3"` |

### Exemplo de execução

**Input:** score 62.3, degradando, CC 8.4, churn 14.2, LOC 312, coupling 9.1

**Output obtido:**

```
**Score de Dívida:** 62/100 - O repositório apresenta dívida moderada-alta concentrada em
poucos arquivos críticos com alta complexidade ciclomática e churn elevado. A tendência de
degradação indica que as mudanças recentes aumentaram o débito sem refatoração compensatória.

**Principais Problemas:**
- Complexidade (Clean Code / SOLID SRP): auth_service.py com CC 12.3 concentra múltiplas
  responsabilidades — autenticação, sessão e hash de senha num único módulo.
- Acoplamento (DIP / Hexagonal): ingestion_service.py importa 11 módulos internos
  diretamente, violando o princípio de inversão de dependência.
- Churn (YAGNI): 3 arquivos com churn > 20 commits/6m sem redução de complexidade —
  indicativo de patches contínuos sem refatoração estrutural.

**Ações Priorizadas:**
1. Extrair PasswordHasher e SessionManager de auth_service.py (SRP) - Impacto: alto
2. Introduzir interface para ingestion pipeline e inverter dependência - Impacto: alto
3. Estabelecer feature freeze nos arquivos de alto churn para refatoração - Impacto: médio

**Diagnóstico:** degradando - O aumento de churn sem redução proporcional de complexidade
indica ciclos de correção acelerada (firefighting) em vez de desenvolvimento sustentável.
```

### Avaliação de qualidade

- **Taxa de sucesso estimada:** 82%
- **Casos onde falha:** Repositórios com poucos arquivos (< 5 hotspots) — análise com contexto insuficiente; métricas zeradas (repositório sem commits) — LLM produz análise genérica
- **Estratégia de mitigação:** Verificar `len(hotspots) >= 3` antes de chamar o LLM; para repos sem commits (churn = 0 em todos), retornar `llm_summary = ""` e exibir mensagem orientando o usuário a executar `git log`

### Histórico de versões

| Versão | Mudança        | Motivo                                                    |
| ------ | -------------- | --------------------------------------------------------- |
| 1.0    | Versão inicial | Implementação do endpoint `POST /tech-debt/analyse` (v2)  |
