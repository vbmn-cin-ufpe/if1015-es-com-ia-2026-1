# Como rodar o CodeCompass do zero

Guia completo para quem está pegando o projeto pela primeira vez e quer ter tudo funcionando localmente.

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

| Ferramenta | Versão mínima | Como verificar |
|---|---|---|
| **Docker Desktop** | 24+ | `docker --version` |
| **Docker Compose** | 2.20+ | `docker compose version` |
| **Git** | qualquer | `git --version` |

> Não é necessário ter Python, Node.js ou qualquer outra dependência instalada — tudo roda dentro de containers Docker.

---

## Passo 1 — Clonar o repositório

```bash
git clone https://github.com/vbmn-cin-ufpe/if1015-es-com-ia-2026-1.git
cd if1015-es-com-ia-2026-1
```

---

## Passo 2 — Configurar variáveis de ambiente

Copie o arquivo de exemplo e abra para edição:

```bash
cp .env.example .env
```

Edite o `.env` com as suas credenciais:

```dotenv
# ── LLM (obrigatório para o chat funcionar) ──────────────────
LLM_PROVIDER=abacus
LLM_API_KEY=sua-chave-aqui          # Abacus AI: https://abacus.ai/
LLM_MODEL=CLAUDE_V3_5_SONNET

# ── Embeddings ────────────────────────────────────────────────
# Opção A — sem chave (mais lento, ~220s por indexação):
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=384

# Opção B — com OpenAI (recomendado, ~12s por indexação):
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=sua-chave-openai-aqui
# EMBEDDING_MODEL=text-embedding-3-small
# EMBEDDING_DIM=1536

# ── Banco de dados (escolha uma senha forte) ──────────────────
POSTGRES_DB=codecompass
POSTGRES_USER=codecompass
POSTGRES_PASSWORD=uma_senha_forte_aqui

# ── Usuário admin inicial ─────────────────────────────────────
ADMIN_EMAIL=admin
ADMIN_PASSWORD=outra_senha_forte_aqui
```

> **Onde obter as chaves:**
> - **Abacus AI:** https://abacus.ai/ → Account → API Keys
> - **OpenAI:** https://platform.openai.com/api-keys

---

## Passo 3 — Subir os containers

```bash
docker compose up --build
```

Na primeira execução, o Docker vai:
1. Baixar as imagens base (Node 20, Python 3.11, PostgreSQL 16, ChromaDB)
2. Instalar as dependências Python e npm
3. Iniciar os 4 serviços

> A primeira build leva entre 3–10 minutos dependendo da velocidade da internet.

Quando aparecer `Application startup complete.` no log do backend, tudo está pronto.

---

## Passo 4 — Acessar a aplicação

| Serviço | URL |
|---|---|
| **Frontend** (interface principal) | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **Swagger / Docs interativos** | http://localhost:8000/docs |
| **ChromaDB** | http://localhost:8001 |

---

## Passo 5 — Usar o CodeCompass

### 5.1 Fazer login

Na interface, clique em **🔐 Entrar** (canto superior direito) e use as credenciais definidas no `.env`:

- **Email:** valor de `ADMIN_EMAIL` (ex: `admin`)
- **Senha:** valor de `ADMIN_PASSWORD`

### 5.2 Indexar um repositório

1. Acesse a aba **📁 Repositório** na sidebar
2. No campo de URL, cole a URL de um repositório GitHub público:
   ```
   https://github.com/fastapi/fastapi
   ```
3. Clique em **Indexar**
4. A indexação roda em background — o status muda para `indexing` e depois `completed`

> **Dica:** Para testar com um repo pequeno e rápido, use `https://github.com/tiangolo/fastapi` ou `https://github.com/pallets/flask`.

### 5.3 Fazer perguntas no Chat

1. Após o status ficar `completed`, acesse a aba **💬 Chat**
2. Digite uma pergunta em linguagem natural:
   - `"Como funciona o sistema de autenticação?"`
   - `"Quais são os principais módulos do projeto?"`
   - `"Como criar um novo endpoint na API?"`
3. A resposta vem com referências aos arquivos do repositório consultados

### 5.4 Explorar funcionalidades avançadas

| Aba | O que faz | Pré-requisito |
|-----|----------|---------------|
| **Drift Arq.** | Compara snapshots do grafo de dependências entre re-indexações | Pelo menos 2 indexações do mesmo repo |
| **Watchlist** | Subscreve módulos para receber notificações por e-mail | Estar logado |
| **Admin** | Gerencia usuários, planos, audit log e webhooks | Estar logado como admin |

### 5.5 Configurar Webhooks GitHub (opcional)

Para receber push events do GitHub e disparar re-indexação automática:

