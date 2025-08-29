# Guia de Instalação e Configuração

## Melhorias Implementadas

### 1. Tela de Login Moderna e Responsiva
- **Design profissional** com gradientes e animações suaves
- **Campos de Utilizador e Senha** (não email) conforme solicitado
- **Validações em tempo real** com mensagens de erro específicas
- **Indicador visual de força de senha**
- **Botão de mostrar/ocultar senha**
- **Responsividade total** para desktop, tablet e mobile
- **Mensagens de erro vindas do backend** com tratamento de tentativas de login

### 2. Dashboard e Sidebar Funcional
- **Sidebar moderno** com ícones e descrições
- **Navegação real** entre todas as páginas
- **Indicador visual** da página ativa
- **Status de conexão** em tempo real
- **Menu de usuário** com opções de perfil e logout
- **Modo escuro/claro** com persistência
- **Responsividade** com menu hambúrguer no mobile

### 3. Integração com SQLite
- **Banco de dados SQLite** configurado e funcional
- **Autenticação real** com verificação no banco
- **Sistema de tentativas de login** com bloqueio temporário
- **CRUD completo de usuários** com operações reais no banco
- **Logs salvos no banco** de dados
- **Sistema de backup e restauração**

### 4. Páginas Implementadas
- **Login**: Autenticação segura com JWT
- **Dashboard**: Visão geral com estatísticas
- **Dispositivos**: Gerenciamento de dispositivos conectados
- **Logs**: Visualização de logs do sistema
- **Usuários**: CRUD completo de usuários (admin only)
- **Segurança**: Alteração de senha com validação
- **Monitoramento**: Estatísticas em tempo real do servidor
- **Backup**: Sistema de backup e restauração
- **Configurações**: Preferências do sistema

## Instalação

### Pré-requisitos
- Node.js 14+ instalado
- NPM ou Yarn

### Passos de Instalação

1. **Instalar dependências do servidor**:
```bash
cd server
npm install
```

2. **Instalar dependências do cliente**:
```bash
cd ../client
npm install
```

3. **Configurar variáveis de ambiente**:
Crie um arquivo `.env` na raiz do projeto:
```env
PORT=5001
HOST=localhost
JWT_SECRET=sua-chave-secreta-super-segura-aqui
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
```

4. **Iniciar o servidor** (em um terminal):
```bash
cd server
npm start
```

5. **Iniciar o cliente** (em outro terminal):
```bash
cd client
npm start
```

## Credenciais de Acesso

- **Usuário**: admin
- **Senha**: admin123

## Funcionalidades Principais

### Sistema de Login
- Validação de campos em tempo real
- Contador de tentativas com bloqueio após 5 tentativas
- Mensagens de erro específicas do backend
- Token JWT com refresh token
- Logout seguro

### Gestão de Usuários
- Criar novos usuários (admin only)
- Editar informações de usuários
- Desativar usuários
- Visualizar lista completa com filtros

### Segurança
- Senhas criptografadas com bcrypt
- Indicador de força de senha
- Alteração de senha com validação
- Sistema de roles (admin/user)

### Monitoramento
- CPU, Memória, Disco em tempo real
- Tráfego de rede
- Uptime do sistema
- Atualização automática a cada 5 segundos

### Backup
- Criação manual de backups
- Backup automático configurável
- Restauração de backups
- Download de backups

## Estrutura do Banco de Dados

### Tabela: users
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- password_hash (TEXT)
- email (TEXT)
- role (TEXT)
- is_active (BOOLEAN)
- created_at (DATETIME)
- updated_at (DATETIME)

### Tabela: login_attempts
- id (INTEGER PRIMARY KEY)
- username (TEXT)
- attempts (INTEGER)
- last_attempt (DATETIME)
- locked_until (DATETIME)

### Tabela: logs
- id (INTEGER PRIMARY KEY)
- level (TEXT)
- message (TEXT)
- meta (TEXT)
- timestamp (DATETIME)

## Tecnologias Utilizadas

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Lucide React (ícones)
- React Hot Toast
- Axios

### Backend
- Node.js
- Express
- SQLite3
- JWT
- Bcrypt
- Socket.io
- Helmet (segurança)

## Melhorias de UX/UI

1. **Feedback Visual**:
   - Animações suaves em todas as transições
   - Estados de loading em botões e páginas
   - Tooltips informativos
   - Mensagens de sucesso/erro claras

2. **Acessibilidade**:
   - Labels apropriados em todos os campos
   - Navegação por teclado
   - Contraste adequado de cores
   - Textos alternativos

3. **Performance**:
   - Lazy loading de componentes
   - Otimização de re-renders
   - Cache de dados quando apropriado

4. **Responsividade**:
   - Layout adaptativo para todos os tamanhos
   - Menu mobile otimizado
   - Tabelas com scroll horizontal no mobile
   - Formulários adaptados para toque

## Próximos Passos Sugeridos

1. Implementar autenticação de dois fatores
2. Adicionar logs de auditoria detalhados
3. Sistema de notificações em tempo real
4. Dashboard com gráficos interativos
5. Exportação de relatórios em PDF
6. Integração com serviços de email
7. Sistema de permissões granular
8. API REST documentada com Swagger