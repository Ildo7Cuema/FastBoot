# Dockerfile para FastBoot Factory Reset Web
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    android-tools \
    fastboot \
    usbutils \
    udev \
    && rm -rf /var/cache/apk/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências do backend
RUN npm ci --only=production

# Copiar código fonte do backend
COPY server/ ./server/
COPY src/modules/ ./src/modules/

# Copiar package.json do frontend
COPY client/package*.json ./client/

# Instalar dependências do frontend
WORKDIR /app/client
RUN npm ci --only=production

# Copiar código fonte do frontend
COPY client/src/ ./src/
COPY client/public/ ./public/
COPY client/tailwind.config.js client/postcss.config.js ./

# Build do frontend
RUN npm run build

# Voltar para o diretório raiz
WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fastboot -u 1001

# Criar diretório de logs
RUN mkdir -p /app/logs && chown -R fastboot:nodejs /app/logs

# Copiar arquivos de configuração
COPY .env* ./
COPY docker-compose.yml ./

# Expor porta
EXPOSE 5000

# Mudar para usuário não-root
USER fastboot

# Comando padrão
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
