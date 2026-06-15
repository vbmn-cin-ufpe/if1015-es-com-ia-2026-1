# ── URLs públicas ─────────────────────────────────────────────────────────────

output "frontend_url" {
  description = "URL pública do frontend React (acesso via navegador)"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "backend_url" {
  description = "URL pública da API backend (FastAPI)"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "backend_docs_url" {
  description = "URL do Swagger UI da API"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}/docs"
}

# ── Container Registry ────────────────────────────────────────────────────────

output "acr_login_server" {
  description = "Endereço do Azure Container Registry para docker push/pull"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "Username admin do ACR (para docker login)"
  value       = azurerm_container_registry.main.admin_username
}

output "acr_admin_password" {
  description = "Senha admin do ACR (para docker login)"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

# ── Banco de dados ────────────────────────────────────────────────────────────

output "postgres_fqdn" {
  description = "FQDN do servidor PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_connection_string" {
  description = "Connection string completa do PostgreSQL (para uso externo/debugging)"
  value       = "postgresql://${var.postgres_admin_login}:SENHA@${azurerm_postgresql_flexible_server.main.fqdn}:5432/codecompass?sslmode=require"
  sensitive   = false
}

# ── Recursos auxiliares ───────────────────────────────────────────────────────

output "resource_group_name" {
  description = "Nome do Resource Group criado"
  value       = azurerm_resource_group.main.name
}

output "container_app_environment_name" {
  description = "Nome do Container Apps Environment"
  value       = azurerm_container_app_environment.main.name
}

output "chroma_internal_fqdn" {
  description = "FQDN interno do ChromaDB (acessível apenas dentro do environment)"
  value       = azurerm_container_app.chroma.ingress[0].fqdn
}

# ── Comandos úteis gerados automaticamente ───────────────────────────────────

output "docker_login_command" {
  description = "Comando para autenticar o Docker no ACR"
  value       = "az acr login --name ${azurerm_container_registry.main.name}"
}

output "backend_image_tag" {
  description = "Tag completa da imagem do backend para docker build/push"
  value       = "${azurerm_container_registry.main.login_server}/codecompass-backend:latest"
}

output "frontend_image_tag" {
  description = "Tag completa da imagem do frontend para docker build/push"
  value       = "${azurerm_container_registry.main.login_server}/codecompass-frontend:latest"
}
