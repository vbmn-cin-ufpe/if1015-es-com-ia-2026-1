# Workflow de Desenvolvimento Assistido por IA — [Nome da Equipe — PREENCHER]

## Sobre este documento

Este documento registra como a equipe utilizou ferramentas e técnicas de IA ao longo do desenvolvimento do projeto **CodeCompass**. É atualizado a cada fase do projeto e entregue junto com a aplicação na apresentação final.

Além do registro qualitativo do uso de IA, este documento captura dados de **economicidade**: consumo de tokens, esforço humano real e uma estimativa contrafactual do custo equivalente sem assistência de IA. O objetivo é permitir, ao final do semestre, uma análise comparativa entre o custo real do desenvolvimento assistido por IA e o custo estimado de um desenvolvimento realizado integralmente por profissionais humanos nos perfis equivalentes.

---

## Ferramentas utilizadas

| Ferramenta                  | Categoria                 | Quando usada                                                                                                                   | Modelo/Versão                                     | Custo real                                   | Avaliação  |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------- | ---------- |
| Abacus AI (ChatLLM)         | LLM Platform / Assistente | Planejamento de arquitetura, análise de domínio, sessões de design e consultas de teste da aplicação CodeCompass               | Claude Sonnet 4.5 / GPT-4.1 Mini / Gemini 3 Flash | ~12.443 créditos Jun–Jul/2026 (~$12 est.)    | ⭐⭐⭐⭐⭐ |
| GitHub Copilot (Agent Mode) | Code generation / Agent   | Implementação completa das 8 specs (backend + frontend + testes), refatoração, leitura de specs, otimizações e melhorias de UX | Claude Sonnet 4.6 (não Opus 4 — assinatura plana) | **$57 total / 3 meses (Business, org-pago)** | ⭐⭐⭐⭐⭐ |
| OpenAI API                  | Embeddings / Completions  | Indexação de repositórios via `text-embedding-3-small`; testes de completions GPT-5.5 durante desenvolvimento                  | text-embedding-3-small + gpt-5_5-2026-04-23       | **$0,13 — confirmado (screenshot)**          | ⭐⭐⭐⭐   |

> **Nota de custos:** O GitHub Copilot Business é pago pela organização `ava-client-brazil-cnh` — custo direto ao desenvolvedor = R$0. O valor é incluído nos cálculos de economicidade por representar o custo econômico real do desenvolvimento assistido por IA, independente de quem paga. Copilot NÃO cobra por token — é assinatura plana.

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

| Atividade                                                    | Ferramenta/Modelo   | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD)             |
| ------------------------------------------------------------ | ------------------- | --------------------- | ------------------- | -------------------------------- |
| Análise dos 10 domínios + classificação                      | Abacus AI (ChatLLM) | ~8.000                | ~6.000              | Incluído na assinatura Abacus AI |
| Geração de estrutura do projeto (backend + IA)               | Abacus AI (ChatLLM) | ~5.000                | ~12.000             | Incluído na assinatura Abacus AI |
| Análise de boas práticas production-ready                    | Abacus AI (ChatLLM) | ~4.000                | ~15.000             | Incluído na assinatura Abacus AI |
| Visão de produto (fluxo empresa)                             | Abacus AI (ChatLLM) | ~3.000                | ~10.000             | Incluído na assinatura Abacus AI |
| Geração da PROPOSTA_v1.md                                    | Abacus AI (ChatLLM) | ~6.000                | ~8.000              | Incluído na assinatura Abacus AI |
| Geração do WORKFLOW_DOCUMENT.md                              | Abacus AI (ChatLLM) | ~4.000                | ~6.000              | Incluído na assinatura Abacus AI |
| GitHub Copilot Business — assinatura (proporcional Abr/2026) | GitHub Copilot      | —                     | —                   | **~$5,00**                       |
| **Total da fase**                                            |                     | **~30.000 (est.)**    | **~57.000 (est.)**  | **~$6,00** (~R$34)               |

