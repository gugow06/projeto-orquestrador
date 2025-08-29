#!/bin/bash

# Script de deploy para produção
# Este script automatiza o processo de build e deploy da aplicação

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
APP_NAME="projeto-orquestrador"
DOCKER_IMAGE="$APP_NAME:latest"
DOCKER_IMAGE_PROD="$APP_NAME:prod-$(date +%Y%m%d-%H%M%S)"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Funções utilitárias
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar pré-requisitos
check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose não está instalado"
        exit 1
    fi
    
    # Verificar se Docker está rodando
    if ! docker info &> /dev/null; then
        log_error "Docker não está rodando"
        exit 1
    fi
    
    # Verificar arquivos necessários
    if [[ ! -f "Dockerfile" ]]; then
        log_error "Dockerfile não encontrado"
        exit 1
    fi
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "docker-compose.yml não encontrado"
        exit 1
    fi
    
    if [[ ! -f ".env.production" ]]; then
        log_warning ".env.production não encontrado, usando variáveis padrão"
    fi
    
    log_success "Pré-requisitos verificados"
}

# Fazer backup dos dados
backup_data() {
    log "Fazendo backup dos dados..."
    
    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup de volumes Docker (se existirem)
    if docker volume ls | grep -q "${APP_NAME}_app_uploads"; then
        log "Fazendo backup do volume de uploads..."
        docker run --rm -v "${APP_NAME}_app_uploads:/data" -v "$(pwd)/$BACKUP_DIR:/backup" alpine tar czf "/backup/uploads-$(date +%Y%m%d-%H%M%S).tar.gz" -C /data .
    fi
    
    if docker volume ls | grep -q "${APP_NAME}_app_logs"; then
        log "Fazendo backup do volume de logs..."
        docker run --rm -v "${APP_NAME}_app_logs:/data" -v "$(pwd)/$BACKUP_DIR:/backup" alpine tar czf "/backup/logs-$(date +%Y%m%d-%H%M%S).tar.gz" -C /data .
    fi
    
    log_success "Backup concluído"
}

# Build da aplicação
build_application() {
    log "Iniciando build da aplicação..."
    
    # Limpar builds anteriores
    log "Limpando builds anteriores..."
    docker system prune -f
    
    # Build da imagem
    log "Construindo imagem Docker..."
    docker build -t "$DOCKER_IMAGE" -t "$DOCKER_IMAGE_PROD" .
    
    # Verificar se o build foi bem-sucedido
    if docker images | grep -q "$APP_NAME"; then
        log_success "Build da aplicação concluído"
    else
        log_error "Falha no build da aplicação"
        exit 1
    fi
}

# Executar testes
run_tests() {
    log "Executando testes..."
    
    # Executar testes em container temporário
    if docker run --rm "$DOCKER_IMAGE" npm test; then
        log_success "Todos os testes passaram"
    else
        log_error "Alguns testes falharam"
        read -p "Continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Verificar health check
check_health() {
    log "Verificando health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker run --rm "$DOCKER_IMAGE" node healthcheck.js; then
            log_success "Health check passou"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts falhou, aguardando..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check falhou após $max_attempts tentativas"
    return 1
}

# Deploy da aplicação
deploy_application() {
    log "Iniciando deploy..."
    
    # Parar containers existentes
    log "Parando containers existentes..."
    docker-compose down || true
    
    # Iniciar novos containers
    log "Iniciando novos containers..."
    docker-compose up -d
    
    # Aguardar containers iniciarem
    log "Aguardando containers iniciarem..."
    sleep 10
    
    # Verificar se containers estão rodando
    if docker-compose ps | grep -q "Up"; then
        log_success "Containers iniciados com sucesso"
    else
        log_error "Falha ao iniciar containers"
        docker-compose logs
        exit 1
    fi
}

# Verificar deploy
verify_deployment() {
    log "Verificando deploy..."
    
    local app_url="http://localhost:3000"
    local health_url="$app_url/api/health-check"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null; then
            log_success "Aplicação está respondendo em $app_url"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts - aplicação ainda não está respondendo..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Aplicação não está respondendo após $max_attempts tentativas"
    log "Logs dos containers:"
    docker-compose logs --tail=50
    return 1
}

# Limpeza pós-deploy
cleanup() {
    log "Executando limpeza..."
    
    # Remover imagens antigas (manter últimas 3)
    log "Removendo imagens antigas..."
    docker images "$APP_NAME" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}' | xargs -r docker rmi || true
    
    # Limpar volumes órfãos
    docker volume prune -f
    
    log_success "Limpeza concluída"
}

# Rollback
rollback() {
    log_error "Executando rollback..."
    
    # Parar containers atuais
    docker-compose down
    
    # Restaurar backup mais recente (se existir)
    if [[ -d "$BACKUP_DIR" ]] && [[ $(ls -A "$BACKUP_DIR") ]]; then
        log "Restaurando backup mais recente..."
        # Implementar lógica de restore aqui
    fi
    
    log_warning "Rollback concluído - verifique manualmente o estado da aplicação"
}

# Função principal
main() {
    log "=== Iniciando deploy do $APP_NAME ==="
    
    # Trap para rollback em caso de erro
    trap 'log_error "Deploy falhou! Executando rollback..."; rollback; exit 1' ERR
    
    check_prerequisites
    backup_data
    build_application
    
    # Executar testes apenas se solicitado
    if [[ "$1" == "--with-tests" ]]; then
        run_tests
    fi
    
    deploy_application
    verify_deployment
    cleanup
    
    log_success "=== Deploy do $APP_NAME concluído com sucesso! ==="
    log "Aplicação disponível em: http://localhost:3000"
    log "Health check: http://localhost:3000/api/health-check"
    log "Métricas: http://localhost:3000/api/metrics"
}

# Verificar argumentos
case "$1" in
    "--help" | "-h")
        echo "Uso: $0 [opções]"
        echo "Opções:"
        echo "  --with-tests    Executar testes antes do deploy"
        echo "  --rollback      Executar rollback"
        echo "  --help          Mostrar esta ajuda"
        exit 0
        ;;
    "--rollback")
        rollback
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac