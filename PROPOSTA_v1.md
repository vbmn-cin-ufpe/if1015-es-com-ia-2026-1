# Proposta de Projeto v1

**Equipe:** CodeCompass

**Membros:** 

> Victor Barros de Miranda Neves <vbmn@cin.ufpe.br>
> Vinicius Henrique Silva <vhs@cin.ufpe.br>
> Alexandre de Souza Cabral <asc5@cin.ufpe.br>
> Arthur Luis de Farias Alves <alfa@cin.ufpe.br>
> Getulio Junqueira de Queiroz Lima <gjql@cin.ufpe.br>
> Carlos Henrique da Silva Frey <chsf@cin.ufpe.br>

**Data:** 14/04/2026
**Versão:** 1.0

## 1. Título do projeto

> **CodeCompass — Onboarding Inteligente em Codebases Legados com IA**

## 2. Domínio e fase do SDLC

> **Domínio:** D8 — Onboarding de Desenvolvedores em Codebases Legados (Camada 3 — Território Aberto)
>
> **Fase do SDLC:** Manutenção e Evolução de Software. O onboarding de novos desenvolvedores é uma atividade recorrente e crítica na fase de manutenção — cada novo membro precisa compreender a arquitetura, as decisões históricas e as "regras não escritas" do sistema antes de contribuir de forma produtiva. A IA atua diretamente nesse gargalo do ciclo de vida.

## 3. Problema

> **Contexto:** Quando um desenvolvedor entra em um time que mantém um sistema de médio/grande porte, ele enfrenta semanas (às vezes meses) de ramp-up. O conhecimento sobre a codebase está disperso em código-fonte, mensagens de commit, Pull Requests, wikis desatualizadas e, principalmente, na cabeça dos desenvolvedores veteranos.
>
> **Usuário:** Desenvolvedores recém-chegados a um time (novatos, transferidos, terceirizados), e também tech leads que precisam facilitar esse processo.
>
> **Frequência:** Toda vez que há contratação, rotação de equipe ou expansão do time — em empresas de tecnologia, isso acontece continuamente.
>
> **Impacto:** Segundo pesquisas de mercado, o tempo médio de onboarding em codebases complexas é de 3-6 meses até produtividade plena. Durante esse período:
> - O novo dev interrompe veteranos com perguntas (~3-5h/semana por veterano)
> - Comete erros por desconhecimento de decisões arquiteturais não documentadas
> - Produz código que viola padrões implícitos do time, gerando retrabalho em code review
> - A empresa paga salário integral por produtividade parcial
>
> **O que acontece quando não é resolvido:** Alta rotatividade gera ciclos viciosos — cada saída leva conhecimento embora, cada entrada recomeça o processo do zero. Times com onboarding ruim têm maior turnover, criando um loop de perda de conhecimento institucional.

## 4. Trabalhos relacionados

> **1. Sourcegraph Cody**
> - **O que faz:** Assistente de código que usa contexto do repositório para responder perguntas e gerar código. Utiliza indexação semântica da codebase.
> - **Relação com nossa proposta:** Aborda o problema de compreensão de código, mas foca em code completion e perguntas pontuais — não oferece uma experiência estruturada de onboarding.
> - **Gap:** Não gera tours guiados, não analisa histórico de commits/PRs para explicar decisões, não mapeia a "jornada" do novo dev.
>
> **2. Swimm**
> - **O que faz:** Plataforma de documentação contínua que mantém docs sincronizados com o código. Permite criar walkthroughs interativos.
> - **Relação com nossa proposta:** Resolve parte do problema (documentação atualizada), mas depende de esforço manual dos veteranos para criar os walkthroughs.
> - **Gap:** Não usa IA para gerar automaticamente os tours, não analisa a codebase para identificar os pontos mais importantes para um novato.
>
> **3. Pesquisas em Program Comprehension + LLMs**
> - **Referências:**
>   - Nam, J. et al. (2024). "Using an LLM to Help With Code Understanding." *ICSE 2024*. DOI: 10.1145/3597503.3639187
>   - Hou, X. et al. (2024). "Large Language Models for Software Engineering: A Systematic Literature Review." *ACM TOSEM*, 33(8). DOI: 10.1145/3695988
>   - Ahmed, I. et al. (2025). "Artificial Intelligence for Software Engineering: The Journey So Far and the Road Ahead." *ACM TOSEM*, 34(5). DOI: 10.1145/3719006
> - **O que fazem:** Demonstram que LLMs podem explicar código, sumarizar funções e responder perguntas sobre repositórios quando alimentados com contexto adequado via RAG.
> - **Gap:** São pesquisas acadêmicas — não há uma ferramenta integrada que combine RAG sobre código + análise de commits + geração de tours + interface conversacional para onboarding.

## 5. Solução proposta

