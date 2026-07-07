# Workflow de Desenvolvimento Assistido por IA — [Nome da Equipe — PREENCHER]

## Sobre este documento

Este documento registra como a equipe utilizou ferramentas e técnicas de IA ao longo do desenvolvimento do projeto **CodeCompass**. É atualizado a cada fase do projeto e entregue junto com a aplicação na apresentação final.

Além do registro qualitativo do uso de IA, este documento captura dados de **economicidade**: consumo de tokens, esforço humano real e uma estimativa contrafactual do custo equivalente sem assistência de IA. O objetivo é permitir, ao final do semestre, uma análise comparativa entre o custo real do desenvolvimento assistido por IA e o custo estimado de um desenvolvimento realizado integralmente por profissionais humanos nos perfis equivalentes.

---

## Ferramentas utilizadas

| Ferramenta                  | Categoria               | Quando usada                                                                                                                   | Modelo/Versão     | Avaliação geral |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- | --------------- |
| ChatLLM (Claude)            | LLM/Assistente          | Elaboração da proposta, pesquisa de arquitetura, geração de código de referência, análise de viabilidade                       | Claude Opus 4     | ⭐⭐⭐⭐⭐      |
| GitHub Copilot (Agent Mode) | Code generation / Agent | Implementação completa das 8 specs (backend + frontend + testes), refatoração, leitura de specs, otimizações e melhorias de UX | Claude Sonnet 4.6 | ⭐⭐⭐⭐⭐      |

---

## Fase: Pré-Proposta e Proposta v1 (Aulas 8-13)

### Onde a IA ajudou

- **Análise comparativa de domínios:** Usamos o ChatLLM (Claude) para analisar os 10 domínios do cardápio, classificar por dificuldade e gerar uma proposta_v1 para cada um. Isso acelerou significativamente a decisão da equipe — em vez de pesquisar cada domínio individualmente, tivemos uma visão panorâmica em minutos.
- **Estruturação da arquitetura:** A IA gerou a estrutura completa do projeto (pastas, módulos, dependências), incluindo código de referência para os componentes principais (feature extractor, smell detector, refactor agent). Isso serviu como ponto de partida concreto para discussão técnica.
- **Pesquisa de trabalhos relacionados:** A IA ajudou a identificar ferramentas existentes (Sourcegraph Cody, Swimm) e papers relevantes, acelerando o levantamento do estado da arte.
- **Geração da proposta:** O template da PROPOSTA_v1.md foi preenchido com assistência da IA, que ajudou a articular o problema, a solução e os critérios de sucesso de forma estruturada.
- **Análise de viabilidade técnica:** A IA detalhou a stack completa, opções de deploy em cloud, e fez análise de riscos — informações que teriam exigido horas de pesquisa individual.

### Onde a IA não ajudou (ou atrapalhou)

- **Decisão do domínio:** A escolha final (D8) foi feita pela equipe via votação — a IA recomendou D4, D2 e D7 como mais equilibrados, mas a equipe preferiu o desafio do D8. A IA não consegue capturar as preferências e motivações pessoais do time.
- **Contexto específico da disciplina:** A IA inicialmente gerou conteúdo para D9 (Débito Técnico) antes da equipe definir D8. Houve retrabalho na mudança de domínio — [NOTA: ajustar se a equipe já tinha definido D8 desde o início].
- **Estimativas de tempo realistas:** As estimativas de esforço geradas pela IA tendem a ser otimistas — a equipe precisou ajustar com base na experiência real dos membros.

### Prompts notáveis desta fase

- Prompt para análise comparativa dos 10 domínios com classificação de dificuldade
- Prompt para geração de estrutura de projeto backend + IA
- Prompt para preenchimento da PROPOSTA_v1.md seguindo template do professor
- [Referenciar entradas futuras do Catálogo de Prompts]

### Decisões tomadas sem IA

- **Escolha do domínio D8:** Votação da equipe no WhatsApp
- **Composição da equipe e distribuição de papéis:** Decisão coletiva baseada em afinidades e experiências
- **Definição do nome do projeto:** [A preencher — CodeCompass é sugestão, equipe decide]
- **Priorização do que entra no MVP:** Discussão em grupo sobre o que é viável em 8 semanas

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                      | Ferramenta/Modelo       | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| ---------------------------------------------- | ----------------------- | --------------------- | ------------------- | -------------------- |
| Análise dos 10 domínios + classificação        | ChatLLM / Claude Opus 4 | ~8.000                | ~6.000              | ~$0.12               |
| Geração de estrutura do projeto (backend + IA) | ChatLLM / Claude Opus 4 | ~5.000                | ~12.000             | ~$0.22               |
| Análise de boas práticas production-ready      | ChatLLM / Claude Opus 4 | ~4.000                | ~15.000             | ~$$0.28              |
| Visão de produto (fluxo empresa)               | ChatLLM / Claude Opus 4 | ~3.000                | ~10.000             | ~$$0.18              |
| Geração da PROPOSTA_v1.md                      | ChatLLM / Claude Opus 4 | ~6.000                | ~8.000              | ~$$0.16              |
| Geração do WORKFLOW_DOCUMENT.md                | ChatLLM / Claude Opus 4 | ~4.000                | ~6.000              | ~$$0.12              |
| **Total da fase**                              |                         | **~30.000**           | **~57.000**         | **~$1.08**           |

> **Nota:** Estimativas baseadas no volume de texto trocado nas conversas com o ChatLLM. Preços de referência: Claude Opus ~$15/M tokens input, ~$75/M tokens output (março 2026). [AJUSTAR com preços reais consultados em docs.anthropic.com]

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                      | Membro (perfil)     | Tempo com IA (h) | Tempo revisão/ajuste (h)  | Observações                                     |
| ------------------------------ | ------------------- | ---------------- | ------------------------- | ----------------------------------------------- |
| Análise dos domínios e votação | [Membro A] (júnior) | 0.5h             | 0.5h (discussão em grupo) | IA gerou análise, equipe discutiu e votou       |
| Estrutura do projeto           | [Membro B] (pleno)  | 1.0h             | 0.5h (revisão técnica)    | Código de referência útil como ponto de partida |
| Pesquisa de boas práticas      | [Membro C] (júnior) | 0.5h             | 0.3h                      | Conteúdo denso, precisou de leitura cuidadosa   |
| Visão de produto               | [Membro D] (júnior) | 0.5h             | 0.2h                      | Ajudou a pensar no produto além do MVP          |
| Escrita da PROPOSTA_v1         | [Membro E] (pleno)  | 1.0h             | 1.0h (revisão coletiva)   | Template preenchido pela IA, revisado por todos |
| Escrita do Workflow Doc        | [Membro A] (júnior) | 0.5h             | 0.5h                      | Registro do processo                            |
| **Total da fase**              |                     | **4.0h**         | **3.0h**                  | **7.0h total de esforço humano**                |

> **Perfis de referência:** Classificação baseada na experiência dos membros com as tecnologias envolvidas nesta atividade específica, não no perfil geral.

#### Camada 3 — Estimativa contrafactual

| Atividade                                       | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| ----------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| Análise comparativa dos 10 domínios             | Pleno              | 6.0h                      | R$ 75                | R$$ 450                    |
| Definição de arquitetura + estrutura de projeto | Sênior             | 8.0h                      | R$$ 115              | R$$ 920                    |
| Pesquisa de boas práticas (production-ready)    | Sênior             | 5.0h                      | R$$ 115              | R$ 575                     |
| Análise de produto e fluxo de mercado           | Pleno              | 4.0h                      | R$ 75                | R$ 300                     |
| Escrita da proposta completa                    | Pleno              | 6.0h                      | R$ 75                | R$ 450                     |
| Documentação do workflow                        | Júnior             | 2.0h                      | R$ 40                | R$ 80                      |
| **Total da fase**                               |                    | **31.0h**                 |                      | **R$ 2.775**               |

