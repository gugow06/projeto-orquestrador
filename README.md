# 🔄 Orquestrador de Dados - Sistema de Produção

Sistema avançado de orquestração entre sistemas legados e contemporâneos usando IA generativa para análise e transformação de dados, otimizado para produção com monitoramento completo e alta performance.

## ✨ Funcionalidades Principais

### 🔍 Processamento de Dados
- **Upload Inteligente**: Suporte para arquivos CSV com validação automática
- **Análise com IA**: Integração com Google Gemini e Groq para análise de esquemas
- **Mapeamento Automático**: Sugestões inteligentes de transformação de dados
- **Validação Robusta**: Sistema completo de validação de entrada e tipos
- **Transformação Avançada**: Aplicação de regras complexas de transformação

### 🚀 Performance e Produção
- **Cache Inteligente**: Sistema de cache em memória com múltiplas estratégias (LRU, LFU, FIFO)
- **Compressão Automática**: Compressão de assets e responses (gzip, deflate, brotli)
- **Code Splitting**: Carregamento lazy de componentes para otimização de bundle
- **Rate Limiting**: Proteção contra abuso com limitação de taxa configurável
- **Bundle Optimization**: Análise e otimização automática do tamanho do bundle

### 📊 Monitoramento e Observabilidade
- **Logs Estruturados**: Sistema de logging em JSON para produção
- **Métricas de Performance**: Coleta de métricas de CPU, memória, rede e aplicação
- **Health Checks**: Verificação automática de saúde da aplicação e dependências
- **Monitoramento de Erros**: Sistema avançado de captura e análise de erros
- **Alertas Inteligentes**: Notificações baseadas em thresholds configuráveis

### 🔒 Segurança
- **Headers de Segurança**: CSP, HSTS, X-Frame-Options e outros headers
- **Detecção de Ataques**: Identificação de tentativas de SQL injection e path traversal
- **Autenticação**: Sistema de tokens para APIs sensíveis
- **Validação de Entrada**: Sanitização e validação robusta de todos os inputs

## 🛠️ Stack Tecnológico

### Frontend & Backend
- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript com tipagem estrita
- **UI**: Tailwind CSS + Shadcn/ui + Framer Motion
- **Ícones**: Lucide React

### IA e Processamento
- **IA Generativa**: Google Gemini Pro, Groq
- **Processamento CSV**: Papa Parse
- **Validação**: Sistema customizado de validação

### Infraestrutura
- **Containerização**: Docker com multi-stage build
- **Orquestração**: Docker Compose
- **Cache**: Redis para sessões e cache distribuído
- **Proxy**: Nginx para load balancing
- **Monitoramento**: Prometheus + Grafana

## 📋 Pré-requisitos

### Para Desenvolvimento
- **Node.js** 18+ (LTS recomendado)
- **NPM** ou **Yarn**
- **Git**

### Para Produção
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **4GB+ RAM** (recomendado)
- **2+ CPU cores**

### APIs Necessárias
- Chave de API do **Google Gemini** ou **Groq**
- Token de autenticação para APIs (produção)

## 🚀 Instalação e Execução

### Desenvolvimento Local

1. **Clone o repositório**:
```bash
git clone https://github.com/seu-usuario/projeto-orquestrador.git
cd projeto-orquestrador
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env.local
# Edite .env.local com suas chaves de API
```

4. **Execute em modo desenvolvimento**:
```bash
npm run dev
```

5. **Acesse a aplicação**: http://localhost:3000

### Deploy para Produção

#### Deploy Rápido com Docker
```bash
# Configurar ambiente
cp .env.production.example .env.production
# Editar .env.production com configurações de produção

# Deploy automatizado
chmod +x deploy.sh
./deploy.sh
```

#### Deploy Manual
```bash
# Build da aplicação
docker build -t projeto-orquestrador:latest .

# Iniciar com Docker Compose
docker-compose up -d

# Verificar status
docker-compose ps
curl http://localhost:3000/api/health-check
```

## ⚙️ Configuração

### Variáveis de Ambiente

#### Desenvolvimento (.env.local)
```env
# APIs de IA
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_gemini
NEXT_PUBLIC_GROQ_API_KEY=sua_chave_groq

# Configurações básicas
NODE_ENV=development
```