1. No painel **Admin → Webhooks**, clique em **Adicionar Webhook**
2. Selecione o repositório e preencha a branch (ex: `main`)
3. **Copie o segredo gerado** — ele só é exibido uma vez
4. No GitHub, vá em **Settings → Webhooks → Add webhook**:
   - Payload URL: `https://seu-domínio/api/webhooks/github/{webhook_id}`
   - Content type: `application/json`
   - Secret: cole o segredo copiado
   - Eventos: `Just the push event`

---

## Solução de problemas comuns

### Container não inicia / erro de porta em uso

```bash
# Verifica se já há algo rodando nas portas
docker compose ps
# Para todos os containers
docker compose down
# Sobe novamente
docker compose up
```

### `POSTGRES_PASSWORD is required` ao subir

O `.env` está faltando ou sem a variável `POSTGRES_PASSWORD`. Verifique:
```bash
cat .env | grep POSTGRES_PASSWORD
```

### `ADMIN_PASSWORD is required` ao subir

O `.env` não tem `ADMIN_PASSWORD`. Adicione a variável ao arquivo `.env`.

### Indexação trava em 92% ou nunca completa

Verifique os logs do backend:
```bash
docker compose logs backend --follow
```
Causas comuns: URL inválida, repositório privado, timeout de rede.

### Chat retorna erro de LLM

Verifique se `LLM_API_KEY` está correta no `.env`:
```bash
docker compose logs backend | grep "LLM\|abacus\|Error"
```

### Frontend não carrega / tela branca

```bash
docker compose logs frontend --follow
```
Se houver erro de compilação, o Vite vai mostrar a mensagem de erro no log.

---

## Comandos úteis

```bash
# Ver logs em tempo real de todos os serviços
docker compose logs -f

# Ver logs apenas do backend
docker compose logs backend --follow

# Parar todos os serviços (mantém volumes)
docker compose down

# Parar e remover tudo (inclusive banco de dados)
docker compose down -v

# Rebuild sem cache (após mudança de dependências)
docker compose build --no-cache

# Acessar o terminal do backend
docker exec -it if1015-es-com-ia-2026-1-backend-1 bash

# Rodar os testes
docker exec if1015-es-com-ia-2026-1-backend-1 pytest backend/tests/unit
```

---

## Rodar sem Docker (desenvolvimento local)

Caso prefira rodar localmente sem Docker:

### Backend

```bash
# Pré-requisitos: Python 3.11+, PostgreSQL 16, ChromaDB rodando localmente

cd backend
pip install -e ".[dev]"

# Configure as variáveis de ambiente (ou exporte manualmente)
export LLM_PROVIDER=abacus
export LLM_API_KEY=sua-chave
export POSTGRES_DSN=postgresql://user:pass@localhost:5432/codecompass
export CHROMA_HOST=localhost
export CHROMA_PORT=8001
export ADMIN_PASSWORD=sua-senha

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Acessível em http://localhost:5173
```

### Rodar testes

```bash
# Todos os testes (unit + integration + e2e + frontend)
python scripts/run_tests.py

# Apenas unit tests (sem dependências externas)
pytest backend/tests/unit -v

# Frontend
npm --prefix frontend test
```

---

## Variáveis de ambiente — referência completa

| Variável | Obrigatória | Descrição | Padrão |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ Sim | Senha do PostgreSQL | — |
| `ADMIN_PASSWORD` | ✅ Sim | Senha do admin inicial | — |
| `ADMIN_EMAIL` | Não | E-mail do admin | `admin` |
| `POSTGRES_DB` | Não | Nome do banco | `codecompass` |
| `POSTGRES_USER` | Não | Usuário do banco | `codecompass` |
| `LLM_PROVIDER` | Não | `abacus`\|`openai`\|`anthropic` | `abacus` |
| `LLM_API_KEY` | Não* | Chave do LLM | — |
| `LLM_MODEL` | Não | Modelo LLM | `CLAUDE_V3_5_SONNET` |
| `OPENAI_API_KEY` | Não* | Chave OpenAI para embeddings | — |
| `EMBEDDING_PROVIDER` | Não | `local`\|`openai` | `local` |
| `EMBEDDING_MODEL` | Não | Modelo de embeddings | `all-MiniLM-L6-v2` |
| `EMBEDDING_DIM` | Não | Dimensão dos vetores | `384` |
| `EMBEDDING_MAX_WORKERS` | Não | Workers paralelos (OpenAI) | `4` |
| `ALLOW_LOCAL_REPOS` | Não | Permite paths locais | `true` |
| `CHROMA_HOST` | Não | Host do ChromaDB | `localhost` |
| `CHROMA_PORT` | Não | Porta do ChromaDB | `8001` |

*Sem `LLM_API_KEY`, o chat retornará uma resposta de fallback. Sem `OPENAI_API_KEY` quando `EMBEDDING_PROVIDER=openai`, os embeddings falharão.