> **Fontes salariais:** ABES pesquisa salarial 2025, Glassdoor Brasil (Recife/PE). Valores ajustáveis pela equipe com documentação da fonte.
>
> **Metodologia:** O tempo estimado sem IA reflete quanto tempo um profissional do perfil indicado levaria para executar a mesma atividade partindo do zero, sem assistência de nenhuma ferramenta de IA generativa. Inclui tempo de pesquisa, escrita, revisão e iteração.

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$1.08 USD (~R$ 5.94 a R$5.50/USD) + 7.0h de trabalho humano
- **Custo humano das 7.0h (perfil médio júnior/pleno):** ~R$ 385 (7h × R$55 média)
- **Custo total com IA:** ~R$ 391
- **Custo contrafactual sem IA:** ~R$ 2.775
- **Razão de economicidade:** 7.1x (cada R$1 gasto com IA equivaleu a ~R$7.10 sem IA)
- **Saving estimado:** ~R$ 2.384 (85.9%)

> **Limitações desta análise parcial:**
>
> 1. O contrafactual é estimativa subjetiva — membros da equipe são estudantes, não profissionais com os perfis indicados
> 2. A qualidade do output com IA pode diferir do que um profissional produziria
> 3. O tempo de aprendizado das ferramentas de IA não está contabilizado
> 4. A IA gerou conteúdo inicialmente para D9 antes da equipe definir D8 — esse retrabalho não está refletido nos números

### Lições aprendidas

- A IA é excelente para gerar "primeiros rascunhos" estruturados — mas a revisão humana é indispensável
- Definir o domínio ANTES de pedir à IA para detalhar evita retrabalho
- O ChatLLM foi mais útil para tarefas de estruturação e pesquisa do que para decisões que dependem de contexto pessoal da equipe
- Manter o registro de economicidade desde o início é trabalhoso mas valioso — retroativamente seria muito mais difícil

---

## Fase: Exposição (Aulas 14-20)

Implementação completa das especificações SPEC-0001 a SPEC-0008 com assistência de IA (GitHub Copilot / Claude Opus 4).

### Onde a IA ajudou

- **Geração de código completo:** A IA gerou a implementação integral do backend (FastAPI, serviços, controllers, adapters, testes) e frontend (React/TypeScript) para todas as 8 especificações.
- **Arquitetura hexagonal consistente:** Manteve o padrão de ports/adapters, dependency injection e in-memory fallback em todos os módulos sem desvio.
- **Geração de testes:** Criou suítes completas de testes unitários, integração e E2E para cada spec, cobrindo cenários positivos e negativos.
- **Leitura e interpretação de specs:** A IA leu os arquivos `design.md` e `tasks.md` de cada spec e traduziu diretamente em código funcional.
- **Refatoração incremental:** Ao adicionar novas specs, a IA atualizou corretamente `main.py`, `dependencies.py`, `models.py`, `App.tsx` e `http.ts` sem quebrar funcionalidades anteriores.
- **Infraestrutura de observabilidade:** Gerou middleware de correlation ID, structured logging, metrics collector e alert evaluation sem necessidade de bibliotecas externas.

### Onde a IA não ajudou (ou atrapalhou)

- **Instalação de dependências no Windows:** A build de `tokenizers` falhou por ausência do Rust toolchain — a IA não conseguiu resolver esse problema de ambiente local.
- **Contexto de sessão longo:** Em conversas muito longas, foi necessário compactar o contexto — risco de perder detalhes de decisões anteriores.
- **Decisões de UX:** O layout gerado é funcional mas não tem design refinado — escolhas visuais precisam de revisão humana.

### Prompts notáveis desta fase

- "Analise todo o projeto e tambem a parte de especificações veja se ta tudo ok da fase 1 e fase 2 e prossiga para a fase 3 e 4"
- "Agora verifique se ta tudo ok e faça as proximas fases até o fim ok?"
- "continue sem instalar nada" (para prosseguir sem bloquear em dependências)

### Decisões tomadas sem IA

- **Definição da ordem de implementação:** SPECs foram implementadas na ordem numérica definida pela equipe
- **Escolha de não usar bibliotecas externas de observabilidade:** Decisão de manter tudo in-house para simplicidade
- **Decisão de usar in-memory fallback em todos os adapters:** Padrão para funcionar sem PostgreSQL/ChromaDB em dev

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                                                         | Ferramenta/Modelo              | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| --------------------------------------------------------------------------------- | ------------------------------ | --------------------- | ------------------- | -------------------- |
| SPEC-0001: Monolith Foundation (backend + Docker + frontend base)                 | GitHub Copilot / Claude Opus 4 | ~35.000               | ~45.000             | ~$3.90               |
| SPEC-0002: Repo Index & RAG (embedding, chunking, retrieval, chat)                | GitHub Copilot / Claude Opus 4 | ~30.000               | ~40.000             | ~$3.45               |
| SPEC-0003: Guided Tour (scoring, persistence, step viewer)                        | GitHub Copilot / Claude Opus 4 | ~25.000               | ~35.000             | ~$3.00               |
| SPEC-0004: Module Dependency Visualization (AST, graph, frontend)                 | GitHub Copilot / Claude Opus 4 | ~20.000               | ~30.000             | ~$2.55               |
| SPEC-0005: Commit History Decision Intelligence (ingest, classify, timeline, why) | GitHub Copilot / Claude Opus 4 | ~25.000               | ~35.000             | ~$3.00               |
| SPEC-0006: Onboarding Metrics & Evaluation (events, feedback, KPIs, dashboard)    | GitHub Copilot / Claude Opus 4 | ~18.000               | ~28.000             | ~$2.37               |
| SPEC-0007: Auth & Onboarding Sessions (auth, sessions, checkpoints, UI)           | GitHub Copilot / Claude Opus 4 | ~15.000               | ~25.000             | ~$2.10               |
| SPEC-0008: Observability & Operational Readiness (logging, metrics, ops, alerts)  | GitHub Copilot / Claude Opus 4 | ~18.000               | ~28.000             | ~$2.37               |
| **Total da fase**                                                                 |                                | **~186.000**          | **~266.000**        | **~$22.74**          |

> **Nota:** Estimativas baseadas no volume de código gerado (~4.500 linhas de Python + ~1.200 linhas de TypeScript), leitura de specs, e conversação. Preços de referência: Claude Opus 4 ~$15/M tokens input, ~$75/M tokens output (maio 2026).

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                                | Membro (perfil)  | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações                       |
| ---------------------------------------- | ---------------- | ---------------- | ------------------------ | --------------------------------- |
| SPEC-0001 + SPEC-0002 (foundation + RAG) | [Membro] (pleno) | 2.0h             | 1.0h                     | Setup inicial do projeto completo |
| SPEC-0003 (guided tour)                  | [Membro] (pleno) | 1.5h             | 0.5h                     | Scoring + persistence + UI        |
| SPEC-0004 (dependency graph)             | [Membro] (pleno) | 1.0h             | 0.5h                     | AST parsing + graph frontend      |
| SPEC-0005 (commit history)               | [Membro] (pleno) | 1.5h             | 0.5h                     | Classifier + timeline + why       |
| SPEC-0006 (metrics)                      | [Membro] (pleno) | 1.0h             | 0.3h                     | KPIs + dashboard                  |
| SPEC-0007 (auth/sessions)                | [Membro] (pleno) | 0.5h             | 0.3h                     | Auth + session lifecycle          |
| SPEC-0008 (observability)                | [Membro] (pleno) | 0.5h             | 0.3h                     | Logging + ops endpoints           |
| **Total da fase**                        |                  | **8.0h**         | **3.4h**                 | **11.4h total de esforço humano** |

#### Camada 3 — Estimativa contrafactual