#### Produção (.env.production)
```env
# Ambiente
NODE_ENV=production
PORT=3000

# Segurança
SECRET_KEY=chave-secreta-forte-aqui
JWT_SECRET=jwt-secret-forte-aqui
HEALTH_CHECK_TOKEN=token-health-check
METRICS_TOKEN=token-metricas

# APIs de IA
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_gemini
NEXT_PUBLIC_GROQ_API_KEY=sua_chave_groq

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=senha-redis-forte

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache e Performance
CACHE_TTL=3600
ENABLE_CACHE=true
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6

# Logs
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5
```

### Configuração das APIs de IA

#### Google Gemini
1. Acesse [Google AI Studio](https://ai.google.dev)
2. Crie uma conta e gere uma API key
3. Adicione a chave em `NEXT_PUBLIC_GEMINI_API_KEY`

#### Groq
1. Acesse [Groq Console](https://console.groq.com)
2. Crie uma conta e gere uma API key
3. Adicione a chave em `NEXT_PUBLIC_GROQ_API_KEY`

## 📖 Como Usar

### 1. Upload e Análise de Dados
- Arraste e solte um arquivo CSV ou clique para selecionar
- O sistema validará automaticamente o formato
- Visualize o preview dos dados carregados
- Confirme para iniciar a análise com IA

### 2. Análise Inteligente
- Escolha entre Google Gemini ou Groq
- A IA analisará a estrutura e conteúdo dos dados
- Receba sugestões de mapeamento e transformação
- Revise e ajuste as sugestões conforme necessário

### 3. Transformação e Publicação
- Configure as regras de transformação
- Escolha o destino (API, arquivo, banco de dados)
- Execute a transformação
- Monitore o progresso em tempo real

### 2. Análise com IA
- Configure sua chave de API (Gemini ou Groq)
- A IA analisará o esquema dos dados
- Receberá sugestões de mapeamento com níveis de confiança

### 3. Transformação
- Revise os mapeamentos sugeridos
- Execute a transformação dos dados
- Visualize o resultado e baixe se necessário

### 4. Publicação
- Escolha o destino: API REST, Banco de Dados ou Arquivo
- Configure os parâmetros de conexão
- Publique os dados transformados

## 📊 Monitoramento e Observabilidade

### Health Checks
```bash
# Verificar saúde da aplicação
curl http://localhost:3000/api/health-check

# Com autenticação (produção)
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/health-check
```

### Métricas de Performance
```bash
# Métricas em JSON
curl http://localhost:3000/api/metrics

# Métricas para Prometheus
curl http://localhost:3000/api/metrics?format=prometheus
```

### Logs Estruturados
```bash
# Visualizar logs em desenvolvimento
npm run dev

# Logs em produção (Docker)
docker-compose logs -f app

# Logs estruturados em arquivo
docker exec projeto-orquestrador-app tail -f /app/logs/app.log
```

### Dashboards (Produção)
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 📁 Estrutura do Projeto

```
📦 projeto-orquestrador/
├── 🐳 Docker & Deploy
│   ├── Dockerfile              # Container otimizado para produção
│   ├── docker-compose.yml      # Orquestração completa
│   ├── deploy.sh              # Script de deploy automatizado
│   ├── healthcheck.js         # Health check para Docker
│   └── .dockerignore          # Exclusões do build
├── 📋 Configuração
│   ├── next.config.js         # Configuração do Next.js
│   ├── .env.production        # Variáveis de produção
│   ├── .env.example           # Template de variáveis
│   └── .gitignore             # Exclusões do Git
├── 🔧 Scripts
│   └── scripts/
│       └── analyze-bundle.js  # Análise de bundle
├── 💻 Código Fonte
│   └── src/
│       ├── app/               # App Router (Next.js 14)
│       │   ├── api/           # APIs REST
│       │   │   ├── health-check/
│       │   │   └── metrics/
│       │   ├── globals.css    # Estilos globais
│       │   ├── layout.tsx     # Layout principal
│       │   └── page.tsx       # Página inicial
│       ├── components/        # Componentes React
│       │   ├── ui/           # Componentes base (shadcn/ui)
│       │   ├── LazyComponents.tsx  # Code splitting
│       │   ├── DataTransformer.tsx
│       │   ├── FileUploader.tsx
│       │   ├── OutputPublisher.tsx
│       │   └── SchemaAnalyzer.tsx
│       ├── lib/              # Bibliotecas e utilitários
│       │   ├── ai-service.ts          # Integração com IA
│       │   ├── cache-manager.ts       # Sistema de cache
│       │   ├── compression.ts         # Compressão de assets
│       │   ├── error-monitor.ts       # Monitoramento de erros
│       │   ├── input-validator.ts     # Validação de entrada
│       │   ├── logger.ts              # Logs estruturados
│       │   ├── performance-metrics.ts # Métricas de performance
│       │   ├── rate-limiter.ts        # Rate limiting
│       │   └── utils.ts               # Utilitários gerais
│       ├── middleware.ts      # Middleware do Next.js
│       └── types/            # Tipos TypeScript
│           └── index.ts
└── 📚 Documentação
    ├── README.md             # Este arquivo
    ├── DEPLOY.md            # Guia de deploy
    ├── GUIA_DE_TESTE.md     # Guia de testes
    └── INSTALACAO_NODEJS.md # Instalação do Node.js
```

## 🔄 Fluxo de Dados

1. **Input Adapter**: Coleta dados do sistema legado (CSV)
2. **AI Analyzer**: Analisa esquemas e sugere mapeamentos
3. **Data Transformer**: Aplica transformações baseadas na IA
4. **Output Publisher**: Envia dados para sistema contemporâneo

## 🎯 Exemplos de Uso

### Migração de Sistema Financeiro
```csv
# Dados legados (exemplo_dados_financeiros.csv)
id_conta,nome_cliente,saldo_atual,data_abertura
001,João Silva,1500.50,01/01/2020
002,Maria Santos,2300.75,15/03/2020
```

### Modernização de Cadastro
```csv
# Dados legados (exemplo_dados_legados.csv)
codigo,descricao,categoria,valor
PROD001,Notebook Dell,Informática,2500.00
PROD002,Mouse Logitech,Periféricos,45.90
```

## 🎯 Casos de Uso

- Migração de dados entre sistemas ERP
- Integração de planilhas legadas com APIs modernas
- Normalização de dados para Data Lakes
- Modernização de processos ETL

## 🚧 Roadmap

- [ ] Suporte para mais formatos (XML, JSON, TXT)
- [ ] Integração com bancos de dados legados
- [ ] Pipeline de transformação visual
- [ ] Monitoramento e logs avançados
- [ ] Suporte para transformações customizadas
- [ ] API para automação

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código

# Análise e Otimização
node scripts/analyze-bundle.js  # Análise do bundle

# Deploy
./deploy.sh                    # Deploy completo
./deploy.sh --with-tests       # Deploy com testes
./deploy.sh --rollback         # Rollback
```

## 🔧 Desenvolvimento

### Adicionando Novas Funcionalidades
1. Crie componentes em `src/components/`
2. Adicione lógica de negócio em `src/lib/`
3. Implemente APIs em `src/app/api/`
4. Adicione tipos em `src/types/`
5. Teste localmente com `npm run dev`

### Otimização de Performance
- Use `LazyComponents.tsx` para code splitting
- Implemente cache com `cache-manager.ts`
- Monitore performance com `/api/metrics`
- Analise bundle com `analyze-bundle.js`

## 🤝 Contribuição

1. **Fork** o projeto
2. **Clone** seu fork: `git clone https://github.com/seu-usuario/projeto-orquestrador.git`
3. **Crie** uma branch: `git checkout -b feature/nova-funcionalidade`
4. **Desenvolva** e teste suas mudanças
5. **Commit**: `git commit -m 'feat: adiciona nova funcionalidade'`
6. **Push**: `git push origin feature/nova-funcionalidade`
7. **Abra** um Pull Request

### Padrões de Commit
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` manutenção

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

### Documentação
- 📖 [Guia de Deploy](DEPLOY.md)
- 🧪 [Guia de Testes](GUIA_DE_TESTE.md)
- ⚙️ [Instalação Node.js](INSTALACAO_NODEJS.md)

### Contato
- 🐛 [Issues](https://github.com/seu-usuario/projeto-orquestrador/issues)
- 💬 [Discussions](https://github.com/seu-usuario/projeto-orquestrador/discussions)
- 📧 Email: seu-email@exemplo.com

### Status do Projeto
- ✅ **Produção**: Sistema pronto para uso em produção
- 🔄 **Monitoramento**: Logs, métricas e health checks ativos
- 🚀 **Performance**: Otimizado com cache, compressão e code splitting
- 🔒 **Segurança**: Rate limiting, validação e headers de segurança

---

**Desenvolvido com ❤️ usando Next.js 14, TypeScript e IA Generativa**

*Sistema de orquestração de dados enterprise-ready com monitoramento completo e alta performance.*