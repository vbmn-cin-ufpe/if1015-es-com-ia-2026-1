locals {
  # Nome base dos recursos — ex: "codecompass-prod"
  base_name = "${var.prefix}-${var.environment}"

  # Nome do ACR sem hífens (restrição Azure)
  acr_name = "${replace(var.prefix, "-", "")}${var.environment}acr"

  # Nome do Storage Account sem hífens e com max 24 chars
  storage_name = substr("${replace(var.prefix, "-", "")}${var.environment}sa", 0, 24)

  tags = {
    project     = "CodeCompass"
    environment = var.environment
    managed_by  = "Terraform"
    repository  = "if1015-es-com-ia-2026-1"
  }
}

# ── Grupo de Recursos ─────────────────────────────────────────────────────────

resource "azurerm_resource_group" "main" {
  name     = "${local.base_name}-rg"
  location = var.location
  tags     = local.tags
}

# ── Monitoramento: Log Analytics Workspace ────────────────────────────────────

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.base_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# ── Azure Container Registry (ACR) ───────────────────────────────────────────
# Armazena as imagens Docker do backend e frontend

resource "azurerm_container_registry" "main" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true # Necessário para Container Apps autenticar sem managed identity
  tags                = local.tags
}

# ── Azure Storage Account — persistência do ChromaDB ─────────────────────────
# ChromaDB precisa de volume persistente: usamos Azure Files (SMB) montado
# dentro do Container Apps Environment via azurerm_container_app_environment_storage

resource "azurerm_storage_account" "chroma" {
  name                     = local.storage_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.tags
}

resource "azurerm_storage_share" "chroma" {
  name                 = "chromadb-data"
  storage_account_name = azurerm_storage_account.chroma.name
  quota                = var.chroma_storage_gb
}