> **CodeCompass** é um assistente conversacional de onboarding que ajuda desenvolvedores novos a entender uma codebase legada de forma guiada e contextualizada.
>
> ### O que a aplicação faz:
> 1. **Indexa o repositório** — Clona o repo, faz parsing dos arquivos, extrai embeddings com modelo de código (CodeBERT/StarCoder), e armazena em vector DB (ChromaDB)
> 2. **Analisa o histórico** — Processa commits, PRs e mensagens para construir uma "narrativa" da evolução do código
> 3. **Gera tours guiados** — Identifica automaticamente os módulos mais importantes (por frequência de mudança, acoplamento, complexidade) e cria walkthroughs explicativos
> 4. **Responde perguntas** — Interface conversacional onde o dev pergunta em linguagem natural ("O que faz o módulo de pagamento?", "Por que usamos Redis aqui?") e recebe respostas contextualizadas via RAG
> 5. **Mapeia dependências** — Gera visualização de dependências entre módulos para orientação espacial na codebase
>
> ### Papel central da IA:
> - **LLM (Claude API):** Gera explicações, sumariza código, responde perguntas, cria narrativas de onboarding
> - **RAG (ChromaDB + embeddings):** Injeta contexto relevante do repositório no prompt, superando limitações de janela de contexto
> - **NLP sobre commits/PRs:** Extrai decisões históricas e "por quês" do código
> - **Análise estática + ML:** Identifica módulos críticos para priorizar no tour (complexidade ciclomática, frequência de mudança, acoplamento)

## 6. Arquitetura preliminar

> ### Componentes principais:
>
> ```
> [Dev Novato] → [Interface Web (Next.js)]
>                        ↓
>                [API Backend (FastAPI)]
>                   ↓          ↓           ↓
>          [GitHub Client] [RAG Engine] [LLM Client]
>               ↓              ↓            ↓
>          [Clone Repo]  [ChromaDB]   [Claude API]
>               ↓
>        [Analyzers]
>        ├── AST Parser
>        ├── Commit Analyzer
>        ├── Dependency Mapper
>        └── Complexity Analyzer
> ```
>
> **Backend:** Python/FastAPI — orquestra o pipeline de indexação, RAG e chamadas ao LLM
> **Frontend:** Next.js — interface conversacional + visualização de dependências + tours interativos
> **Vector DB:** ChromaDB — armazena embeddings de código para busca semântica
> **LLM:** Claude API (claude-sonnet-4-6) — geração de explicações e respostas
> **Banco de dados:** Supabase (PostgreSQL) — metadados de repos, sessões, histórico de perguntas
> **Análise de código:** radon (complexidade), AST nativo do Python, GitPython (histórico)

## 7. Escopo do MVP

> ### ✅ Entra no MVP:
> - Indexação de repositório Python via URL do GitHub
> - Busca semântica sobre o código (RAG com ChromaDB)
> - Chat conversacional: perguntas em linguagem natural sobre a codebase
> - Geração automática de tour guiado dos módulos mais importantes
> - Visualização básica de dependências entre módulos
> - Sumarização de arquivos/funções principais
>
> ### ❌ Fora do MVP:
> - Suporte a linguagens além de Python
> - Análise profunda de histórico de PRs (apenas commits no MVP)
> - Integração com Slack/Teams
> - Personalização do tour por role (backend dev vs frontend dev)
> - Métricas de progresso do onboarding
> - Deploy on-premise / self-hosted

## 8. Dependências técnicas

> | Dependência | Tipo | Risco |
> |---|---|---|
> | Claude API (Anthropic) | LLM | Baixo — API estável, plano gratuito limitado mas suficiente para MVP |
> | ChromaDB | Vector DB | Baixo — open source, roda local |
> | GitHub API | Integração | Baixo — rate limits generosos para repos públicos |
> | radon | Análise estática | Baixo — biblioteca Python madura |
> | CodeBERT / sentence-transformers | Embeddings | Médio — requer GPU para performance ideal, mas roda em CPU |
> | Supabase | Banco de dados | Baixo — free tier suficiente |
> | Repositórios Python open-source | Dados de teste | Baixo — abundantes no GitHub |
>
> **Risco principal:** Performance da indexação em repos grandes (>50k LOC). Mitigação: limitar tamanho no MVP e usar chunking inteligente.

## 9. Hipótese principal a validar

> **Um assistente conversacional alimentado por RAG sobre código-fonte e histórico de commits consegue reduzir significativamente o tempo que um desenvolvedor novo leva para responder perguntas básicas sobre uma codebase desconhecida, comparado a ler o código diretamente.**

## 10. Critério de sucesso

> O projeto será bem-sucedido se, ao final do semestre:
>
> 1. **Funcional:** A aplicação consegue indexar um repositório Python real (>10k LOC), responder perguntas sobre ele com respostas contextualizadas e gerar um tour guiado automaticamente
> 2. **Qualidade das respostas:** Em um teste com 20 perguntas sobre uma codebase conhecida, ≥70% das respostas são avaliadas como "úteis" ou "corretas" por um desenvolvedor familiarizado com o código
> 3. **Tempo de resposta:** Perguntas respondidas em <15 segundos (excluindo indexação inicial)
> 4. **Cobertura de testes:** ≥80% nos componentes core (RAG engine, analyzers)
> 5. **Processo documentado:** Workflow Document completo com registro de economicidade em todas as fases
