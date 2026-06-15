<#
.SYNOPSIS
    Deploy completo do CodeCompass no Azure Container Apps via Terraform + Docker.

.DESCRIPTION
    Executa todas as etapas de deploy em sequência:
    1. terraform apply  — cria/atualiza infraestrutura Azure
    2. docker build     — constrói imagens do backend e frontend
    3. docker push      — envia imagens ao ACR (Azure Container Registry)
    4. az containerapp  — atualiza os Container Apps com as novas imagens

.PARAMETER Action
    init    — Inicializa o Terraform (apenas na primeira vez)
    plan    — Mostra o que será criado/alterado sem aplicar
    deploy  — Executa o deploy completo (padrão)
    destroy — Destrói toda a infraestrutura (CUIDADO: irreversível!)

.PARAMETER Env
    staging — Usa infra/envs/staging.tfvars (scale-to-zero, recursos mínimos, ~$5-8 por 3 dias)
    prod    — Usa infra/envs/prod.tfvars (1 réplica fixa, recursos padrão, ~$8-12 por 3 dias)
    Padrão: staging

.PARAMETER Tag
    Tag da imagem Docker. Padrão: timestamp YYYYMMDDHHmm.

.EXAMPLE
    .\deploy.ps1 -Action init -Env staging
    .\deploy.ps1 -Action plan -Env prod
    .\deploy.ps1 -Action deploy -Env staging
    .\deploy.ps1 -Action deploy -Env prod -Tag "v1.2.0"
    .\deploy.ps1 -Action destroy -Env staging
#>

param(
    [ValidateSet("init", "plan", "deploy", "destroy")]
    [string]$Action = "deploy",
    [ValidateSet("staging", "prod")]
    [string]$Env = "staging",
    [string]$Tag = (Get-Date -Format "yyyyMMddHHmm")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configuração ─────────────────────────────────────────────────────────────

$ROOT_DIR  = Split-Path $PSScriptRoot -Parent
$INFRA_DIR = $PSScriptRoot
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"
$BACKEND_DIR  = Join-Path $ROOT_DIR "backend"

# ── Funções auxiliares ────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Assert-Command([string]$cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "Comando '$cmd' não encontrado. Instale e adicione ao PATH antes de prosseguir."
    }
}

function Invoke-Checked([string]$cmd) {
    Write-Host "> $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou com exit code $LASTEXITCODE: $cmd"
    }
}

# ── Verificação de pré-requisitos ────────────────────────────────────────────

Write-Step "Verificando pré-requisitos"
Assert-Command "terraform"
Assert-Command "docker"
Assert-Command "az"

# Verifica se está logado no Azure CLI
$azAccount = az account show 2>$null | ConvertFrom-Json
if (-not $azAccount) {
    Write-Host "Não autenticado no Azure CLI. Execute: az login" -ForegroundColor Yellow
    az login
}
Write-Host "Conta Azure: $($azAccount.user.name) | Subscription: $($azAccount.name)" -ForegroundColor Green

# ── Terraform init ────────────────────────────────────────────────────────────

if ($Action -eq "init") {
    Write-Step "Inicializando Terraform"
    Set-Location $INFRA_DIR
    Invoke-Checked "terraform init"
    Write-Host "`nTerraform inicializado! Próximo passo: .\deploy.ps1 -Action plan -Env $Env" -ForegroundColor Green
    exit 0
}

# ── Seleciona tfvars do ambiente ─────────────────────────────────────────────

$tfvars = Join-Path $INFRA_DIR "envs\${Env}.tfvars"
if (-not (Test-Path $tfvars)) {
    Write-Host @"

ERRO: Arquivo de variáveis não encontrado: $tfvars

Edite o arquivo correspondente ao ambiente:
  infra\envs\staging.tfvars  — para staging
  infra\envs\prod.tfvars     — para prod

Substitua todos os campos TROQUE_* pelos valores reais.

"@ -ForegroundColor Red
    exit 1
}
Write-Host "Ambiente: $Env | Tfvars: $tfvars" -ForegroundColor Green

# ── Terraform plan ────────────────────────────────────────────────────────────

if ($Action -eq "plan") {
    Write-Step "Terraform Plan — ambiente: $Env"
    Set-Location $INFRA_DIR
    Invoke-Checked "terraform init -upgrade"
    Invoke-Checked "terraform plan -var-file=`"$tfvars`" -out=tfplan"
    Write-Host "`nPlano salvo em tfplan. Execute '.\deploy.ps1 -Action deploy -Env $Env' para aplicar." -ForegroundColor Green
    exit 0
}

# ── Terraform destroy ─────────────────────────────────────────────────────────

