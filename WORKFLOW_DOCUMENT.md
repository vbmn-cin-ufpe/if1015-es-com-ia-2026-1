# Workflow de Desenvolvimento Assistido por IA — [Nome da Equipe — PREENCHER]

## Sobre este documento

Este documento registra como a equipe utilizou ferramentas e técnicas de IA ao longo do desenvolvimento do projeto **CodeCompass**. É atualizado a cada fase do projeto e entregue junto com a aplicação na apresentação final.

Além do registro qualitativo do uso de IA, este documento captura dados de **economicidade**: consumo de tokens, esforço humano real e uma estimativa contrafactual do custo equivalente sem assistência de IA. O objetivo é permitir, ao final do semestre, uma análise comparativa entre o custo real do desenvolvimento assistido por IA e o custo estimado de um desenvolvimento realizado integralmente por profissionais humanos nos perfis equivalentes.

---

## Ferramentas utilizadas

| Ferramenta | Categoria | Quando usada | Modelo/Versão | Avaliação geral |
|---|---|---|---|---|
| ChatLLM (Claude) | LLM/Assistente | Elaboração da proposta, pesquisa de arquitetura, geração de código de referência, análise de viabilidade | Claude Opus 4 | ⭐⭐⭐⭐⭐ |
| [GitHub Copilot] | Code completion | [A preencher quando iniciar implementação] | [modelo] | [A preencher] |
| [Outras ferramentas] | [categoria] | [quando] | [modelo] | [A preencher] |

> Registrar o modelo específico utilizado é importante para o cálculo de custo por token, pois modelos diferentes têm preços diferentes.

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

| Atividade | Ferramenta/Modelo | Tokens entrada (est.) | Tokens saída (est.) | Custo estimado (USD) |
|---|---|---|---|---|
| Análise dos 10 domínios + classificação | ChatLLM / Claude Opus 4 | ~8.000 | ~6.000 | ~$0.12 |
| Geração de estrutura do projeto (backend + IA) | ChatLLM / Claude Opus 4 | ~5.000 | ~12.000 | ~$0.22 |
| Análise de boas práticas production-ready | ChatLLM / Claude Opus 4 | ~4.000 | ~15.000 | ~$$0.28 |
| Visão de produto (fluxo empresa) | ChatLLM / Claude Opus 4 | ~3.000 | ~10.000 | ~$$0.18 |
| Geração da PROPOSTA_v1.md | ChatLLM / Claude Opus 4 | ~6.000 | ~8.000 | ~$$0.16 |
| Geração do WORKFLOW_DOCUMENT.md | ChatLLM / Claude Opus 4 | ~4.000 | ~6.000 | ~$$0.12 |
| **Total da fase** | | **~30.000** | **~57.000** | **~$1.08** |

> **Nota:** Estimativas baseadas no volume de texto trocado nas conversas com o ChatLLM. Preços de referência: Claude Opus ~$15/M tokens input, ~$75/M tokens output (março 2026). [AJUSTAR com preços reais consultados em docs.anthropic.com]

#### Camada 2 — Esforço humano real (auto-declarado)

| Atividade | Membro (perfil) | Tempo com IA (h) | Tempo revisão/ajuste (h) | Observações |
|---|---|---|---|---|
| Análise dos domínios e votação | [Membro A] (júnior) | 0.5h | 0.5h (discussão em grupo) | IA gerou análise, equipe discutiu e votou |
| Estrutura do projeto | [Membro B] (pleno) | 1.0h | 0.5h (revisão técnica) | Código de referência útil como ponto de partida |
| Pesquisa de boas práticas | [Membro C] (júnior) | 0.5h | 0.3h | Conteúdo denso, precisou de leitura cuidadosa |
| Visão de produto | [Membro D] (júnior) | 0.5h | 0.2h | Ajudou a pensar no produto além do MVP |
| Escrita da PROPOSTA_v1 | [Membro E] (pleno) | 1.0h | 1.0h (revisão coletiva) | Template preenchido pela IA, revisado por todos |
| Escrita do Workflow Doc | [Membro A] (júnior) | 0.5h | 0.5h | Registro do processo |
| **Total da fase** | | **4.0h** | **3.0h** | **7.0h total de esforço humano** |

> **Perfis de referência:** Classificação baseada na experiência dos membros com as tecnologias envolvidas nesta atividade específica, não no perfil geral.

#### Camada 3 — Estimativa contrafactual

| Atividade | Perfil equivalente | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
|---|---|---|---|---|
| Análise comparativa dos 10 domínios | Pleno | 6.0h | R$ 75 | R$$ 450 |
| Definição de arquitetura + estrutura de projeto | Sênior | 8.0h | R$$ 115 | R$$ 920 |
| Pesquisa de boas práticas (production-ready) | Sênior | 5.0h | R$$ 115 | R$ 575 |
| Análise de produto e fluxo de mercado | Pleno | 4.0h | R$ 75 | R$ 300 |
| Escrita da proposta completa | Pleno | 6.0h | R$ 75 | R$ 450 |
| Documentação do workflow | Júnior | 2.0h | R$ 40 | R$ 80 |
| **Total da fase** | | **31.0h** | | **R$ 2.775** |

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
[A preencher durante a fase]

### Onde a IA ajudou
> [A preencher]

### Onde a IA não ajudou (ou atrapalhou)
> [A preencher]

### Prompts notáveis desta fase
> [A preencher]

### Decisões tomadas sem IA
> [A preencher]

### Registro de economicidade desta fase

#### Camada 1 — Consumo de IA
| Atividade | Ferramenta/Modelo | Tokens entrada | Tokens saída | Custo estimado (USD) |
|---|---|---|---|---|
| | | | | |
| **Total da fase** | | | | |

#### Camada 2 — Esforço humano real (auto-declarado)
| Atividade | Membro (perfil) | Tempo com IA (h) | Tempo sem IA (h) | Observações |
|---|---|---|---|---|
| | | | | |

#### Camada 3 — Estimativa contrafactual
| Atividade | Perfil | Tempo estimado sem IA (h) | Salário médio/h (R$) | Custo humano estimado (R$) |
|---|---|---|---|---|
| | | | | |
| **Total da fase** | | | | |

### Lições aprendidas
> [A preencher]

---

## Fase: Composição (Aulas 21-24)
[Mesma estrutura — A preencher]

## Fase: Ensaio (Aulas 25-29)
[Mesma estrutura — A preencher]

## Fase: Ressonância (Aulas 30-32)
[Mesma estrutura — A preencher]

---

## Reflexão final
[A preencher ao final do semestre]

### Métricas de uso de IA (estimadas)

| Atividade | % assistida por IA | Ferramentas |
|---|---|---|
| Escrita de código | _% | |
| Geração de testes | _% | |
| Documentação | _% | |
| Design de prompts | _% | |
| Análise de requisitos | _% | |

### Consolidado de economicidade do projeto

#### Custo real de IA (total do projeto)
| Fase | Tokens entrada | Tokens saída | Custo IA (USD) | Custo IA (R$) |
|---|---|---|---|---|
| Pré-proposta | ~30.000 | ~57.000 | ~$1.08 | ~R$ 5.94 |
| Exposição | | | | |
| Composição | | | | |
| Ensaio | | | | |
| Ressonância | | | | |
| **Total** | | | | |

#### Custo contrafactual humano (total do projeto)
| Fase | Horas totais estimadas | Custo humano estimado (R$) |
|---|---|---|
| Pré-proposta | 31.0h | R$ 2.775 |
| Exposição | | |
| Composição | | |
| Ensaio | | |
| Ressonância | | |
| **Total** | | |

#### Análise comparativa
- **Custo total com IA (R$):** [A calcular ao final]
- **Custo total estimado sem IA (R$):** [A calcular ao final]
- **Razão de economicidade:** [custo sem IA / custo com IA]
- **Saving estimado (R$):** [diferença absoluta]
- **Saving estimado (%):** [diferença percentual]

> **Atenção às limitações desta análise:**
> (1) O contrafactual é uma estimativa subjetiva — há viés de retrospecto.
> (2) O custo com IA não inclui o tempo de aprendizado das ferramentas (curva de adoção).
> (3) A qualidade do output pode diferir entre as abordagens.
> (4) Há atividades onde a IA aumentou o tempo total — esses casos devem ser documentados.

### O que mudaria se fizesse novamente?
> [A preencher]

### Recomendações para outras equipes
> [A preencher]
