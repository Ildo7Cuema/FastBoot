# FastBoot Factory Reset - Aplicação Web

Aplicação web multiplataforma para restauração de fábrica de dispositivos Android usando ADB e Fastboot.

## 🚀 Características

- **Interface Web Moderna** com React + TailwindCSS
- **Backend Node.js + Express** com autenticação JWT
- **Comunicação em tempo real** via WebSocket
- **Detecção automática** de dispositivos Android conectados via USB
- **Operações seguras** com confirmações para ações críticas
- **Logs em tempo real** com filtros e exportação
- **Compatibilidade multiplataforma** (Windows, macOS e Linux)
- **Tema claro/escuro** automático baseado na preferência do sistema
- **Monitoramento contínuo** de dispositivos

## 🛠️ Funcionalidades Principais

### 1. Autenticação e Segurança
- Sistema de login com JWT
- Usuário padrão: `admin` / `admin123`
- Middleware de autenticação para todas as operações críticas

### 2. Detecção de Dispositivos
- Detecção automática via ADB
- Informações detalhadas do dispositivo (modelo, fabricante, versão Android)
- Status de conexão em tempo real via WebSocket

### 3. Operações de Fastboot
- Reiniciar dispositivo para modo Fastboot
- Verificação de status do dispositivo
- Informações detalhadas do dispositivo

### 4. Factory Reset
- Restauração completa para configurações de fábrica
- Confirmação de segurança antes da execução
- Progresso visual da operação
- Logs detalhados de cada etapa

### 5. Operações Adicionais
- Reiniciar dispositivo
- Limpar cache do sistema
- Monitoramento de status em tempo real

### 6. Sistema de Logs
- Logs em tempo real de todas as operações
- Filtros por nível (DEBUG, INFO, WARN, ERROR)
- Busca textual nos logs
- Exportação para arquivo JSON
- Histórico persistente

## 📋 Pré-requisitos

### Sistema Operacional
- **Windows 10+** ou **macOS 10.14+** ou **Linux**
- Node.js 16.0.0 ou superior

### Android SDK Platform Tools
- [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
- Deve estar no PATH do sistema ou em localização padrão

### Dispositivo Android
- Depuração USB habilitada
- Conectado via cabo USB
- Desbloqueado (para operações de bootloader)

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/fastboot-factory-reset-web.git
cd fastboot-factory-reset-web
```

### 2. Instale as dependências
```bash
npm run install:all
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Instale o Android SDK Platform Tools

#### Windows
1. Baixe o [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
2. Extraia para `C:\Android\platform-tools\`
3. Adicione ao PATH do sistema:
   - Painel de Controle → Sistema → Variáveis de Ambiente
   - Adicione `C:\Android\platform-tools\` ao PATH

#### macOS
```bash
# Via Homebrew (recomendado)
brew install android-platform-tools

# Ou baixe manualmente
# https://developer.android.com/studio/releases/platform-tools
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install android-tools-adb android-tools-fastboot

# Ou baixe manualmente
# https://developer.android.com/studio/releases/platform-tools
```

### 5. Execute a aplicação

#### Desenvolvimento
```bash
npm run dev
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

#### Produção
```bash
npm run build
npm start
```

## 🔧 Uso

### 1. Acesso à Aplicação
- Abra http://localhost:3000 no navegador
- Faça login com as credenciais padrão:
  - **Usuário:** `admin`
  - **Senha:** `admin123`

### 2. Detectar Dispositivos
- Conecte um dispositivo Android via USB
- Habilite a depuração USB no dispositivo
- Clique em "Detectar Dispositivos"

### 3. Executar Factory Reset
- Selecione o dispositivo desejado
- Clique em "Factory Reset"
- Confirme a operação (⚠️ **IRREVERSÍVEL**)
- Aguarde a conclusão

### 4. Monitorar Logs
- Acesse a aba "Logs" para ver operações em tempo real
- Use filtros para buscar logs específicos
- Exporte logs para análise

## 🏗️ Estrutura do Projeto

```
fastboot-factory-reset-web/
├── server/                 # Backend Node.js + Express
│   ├── routes/            # Rotas da API
│   ├── config/            # Configurações
│   └── index.js           # Servidor principal
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos React
│   │   └── App.js         # Aplicação principal
│   ├── public/            # Arquivos públicos
│   └── package.json       # Dependências do frontend
├── src/modules/           # Módulos existentes (ADB, Fastboot, Logger)
├── package.json           # Dependências do backend
└── README.md              # Este arquivo
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login do usuário
- `GET /api/auth/verify` - Verificar token

### Dispositivos
- `GET /api/devices` - Listar dispositivos
- `POST /api/devices/detect` - Detectar dispositivos
- `GET /api/devices/:id` - Informações do dispositivo
- `POST /api/devices/:id/reboot-bootloader` - Reiniciar para bootloader

### Fastboot
- `POST /api/fastboot/factory-reset` - Factory reset
- `POST /api/fastboot/reboot` - Reiniciar dispositivo
- `POST /api/fastboot/clear-cache` - Limpar cache
- `GET /api/fastboot/status` - Status do fastboot

### Logs
- `GET /api/logs` - Obter logs
- `DELETE /api/logs` - Limpar logs
- `GET /api/logs/export` - Exportar logs

## 🚨 Avisos de Segurança

### ⚠️ Factory Reset
- **IRREVERSÍVEL**: Todos os dados serão perdidos
- Faça backup antes de executar
- Confirme a operação no dispositivo Android

### 🔐 Autenticação
- Altere a senha padrão em produção
- Use HTTPS em ambiente de produção
- Configure JWT_SECRET seguro

## 🐛 Solução de Problemas

### ADB não encontrado
```bash
# Verifique se está no PATH
adb version

# Ou use caminho completo
export PATH=$PATH:/caminho/para/platform-tools
```

### Dispositivo não detectado
1. Verifique se a depuração USB está habilitada
2. Aceite a autorização no dispositivo Android
3. Teste com `adb devices` no terminal

### Erro de permissão
- Execute como administrador (Windows)
- Use `sudo` no Linux/macOS
- Verifique permissões USB

## 📝 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/seu-usuario/fastboot-factory-reset-web/issues)
- **Documentação:** [Wiki](https://github.com/seu-usuario/fastboot-factory-reset-web/wiki)
- **Email:** suporte@fastboot.com

## 🔄 Changelog

### v1.0.0 (2024-01-XX)
- ✨ Aplicação web completa com React + Express
- 🔐 Sistema de autenticação JWT
- 📱 Detecção automática de dispositivos Android
- 🚀 Factory reset via ADB/Fastboot
- 📊 Logs em tempo real via WebSocket
- 🎨 Interface moderna com TailwindCSS
- 📱 Responsivo para todos os dispositivos
- 🔒 Operações seguras com confirmações
- 📤 Exportação de logs
- 🌐 Compatibilidade multiplataforma

---

**Desenvolvido com ❤️ pela equipe FastBoot**
