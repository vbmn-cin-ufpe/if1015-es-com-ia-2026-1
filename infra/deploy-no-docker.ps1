<#
.SYNOPSIS
    Deploy do CodeCompass no Azure SEM Docker Desktop local.
    Usa ACR Tasks (az acr build) para construir as imagens diretamente na nuvem.

.DESCRIPTION
    Executa todas as etapas de deploy sem precisar de Docker instalado:
    1. terraform apply  — cria/atualiza infraestrutura Azure
    2. az acr build     — envia o código e constrói a imagem NO AZURE (ACR Tasks)
    3. az containerapp  — atualiza os Container Apps com as novas imagens

.PARAMETER Action
    init    — Inicializa o Terraform (apenas na primeira vez)
    plan    — Mostra o que será criado/alterado sem aplicar
    deploy  — Executa o deploy completo (padrão)
    destroy — Destrói toda a infraestrutura (CUIDADO: irreversível!)

.PARAMETER Env
    staging — Usa infra/envs/staging.tfvars (recomendado para testes)
    prod    — Usa infra/envs/prod.tfvars
    Padrão: staging

.PARAMETER Tag
    Tag da imagem Docker. Padrão: timestamp YYYYMMDDHHmm.

.EXAMPLE
    .\deploy-no-docker.ps1 -Action init -Env staging
    .\deploy-no-docker.ps1 -Action plan -Env staging
    .\deploy-no-docker.ps1 -Action deploy -Env staging
    .\deploy-no-docker.ps1 -Action destroy -Env staging
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

$ROOT_DIR     = Split-Path $PSScriptRoot -Parent
$INFRA_DIR    = $PSScriptRoot
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
        throw "Comando falhou com exit code ${LASTEXITCODE}: $cmd"
    }
}

# ── Verificação de pré-requisitos (sem docker!) ───────────────────────────────

Write-Step "Verificando pré-requisitos"
Assert-Command "terraform"
Assert-Command "az"
Write-Host "OK: terraform e az encontrados (Docker NAO necessário neste script)" -ForegroundColor Green

# Verifica login no Azure CLI
$azAccount = az account show 2>$null | ConvertFrom-Json
if (-not $azAccount) {
    Write-Host "Não autenticado no Azure CLI. Execute: az login" -ForegroundColor Yellow
    az login
    $azAccount = az account show | ConvertFrom-Json
}
Write-Host "Conta Azure: $($azAccount.user.name) | Subscription: $($azAccount.name)" -ForegroundColor Green

# ── Terraform init ────────────────────────────────────────────────────────────

if ($Action -eq "init") {
    Write-Step "Inicializando Terraform"
    Set-Location $INFRA_DIR
    Invoke-Checked "terraform init"
    Write-Host "`nTerraform inicializado! Próximo passo: .\deploy-no-docker.ps1 -Action plan -Env $Env" -ForegroundColor Green
    exit 0
}

# ── Seleciona tfvars do ambiente ─────────────────────────────────────────────

$tfvars = Join-Path $INFRA_DIR "envs\${Env}.tfvars"
if (-not (Test-Path $tfvars)) {
    Write-Host @"

ERRO: Arquivo de variáveis não encontrado: $tfvars

Crie o arquivo copiando o exemplo:
  Copy-Item infra\envs\staging.tfvars.example infra\envs\staging.tfvars

Depois edite o arquivo substituindo todos os campos TROQUE_* pelos valores reais.

"@ -ForegroundColor Red
    exit 1
}
Write-Host "Ambiente: $Env | Tfvars: $tfvars" -ForegroundColor Green

# ── Terraform plan ────────────────────────────────────────────────────────────