# ── PostgreSQL Flexible Server ───────────────────────────────────────────────
# PaaS gerenciado: backups automáticos, SSL obrigatório, atualizações de patches

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.base_name}-pg"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  administrator_login    = var.postgres_admin_login
  administrator_password = var.postgres_admin_password
  storage_mb             = var.postgres_storage_mb
  sku_name               = var.postgres_sku
  backup_retention_days  = 7
  tags                   = local.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "codecompass" {
  name      = "codecompass"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Permite conexões originárias de serviços Azure (inclui Container Apps)
# Para maior segurança em prod: substitua por VNet integration + private endpoint
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ── Container Apps Environment ────────────────────────────────────────────────
# Ambiente compartilhado que hospeda os 3 containers: backend, frontend, chroma
# Rede interna: containers se comunicam pelo FQDN interno do environment

resource "azurerm_container_app_environment" "main" {
  name                       = "${local.base_name}-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.tags
}

# Monta o Azure Files share dentro do environment para que o ChromaDB possa usá-lo
resource "azurerm_container_app_environment_storage" "chroma" {
  name                         = "chromastorage"
  container_app_environment_id = azurerm_container_app_environment.main.id
  account_name                 = azurerm_storage_account.chroma.name
  share_name                   = azurerm_storage_share.chroma.name
  access_key                   = azurerm_storage_account.chroma.primary_access_key
  access_mode                  = "ReadWrite"
}

# ── Container App: ChromaDB ───────────────────────────────────────────────────
# Ingress interno (não exposto para a internet) — apenas o backend acessa
# Usa armazenamento efêmero do container (Azure Files SMB não suporta SQLite locking)
# Para persistência real em produção, usar Azure Blob Storage ou ChromaDB Cloud

resource "azurerm_container_app" "chroma" {
  name                         = "${var.prefix}-chroma"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  template {
    min_replicas = 1
    max_replicas = 1 # ChromaDB não suporta clustering horizontal — manter em 1

    container {
      name   = "chroma"
      image  = "chromadb/chroma:0.5.5"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "IS_PERSISTENT"
        value = "TRUE"
      }
      env {
        name  = "CHROMA_SERVER_HTTP_PORT"
        value = "8000"
      }
      env {
        name  = "ANONYMIZED_TELEMETRY"
        value = "False"
      }

      liveness_probe {
        transport               = "HTTP"
        path                    = "/api/v1/heartbeat"
        port                    = 8000
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  ingress {
    external_enabled = false # Apenas interno — backend acessa via FQDN interno
    target_port      = 8000
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ── Container App: Backend (FastAPI) ─────────────────────────────────────────
# Imagem inicial é um placeholder nginx; o deploy.ps1 atualiza para a imagem real.
# lifecycle.ignore_changes evita que o Terraform reverta a imagem após o CI/CD atualizar.

resource "azurerm_container_app" "backend" {
  name                         = "${var.prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  # ── Secrets (referenciados via secret_name nas env vars) ──────────────────
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
  secret {
    name  = "postgres-password"
    value = var.postgres_admin_password
  }
  secret {
    name  = "admin-password"
    value = var.admin_password
  }
  secret {
    name  = "llm-api-key"
    value = var.llm_api_key
  }
  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }
  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  template {
    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas

    container {
      name = "backend"
      # Imagem placeholder — substituída pelo deploy-no-docker.ps1 após o acr build
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = var.backend_cpu
      memory = var.backend_memory

      # ── PostgreSQL ────────────────────────────────────────────────────────
      env {
        name  = "POSTGRES_DSN"
        value = "postgresql://${var.postgres_admin_login}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/codecompass?sslmode=require"
      }
      env {
        name  = "POSTGRES_DB"
        value = "codecompass"
      }
      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      # ── Admin inicial ─────────────────────────────────────────────────────
      env {
        name  = "ADMIN_EMAIL"
        value = var.admin_email
      }
      env {
        name        = "ADMIN_PASSWORD"
        secret_name = "admin-password"
      }

      # ── LLM ───────────────────────────────────────────────────────────────
      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }
      env {
        name        = "LLM_API_KEY"
        secret_name = "llm-api-key"
      }
      env {
        name  = "LLM_MODEL"
        value = var.llm_model
      }

      # ── Embeddings ────────────────────────────────────────────────────────
      env {
        name  = "EMBEDDING_PROVIDER"
        value = var.embedding_provider
      }
      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }
      env {
        name  = "EMBEDDING_MODEL"
        value = var.embedding_model
      }
      env {
        name  = "EMBEDDING_DIM"
        value = var.embedding_dim
      }
      env {
        name  = "EMBEDDING_MAX_WORKERS"
        value = var.embedding_max_workers
      }

      # ── ChromaDB (via FQDN interno do Container Apps Environment) ─────────
      # O FQDN interno tem formato: <app-name>.<environment-default-domain>
      # transport = "http" → ingress interno escuta na porta 80 (sem TLS)
      env {
        name  = "CHROMA_HOST"
        value = azurerm_container_app.chroma.ingress[0].fqdn
      }
      env {
        name  = "CHROMA_PORT"
        value = "80"
      }
      env {
        name  = "CHROMA_SSL"
        value = "false"
      }

      # ── Auth ──────────────────────────────────────────────────────────────
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      # ── Misc ──────────────────────────────────────────────────────────────
      env {
        name  = "ALLOW_LOCAL_REPOS"
        value = "false"
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      liveness_probe {
        transport               = "HTTP"
        path                    = "/api/health"
        port                    = 8000
        interval_seconds        = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        transport        = "HTTP"
        path             = "/api/health"
        port             = 8000
        interval_seconds = 10
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  # Ignora mudanças de imagem feitas pelo CI/CD (deploy.ps1)
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }

  depends_on = [azurerm_container_app.chroma]
}

# ── Container App: Frontend (React/Vite → nginx) ─────────────────────────────
# A imagem é construída com VITE_API_BASE_URL = URL do backend.
# Como VITE bake variáveis em build-time, o deploy.ps1 constrói a imagem
# DEPOIS de ter a URL do backend via `terraform output`.

resource "azurerm_container_app" "frontend" {
  name                         = "${var.prefix}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name = "frontend"
      # Placeholder inicial — substituído pelo deploy.ps1 com a imagem de produção
      image  = "nginx:alpine"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  # Ignora mudanças de imagem feitas pelo CI/CD (deploy.ps1)
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }

  depends_on = [azurerm_container_app.backend]
}

