#!/bin/bash

echo "🚀 FastBoot Factory Reset - Instalação e Inicialização Automática"
echo "================================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Node.js está instalado
print_status "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js não está instalado. Instalando..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            print_status "Instalando Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    print_success "Node.js já está instalado: $(node --version)"
fi

# Verificar se npm está instalado
print_status "Verificando npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm não está instalado"
    exit 1
else
    print_success "npm já está instalado: $(npm --version)"
fi

# Verificar se ADB está instalado
print_status "Verificando ADB..."
if ! command -v adb &> /dev/null; then
    print_warning "ADB não está instalado. Instalando..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install android-platform-tools
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get install -y android-tools-adb android-tools-fastboot
    fi
else
    print_success "ADB já está instalado: $(adb version | head -n1)"
fi

# Verificar se Fastboot está instalado
print_status "Verificando Fastboot..."
if ! command -v fastboot &> /dev/null; then
    print_warning "Fastboot não está instalado. Instalando..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install android-platform-tools
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get install -y android-tools-adb android-tools-fastboot
    fi
else
    print_success "Fastboot já está instalado: $(fastboot version | head -n1)"
fi

# Criar diretórios necessários
print_status "Criando diretórios necessários..."
mkdir -p data logs uploads backups

# Instalar dependências do backend
print_status "Instalando dependências do backend..."
npm install

# Instalar dependências do frontend
print_status "Instalando dependências do frontend..."
cd client
npm install
cd ..

# Criar arquivo .env se não existir
print_status "Configurando arquivo .env..."
if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
NODE_ENV=development
PORT=5001
HOST=localhost
JWT_SECRET=sua-chave-secreta-aqui
SESSION_SECRET=outra-chave-secreta-para-sessoes
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
DB_TYPE=sqlite
DB_PATH=./data/fastboot.db
LOG_LEVEL=INFO
LOG_DIRECTORY=./logs
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=30
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_TIME=15m
PASSWORD_MIN_LENGTH=8
ENVEOF
    print_success "Arquivo .env criado"
else
    print_success "Arquivo .env já existe"
fi

# Criar banco SQLite e usuário admin
print_status "Configurando banco de dados..."
sqlite3 data/fastboot.db << 'SQLEOF'
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_until DATETIME
);
SQLEOF

# Criar usuário admin com senha criptografada
print_status "Criando usuário administrador..."
cat > create-admin.js << 'JSEOF'
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/fastboot.db');
const db = new sqlite3.Database(dbPath);

const username = 'IldoAdmin';
const password = 'Ildo7..Marques';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Erro ao gerar hash:', err);
        db.close();
        return;
    }
    
    const sql = 'INSERT OR REPLACE INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, ?)';
    db.run(sql, [username, hash, 'admin', 1], function(err) {
        if (err) {
            console.error('Erro ao inserir usuário:', err);
        } else {
            console.log('Usuário administrador criado com sucesso!');
            console.log('Username:', username);
            console.log('Senha:', password);
        }
        db.close();
    });
});
JSEOF

# Instalar sqlite3 se não estiver instalado
if ! npm list sqlite3 &> /dev/null; then
    print_status "Instalando sqlite3..."
    npm install sqlite3
fi

# Criar usuário admin
print_status "Executando script de criação do usuário admin..."
node create-admin.js

# Limpar arquivo temporário
rm create-admin.js

print_success "✅ Instalação concluída com sucesso!"
echo ""
echo "🚀 Iniciando aplicação automaticamente..."
echo ""

# Função para limpar processos ao sair
cleanup() {
    print_status "Parando aplicação..."
    pkill -f "node.*server"
    pkill -f "npm.*start"
    pkill -f "react-scripts"
    exit 0
}

# Capturar sinal de interrupção
trap cleanup SIGINT SIGTERM

# Iniciar backend em background
print_status "Iniciando servidor backend na porta 5001..."
npm run server:dev &
BACKEND_PID=$!

# Aguardar backend inicializar
sleep 5

# Iniciar frontend em background
print_status "Iniciando frontend na porta 3000..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

print_success "�� Aplicação iniciada com sucesso!"
echo ""
echo "�� Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5001"
echo ""
echo "�� Login: IldoAdmin"
echo "🔑 Senha: Ildo7..Marques"
echo ""
echo "⏹️  Para parar a aplicação, pressione Ctrl+C"
echo ""

# Aguardar processos
wait $BACKEND_PID $FRONTEND_PID