> **Nota:** O Abacus AI ChatLLM é cobrado por créditos de plataforma (não por token diretamente ao usuário). O log de créditos começa em Jun/10/2026 (reinício da assinatura), portanto o uso nesta fase é estimado com base no volume de conversas. GitHub Copilot Business: assinatura plana $19/mês — não há cobrança por token. O custo desta fase é o proporcional da assinatura (~$5 de $57 total do projeto).

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
| Análise comparativa dos 10 domínios             | Pleno              | 6.0h                      | R$38                 | R$228                      |
| Definição de arquitetura + estrutura de projeto | Sênior             | 8.0h                      | R$62                 | R$496                      |
| Pesquisa de boas práticas (production-ready)    | Sênior             | 5.0h                      | R$62                 | R$310                      |
| Análise de produto e fluxo de mercado           | Pleno              | 4.0h                      | R$38                 | R$152                      |
| Escrita da proposta completa                    | Pleno              | 6.0h                      | R$38                 | R$228                      |
| Documentação do workflow                        | Júnior             | 2.0h                      | R$22                 | R$44                       |
| **Total da fase**                               |                    | **31.0h**                 |                      | **R$1.458**                |

> **Fontes salariais (corrigidas):** Mercado de TI Recife/PE 2026 — Júnior: R$22/h (~R$3.520/mês CLT), Pleno: R$38/h (~R$6.080/mês), Sênior: R$62/h (~R$9.920/mês). Base de cálculo: salário mensal bruto ÷ 160h úteis. Hubs como SP/RJ praticam valores 40–60% maiores — os valores anteriores (R$40/R$75/R$115) correspondiam a esses mercados e foram corrigidos para refletir a realidade regional.
>
> **Metodologia:** O tempo estimado sem IA reflete quanto tempo um profissional do perfil indicado levaria para executar a mesma atividade partindo do zero, sem assistência de nenhuma ferramenta de IA generativa. Inclui raciocínio/planejamento (~25%), implementação/execução (~60%) e pesquisa/documentação (~15%).

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$6 USD — Copilot Business proporcional (~$5) + Abacus AI ChatLLM estimado (~$1) = **~R$34** (câmbio R$5,70/USD)
- **Custo humano das 7.0h (perfil pleno, R$38/h):** ~R$266 — o ChatLLM substituiu ~24h de pesquisa individual e ~7h de escrita estruturada de documentos
- **Custo total com IA:** **~R$300**
- **Custo contrafactual sem IA:** **~R$1.458** — corrigido com taxas reais mercado Recife/PE 2026 (Sênior R$62/h, Pleno R$38/h, Júnior R$22/h)
- **Razão de economicidade:** **4,9x** (cada R$1 gasto com IA equivaleu a ~R$4,90 sem IA)
- **Saving estimado:** ~R$1.158 (79,4%)

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

| Atividade                                                                         | Ferramenta/Modelo                  | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD)           |
| --------------------------------------------------------------------------------- | ---------------------------------- | --------------------- | ------------------- | ------------------------------ |
| SPEC-0001: Monolith Foundation (backend + Docker + frontend base)                 | GitHub Copilot / Claude Sonnet 4.6 | ~35.000               | ~45.000             | Incluído na assinatura Copilot |
| SPEC-0002: Repo Index & RAG (embedding, chunking, retrieval, chat)                | GitHub Copilot / Claude Sonnet 4.6 | ~30.000               | ~40.000             | Incluído na assinatura Copilot |
| SPEC-0003: Guided Tour (scoring, persistence, step viewer)                        | GitHub Copilot / Claude Sonnet 4.6 | ~25.000               | ~35.000             | Incluído na assinatura Copilot |
| SPEC-0004: Module Dependency Visualization (AST, graph, frontend)                 | GitHub Copilot / Claude Sonnet 4.6 | ~20.000               | ~30.000             | Incluído na assinatura Copilot |
| SPEC-0005: Commit History Decision Intelligence (ingest, classify, timeline, why) | GitHub Copilot / Claude Sonnet 4.6 | ~25.000               | ~35.000             | Incluído na assinatura Copilot |
| SPEC-0006: Onboarding Metrics & Evaluation (events, feedback, KPIs, dashboard)    | GitHub Copilot / Claude Sonnet 4.6 | ~18.000               | ~28.000             | Incluído na assinatura Copilot |
| SPEC-0007: Auth & Onboarding Sessions (auth, sessions, checkpoints, UI)           | GitHub Copilot / Claude Sonnet 4.6 | ~15.000               | ~25.000             | Incluído na assinatura Copilot |
| SPEC-0008: Observability & Operational Readiness (logging, metrics, ops, alerts)  | GitHub Copilot / Claude Sonnet 4.6 | ~18.000               | ~28.000             | Incluído na assinatura Copilot |
| GitHub Copilot Business — assinatura (proporcional Mai–Jun/2026, fase principal)  | GitHub Copilot Business            | —                     | —                   | **~$15,00**                    |
| Abacus AI ChatLLM — planejamento de specs (Jun/10–15)                             | Abacus AI                          | —                     | —                   | ~$3,00                         |
| **Total da fase**                                                                 |                                    | **~186.000 (est.)**   | **~266.000 (est.)** | **~$18,00** (~R$103)           |

