# Guia de Deploy para Produção

Este documento contém instruções detalhadas para preparar e fazer deploy da aplicação em ambiente de produção.

## 📋 Pré-requisitos

### Software Necessário
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (para desenvolvimento)
- Git

### Recursos de Sistema Recomendados
- **CPU**: 2+ cores
- **RAM**: 4GB+ (2GB para aplicação + 1GB para Redis + 1GB para sistema)
- **Disco**: 20GB+ de espaço livre
- **Rede**: Conexão estável com internet

## 🚀 Deploy Rápido

### 1. Preparação
```bash
# Clonar repositório
git clone <repository-url>
cd projeto_orquestrador

# Configurar variáveis de ambiente
cp .env.production.example .env.production
# Editar .env.production com suas configurações
```

### 2. Deploy Automatizado
```bash
# Tornar script executável
chmod +x deploy.sh

# Deploy simples
./deploy.sh

# Deploy com testes
./deploy.sh --with-tests
```

### 3. Verificação
```bash
# Verificar status dos containers
docker-compose ps

# Verificar logs
docker-compose logs -f app

# Testar aplicação
curl http://localhost:3000/api/health-check
```

## 🔧 Deploy Manual

### 1. Build da Aplicação
```bash
# Build da imagem Docker
docker build -t projeto-orquestrador:latest .

# Verificar imagem criada
docker images | grep projeto-orquestrador
```

### 2. Configuração do Ambiente
```bash
# Criar volumes para persistência
docker volume create projeto-orquestrador_app_logs
docker volume create projeto-orquestrador_app_cache
docker volume create projeto-orquestrador_app_uploads
docker volume create projeto-orquestrador_redis_data
```

### 3. Iniciar Serviços
```bash
# Iniciar todos os serviços
docker-compose up -d

# Ou iniciar serviços específicos
docker-compose up -d app redis

# Para incluir monitoramento
docker-compose --profile monitoring up -d
```

## 📊 Monitoramento

### Endpoints de Monitoramento
- **Health Check**: `http://localhost:3000/api/health-check`
- **Métricas**: `http://localhost:3000/api/metrics`
- **Métricas Prometheus**: `http://localhost:3000/api/metrics?format=prometheus`

### Dashboards (se habilitado)
- **Grafana**: `http://localhost:3001` (admin/admin)
- **Prometheus**: `http://localhost:9090`

### Logs
```bash
# Logs da aplicação
docker-compose logs -f app

# Logs do Redis
docker-compose logs -f redis

# Logs de todos os serviços
docker-compose logs -f

# Logs estruturados (dentro do container)
docker exec -it projeto-orquestrador-app tail -f /app/logs/app.log
```

## 🔒 Configurações de Segurança

### Variáveis de Ambiente Críticas
```bash
# .env.production
NODE_ENV=production
SECRET_KEY=<chave-secreta-forte>
JWT_SECRET=<jwt-secret-forte>
REDIS_PASSWORD=<senha-redis-forte>
METRICS_TOKEN=<token-metricas>
HEALTH_CHECK_TOKEN=<token-health-check>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL=3600
ENABLE_CACHE=true
ENABLE_COMPRESSION=true

# Logs
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5
```

### Configurações de Firewall
```bash
# Portas que devem estar abertas
# 3000 - Aplicação principal
# 80/443 - Nginx (se usado)
# 6379 - Redis (apenas interno)
# 9090 - Prometheus (apenas interno/VPN)
# 3001 - Grafana (apenas interno/VPN)
```

## 🔄 Operações de Manutenção

### Backup
```bash
# Backup automático (incluído no deploy.sh)
./deploy.sh --backup-only

# Backup manual
mkdir -p backups
docker run --rm -v projeto-orquestrador_app_uploads:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
docker run --rm -v projeto-orquestrador_app_logs:/data -v $(pwd)/backups:/backup alpine tar czf /backup/logs-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore
```bash
# Restaurar uploads
docker run --rm -v projeto-orquestrador_app_uploads:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/uploads-YYYYMMDD.tar.gz -C /data

# Restaurar logs
docker run --rm -v projeto-orquestrador_app_logs:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/logs-YYYYMMDD.tar.gz -C /data
```

### Atualização
```bash
# Atualizar código
git pull origin main

# Rebuild e redeploy
./deploy.sh

# Ou manual
docker-compose down
docker build -t projeto-orquestrador:latest .
docker-compose up -d
```

### Rollback
```bash
# Rollback automático
./deploy.sh --rollback

# Rollback manual para versão específica
docker tag projeto-orquestrador:prod-20240115-143000 projeto-orquestrador:latest
docker-compose down
docker-compose up -d
```

## 🐛 Troubleshooting

### Problemas Comuns

#### Aplicação não inicia
```bash
# Verificar logs
docker-compose logs app

# Verificar configurações
docker-compose config

# Verificar recursos
docker stats
```

#### Health check falhando
```bash
# Testar health check manualmente
docker exec projeto-orquestrador-app node healthcheck.js

# Verificar conectividade
docker exec projeto-orquestrador-app curl -f http://localhost:3000/api/health-check
```

#### Performance baixa
```bash
# Verificar métricas
curl http://localhost:3000/api/metrics

# Verificar uso de recursos
docker stats

# Verificar logs de performance
docker exec projeto-orquestrador-app tail -f /app/logs/performance.log
```

#### Problemas de memória
```bash
# Verificar uso de memória
docker exec projeto-orquestrador-app node -e "console.log(process.memoryUsage())"

# Limpar cache
curl -X DELETE http://localhost:3000/api/metrics

# Reiniciar aplicação
docker-compose restart app
```

### Comandos Úteis
```bash
# Entrar no container da aplicação
docker exec -it projeto-orquestrador-app sh

# Verificar configuração do Nginx
docker exec projeto-orquestrador-nginx nginx -t

# Verificar conectividade Redis
docker exec projeto-orquestrador-redis redis-cli ping

# Limpar todos os dados (CUIDADO!)
docker-compose down -v
docker system prune -a
```

## 📈 Otimizações de Performance

### Configurações Recomendadas
```bash
# .env.production
COMPRESSION_LEVEL=6
CACHE_TTL=3600
RATE_LIMIT_MAX_REQUESTS=1000
ENABLE_COMPRESSION=true
ENABLE_CACHE=true

# Para alta carga
WORKER_PROCESSES=4
MAX_CONNECTIONS=1000
KEEP_ALIVE_TIMEOUT=65
```

### Monitoramento de Performance
```bash
# Métricas em tempo real
watch -n 5 'curl -s http://localhost:3000/api/metrics | jq .summary'

# Alertas de performance
curl http://localhost:3000/api/metrics | jq '.alerts.active[]'
```

## 🔐 Segurança em Produção

### Checklist de Segurança
- [ ] Variáveis de ambiente configuradas
- [ ] Senhas fortes definidas
- [ ] Rate limiting habilitado
- [ ] HTTPS configurado (se aplicável)
- [ ] Firewall configurado
- [ ] Logs de segurança habilitados
- [ ] Backup automático configurado
- [ ] Monitoramento ativo

### Configurações de Segurança
```bash
# Headers de segurança (já incluídos no next.config.js)
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
# - Strict-Transport-Security
# - Content-Security-Policy

# Rate limiting por IP
# Configurado em src/middleware.ts

# Validação de entrada
# Implementada em src/lib/input-validator.ts
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs da aplicação
2. Consultar este guia de troubleshooting
3. Verificar issues no repositório
4. Contatar equipe de desenvolvimento

---

**Última atualização**: $(date +%Y-%m-%d)
**Versão do guia**: 1.0