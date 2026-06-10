#!/bin/bash
# Script de deploy automático

echo "🚀 Iniciando deploy da aplicação Schedule System..."

# 1. Build da imagem Docker
echo "📦 Building Docker image..."
docker build -t schedule-app:latest .

# 2. Parar container antigo se existir
echo "🛑 Parando container antigo..."
docker stop schedule-app 2>/dev/null || true
docker rm schedule-app 2>/dev/null || true

# 3. Rodar novo container
echo "▶️ Iniciando novo container..."
docker run -d \
  --name schedule-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  schedule-app:latest

# 4. Verificar status
echo "✅ Verificando status..."
sleep 3
docker ps | grep schedule-app

echo "✨ Deploy completo! Aplicação rodando em http://localhost:3000"
echo "📊 Ver logs: docker logs -f schedule-app"