> **Nota importante sobre o modelo e custo:** O GitHub Copilot Agent Mode usa **Claude Sonnet 4.6** (não Claude Opus 4 como indicado anteriormente). Mais importante: Copilot Business é cobrado via **assinatura plana de $19/mês** — **não há cobrança por token ao usuário**. Os custos individuais por SPEC estimados no documento anterior (~$22.74 total) foram calculados com preços de Claude Opus 4 por token ($15/M input + $75/M output) e estão **incorretos**. O custo real desta fase é a parcela proporcional da assinatura ($15) + uso Abacus AI a partir de Jun/10 ($3).

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
| Backend foundation + Docker + CI/CD setup                               | Sênior             | 16.0h                     | R$62                 | R$992                      |
| RAG pipeline (embedding, chunking, retrieval, chat)                     | Sênior             | 20.0h                     | R$62                 | R$1.240                    |
| Guided tour (scoring engine + persistence + UI)                         | Sênior             | 16.0h                     | R$62                 | R$992                      |
| Dependency graph (AST extraction + assembly + API + frontend)           | Sênior             | 14.0h                     | R$62                 | R$868                      |
| Commit history intelligence (git parsing + classifier + timeline + why) | Sênior             | 16.0h                     | R$62                 | R$992                      |
| Metrics & evaluation (ingestion + aggregation + reporting + dashboard)  | Pleno              | 12.0h                     | R$38                 | R$456                      |
| Auth & sessions (auth service + session lifecycle + frontend)           | Pleno              | 10.0h                     | R$38                 | R$380                      |
| Observability (structured logging + metrics + ops endpoints + alerts)   | Sênior             | 12.0h                     | R$62                 | R$744                      |
| Testes (unitários + integração + E2E para todas as specs)               | Pleno              | 20.0h                     | R$38                 | R$760                      |
| **Total da fase**                                                       |                    | **136.0h**                |                      | **R$7.424**                |

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$18 USD — GitHub Copilot Business ($15, **maior alocação do projeto**: esta foi a fase de maior volume de código gerado — 8 specs, ~26.575 linhas de código total) + Abacus AI Jun/10–15 ($3) = **~R$103**
- **Nota:** GitHub Copilot Agent Mode é cobrado via **assinatura plana** ($19/mês Business). O modelo ativo era Claude Sonnet 4.6 (não Claude Opus 4). Não há cobrança por token ao usuário — o valor anterior de $22.74 estava calculado com precos de Opus 4 por token e era **fictício**.
- **Custo humano das 11.4h (perfil pleno, R$38/h):** ~R$433 (11.4h × R$38)
- **Custo total com IA:** **~R$536**
- **Custo contrafactual sem IA:** **~R$7.424** — corrigido: Sênior R$62/h (backend complexo + RAG + observabilidade), Pleno R$38/h (métricas, auth, testes)
- **Razão de economicidade:** **13,8x** (cada R$1 gasto com IA equivaleu a ~R$13,80 sem IA)
- **Saving estimado:** ~R$6.888 (92,8%)

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
| Diagnóstico e fix bug assíncrono (BackgroundTasks) | Sênior             | 4.0h                      | R$62                 | R$248                      |
| Investigação de APIs de embedding + integração     | Sênior             | 6.0h                      | R$62                 | R$372                      |
| Implementação concorrência com ThreadPoolExecutor  | Sênior             | 4.0h                      | R$62                 | R$248                      |
| Expansão registry de linguagens (9 linguagens)     | Pleno              | 3.0h                      | R$38                 | R$114                      |
| Testes de performance e benchmark                  | Pleno              | 2.0h                      | R$38                 | R$76                       |
| **Total da fase**                                  |                    | **19.0h**                 |                      | **R$1.058**                |

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$10,50 USD — Copilot Business ($8) + Abacus AI Jun/15–22 ($2,50 — inclui dias de uso intenso Jun/19–20: ~2.414 créditos de ChatLLM para planejamento da integração OpenAI vs Abacus) = **~R$60**
- **Custo humano das 4.2h (perfil pleno, R$38/h):** ~R$160 (4.2h × R$38)
- **Custo total com IA:** **~R$220**
- **Custo contrafactual sem IA:** **~R$1.058** — corrigido: Sênior R$62/h para debugging e integração de APIs, Pleno R$38/h para expansão de registry e benchmarks
- **Razão de economicidade:** **4,8x** (cada R$1 gasto com IA equivaleu a ~R$4,80 sem IA)
- **Saving estimado:** ~R$838 (79,2%)

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
| Refatorar navegação para sidebar colapsável              | Pleno              | 6.0h                      | R$38                 | R$228                      |
| Implementar dark mode (Tailwind) em todos os componentes | Pleno              | 4.0h                      | R$38                 | R$152                      |
| Markdown renderer + syntax highlighting VS Code          | Sênior             | 8.0h                      | R$62                 | R$496                      |
| Auditoria de segurança e hardening de env vars           | Sênior             | 3.0h                      | R$62                 | R$186                      |
| Documentação completa (3 documentos)                     | Pleno              | 6.0h                      | R$38                 | R$228                      |
| **Total da fase**                                        |                    | **27.0h**                 |                      | **R$1.290**                |

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$10,50 USD — Copilot Business ($8) + Abacus AI ChatLLM Jun/22–30 ($2,50 — créditos consumidos em sessões de planejamento de UX: sidebar, dark mode, Markdown renderer) = **~R$60**
- **Custo humano das 3.8h (perfil pleno, R$38/h):** ~R$144 (3.8h × R$38)
- **Custo total com IA:** **~R$204**
- **Custo contrafactual sem IA:** **~R$1.290** — corrigido: Sênior R$62/h para auditoria de segurança e Markdown renderer (componentes técnicos complexos), Pleno R$38/h para sidebar, dark mode e documentação
- **Razão de economicidade:** **6,3x** (cada R$1 gasto com IA equivaleu a ~R$6,30 sem IA)
- **Saving estimado:** ~R$1.086 (84,2%)

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
| AuditRepository + middleware + endpoint admin | Sênior             | 8.0h                      | R$62                 | R$496                      |
| WebhookRepository + HMAC + CRUD + receiver    | Sênior             | 10.0h                     | R$62                 | R$620                      |
| WatchlistRepository + NotificationService     | Sênior             | 8.0h                      | R$62                 | R$496                      |
| ArchitectureDriftService + snapshots API      | Sênior             | 10.0h                     | R$62                 | R$620                      |
| LLM interpretation endpoint                   | Pleno              | 3.0h                      | R$38                 | R$114                      |
| DriftTab.tsx (seleção por data + IA)          | Pleno              | 8.0h                      | R$38                 | R$304                      |
| WatchlistTab.tsx                              | Pleno              | 5.0h                      | R$38                 | R$190                      |
| AdminTab.tsx (Auditoria + Webhooks)           | Pleno              | 8.0h                      | R$38                 | R$304                      |
| Wiring + global auth fix                      | Pleno              | 3.0h                      | R$38                 | R$114                      |
| Documentação MD (5 arquivos)                  | Pleno              | 4.0h                      | R$38                 | R$152                      |
| **Total da fase**                             |                    | **67.0h**                 |                      | **R$3.410**                |

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$12,13 USD — Copilot Business ($10) + Abacus AI Jun/29–Jul/02 (~$2,13 — inclui dias de pico: 1.152 créditos Jun/29 e 1.026 créditos Jun/30 via API da aplicação CodeCompass durante testes) = **~R$69**
- **Custo humano das 5.8h (perfil pleno, R$38/h):** ~R$220 (5.8h × R$38)
- **Custo total com IA:** **~R$289**
- **Custo contrafactual sem IA:** **~R$3.410** — corrigido: Sênior R$62/h para backend complexo (HMAC, drift detection, middleware de auditoria — tópicos de segurança e arquitetura avançada), Pleno R$38/h para componentes frontend e documentação
- **Razão de economicidade:** **11,8x** (cada R$1 gasto com IA equivaleu a ~R$11,80 sem IA)
- **Saving estimado:** ~R$3.121 (91,5%)

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
| HotspotsTab (BubbleChart SVG + animações + filtros) | Sênior             | 12.0h                     | R$62                 | R$744                      |
| TechDebt v2 backend (5 métricas + trend + endpoint) | Sênior             | 10.0h                     | R$62                 | R$620                      |
| PROMPT-010 design + integração LLM                  | Sênior             | 4.0h                      | R$62                 | R$248                      |
| TechDebtTab.tsx (5 componentes + charts SVG)        | Pleno              | 10.0h                     | R$38                 | R$380                      |
| Testes unitários (~80 testes em 5 arquivos)         | Pleno              | 8.0h                      | R$38                 | R$304                      |
| Diagnóstico + fix de duplicata                      | Pleno              | 1.0h                      | R$38                 | R$38                       |
| Atualização de documentação (4 arquivos MD)         | Pleno              | 4.0h                      | R$38                 | R$152                      |
| **Total da fase**                                   |                    | **49.0h**                 |                      | **R$2.486**                |