if ($Action -eq "destroy") {
    Write-Host "`nATENÇÃO: Isso irá DESTRUIR toda a infraestrutura do ambiente '$Env'!" -ForegroundColor Red
    $confirm = Read-Host "Digite 'DESTRUIR' para confirmar"
    if ($confirm -ne "DESTRUIR") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
    Set-Location $INFRA_DIR
    Invoke-Checked "terraform destroy -var-file=`"$tfvars`" -auto-approve"
    Write-Host "Infraestrutura do ambiente '$Env' destruída." -ForegroundColor Yellow
    exit 0
}

# ══════════════════════════════════════════════════════════════════════════════
# DEPLOY COMPLETO
# ══════════════════════════════════════════════════════════════════════════════

# ── Passo 1: Terraform apply — cria/atualiza infraestrutura ──────────────────

Write-Step "Passo 1/4 — Terraform: criando/atualizando infraestrutura Azure (env=$Env)"
Set-Location $INFRA_DIR
Invoke-Checked "terraform init -upgrade"
Invoke-Checked "terraform apply -var-file=`"$tfvars`" -auto-approve"

# ── Captura outputs do Terraform ──────────────────────────────────────────────

Write-Step "Capturando outputs do Terraform"
$outputs = terraform output -json | ConvertFrom-Json

$ACR_SERVER       = $outputs.acr_login_server.value
$ACR_USER         = $outputs.acr_admin_username.value
$ACR_PASS         = terraform output -raw acr_admin_password
$BACKEND_URL      = $outputs.backend_url.value
$BACKEND_IMG      = $outputs.backend_image_tag.value
$FRONTEND_IMG     = $outputs.frontend_image_tag.value
$RG_NAME          = $outputs.resource_group_name.value
$ENV_NAME         = $outputs.container_app_environment_name.value
$BACKEND_APP_NAME = "$(terraform output -raw resource_group_name)" -replace "-rg$", ""
# Extrai nomes dos apps a partir do prefixo/environment no outputs
$PREFIX = ($outputs.acr_login_server.value -split "\.")[0] -replace "prod$", "" -replace "staging$", "" -replace "dev$", ""

Write-Host "ACR:      $ACR_SERVER" -ForegroundColor Green
Write-Host "Backend:  $BACKEND_URL" -ForegroundColor Green

# ── Passo 2: Login no ACR ────────────────────────────────────────────────────

Write-Step "Passo 2/4 — Autenticando Docker no Azure Container Registry"
Invoke-Checked "az acr login --name $($ACR_SERVER.Split('.')[0])"

# ── Passo 3: Build e push das imagens ────────────────────────────────────────

Write-Step "Passo 3/4 — Build e push das imagens Docker"

# Backend
$BACKEND_TAG = "${BACKEND_IMG}:${Tag}"
Write-Host "`nConstruindo imagem do backend..." -ForegroundColor Yellow
Set-Location $BACKEND_DIR
Invoke-Checked "docker build -t `"$BACKEND_TAG`" -f Dockerfile ."
Invoke-Checked "docker push `"$BACKEND_TAG`""
# Também atualiza o :latest
Invoke-Checked "docker tag `"$BACKEND_TAG`" `"${BACKEND_IMG}:latest`""
Invoke-Checked "docker push `"${BACKEND_IMG}:latest`""

# Frontend — VITE_API_BASE_URL é baked no build (necessário para Vite)
$FRONTEND_TAG = "${FRONTEND_IMG}:${Tag}"
Write-Host "`nConstruindo imagem do frontend com VITE_API_BASE_URL=$BACKEND_URL..." -ForegroundColor Yellow
Set-Location $FRONTEND_DIR
Invoke-Checked "docker build -t `"$FRONTEND_TAG`" --build-arg VITE_API_BASE_URL=`"$BACKEND_URL`" -f Dockerfile.prod ."
Invoke-Checked "docker push `"$FRONTEND_TAG`""
Invoke-Checked "docker tag `"$FRONTEND_TAG`" `"${FRONTEND_IMG}:latest`""
Invoke-Checked "docker push `"${FRONTEND_IMG}:latest`""

# ── Passo 4: Atualiza os Container Apps com as novas imagens ─────────────────

Write-Step "Passo 4/4 — Atualizando Container Apps no Azure"

# Descobre os nomes dos container apps no resource group
$apps = az containerapp list --resource-group $RG_NAME | ConvertFrom-Json

$backendApp  = ($apps | Where-Object { $_.name -like "*backend*" }).name
$frontendApp = ($apps | Where-Object { $_.name -like "*frontend*" }).name

if (-not $backendApp)  { throw "Container App do backend não encontrado no Resource Group $RG_NAME" }
if (-not $frontendApp) { throw "Container App do frontend não encontrado no Resource Group $RG_NAME" }

Write-Host "Atualizando backend: $backendApp"  -ForegroundColor Yellow
Invoke-Checked "az containerapp update --name $backendApp --resource-group $RG_NAME --image `"$BACKEND_TAG`""

Write-Host "Atualizando frontend: $frontendApp" -ForegroundColor Yellow
Invoke-Checked "az containerapp update --name $frontendApp --resource-group $RG_NAME --image `"$FRONTEND_TAG`""

# ── Resumo final ──────────────────────────────────────────────────────────────

$FRONTEND_URL = $outputs.frontend_url.value
$SWAGGER_URL  = $outputs.backend_docs_url.value

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║                     DEPLOY CONCLUÍDO COM SUCESSO                ║
╚══════════════════════════════════════════════════════════════════╝

  Frontend:   $FRONTEND_URL
  Backend API: $BACKEND_URL
  Swagger UI:  $SWAGGER_URL

  Resource Group: $RG_NAME
  Tag da imagem:  $Tag

"@ -ForegroundColor Green
