# Dockerfile multi-stage para produção otimizada

# Estágio 1: Base com dependências
FROM node:18-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package.json package-lock.json* ./

# Estágio 2: Instalar dependências
FROM base AS deps

# Instalar dependências de produção e desenvolvimento
RUN npm ci

# Estágio 3: Build da aplicação
FROM base AS builder
WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Configurar variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build da aplicação
RUN npm run build

# Estágio 4: Dependências de produção apenas
FROM base AS prod-deps
WORKDIR /app

# Copiar package.json novamente
COPY package.json package-lock.json* ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Estágio 5: Imagem final de produção
FROM node:18-alpine AS runner
WORKDIR /app

# Configurar ambiente de produção
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Criar diretório .next com permissões corretas
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar build da aplicação
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar dependências de produção
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Criar diretórios necessários para logs e cache
RUN mkdir -p /app/logs /app/cache /app/uploads
RUN chown -R nextjs:nodejs /app/logs /app/cache /app/uploads

# Configurar volumes para persistência
VOLUME ["/app/logs", "/app/cache", "/app/uploads"]

# Expor porta
EXPOSE 3000

# Configurar variáveis de ambiente padrão
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Mudar para usuário não-root
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Comando para iniciar a aplicação
CMD ["node", "server.js"]