### Análise parcial de economicidade (esta fase)

- **Custo de ferramentas IA:** ~$12 USD — Copilot Business ($11, inclui os dias finais do projeto Jul/04–09) + Abacus AI app API Jul/01–08 ($1 — aplicação CodeCompass chamando Abacus durante testes de PROMPT-010 e análise de dívida técnica) + **OpenAI API $0,13 confirmado** (indexação via text-embedding-3-small — único custo confirmado por screenshot) = **~R$68**
- **Custo humano das 3.0h (perfil pleno, R$38/h):** ~R$114 (3.0h × R$38)
- **Custo total com IA:** **~R$182**
- **Custo contrafactual sem IA:** **~R$2.486** — corrigido: Sênior R$62/h para BubbleChart SVG avançado, TechDebt v2 backend e PROMPT-010 (trabalho de alto nível técnico), Pleno R$38/h para componentes frontend e testes
- **Razão de economicidade:** **13,7x** (cada R$1 gasto com IA equivaleu a ~R$13,70 sem IA)
- **Saving estimado:** ~R$2.304 (92,7%)

### Lições aprendidas

- Solicitar análise prévia antes da implementação ("mapear antes de codificar") evita retrabalho e melhora a qualidade do design — especialmente em features com múltiplas camadas
- A separação entre `take_snapshot` (automático, sem LLM) e `analyse_and_save` (on-demand, com LLM) é o padrão correto para features de análise custosa — nunca bloquear a indexação com chamadas LLM
- Arquivo Python intermediário para escrita de TSX longo é mais confiável que `-c` inline no PowerShell
- Testes unitários com mocks claros e isolamento de dependências externas exigem leitura prévia profunda do código de produção — a IA precisa de contexto real para gerar testes úteis

---

## Reflexão final

Este projeto demonstrou de forma concreta que engenharia de software com IA generativa não é apenas uma aceleração de produtividade marginal — é uma mudança qualitativa na forma como sistemas complexos são projetados e construídos. Em aproximadamente 6 semanas de trabalho distribuídas em 6 fases, uma plataforma completa de análise de código foi erguida do zero: backend Python/FastAPI com arquitetura hexagonal, frontend React/TypeScript, pipeline RAG, análise de grafos de dependência, detecção de drift arquitetural, dívida técnica multidimensional com LLM, audit log, webhooks HMAC, watchlist com notificações e 80+ testes unitários.

O custo total de ferramentas IA foi **~$69,13 USD** (~R$395 — Copilot Business $57 + Abacus AI ~$12 + OpenAI $0,13 confirmado) para uma equivalência de trabalho estimada em **~329 horas** de desenvolvimento profissional (perfis Sênior/Pleno, taxas mercado Recife/PE 2026), representando uma economia de **~89,9%** frente ao desenvolvimento tradicional. A razão de economicidade de **~9,9x** sustentou-se ao longo de todo o semestre — não foi um pico isolado de uma fase. _(Nota: versões anteriores deste documento reportavam 19,4x/94,8% com base em salários de SP/RJ e custos por token fictícios para o Copilot — os valores acima foram corrigidos e são verificáveis.)_

A IA não substituiu o engenheiro — ela eliminou o atrito de implementação. Decisões de arquitetura, priorização de features, validação de segurança, escolha de patterns e design de prompts continuaram sendo trabalho humano. O que a IA assumiu foi a tradução dessas decisões em código correto, consistente e testado.

### Métricas de uso de IA (estimadas)