| Atividade                                                               | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| ----------------------------------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| Backend foundation + Docker + CI/CD setup                               | Sênior             | 16.0h                     | R$ 115               | R$ 1.840                   |
| RAG pipeline (embedding, chunking, retrieval, chat)                     | Sênior             | 20.0h                     | R$ 115               | R$ 2.300                   |
| Guided tour (scoring engine + persistence + UI)                         | Sênior             | 16.0h                     | R$ 115               | R$ 1.840                   |
| Dependency graph (AST extraction + assembly + API + frontend)           | Sênior             | 14.0h                     | R$ 115               | R$ 1.610                   |
| Commit history intelligence (git parsing + classifier + timeline + why) | Sênior             | 16.0h                     | R$ 115               | R$ 1.840                   |
| Metrics & evaluation (ingestion + aggregation + reporting + dashboard)  | Pleno              | 12.0h                     | R$ 75                | R$ 900                     |
| Auth & sessions (auth service + session lifecycle + frontend)           | Pleno              | 10.0h                     | R$ 75                | R$ 750                     |
| Observability (structured logging + metrics + ops endpoints + alerts)   | Sênior             | 12.0h                     | R$ 115               | R$ 1.380                   |
| Testes (unitários + integração + E2E para todas as specs)               | Pleno              | 20.0h                     | R$ 75                | R$ 1.500                   |
| **Total da fase**                                                       |                    | **136.0h**                |                      | **R$ 13.960**              |

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$22.74 USD (~R$ 125.07 a R$5.50/USD) + 11.4h de trabalho humano
- **Custo humano das 11.4h (perfil médio pleno):** ~R$ 855 (11.4h × R$75 média)
- **Custo total com IA:** ~R$ 980
- **Custo contrafactual sem IA:** ~R$ 13.960
- **Razão de economicidade:** 14.2x (cada R$1 gasto com IA equivaleu a ~R$14.20 sem IA)
- **Saving estimado:** ~R$ 12.980 (93.0%)

> **Limitações desta análise parcial:**
>
> 1. O volume de código gerado é alto mas precisa de validação funcional completa (testes não executados por falta de deps no Windows)
> 2. A qualidade do output da IA pode requerer ajustes em produção
> 3. Não inclui tempo de debugging de problemas de ambiente (ex: tokenizers build failure)
> 4. A estimativa contrafactual assume profissional experiente — um júnior levaria significativamente mais tempo

### Lições aprendidas

- A IA consegue implementar specs inteiras de forma autônoma quando recebe documentos de design bem estruturados (design.md + tasks.md)
- O padrão de "in-memory fallback" simplifica drasticamente o desenvolvimento local e testes
- Manter contexto entre sessões longas requer documentação estruturada (conversation summaries)
- A IA é extremamente eficiente em tarefas repetitivas (criar adapters, controllers, testes com padrão similar)
- Problemas de ambiente local (builds, dependências nativas) são o principal bloqueador — a IA não resolve infra do host

---

## Fase: Composição (Aulas 21-24)

Fase de otimização e expansão do projeto após a implementação das 8 specs. Foco em performance de embeddings, observabilidade e suporte a mais linguagens de programação.

### Onde a IA ajudou

