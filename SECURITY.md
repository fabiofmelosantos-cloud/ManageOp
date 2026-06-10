# 🔒 Segurança e Deploy Independente

## Status de Segurança Atual

### ✅ Implementado
- **Row Level Security (RLS):** Ativo em todas as tabelas
- **Sistema de Auditoria:** Registra todas as alterações automaticamente
- **Autenticação JWT:** Tokens seguros via Supabase
- **Políticas de Acesso:** Cada role vê apenas seus dados
- **Logs de Auditoria:** Apenas ADMIN pode visualizar

### 🟢 Nível de Segurança: ALTO
**Adequado para uso empresarial**

---

## Como Funciona a Segurança

### 1. Row Level Security (RLS)
Cada tabela tem políticas que determinam quem pode ver/editar:

- **Operadores:** Veem apenas sua própria escala
- **Coordenadores:** Veem apenas suas linhas de produção
- **RH:** Veem todos os operadores e escalas
- **Admin:** Acesso total + logs de auditoria

### 2. Sistema de Auditoria
Toda alteração é registrada automaticamente:
- Quem fez a alteração
- Quando foi feita
- O que mudou (valores antes/depois)
- Qual tabela foi afetada

**Exemplo de log:**
\`\`\`json
{
  "user_name": "João Silva",
  "user_role": "admin",
  "action": "UPDATE",
  "table_name": "workers",
  "old_values": {"name": "Pedro"},
  "new_values": {"name": "Pedro Santos"}
}
\`\`\`

### 3. Verificação de Segurança
Execute no Supabase para ver status de segurança:
\`\`\`sql
-- Ver políticas RLS ativas
SELECT schemaname, tablename, policyname 
FROM pg_policies;

-- Ver logs de auditoria (apenas ADMIN)
SELECT * FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 50;
\`\`\`

---

## Deploy Independente (Sem Vercel)

### Opção 1: VPS com Docker (Recomendado)

**Requisitos:**
- VPS (Ubuntu/Debian) - €5-10/mês
- Docker instalado
- Supabase (cloud ou self-hosted)

**Passos:**

1. **Criar Dockerfile** (já incluído no projeto):
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

2. **Build e Deploy:**
\`\`\`bash
# Build da imagem
docker build -t schedule-app .

# Rodar container
docker run -d \
  -p 3000:3000 \
  --name schedule-app \
  --env-file .env \
  --restart unless-stopped \
  schedule-app

# Ver logs
docker logs -f schedule-app
\`\`\`

3. **Configurar Nginx como Reverse Proxy:**
\`\`\`nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

4. **SSL Grátis com Certbot:**
\`\`\`bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
\`\`\`

**Custo Total: €5-10/mês**

---

### Opção 2: Node.js Direto no Servidor

**Passos:**

1. **Instalar Node.js:**
\`\`\`bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
\`\`\`

2. **Clonar e Configurar:**
\`\`\`bash
git clone <seu-repositorio>
cd <projeto>
npm install
npm run build
\`\`\`

3. **Criar .env com variáveis:**
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
\`\`\`

4. **Rodar com PM2 (Process Manager):**
\`\`\`bash
npm install -g pm2
pm2 start npm --name "schedule-app" -- start
pm2 save
pm2 startup
\`\`\`

**Custo Total: €5-10/mês**

---

### Opção 3: Outras Plataformas Cloud

#### **Render** (Alternativa ao Vercel)
- Deploy automático via Git
- €7/mês (plano básico)
- SSL automático
- [https://render.com](https://render.com)

#### **Railway** 
- €5/mês
- Deploy com 1 clique
- [https://railway.app](https://railway.app)

#### **Netlify**
- Similar ao Vercel
- Suporta Next.js
- [https://netlify.com](https://netlify.com)

---

## Backups e Recuperação

### Backup do Supabase
\`\`\`bash
# Via CLI
supabase db dump -f backup.sql

# Restaurar
psql -h db.seu-projeto.supabase.co -U postgres -d postgres -f backup.sql
\`\`\`

### Backup Automático (Cron)
\`\`\`bash
# Adicionar ao crontab (diariamente às 3h)
0 3 * * * /usr/local/bin/supabase db dump -f /backups/backup-$(date +\%Y\%m\%d).sql
\`\`\`

---

## Monitoramento

### Ver Logs da Aplicação
\`\`\`bash
# Docker
docker logs -f schedule-app

# PM2
pm2 logs schedule-app
\`\`\`

### Ver Logs do Supabase
Dashboard → Logs → Query Performance

---

## Troubleshooting

### Problema: RLS bloqueando acesso
**Solução:** Verificar se usuário está autenticado e tem role correto
\`\`\`sql
-- Ver role do usuário atual
SELECT role FROM profiles WHERE id = auth.uid();
\`\`\`

### Problema: Logs de auditoria não aparecem
**Solução:** Verificar se triggers estão ativos
\`\`\`sql
-- Ver triggers ativos
SELECT * FROM pg_trigger WHERE tgname LIKE 'audit%';
\`\`\`

### Problema: Aplicação não conecta ao Supabase
**Solução:** Verificar variáveis de ambiente
\`\`\`bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
\`\`\`

---

## Suporte

Para questões de segurança ou problemas técnicos:
1. Verificar logs de auditoria no Supabase
2. Consultar documentação: [https://supabase.com/docs](https://supabase.com/docs)
3. Verificar status do Supabase: [https://status.supabase.com](https://status.supabase.com)