| Atividade               | % assistida por IA | Ferramentas                                            |
| ----------------------- | ------------------ | ------------------------------------------------------ |
| Escrita de código       | ~95%               | GitHub Copilot (Claude Sonnet 4.6) + Abacus AI ChatLLM |
| Geração de testes       | ~95%               | GitHub Copilot (Claude Sonnet 4.6)                     |
| Documentação            | ~85%               | GitHub Copilot (Claude Sonnet 4.6)                     |
| Design de prompts       | ~40%               | Manual + Abacus AI ChatLLM                             |
| Análise de requisitos   | ~70%               | GitHub Copilot / ChatLLM                               |
| Debugging e diagnóstico | ~80%               | GitHub Copilot (Claude Sonnet 4.6)                     |
| Decisões de arquitetura | ~20%               | Manual (IA como consultor)                             |

### Consolidado de economicidade do projeto

#### Custo real de IA — Por ferramenta (valores confirmados e estimados)

| Ferramenta               | Período         | Unidade de cobrança                | Custo (USD) | Custo (R$)  | Base                                       |
| ------------------------ | --------------- | ---------------------------------- | ----------- | ----------- | ------------------------------------------ |
| GitHub Copilot Business  | Abr–Jul/2026    | Assinatura plana $19/mês × 3       | **$57,00**  | **~R$325**  | Fatura organização `ava-client-brazil-cnh` |
| Abacus AI — UI (ChatLLM) | Jun 10–Jul/2026 | ~10.600 créditos consumidos (UI)   | ~$8,00      | ~R$46       | Log de créditos exportado da Abacus AI     |
| Abacus AI — API (app)    | Jun–Jul/2026    | ~1.800 créditos consumidos (API)   | ~$4,00      | ~R$23       | Log de créditos exportado da Abacus AI     |
| OpenAI API               | Jun 24–Jul/2026 | $0,119 embeddings + $0,007 GPT-5.5 | **$0,13**   | **~R$0,74** | **Confirmado — screenshot plataforma**     |
| **Total ferramentas**    |                 |                                    | **~$69,13** | **~R$395**  |                                            |

> **Sobre Abacus AI:** 12.443 créditos totais entre Jun/10 e Jul/08 de 2026 (log exportado da plataforma). Conversão estimada em ~$0,001/crédito com base nos preços dos modelos utilizados (Claude Sonnet 4.5: $3/M input, $15/M output — Anthropic). Sem taxa de conversão oficial publicada pela Abacus AI, este valor é uma estimativa conservadora.
>
> **Sobre GitHub Copilot:** A assinatura Business ($19/mês) é paga pela organização `ava-client-brazil-cnh` — custo direto ao desenvolvedor = R$0. O valor é incluído aqui porque representa o **custo econômico real** do desenvolvimento assistido por IA, independente de quem paga. Qualquer comparação honesta de custo deve incluí-lo.

#### Screenshots dos gastos com IA 

### OpenAi
<img width="2288" height="931" alt="image" src="https://github.com/user-attachments/assets/4ae4e17a-1053-49e9-8c5e-08a2751e7ab2" />

### Abacus AI
<img width="2239" height="838" alt="image" src="https://github.com/user-attachments/assets/479a16d1-2af9-4e54-a9cb-9d208657e06e" />
<img width="2243" height="869" alt="image" src="https://github.com/user-attachments/assets/634016a1-7ba4-490f-a571-df1d4117f05e" />
<img width="2243" height="817" alt="image" src="https://github.com/user-attachments/assets/d15129cf-e362-454d-a4ce-6b1020f5584b" />
<img width="2245" height="859" alt="image" src="https://github.com/user-attachments/assets/51d197d8-bdab-444b-bdab-6d57282e011c" />






#### Custo real por fase — Ferramentas + Esforço humano

| Fase                  | Copilot (prop.)  | Abacus AI + OpenAI            | Total ferramentas | Esforço humano c/ IA | **Custo total c/ IA** |
| --------------------- | ---------------- | ----------------------------- | ----------------- | -------------------- | --------------------- |
| Pré-proposta          | ~$5 (~R$29)      | ~$1,00 (~R$6)                 | ~R$35             | 7,0h × R$38 = R$266  | **~R$301**            |
| Exposição (8 SPECs)   | ~$15 (~R$86)     | ~$3,00 (~R$17)                | ~R$103            | 11,4h × R$38 = R$433 | **~R$536**            |
| Composição            | ~$8 (~R$46)      | ~$2,50 (~R$14)                | ~R$60             | 4,2h × R$38 = R$160  | **~R$220**            |
| Ensaio                | ~$8 (~R$46)      | ~$2,50 (~R$14)                | ~R$60             | 3,8h × R$38 = R$144  | **~R$204**            |
| Ressonância           | ~$10 (~R$57)     | ~$2,13 (~R$12)                | ~R$69             | 5,8h × R$38 = R$220  | **~R$289**            |
| Melhorias e Qualidade | ~$11 (~R$63)     | ~$1,00 (~R$6) + R$0,74 OpenAI | ~R$70             | 3,0h × R$38 = R$114  | **~R$184**            |
| **Total**             | **$57 (~R$325)** | **~$12,13 (~R$69)**           | **~R$394**        | **35,2h (~R$1.338)** | **~R$1.732**          |