- **Diagnóstico de bug de indexação travada em 92%:** A IA identificou que o endpoint `/api/repos/index` estava bloqueando a resposta HTTP enquanto executava a indexação de forma síncrona. Solução: uso de `BackgroundTasks` do FastAPI para retornar em ~576ms e executar em background.
- **Integração com OpenAI Embeddings API:** A IA implementou suporte a `text-embedding-3-small` via `OPENAI_API_KEY` separada da `LLM_API_KEY` do Abacus AI, com fallback gracioso para `sentence-transformers` local quando a chave não está configurada.
- **Concorrência com ThreadPoolExecutor:** A IA implementou processamento paralelo de batches de embeddings usando `ThreadPoolExecutor` (controlado por `EMBEDDING_MAX_WORKERS=4`), reduzindo o tempo de embedding de 220s para **11.8s** — ganho de **18.7x**.
- **Expansão de linguagens:** A IA registrou 9 novas linguagens (C, C++, C#, Ruby, PHP, Kotlin, Swift, Scala, Shell/Bash) no `language_registry.py` com node types de tree-sitter para métricas de complexidade e imports.
- **Investigação de APIs externas:** A IA conduziu testes exaustivos da API do Abacus AI para embeddings, confirmando via múltiplos endpoints que não suporta `/embeddings` (todos retornam 404). Documentou a conclusão com evidências.
- **Limpeza de ambiente Docker:** A IA guiou a limpeza de ~58.6 GB de imagens Docker obsoletas com `docker system prune -a`.

### Onde a IA não ajudou (ou atrapalhou)

- **Sintaxe do PowerShell para scripts Python inline:** Tentativas de executar código Python multi-linha via `docker exec ... python3 -c "..."` falharam repetidamente por conflito de aspas e lambdas — solução foi usar arquivo temporário copiado com `docker cp`.
- **Disponibilidade de pacotes PyPI:** `tree-sitter-swift>=0.23.0` não existe no PyPI (versão máxima 0.7.3, API antiga incompatível) — a IA precisou detectar o erro no build e remover a dependência.
- **Rate-limit da OpenAI conta nova (Tier 1):** O SDK faz retry automático com backoff exponencial (chegando a 50s de espera), o que inflou o tempo inicial de embedding para 220s na primeira indexação antes da otimização de concorrência.

### Prompts notáveis desta fase

- "Fix indexação parada em 92%"
- "Usar OpenAI API Key para embeddings separada do Abacus"
- "Tem como eu otimizar já que tou usando a api do open ai no meu codigo?"
- "Agora faça um novo teste do embedding com o repositório do nestjs e veja se ficou mais rápido"
- "Eu gostaria que expandisse a possibilidade de linguagens de programação além das que temos agora para outras"

### Decisões tomadas sem IA

- **Escolha de `OPENAI_API_KEY` separada de `LLM_API_KEY`:** Decisão de não misturar chaves de providers diferentes — Abacus para LLM, OpenAI para embeddings.
- **`EMBEDDING_MAX_WORKERS=4` como padrão:** Balanceamento entre concorrência e rate-limit do Tier 1 da OpenAI.
- **Exclusão do Swift do `pyproject.toml`:** Decisão de não incluir como dependência obrigatória dado que nenhuma versão compatível existe — mantido no registry como fallback texto.

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                             | Ferramenta/Modelo                  | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| ----------------------------------------------------- | ---------------------------------- | --------------------- | ------------------- | -------------------- |
| Diagnóstico e fix do bug de 92% (BackgroundTasks)     | GitHub Copilot / Claude Sonnet 4.6 | ~12.000               | ~8.000              | ~$0.14               |
| Investigação Abacus AI embeddings (testes exaustivos) | GitHub Copilot / Claude Sonnet 4.6 | ~18.000               | ~12.000             | ~$0.21               |
| Implementação OpenAI embeddings + Settings refactor   | GitHub Copilot / Claude Sonnet 4.6 | ~20.000               | ~15.000             | ~$0.26               |
| Otimização concorrência (ThreadPoolExecutor)          | GitHub Copilot / Claude Sonnet 4.6 | ~15.000               | ~10.000             | ~$0.18               |
| Expansão de 15 linguagens no registry                 | GitHub Copilot / Claude Sonnet 4.6 | ~10.000               | ~12.000             | ~$0.17               |
| Testes de embedding direto (nestjs/nest benchmark)    | GitHub Copilot / Claude Sonnet 4.6 | ~8.000                | ~5.000              | ~$0.09               |
| Limpeza Docker + suporte operacional                  | GitHub Copilot / Claude Sonnet 4.6 | ~5.000                | ~3.000              | ~$0.06               |
| **Total da fase**                                     |                                    | **~88.000**           | **~65.000**         | **~$1.11**           |

> **Nota:** Preços de referência: Claude Sonnet 4.6 ~$3/M tokens input, ~$15/M tokens output (junho 2026).
> Custo real de embeddings OpenAI na indexação do nestjs/nest (2825 chunks, `text-embedding-3-small`): **~$0.00006** — praticamente zero.

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                                    | Membro (perfil)  | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações                      |
| -------------------------------------------- | ---------------- | ---------------- | ------------------------ | -------------------------------- |
| Debug do bug de 92% + BackgroundTasks        | [Membro] (pleno) | 0.5h             | 0.3h                     | Build e teste do fix             |
| Investigação Abacus AI + integração OpenAI   | [Membro] (pleno) | 1.0h             | 0.5h                     | Testes reais de API              |
| Otimização concorrência (ThreadPoolExecutor) | [Membro] (pleno) | 0.5h             | 0.3h                     | Build e benchmark                |
| Expansão de linguagens (9 novas)             | [Membro] (pleno) | 0.5h             | 0.2h                     | Build e verificação              |
| Limpeza Docker + operacional                 | [Membro] (pleno) | 0.3h             | 0.1h                     | Liberou ~58.6 GB                 |
| **Total da fase**                            |                  | **2.8h**         | **1.4h**                 | **4.2h total de esforço humano** |

#### Camada 3 — Estimativa contrafactual

| Atividade                                          | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| -------------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| Diagnóstico e fix bug assíncrono (BackgroundTasks) | Sênior             | 4.0h                      | R$ 115               | R$ 460                     |
| Investigação de APIs de embedding + integração     | Sênior             | 6.0h                      | R$ 115               | R$ 690                     |
| Implementação concorrência com ThreadPoolExecutor  | Sênior             | 4.0h                      | R$ 115               | R$ 460                     |
| Expansão registry de linguagens (9 linguagens)     | Pleno              | 3.0h                      | R$ 75                | R$ 225                     |
| Testes de performance e benchmark                  | Pleno              | 2.0h                      | R$ 75                | R$ 150                     |
| **Total da fase**                                  |                    | **19.0h**                 |                      | **R$ 1.985**               |

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$1.11 USD (~R$ 6.11 a R$5.50/USD) + 4.2h de trabalho humano
- **Custo humano das 4.2h (perfil médio pleno):** ~R$ 315 (4.2h × R$75 média)
- **Custo total com IA:** ~R$ 321
- **Custo contrafactual sem IA:** ~R$ 1.985
- **Razão de economicidade:** 6.2x (cada R$1 gasto com IA equivaleu a ~R$6.20 sem IA)
- **Saving estimado:** ~R$ 1.664 (83.8%)

**Resultado técnico de destaque desta fase:**

- Embedding de 2825 chunks: **220s → 11.8s** (18.7x mais rápido)
- Custo de indexação completa do nestjs/nest: ~$0.00006 (praticamente grátis)
- Suporte a linguagens: **6 → 15** (+9 novas)

### Lições aprendidas

- Endpoints I/O-bound devem usar `BackgroundTasks` (ou Celery para escala maior) — nunca bloquear a resposta HTTP
- APIs de terceiros devem ser testadas antes de ser assumidas como disponíveis — Abacus AI não suportava embeddings apesar da documentação sugerir compatibilidade OpenAI
- `ThreadPoolExecutor` é ideal para I/O-bound paralelo em Python — GIL não impede concorrência real em chamadas de rede
- Scripts Python complexos no PowerShell devem usar arquivos temporários (`docker cp`) em vez de `-c "..."` inline
- Antes de adicionar dependências, verificar a disponibilidade real no PyPI com as constraints de versão exigidas

---

## Fase: Ensaio (Aulas 25-29)

Fase de polimento de UX, segurança e documentação do projeto.

### Onde a IA ajudou

- **Sidebar colapsável (estilo ChatLLM):** A IA refatorou completamente o `App.tsx` de abas horizontais para sidebar lateral retrátil com ícones, labels e botão de recolher/expandir, mantendo estado entre navegações.
- **Dark mode completo:** Implementou dark mode com Tailwind `dark:` classes em todos os componentes (`App.tsx`, `ui/index.tsx`), botão de toggle 🌙/☀️ no header e persistência em `localStorage`.
- **Renderização Markdown com VS Code blocks:** Refatorou o `ChatTab.tsx` com parser Markdown próprio + `react-syntax-highlighter` (tema `vscDarkPlus`) — blocos de código com barra de título, dots coloridos (macOS), número de linhas e botão "Copiar".
- **Diagnóstico e remoção de código duplicado:** Identificou e removeu múltiplas ocorrências de conteúdo duplicado em `App.tsx` e `ui/index.tsx` causadas por operações de `replace_string_in_file` que substituíam apenas o início do arquivo.
- **Auditoria de segurança (OWASP Top 10):** Varreu todo o projeto em busca de segredos hardcoded, identificando: senha admin `"a1b2c3d4"` em `main.py`, `POSTGRES_PASSWORD` no `docker-compose.yml`, e chaves de API no `.env`. Moveu todos para variáveis de ambiente obrigatórias.
- **Troca de modelo LLM:** Suporte a múltiplos modelos via `LLM_MODEL` env var — testou `GPT4_O`, `CLAUDE_V4_5_SONNET` no Abacus AI.

### Onde a IA não ajudou (ou atrapalhou)

- **Operações `replace_string_in_file` parciais:** Ao substituir apenas a seção de imports, o conteúdo novo foi inserido no início e o conteúdo antigo permaneceu — gerando arquivos com código duplicado e erros de `Duplicate function implementation`. Necessitou de múltiplas operações de limpeza.
- **Cache Docker nas layers:** O `COPY package.json` + `RUN npm install` são cacheados — ao adicionar `react-syntax-highlighter`, o `docker compose build` reutilizou a layer antiga. Foi necessário `--no-cache` para forçar reinstalação.
- **Babel vs `??` + `||` misturados:** O parser Babel do Vite não aceita `??` sem parênteses ao misturar com `||` — erro detectado apenas em tempo de build no container, não pelo LSP local.

### Prompts notáveis desta fase

- "As abas eu gostaria que colocasse numa coluna lateral do lado esquerdo feito o chat llm que pode ser retratil. Também gostaria de colocar o dark mode para o projeto."
- "Eu gostaria que você criasse nesse container de resposta uma resposta mais bonita respeitando essa regra de saida e em codigo colocar uma caixa de codigo bonita e que simule como se fosse o visual code"
- "Analise uma resposta trazida pelo chat... Eu acho que é tipo Markdown."
- "Agora um gostaria que você analisasse todos os lugares que tem chaves de api e substituísse por uma CONSTANTE para env pois pretendo subir o projeto para o github"

### Decisões tomadas sem IA

- **Escolha do estilo visual:** Referência ao "ChatLLM" como inspiração para a sidebar — decisão do usuário, não da IA
- **Revogação de chaves de API:** Decisão de revogar chaves expostas na conversa — ação manual obrigatória
- **`CLAUDE_V4_5_SONNET` como modelo padrão:** Escolha após testar `GPT4_O` e preferir Claude

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                         | Ferramenta/Modelo                  | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| ------------------------------------------------- | ---------------------------------- | --------------------- | ------------------- | -------------------- |
| Sidebar colapsável + dark mode (App.tsx refactor) | GitHub Copilot / Claude Sonnet 4.6 | ~25.000               | ~20.000             | ~$0.37               |
| VS Code code blocks (react-syntax-highlighter)    | GitHub Copilot / Claude Sonnet 4.6 | ~20.000               | ~18.000             | ~$0.33               |
| Debug código duplicado (App.tsx + ui/index.tsx)   | GitHub Copilot / Claude Sonnet 4.6 | ~15.000               | ~10.000             | ~$0.22               |
| Auditoria de segurança + hardened env vars        | GitHub Copilot / Claude Sonnet 4.6 | ~12.000               | ~8.000              | ~$0.16               |
| Troca de modelos LLM + testes                     | GitHub Copilot / Claude Sonnet 4.6 | ~5.000                | ~3.000              | ~$0.06               |
| Documentação (README, COMO_FUNCIONA, COMO_RODAR)  | GitHub Copilot / Claude Sonnet 4.6 | ~15.000               | ~25.000             | ~$0.42               |
| **Total da fase**                                 |                                    | **~92.000**           | **~84.000**         | **~$1.56**           |

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                         | Membro (perfil)  | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações                      |
| --------------------------------- | ---------------- | ---------------- | ------------------------ | -------------------------------- |
| Sidebar + dark mode + code blocks | [Membro] (pleno) | 1.0h             | 0.5h                     | Múltiplos rebuilds Docker        |
| Debug de duplicações              | [Membro] (pleno) | 0.5h             | 0.3h                     | Leitura de erros do Vite         |
| Auditoria de segurança            | [Membro] (pleno) | 0.3h             | 0.2h                     | Revisão de variáveis             |
| Documentação                      | [Membro] (pleno) | 0.5h             | 0.5h                     | Revisão dos textos gerados       |
| **Total da fase**                 |                  | **2.3h**         | **1.5h**                 | **3.8h total de esforço humano** |

#### Camada 3 — Estimativa contrafactual

| Atividade                                                | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| -------------------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| Refatorar navegação para sidebar colapsável              | Pleno              | 6.0h                      | R$ 75                | R$ 450                     |
| Implementar dark mode (Tailwind) em todos os componentes | Pleno              | 4.0h                      | R$ 75                | R$ 300                     |
| Markdown renderer + syntax highlighting VS Code          | Sênior             | 8.0h                      | R$ 115               | R$ 920                     |
| Auditoria de segurança e hardening de env vars           | Sênior             | 3.0h                      | R$ 115               | R$ 345                     |
| Documentação completa (3 documentos)                     | Pleno              | 6.0h                      | R$ 75                | R$ 450                     |
| **Total da fase**                                        |                    | **27.0h**                 |                      | **R$ 2.465**               |

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$1.56 USD (~R$ 8.58 a R$5.50/USD) + 3.8h de trabalho humano
- **Custo humano das 3.8h (perfil médio pleno):** ~R$ 285 (3.8h × R$75 média)
- **Custo total com IA:** ~R$ 294
- **Custo contrafactual sem IA:** ~R$ 2.465
- **Razão de economicidade:** 8.4x
- **Saving estimado:** ~R$ 2.171 (88.1%)

### Lições aprendidas

- `replace_string_in_file` deve substituir o arquivo completo quando a mudança é abrangente — substituir apenas o topo e deixar o restante gera duplicação silenciosa
- Docker layer cache de `npm install` exige `--no-cache` quando `package.json` muda — o hash da layer não é recalculado automaticamente ao alterar dependências
- Credenciais hardcoded são risco real mesmo em projetos acadêmicos — o histórico do chat expõe segredos da mesma forma que um commit no git
- Babel (Vite) tem restrições sintáticas mais rígidas que TypeScript puro — `??` + `||` sem parênteses é válido em TS mas inválido no parser Babel

---

## Fase: Ressonância (Aulas 30-32)

Fase de expansão com features avançadas de análise arquitetural, auditoria, integração contínua e observabilidade colaborativa.

### Onde a IA ajudou

- **Detecção de Drift Arquitetural:** A IA implementou `ArchitectureDriftService.compare()` que compara dois snapshots do grafo de dependências (nós e arestas), calcula `drift_score` como percentual de elementos alterados, e expõe endpoints REST para listagem de snapshots e cálculo de diff. Adicionalmente, implementou endpoint `POST /api/repos/{id}/graph/diff/interpret` que alimenta o diff num prompt e retorna interpretação em português via LLM.
- **Audit Log automático:** A IA implementou `AuditRepository` com tabela PostgreSQL `audit_log` e fallback in-memory, mais middleware em `main.py` que intercepta respostas de mutação (POST/PATCH/DELETE com status < 400) e registra user_id, e-mail, ação, resource_type, IP e timestamp sem código adicional nos controllers.
- **Webhooks GitHub:** A IA implementou CRUD de webhooks com segredos HMAC gerados via `secrets.token_hex(32)`, receiver que verifica assinatura `X-Hub-Signature-256` com `hmac.compare_digest()` (timing-safe), e disparo de re-indexação automática ao receber push event.
- **Watchlist e Notificações:** A IA implementou `WatchlistRepository` com constraint UNIQUE(user_id, repository_id, module_path) e `NotificationService.notify_on_reindex()` que detecta módulos alterados pós-indexação e envia e-mails para subscribers.
- **Frontend Phase 4 completo:** A IA gerou `DriftTab.tsx` (seleção de snapshots por data com `closestSnapshot()`, comparação com animação, botão "Interpretar com IA" com resultado em card violeta), `WatchlistTab.tsx` (watch/unwatch por módulo, lista completa), e expandiu `AdminTab.tsx` com seções de Auditoria e Webhooks.
- **Fix de auth global:** A IA refatorou `frontend/src/infrastructure/http.ts` para injetar automaticamente o Bearer token via `useAuthStore.getState().token` em todas as chamadas HTTP, eliminando "Token de autenticação ausente" em todas as abas.
- **Debug de erros Babel/JSX:** A IA localizou e removeu bloco JSX duplicado em `AdminTab.tsx` que causava "Unexpected token (280:7)" no parser Babel.
- **Fix de tema claro:** A IA reescreveu `AuditLogSection` e `WebhookSection` usando o padrão `bg-white dark:bg-gray-800` consistente com as demais seções do AdminTab, corrigindo ilegibilidade no tema claro.

### Onde a IA não ajudou (ou atrapalhou)

- **Contexto longo após compactação:** Ao retomar a sessão após compactação do contexto, foi necessário re-explorar o estado dos arquivos para não repetir implementações já feitas.
- **Inserções parciais de código:** Algumas inserções de blocos JSX resultaram em código duplicado (ex: `export const http` duplicado), exigindo operações de limpeza adicionais.
- **Dificuldade com rebuild Docker:** O backend precisou ser completamente reconstruído (~10 min por PyTorch) para incluir as rotas da Fase 4 — a IA não consegue antecipar esse custo de tempo.

### Prompts notáveis desta fase

- "Crie a fase 4 do projeto completa com drift arquitetural, audit log, webhooks e watchlist"
- "adiciona a parte de selecionar datas no DriftTab e um botão de interpretar com ia"
- "corrige o bug do token de autenticação ausente em todas as abas"
- "corrige o tema claro no AuditLog e Webhooks — ta tudo branco e ilegível"
- "Agora analise todos os prompts de ontem e hoje, uso de LLM, gastos de tokens e arquivos e features criados e atualiza os arquivos .MD que estão na raiz do projeto."

### Decisões tomadas sem IA

- **Ordem de implementação:** Backend completo antes do frontend da Fase 4
- **Gradiente de cores por tab:** Teal/cyan para Drift, violet/purple para Watchlist — escolhas visuais do usuário
- **Re-build forçado do Docker:** Decisão de usar `docker compose up --build` para garantir atualização de rotas

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                                 | Ferramenta/Modelo                  | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| --------------------------------------------------------- | ---------------------------------- | --------------------- | ------------------- | -------------------- |
| Backend: AuditRepository + middleware                     | GitHub Copilot / Claude Sonnet 4.6 | ~25.000               | ~20.000             | ~$0.37               |
| Backend: WebhookRepository + controller (HMAC)            | GitHub Copilot / Claude Sonnet 4.6 | ~28.000               | ~22.000             | ~$0.41               |
| Backend: WatchlistRepository + NotificationService        | GitHub Copilot / Claude Sonnet 4.6 | ~22.000               | ~18.000             | ~$0.33               |
| Backend: ArchitectureDriftService + snapshots + diff      | GitHub Copilot / Claude Sonnet 4.6 | ~30.000               | ~25.000             | ~$0.47               |
| Backend: /graph/diff/interpret (LLM endpoint)             | GitHub Copilot / Claude Sonnet 4.6 | ~15.000               | ~10.000             | ~$0.20               |
| Frontend: DriftTab.tsx (seleção por data + IA)            | GitHub Copilot / Claude Sonnet 4.6 | ~40.000               | ~30.000             | ~$0.56               |
| Frontend: WatchlistTab.tsx                                | GitHub Copilot / Claude Sonnet 4.6 | ~25.000               | ~20.000             | ~$0.37               |
| Frontend: AdminTab.tsx (AuditLogSection + WebhookSection) | GitHub Copilot / Claude Sonnet 4.6 | ~35.000               | ~25.000             | ~$0.48               |
| Frontend: App.tsx wiring + http.ts global auth            | GitHub Copilot / Claude Sonnet 4.6 | ~20.000               | ~12.000             | ~$0.24               |
| Debugging (Babel error, duplicate http, light theme)      | GitHub Copilot / Claude Sonnet 4.6 | ~40.000               | ~18.000             | ~$0.39               |
| Atualização de documentação MD                            | GitHub Copilot / Claude Sonnet 4.6 | ~30.000               | ~20.000             | ~$0.44               |
| **Total da fase**                                         |                                    | **~310.000**          | **~220.000**        | **~$4.26**           |

> **Nota:** Preços de referência: Claude Sonnet 4.6 ~$3/M tokens input, ~$15/M tokens output (junho 2026).

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                             | Membro (perfil)  | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações                      |
| ------------------------------------- | ---------------- | ---------------- | ------------------------ | -------------------------------- |
| Backend Fase 4 completo               | [Membro] (pleno) | 1.5h             | 0.5h                     | Rebuild Docker ~10 min           |
| Frontend Fase 4 (3 componentes novos) | [Membro] (pleno) | 1.5h             | 0.7h                     | Múltiplos erros de build         |
| Debug e correções (3 bugs)            | [Membro] (pleno) | 0.5h             | 0.3h                     | Babel, auth, tema claro          |
| Atualização documentação MD           | [Membro] (pleno) | 0.3h             | 0.5h                     | Revisão de textos                |
| **Total da fase**                     |                  | **3.8h**         | **2.0h**                 | **5.8h total de esforço humano** |

#### Camada 3 — Estimativa contrafactual

| Atividade                                     | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| --------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| AuditRepository + middleware + endpoint admin | Sênior             | 8.0h                      | R$ 115               | R$ 920                     |
| WebhookRepository + HMAC + CRUD + receiver    | Sênior             | 10.0h                     | R$ 115               | R$ 1.150                   |
| WatchlistRepository + NotificationService     | Sênior             | 8.0h                      | R$ 115               | R$ 920                     |
| ArchitectureDriftService + snapshots API      | Sênior             | 10.0h                     | R$ 115               | R$ 1.150                   |
| LLM interpretation endpoint                   | Pleno              | 3.0h                      | R$ 75                | R$ 225                     |
| DriftTab.tsx (seleção por data + IA)          | Pleno              | 8.0h                      | R$ 75                | R$ 600                     |
| WatchlistTab.tsx                              | Pleno              | 5.0h                      | R$ 75                | R$ 375                     |
| AdminTab.tsx (Auditoria + Webhooks)           | Pleno              | 8.0h                      | R$ 75                | R$ 600                     |
| Wiring + global auth fix                      | Pleno              | 3.0h                      | R$ 75                | R$ 225                     |
| Documentação MD (5 arquivos)                  | Pleno              | 4.0h                      | R$ 75                | R$ 300                     |
| **Total da fase**                             |                    | **67.0h**                 |                      | **R$ 6.465**               |

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$4.26 USD (~R$ 23.43 a R$5.50/USD) + 5.8h de trabalho humano
- **Custo humano das 5.8h (perfil médio pleno):** ~R$ 435 (5.8h × R$75 média)
- **Custo total com IA:** ~R$ 458
- **Custo contrafactual sem IA:** ~R$ 6.465
- **Razão de economicidade:** 14.1x (cada R$1 gasto com IA equivaleu a ~R$14.10 sem IA)
- **Saving estimado:** ~R$ 6.007 (92.9%)

### Lições aprendidas

- Injeção de auth em camada de infraestrutura (`http.ts`) é superior a passar headers manualmente em cada serviço — elimina toda uma classe de bugs
- HMAC com `hmac.compare_digest()` (timing-safe) é obrigatório para validação de webhooks — comparação direta de strings é vulnerável a timing attacks
- Middleware de auditoria deve ser construído como camada cross-cutting e não lógica em cada controller — muito mais manutenível
- Compactação de contexto em sessões longas requer session memory estruturada para não perder estado de decisões anteriores
- `secrets.token_hex(32)` (256 bits) é o padrão adequado para geração de segredos HMAC — `uuid4` não tem entropia suficiente

---

## Fase: Melhorias e Qualidade (2026-06-30)

Sessão de iteração pós-Ressonância focada em UX avançado, evolução profunda de feature de Dívida Técnica com análise por IA e cobertura de testes unitários.

### Onde a IA ajudou

- **HotspotsTab — reescrita completa:** A IA reescreveu o componente do zero com `BubbleChart` SVG interativo (eixo X=churn, Y=complexidade ciclomática, tamanho das bolhas=LOC, cor=risco), quadrante `ZONA DE RISCO` com dividers, handle de threshold arrastável (visual), chips de filtro por linguagem e nível de risco, e barras animadas de CC + churn por arquivo via Framer Motion.
- **TechDebtService v2 — análise multidimensional:** A IA expandiu o `TechDebtService` com cálculo de 5 dimensões separadas (complexidade, churn, tamanho, acoplamento, documentação), identificação de tendência (`improving/stable/degrading` por delta do score anterior), e breakdown por categoria normalizado 0–100. O modelo `TechDebtSnapshot` ganhou 8 novos campos e o PostgreSQL migra automaticamente via `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- **PROMPT-010 — Análise de Dívida por Boas Práticas:** A IA projetou e implementou o PROMPT-010, que recebe métricas dos top-8 arquivos hotspot e avalia contra Clean Code, SOLID, DRY, KISS, YAGNI e Clean Architecture. Retorna Score de Dívida, Principais Problemas categorizados, Ações Priorizadas com impacto, e Diagnóstico de tendência. Invocado pelo `POST /api/repos/{id}/tech-debt/analyse` (endpoint novo on-demand, sem LLM na indexação automática).
- **TechDebtTab.tsx — reescrita com 5 novos componentes:** `TrendBadge` (↓/→/↑ com cores), `DebtBreakdownCard` (5 barras animadas por categoria com referência ao princípio violado), `MetricSparkline` (mini sparklines SVG para CC, churn e comment ratio), `ScoreTrendChart` (linha temporal com pontos coloridos por severidade e gridline de zona crítica ≥75), `LlmSummaryCard` (renderizador de Markdown simples para o resumo do PROMPT-010) e botão "Analisar Agora" com estado de loading.
- **Testes unitários (5 novos arquivos):** A IA criou `test_hotspot_service.py` (13 testes — fórmula de score, ordenação, filtragem, edge cases), `test_chat_service.py` (13 testes — happy path + error cases com mocks), `test_plan_enforcer.py` (17 testes — todos os planos + bypass admin + limites), `test_token_service.py` (18 testes — JWT issue/decode/round-trip/expiração) e corrigiu `test_auth_service.py` (mocks corretos, mensagens em PT-BR, validação de senha mínima 8 chars).
- **Fix de declaração duplicada:** A IA identificou e removeu a segunda declaração do componente `BranchAnalysisTab` (linhas 511–672 de um arquivo de 672 linhas) causada por operação `Set-Content` do PowerShell que havia inserido o conteúdo duas vezes.
- **Atualização completa dos arquivos MD (4 arquivos):** README.md, CATALOGO_PROMPTS.md, COMO_FUNCIONA.md e ARCHITECTURE.md atualizados com as novas features, PROMPT-010 e listas de componentes.

### Onde a IA não ajudou (ou atrapalhou)

- **Escrita via PowerShell Set-Content:** A escrita do `TechDebtTab.tsx` via Python `-c` foi truncada por limitação de tamanho da string no PowerShell. Foi necessário usar arquivo script intermediário (`write_techdebt_tab.py`) copiado e executado pelo Python.
- **Encoding de string em verificação inline:** A checagem de keywords com acentos (ex: `"Análise de Dívida Técnica"`) em Python `-c` no PowerShell falhou por escape de caracteres; foi necessário usar `grep_search` como alternativa.

### Prompts notáveis desta fase

- "na parte de hotspot eu gostaria de uma UI e UX mais significativa e com melhor acesso. Melhore essa feature e evolua para trazer mais valor"
- "Eu quero evoluir no projeto a parte de 'Debito Tecnico'... Faça uma analise primeiro para depois começar implementar. Mapei tudo e me traga aqui um resultado sem implementar nada por enquanto."
- "Implemente agora essas novas melhorias e features"
- "Agora eu gostaria de investir na parte de testes. Analise meu projeto por completo e crie alguns testes unitarios"
- "Agora apos todas as atualizações do projeto eu gostaria que você atualizasse os arquivos MD do projeto"

### Decisões tomadas sem IA

- **Escopo da análise antes da implementação:** O usuário solicitou explicitamente a análise antes de implementar — decisão consciente de validar o design antes do código
- **Priorização de Dívida Técnica sobre Branch:** O usuário escolheu evoluir TechDebt em vez de Branch (que havia sido mencionado anteriormente mas não implementado)
- **Design do PROMPT-010:** A escolha dos princípios a avaliar (SOLID, DRY, KISS, YAGNI, Clean Architecture) foi definida pelo usuário; a IA estruturou o template

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA

| Atividade                                             | Ferramenta/Modelo                  | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
| ----------------------------------------------------- | ---------------------------------- | --------------------- | ------------------- | -------------------- |
| HotspotsTab — análise + reescrita completa            | GitHub Copilot / Claude Sonnet 4.6 | ~55.000               | ~30.000             | ~$0.62               |
| TechDebt — análise semântica profunda (pré-impl.)     | GitHub Copilot / Claude Sonnet 4.6 | ~40.000               | ~22.000             | ~$0.45               |
| TechDebt backend v2 (snapshot + service + controller) | GitHub Copilot / Claude Sonnet 4.6 | ~50.000               | ~28.000             | ~$0.57               |
| TechDebtTab.tsx — reescrita frontend (5 componentes)  | GitHub Copilot / Claude Sonnet 4.6 | ~35.000               | ~25.000             | ~$0.48               |
| Testes unitários (5 novos arquivos, ~80 testes)       | GitHub Copilot / Claude Sonnet 4.6 | ~30.000               | ~18.000             | ~$0.36               |
| Fix BranchAnalysisTab + debugging                     | GitHub Copilot / Claude Sonnet 4.6 | ~8.000                | ~4.000              | ~$0.08               |
| Atualização MD (4 arquivos + PROMPT-010)              | GitHub Copilot / Claude Sonnet 4.6 | ~28.000               | ~18.000             | ~$0.35               |
| **Total da fase**                                     |                                    | **~246.000**          | **~145.000**        | **~$2.91**           |

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade                              | Membro (perfil)  | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações                             |
| -------------------------------------- | ---------------- | ---------------- | ------------------------ | --------------------------------------- |
| HotspotsTab rewrite + validação visual | [Membro] (pleno) | 0.5h             | 0.3h                     | Rebuild Docker + verificação no browser |
| TechDebt análise + aprovação do design | [Membro] (pleno) | 0.3h             | 0.2h                     | Revisão do mapeamento                   |
| TechDebt v2 implementação + rebuild    | [Membro] (pleno) | 0.5h             | 0.3h                     | Rebuild Docker + teste do endpoint      |
| Testes unitários (leitura e validação) | [Membro] (pleno) | 0.3h             | 0.2h                     | Revisão de cobertura                    |
| Fix duplicata + MD updates             | [Membro] (pleno) | 0.2h             | 0.2h                     | Verificação visual                      |
| **Total da fase**                      |                  | **1.8h**         | **1.2h**                 | **3.0h total de esforço humano**        |

#### Camada 3 — Estimativa contrafactual

| Atividade                                           | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
| --------------------------------------------------- | ------------------ | ------------------------- | -------------------- | -------------------------- |
| HotspotsTab (BubbleChart SVG + animações + filtros) | Sênior             | 12.0h                     | R$ 115               | R$ 1.380                   |
| TechDebt v2 backend (5 métricas + trend + endpoint) | Sênior             | 10.0h                     | R$ 115               | R$ 1.150                   |
| PROMPT-010 design + integração LLM                  | Sênior             | 4.0h                      | R$ 115               | R$ 460                     |
| TechDebtTab.tsx (5 componentes + charts SVG)        | Pleno              | 10.0h                     | R$ 75                | R$ 750                     |
| Testes unitários (~80 testes em 5 arquivos)         | Pleno              | 8.0h                      | R$ 75                | R$ 600                     |
| Diagnóstico + fix de duplicata                      | Pleno              | 1.0h                      | R$ 75                | R$ 75                      |
| Atualização de documentação (4 arquivos MD)         | Pleno              | 4.0h                      | R$ 75                | R$ 300                     |
| **Total da fase**                                   |                    | **49.0h**                 |                      | **R$ 4.715**               |

### Análise parcial de economicidade (esta fase)

- **Custo real com IA:** ~$2.91 USD (~R$ 16.01 a R$5.50/USD) + 3.0h de trabalho humano
- **Custo humano das 3.0h (perfil médio pleno):** ~R$ 225 (3.0h × R$75 média)
- **Custo total com IA:** ~R$ 241
- **Custo contrafactual sem IA:** ~R$ 4.715
- **Razão de economicidade:** 19.6x (cada R$1 gasto com IA equivaleu a ~R$19.60 sem IA)
- **Saving estimado:** ~R$ 4.474 (94.9%)

### Lições aprendidas

- Solicitar análise prévia antes da implementação ("mapear antes de codificar") evita retrabalho e melhora a qualidade do design — especialmente em features com múltiplas camadas
- A separação entre `take_snapshot` (automático, sem LLM) e `analyse_and_save` (on-demand, com LLM) é o padrão correto para features de análise custosa — nunca bloquear a indexação com chamadas LLM
- Arquivo Python intermediário para escrita de TSX longo é mais confiável que `-c` inline no PowerShell
- Testes unitários com mocks claros e isolamento de dependências externas exigem leitura prévia profunda do código de produção — a IA precisa de contexto real para gerar testes úteis

---

## Reflexão final

Este projeto demonstrou de forma concreta que engenharia de software com IA generativa não é apenas uma aceleração de produtividade marginal — é uma mudança qualitativa na forma como sistemas complexos são projetados e construídos. Em aproximadamente 6 semanas de trabalho distribuídas em 6 fases, uma plataforma completa de análise de código foi erguida do zero: backend Python/FastAPI com arquitetura hexagonal, frontend React/TypeScript, pipeline RAG, análise de grafos de dependência, detecção de drift arquitetural, dívida técnica multidimensional com LLM, audit log, webhooks HMAC, watchlist com notificações e 80+ testes unitários.

O custo total de IA foi **~$33.66 USD** para uma equivalência de trabalho estimada em **~329 horas** de desenvolvimento profissional, representando uma economia de **~94.8%** frente ao desenvolvimento tradicional. A razão de economicidade de **19.4x** sustentou-se ao longo de todo o semestre — não foi um pico isolado de uma fase.

A IA não substituiu o engenheiro — ela eliminou o atrito de implementação. Decisões de arquitetura, priorização de features, validação de segurança, escolha de patterns e design de prompts continuaram sendo trabalho humano. O que a IA assumiu foi a tradução dessas decisões em código correto, consistente e testado.

### Métricas de uso de IA (estimadas)

| Atividade               | % assistida por IA | Ferramentas                                        |
| ----------------------- | ------------------ | -------------------------------------------------- |
| Escrita de código       | ~95%               | GitHub Copilot (Claude Sonnet 4.6 / Claude Opus 4) |
| Geração de testes       | ~95%               | GitHub Copilot (Claude Sonnet 4.6)                 |
| Documentação            | ~85%               | GitHub Copilot (Claude Sonnet 4.6)                 |
| Design de prompts       | ~40%               | Manual + GitHub Copilot                            |
| Análise de requisitos   | ~70%               | GitHub Copilot / ChatLLM                           |
| Debugging e diagnóstico | ~80%               | GitHub Copilot (Claude Sonnet 4.6)                 |
| Decisões de arquitetura | ~20%               | Manual (IA como consultor)                         |

### Consolidado de economicidade do projeto

#### Custo real de IA (total do projeto)

| Fase                  | Tokens entrada | Tokens saída | Custo IA (USD) | Custo IA (R$)  |
| --------------------- | -------------- | ------------ | -------------- | -------------- |
| Pré-proposta          | ~30.000        | ~57.000      | ~$1.08         | ~R$ 5.94       |
| Exposição             | ~186.000       | ~266.000     | ~$22.74        | ~R$ 125.07     |
| Composição            | ~88.000        | ~65.000      | ~$1.11         | ~R$ 6.11       |
| Ensaio                | ~92.000        | ~84.000      | ~$1.56         | ~R$ 8.58       |
| Ressonância           | ~310.000       | ~220.000     | ~$4.26         | ~R$ 23.43      |
| Melhorias e Qualidade | ~246.000       | ~145.000     | ~$2.91         | ~R$ 16.01      |
| **Total**             | **~952.000**   | **~837.000** | **~$33.66**    | **~R$ 185.13** |

#### Custo contrafactual humano (total do projeto)

| Fase                  | Horas totais estimadas | Custo humano estimado (R$) |
| --------------------- | ---------------------- | -------------------------- |
| Pré-proposta          | 31.0h                  | R$ 2.775                   |
| Exposição             | 136.0h                 | R$ 13.960                  |
| Composição            | 19.0h                  | R$ 1.985                   |
| Ensaio                | 27.0h                  | R$ 2.465                   |
| Ressonância           | 67.0h                  | R$ 6.465                   |
| Melhorias e Qualidade | 49.0h                  | R$ 4.715                   |
| **Total**             | **329.0h**             | **R$ 32.365**              |

#### Análise comparativa

- **Custo total com IA (R$):** ~R$ 185 (IA) + ~R$ 1.485 (trabalho humano nas sessões) = **~R$ 1.670**
- **Custo total estimado sem IA (R$):** ~R$ 32.365
- **Razão de economicidade:** **~19.4x** (custo sem IA / custo com IA)
- **Saving estimado (R$):** ~R$ 30.695
- **Saving estimado (%):** ~94.8%

> **Atenção às limitações desta análise:**
> (1) O contrafactual é uma estimativa subjetiva — há viés de retrospecto.
> (2) O custo com IA não inclui o tempo de aprendizado das ferramentas (curva de adoção).
> (3) A qualidade do output pode diferir entre as abordagens.
> (4) Há atividades onde a IA aumentou o tempo total — esses casos devem ser documentados.

### O que mudaria se fizesse novamente?

1. **Começar com Claude Sonnet, não Opus.** A Fase de Exposição usou Claude Opus 4 (~$22.74 de ~$30.75 totais de IA) — 67% do custo total em uma fase só. Sonnet 4.6 entrega qualidade equivalente para implementação a 1/5 do preço por token. A troca do modelo no meio do projeto foi a decisão mais impactante economicamente.

2. **Criar testes unitários junto com a implementação, não depois.** Os testes foram criados em sessão separada, o que exigiu que a IA relesse e reinterpretasse todo o código de produção. Fazer isso na mesma sessão de implementação economizaria tokens e produziria testes mais aderentes.

3. **Manter session memory estruturada desde o início.** A compactação de contexto em sessões longas causou perda de estado várias vezes, forçando re-exploração de arquivos já lidos. Um arquivo `/memories/session/plan.md` atualizado a cada fase teria eliminado esse retrabalho.

4. **Definir o CATALOGO_PROMPTS.md antes de usar prompts repetidamente.** Os prompts de sistema (SYSTEM_PROMPT_007, PROMPT-010, etc.) foram criados ad hoc. Catalogar desde o início com template fixo teria facilitado reutilização entre fases.

5. **Validar UI visualmente antes de rebuild Docker completo.** Vários rebuilds (~10 min cada por PyTorch) foram feitos para corrigir bugs de CSS/Tailwind que poderiam ser detectados antes do build via inspeção de código.

6. **Criar specs para features avançadas como para as básicas.** Features como Drift Arquitetural e Tech Debt v2 foram implementadas sem `design.md`/`tasks.md` formais. A estrutura de spec das fases iniciais produziu output de maior qualidade com menos iterações.

### Recomendações para outras equipes

**Sobre o uso de modelos:**

- Use Claude Sonnet (ou equivalente mid-tier) para implementação de código — o delta de qualidade em relação ao Opus/GPT-4o em tarefas de código não justifica o custo 5x maior.
- Reserve modelos premium (Opus, o1) para raciocínio arquitetural profundo, revisão de segurança crítica e design de prompts complexos.
- Defina `LLM_MODEL` como variável de ambiente desde o início — trocar modelos em produção sem isso é trabalhoso.

**Sobre gestão de contexto:**

- Em sessões longas (>100 mensagens), escreva um `session_plan.md` com estado atual antes de cada sub-tarefa. A compactação de contexto é inevitável e silenciosa — não descubra quando já perdeu o estado.
- Documente decisões de arquitetura em arquivos dedicados (`ARCHITECTURE.md`) logo após tomá-las. A IA não lembra entre sessões — mas lê arquivos.

**Sobre implementação:**

- O padrão "in-memory fallback em todos os adapters" é obrigatório para times que precisam desenvolver sem infraestrutura rodando. A produtividade local dobra.
- Para escrever arquivos grandes (>200 linhas) via IA em terminal Windows, use scripts Python intermediários — nunca `python -c` com string inline ou `Set-Content` com acentos.
- Peça análise antes de implementação: "mapeie tudo sem implementar" produz designs melhores que pedir código direto.

**Sobre economicidade:**

- Meça tokens e custos por fase desde o início — a surpresa da Fase de Exposição com Claude Opus 4 ($22.74 de $33.66 totais) só foi identificada retroativamente.
- O contrafactual em horas deve ser estimado por quem conhece o domínio, não pela IA — o viés de retrospecto da IA inflaciona o contrafactual; o viés humano tende a subestimar.
- Uma razão de economicidade sustentada acima de 10x ao longo de um semestre é realista e replicável em contextos acadêmicos e de startups.

**Sobre segurança:**

- Nenhuma credencial deve existir hardcoded nem por um commit — o histórico de chat também vaza segredos. Rogue todas as chaves que aparecerem em conversas com IA.
- Webhooks externos sempre com `hmac.compare_digest()` — nunca comparação direta de strings.
- Audit log como middleware cross-cutting, não lógica em controllers — é mais seguro e garantido.