if ($Action -eq "plan") {
    Write-Step "Terraform Plan -- ambiente: $Env"
    Set-Location $INFRA_DIR
    Invoke-Checked "terraform init -upgrade"
    Invoke-Checked "terraform plan -var-file=`"$tfvars`" -out=tfplan"
    Write-Host "`nPlano salvo em tfplan. Execute '.\deploy-no-docker.ps1 -Action deploy -Env $Env' para aplicar." -ForegroundColor Green
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
# DEPLOY COMPLETO (sem Docker local — usa ACR Tasks)
# ══════════════════════════════════════════════════════════════════════════════

# ── Passo 1: Terraform apply ─────────────────────────────────────────────────

Write-Step "Passo 1/3 -- Terraform: criando/atualizando infraestrutura Azure - env=$Env"
Set-Location $INFRA_DIR
Invoke-Checked "terraform init -upgrade"
Invoke-Checked "terraform apply -var-file=`"$tfvars`" -auto-approve"

# ── Captura outputs do Terraform ──────────────────────────────────────────────

Write-Step "Capturando outputs do Terraform"
$outputs = terraform output -json | ConvertFrom-Json

$ACR_SERVER  = $outputs.acr_login_server.value
$ACR_NAME    = $ACR_SERVER.Split(".")[0]
$BACKEND_URL = $outputs.backend_url.value
$BACKEND_IMG = $outputs.backend_image_tag.value
$FRONTEND_IMG= $outputs.frontend_image_tag.value
$RG_NAME     = $outputs.resource_group_name.value

Write-Host "ACR:      $ACR_SERVER" -ForegroundColor Green
Write-Host "Backend:  $BACKEND_URL" -ForegroundColor Green
Write-Host "RG:       $RG_NAME"    -ForegroundColor Green

# ── Passo 2: Build remoto via ACR Tasks (sem Docker local!) ──────────────────

Write-Step "Passo 2/3 -- Build das imagens no Azure via ACR Tasks - sem Docker local"

# Backend — envia o diretório backend/ para o ACR e builda lá
$BACKEND_TAG  = "${BACKEND_IMG}:${Tag}"
$BACKEND_LATEST = "${BACKEND_IMG}:latest"
Write-Host "`nBuilding backend no ACR (isso pode levar 3-5 minutos)..." -ForegroundColor Yellow
Set-Location $BACKEND_DIR
Invoke-Checked "az acr build --registry $ACR_NAME --image `"backend:${Tag}`" --image `"backend:latest`" -f Dockerfile ."

# Frontend — passa VITE_API_BASE_URL como build-arg (Vite precisa no momento do build)
$FRONTEND_TAG    = "${FRONTEND_IMG}:${Tag}"
$FRONTEND_LATEST = "${FRONTEND_IMG}:latest"
Write-Host "`nBuilding frontend no ACR com VITE_API_BASE_URL=$BACKEND_URL..." -ForegroundColor Yellow
Set-Location $FRONTEND_DIR
Invoke-Checked "az acr build --registry $ACR_NAME --image `"frontend:${Tag}`" --image `"frontend:latest`" --build-arg VITE_API_BASE_URL=`"$BACKEND_URL`" -f Dockerfile.prod ."

Write-Host "Build concluído! Imagens no ACR:" -ForegroundColor Green
Write-Host "  ${ACR_SERVER}/backend:${Tag}"  -ForegroundColor Green
Write-Host "  ${ACR_SERVER}/frontend:${Tag}" -ForegroundColor Green

# ── Passo 3: Atualiza os Container Apps ──────────────────────────────────────

Write-Step "Passo 3/3 -- Atualizando Container Apps no Azure"

$apps = az containerapp list --resource-group $RG_NAME | ConvertFrom-Json

$backendApp  = ($apps | Where-Object { $_.name -like "*-api" }).name
$frontendApp = ($apps | Where-Object { $_.name -notlike "*-api" -and $_.name -notlike "*-chroma" }).name

if (-not $backendApp)  { throw "Container App da API não encontrado no Resource Group $RG_NAME" }
if (-not $frontendApp) { throw "Container App do frontend não encontrado no Resource Group $RG_NAME" }

$BACKEND_FULL_TAG  = "${ACR_SERVER}/backend:${Tag}"
$FRONTEND_FULL_TAG = "${ACR_SERVER}/frontend:${Tag}"

Write-Host "Atualizando backend:  $backendApp  -> $BACKEND_FULL_TAG"  -ForegroundColor Yellow
Invoke-Checked "az containerapp update --name $backendApp  --resource-group $RG_NAME --image `"$BACKEND_FULL_TAG`""

Write-Host "Atualizando frontend: $frontendApp -> $FRONTEND_FULL_TAG" -ForegroundColor Yellow
Invoke-Checked "az containerapp update --name $frontendApp --resource-group $RG_NAME --image `"$FRONTEND_FULL_TAG`""

# ── Resumo final ──────────────────────────────────────────────────────────────

$FRONTEND_URL = $outputs.frontend_url.value
$SWAGGER_URL  = $outputs.backend_docs_url.value

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║              DEPLOY CONCLUÍDO COM SUCESSO (sem Docker local)    ║
╚══════════════════════════════════════════════════════════════════╝

  Frontend:    $FRONTEND_URL
  Backend API: $BACKEND_URL
  Swagger UI:  $SWAGGER_URL

  Resource Group: $RG_NAME
  Tag da imagem:  $Tag

"@ -ForegroundColor Green