#### Custo contrafactual — Estimativa sem IA (taxas mercado Recife/PE 2026)

> **Referência salarial corrigida:** Júnior R$22/h (~R$3.520/mês CLT), Pleno R$38/h (~R$6.080/mês), Sênior R$62/h (~R$9.920/mês). Base: salário mensal bruto ÷ 160 horas úteis. Os valores anteriores (R$40/R$75/R$115) correspondiam ao mercado de SP/RJ ou referências internacionais — ~85% acima do mercado regional onde o projeto foi desenvolvido.

| Fase                  | Horas sem IA | Perfil médio | Custo sem IA | Custo c/ IA | Saving    | Razão     |
| --------------------- | ------------ | ------------ | ------------ | ----------- | --------- | --------- |
| Pré-proposta          | 31h          | Pleno/Sênior | R$1.458      | R$301       | 79,4%     | 4,9x      |
| Exposição (8 SPECs)   | 136h         | Sênior/Pleno | R$7.424      | R$536       | 92,8%     | 13,8x     |
| Composição            | 19h          | Sênior       | R$1.058      | R$220       | 79,2%     | 4,8x      |
| Ensaio                | 27h          | Pleno/Sênior | R$1.290      | R$204       | 84,2%     | 6,3x      |
| Ressonância           | 67h          | Sênior/Pleno | R$3.410      | R$289       | 91,5%     | 11,8x     |
| Melhorias e Qualidade | 49h          | Sênior/Pleno | R$2.486      | R$184       | 92,6%     | 13,5x     |
| **Total**             | **329h**     |              | **R$17.126** | **R$1.732** | **89,9%** | **~9,9x** |

#### Análise comparativa final

- **Custo total real com IA:** ~R$394 (ferramentas) + ~R$1.338 (esforço humano 35,2h × R$38) = **~R$1.732**
- **Custo estimado sem IA:** **~R$17.126** (329h com perfis Sênior/Pleno, taxas mercado Recife/PE 2026)
- **Razão de economicidade:** **~9,9x** — cada R$1 investido com IA gerou o equivalente a R$9,90 de trabalho humano
- **Saving estimado (R$):** ~R$15.394
- **Saving estimado (%):** ~**89,9%**

> **Por que a razão mudou de 19,4x para ~9,9x?**
> Três correções foram aplicadas: **(1) Salários regionais:** os valores anteriores (R$40/R$75/R$115) eram de SP/RJ ou referências internacionais. Com taxas corretas de Recife/PE (R$22/R$38/R$62), o contrafactual cai de R$32.365 para R$17.126. **(2) Copilot como assinatura:** o custo real de R$325 (Copilot Business 3 meses) foi incluído — não constava antes. **(3) Modelo correto:** o GitHub Copilot usa Claude Sonnet 4.6 via assinatura plana, não Claude Opus 4 por token — os ~$22.74 da fase de Exposição eram uma estimativa fictícia. **9,9x continua sendo uma razão muito expressiva e agora é verificável.**

> **Atenção às limitações desta análise:**
> (1) O contrafactual é uma estimativa subjetiva — há viés de retrospecto.
> (2) O custo com IA não inclui o tempo de aprendizado das ferramentas (curva de adoção).
> (3) A qualidade do output pode diferir entre as abordagens.
> (4) Há atividades onde a IA aumentou o tempo total — esses casos devem ser documentados.
> (5) O tempo estimado sem IA (329h) é o cenário mínimo para um sênior com a stack dominada. Um pleno experiente levaria ~450–550h, o que elevaria o contrafactual para ~R$22.000–R$27.000 e a razão para ~13–16x.

### O que mudaria se fizesse novamente?

