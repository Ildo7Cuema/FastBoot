# FastBoot Factory Reset - Guia de Implantação

## 📋 Índice

1. [Requisitos](#requisitos)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Implantação](#implantação)
5. [Monitoramento](#monitoramento)
6. [Backup e Recuperação](#backup-e-recuperação)
7. [Segurança](#segurança)
8. [Solução de Problemas](#solução-de-problemas)

## 🔧 Requisitos

### Hardware Mínimo

- CPU: 2 cores
- RAM: 2GB
- Armazenamento: 20GB
- Portas USB: Para conexão com dispositivos Android

### Software

- Node.js 16+ ou Docker
- PM2 (para produção sem Docker)
- Nginx (opcional, como proxy reverso)
- Android SDK Platform Tools
- Git

### Sistemas Operacionais Suportados

- Ubuntu 20.04+
- Debian 10+
- CentOS 8+
- Windows Server 2019+
- macOS 10.15+

## 🚀 Instalação

### 1. Instalação Automatizada

#### Linux/macOS

```bash
git clone https://github.com/seu-repo/fastboot-factory-reset.git
cd fastboot-factory-reset
chmod +x install.sh
./install.sh
```

#### Windows

```batch
git clone https://github.com/seu-repo/fastboot-factory-reset.git
cd fastboot-factory-reset
install.bat
```

### 2. Instalação Manual

#### Instalar Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# macOS
brew install node
```

#### Instalar Android Tools

```bash
# Ubuntu/Debian
sudo apt-get install -y android-tools-adb android-tools-fastboot

# CentOS/RHEL
sudo yum install -y android-tools

# macOS
brew install --cask android-platform-tools
```

#### Instalar Dependências

```bash
npm run install:all
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do servidor
NODE_ENV=production
PORT=5000

# Segurança - IMPORTANTE: Altere estes valores!
JWT_SECRET=sua-chave-secreta-super-segura-aqui
SESSION_SECRET=outra-chave-secreta-para-sessoes

# Banco de dados (opcional)
DB_TYPE=sqlite
DB_PATH=./data/fastboot.db

# Logs
LOG_LEVEL=INFO
LOG_DIRECTORY=./logs
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=30

# CORS (ajuste para seu domínio)
CORS_ORIGIN=https://seu-dominio.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Email (para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

### 2. Configuração SSL/TLS

Para HTTPS, você precisará de certificados SSL:

```bash
# Usando Let's Encrypt
sudo apt-get install certbot
sudo certbot certonly --standalone -d seu-dominio.com
```

### 3. Configuração do Firewall

```bash
# Ubuntu/Debian com ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw enable

# CentOS/RHEL com firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## 🚢 Implantação

### Opção 1: PM2 (Recomendado)

```bash
# Build da aplicação
cd client && npm run build && cd ..

# Iniciar com PM2
pm2 start ecosystem.config.js --env production

# Salvar configuração
pm2 save

# Configurar inicialização automática
pm2 startup
```

### Opção 2: Docker

```bash
# Build e iniciar com Docker Compose
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### Opção 3: Systemd (Linux)

```bash
# Criar arquivo de serviço
sudo nano /etc/systemd/system/fastboot.service
```

Conteúdo do arquivo:

```ini
[Unit]
Description=FastBoot Factory Reset Application
After=network.target

[Service]
Type=simple
User=fastboot
WorkingDirectory=/opt/fastboot
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar serviço
sudo systemctl enable fastboot
sudo systemctl start fastboot
```

### Configuração Nginx (Proxy Reverso)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📊 Monitoramento

### PM2 Monitoring

```bash
# Status em tempo real
pm2 monit

# Logs
pm2 logs fastboot-factory-reset

# Métricas
pm2 info fastboot-factory-reset
```

### PM2 Web Dashboard

```bash
# Instalar PM2 Plus
pm2 install pm2-logrotate
pm2 install pm2-auto-pull

# Configurar dashboard web
pm2 web
```

### Monitoramento de Recursos

```bash
# Instalar htop
sudo apt-get install htop

# Monitorar em tempo real
htop
```

### Logs da Aplicação

```bash
# Ver logs em tempo real
tail -f logs/fastboot-*.log

# Buscar erros
grep ERROR logs/fastboot-*.log
```

## 💾 Backup e Recuperação

### Backup Automático

Crie um script de backup (`backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/backup/fastboot"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup dos dados
tar -czf $BACKUP_DIR/data_$TIMESTAMP.tar.gz data/
tar -czf $BACKUP_DIR/logs_$TIMESTAMP.tar.gz logs/
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz uploads/

# Backup da configuração
cp .env $BACKUP_DIR/env_$TIMESTAMP

# Remover backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Agendar com cron:

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2AM
0 2 * * * /opt/fastboot/backup.sh
```

### Recuperação

```bash
# Parar aplicação
pm2 stop fastboot-factory-reset

# Restaurar dados
tar -xzf /backup/fastboot/data_TIMESTAMP.tar.gz
tar -xzf /backup/fastboot/logs_TIMESTAMP.tar.gz
tar -xzf /backup/fastboot/uploads_TIMESTAMP.tar.gz

# Restaurar configuração
cp /backup/fastboot/env_TIMESTAMP .env

# Reiniciar aplicação
pm2 start fastboot-factory-reset
```

## 🔒 Segurança

### 1. Configurações de Segurança

- **Altere as senhas padrão** imediatamente após a instalação
- **Use HTTPS** em produção com certificados válidos
- **Configure firewall** para permitir apenas portas necessárias
- **Mantenha o sistema atualizado** com patches de segurança

### 2. Hardening do Servidor

```bash
# Desabilitar login root SSH
sudo nano /etc/ssh/sshd_config
# Definir: PermitRootLogin no

# Configurar fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 3. Segurança da Aplicação

- Ative rate limiting para prevenir ataques DDoS
- Use tokens JWT com expiração adequada
- Implemente CSRF protection
- Valide e sanitize todas as entradas
- Use HTTPS para todas as comunicações

### 4. Permissões de Arquivo

```bash
# Definir proprietário correto
sudo chown -R fastboot:fastboot /opt/fastboot

# Definir permissões
chmod 750 /opt/fastboot
chmod 640 /opt/fastboot/.env
chmod -R 755 /opt/fastboot/logs
```

## 🔧 Solução de Problemas

### Problemas Comuns

#### 1. Porta já em uso

```bash
# Verificar qual processo está usando a porta
sudo lsof -i :5000

# Matar o processo
sudo kill -9 <PID>
```

#### 2. Dispositivos USB não detectados

```bash
# Verificar permissões USB
ls -la /dev/bus/usb/

# Adicionar usuário ao grupo plugdev
sudo usermod -a -G plugdev $USER

# Recarregar regras udev
sudo udevadm control --reload-rules
sudo udevadm trigger
```

#### 3. Erro de permissão no PM2

```bash
# Reinstalar PM2 com permissões corretas
npm uninstall -g pm2
npm install -g pm2
pm2 update
```

#### 4. WebSocket não conecta

- Verifique configurações de proxy reverso
- Certifique-se que o firewall permite WebSocket
- Verifique logs do navegador para erros CORS

### Logs de Diagnóstico

```bash
# Logs do sistema
sudo journalctl -u fastboot -f

# Logs do PM2
pm2 logs --lines 100

# Logs do Docker
docker-compose logs -f --tail=100

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📈 Otimização de Performance

### 1. Configuração do Node.js

```bash
# Aumentar limite de memória
NODE_OPTIONS="--max-old-space-size=4096" pm2 start ecosystem.config.js
```

### 2. Configuração do PM2

```javascript
// ecosystem.config.js
instances: 'max', // Usar todos os cores disponíveis
exec_mode: 'cluster'
```

### 3. Configuração do Nginx

```nginx
# Habilitar cache
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Compressão Gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs da aplicação
2. Consulte a documentação
3. Abra uma issue no GitHub
4. Entre em contato com o suporte

---

**Última atualização:** Janeiro 2024