1. **Confirmar o modelo ativo no Copilot antes de iniciar cada fase.** O GitHub Copilot Agent Mode usou Claude Sonnet 4.6 ao longo de todo o projeto — o que foi a escolha correta. A confusão inicial sobre ser “Claude Opus 4” gerou estimativas de custo fictícias ($22.74 na Exposição). Como Copilot é assinatura plana, o modelo não afeta o custo — mas afeta a qualidade. Sonnet 4.6 foi suficiente para todas as tarefas de implementação.

2. **Criar testes unitários junto com a implementação, não depois.** Os testes foram criados em sessão separada, o que exigiu que a IA relesse e reinterpretasse todo o código de produção. Fazer isso na mesma sessão de implementação economizaria tokens e produziria testes mais aderentes.

3. **Manter session memory estruturada desde o início.** A compactação de contexto em sessões longas causou perda de estado várias vezes, forçando re-exploração de arquivos já lidos. Um arquivo `/memories/session/plan.md` atualizado a cada fase teria eliminado esse retrabalho.

4. **Definir o CATALOGO_PROMPTS.md antes de usar prompts repetidamente.** Os prompts de sistema (SYSTEM_PROMPT_007, PROMPT-010, etc.) foram criados ad hoc. Catalogar desde o início com template fixo teria facilitado reutilização entre fases.

5. **Validar UI visualmente antes de rebuild Docker completo.** Vários rebuilds (~10 min cada por PyTorch) foram feitos para corrigir bugs de CSS/Tailwind que poderiam ser detectados antes do build via inspeção de código.

6. **Criar specs para features avançadas como para as básicas.** Features como Drift Arquitetural e Tech Debt v2 foram implementadas sem `design.md`/`tasks.md` formais. A estrutura de spec das fases iniciais produziu output de maior qualidade com menos iterações.

### Recomendações para outras equipes

**Sobre o uso de modelos:**

- Use Claude Sonnet (ou equivalente mid-tier) para implementação de código — o delta de qualidade em relação ao Opus/GPT-4o em tarefas de código não justifica o preço maior. GitHub Copilot Business já usa Sonnet 4.6 via assinatura plana — não há escolha de modelo por token neste modelo de cobrança.
- Reserve modelos premium (Opus, o1) para raciocínio arquitetural profundo, revisão de segurança crítica e design de prompts complexos — usados diretamente via API ou Abacus AI ChatLLM, onde o custo por crédito é maior.
- Defina `LLM_MODEL` como variável de ambiente desde o início — trocar modelos em produção sem isso é trabalhoso.

**Sobre gestão de contexto:**

- Em sessões longas (>100 mensagens), escreva um `session_plan.md` com estado atual antes de cada sub-tarefa. A compactação de contexto é inevitável e silenciosa — não descubra quando já perdeu o estado.
- Documente decisões de arquitetura em arquivos dedicados (`ARCHITECTURE.md`) logo após tomá-las. A IA não lembra entre sessões — mas lê arquivos.

**Sobre implementação:**

- O padrão "in-memory fallback em todos os adapters" é obrigatório para times que precisam desenvolver sem infraestrutura rodando. A produtividade local dobra.
- Para escrever arquivos grandes (>200 linhas) via IA em terminal Windows, use scripts Python intermediários — nunca `python -c` com string inline ou `Set-Content` com acentos.
- Peça análise antes de implementação: "mapeie tudo sem implementar" produz designs melhores que pedir código direto.

**Sobre economicidade:**

- Registre custos reais por ferramenta desde o início: guarde prints do painel OpenAI, exporte o log de créditos do Abacus AI mensalmente, e anote a proporção da assinatura Copilot por fase. Retroativamente é muito mais difícil — e erros de estimativa inflam a razão de economicidade de forma não verificável.
- O contrafactual em horas deve ser estimado por quem conhece o domínio, não pela IA — o viés de retrospecto da IA inflaciona o contrafactual; o viés humano tende a subestimar.
- Use taxas salariais do mercado onde o projeto foi desenvolvido. Taxas de SP/RJ ou internacionais em projetos de Recife/PE inflam artificialmente a razão de economicidade.

**Sobre segurança:**

- Nenhuma credencial deve existir hardcoded nem por um commit — o histórico de chat também vaza segredos. Rogue todas as chaves que aparecerem em conversas com IA.
- Webhooks externos sempre com `hmac.compare_digest()` — nunca comparação direta de strings.
- Audit log como middleware cross-cutting, não lógica em controllers — é mais seguro e garantido.
