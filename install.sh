#!/bin/bash

echo "🚀 FastBoot Factory Reset - Instalação"
echo "======================================"

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js 16+ primeiro."
    echo "   Visite: https://nodejs.org/"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js versão 16+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm."
    exit 1
fi

echo "✅ npm $(npm -v) encontrado"

# Verificar se o ADB está instalado
if ! command -v adb &> /dev/null; then
    echo "⚠️  ADB não encontrado no PATH"
    echo "   Instalando Android Platform Tools..."
    
    # Detectar sistema operacional
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y android-tools-adb android-tools-fastboot
        elif command -v yum &> /dev/null; then
            sudo yum install -y android-tools
        elif command -v pacman &> /dev/null; then
            sudo pacman -S android-tools
        else
            echo "❌ Gerenciador de pacotes não suportado. Instale manualmente:"
            echo "   https://developer.android.com/studio/releases/platform-tools"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install android-platform-tools
        else
            echo "❌ Homebrew não encontrado. Instale manualmente:"
            echo "   https://developer.android.com/studio/releases/platform-tools"
        fi
    else
        echo "❌ Sistema operacional não suportado. Instale manualmente:"
        echo "   https://developer.android.com/studio/releases/platform-tools"
    fi
else
    echo "✅ ADB encontrado: $(adb version | head -n1)"
fi

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
npm install

# Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
cd client
npm install
cd ..

# Criar arquivo de ambiente
if [ ! -f .env ]; then
    echo "🔧 Criando arquivo de ambiente..."
    cp env.example .env
    echo "✅ Arquivo .env criado. Edite conforme necessário."
fi

echo ""
echo "🎉 Instalação concluída!"
echo ""
echo "📋 Para executar a aplicação:"
echo "   npm run dev"
echo ""
echo "🌐 Acesse:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔑 Credenciais padrão:"
echo "   Usuário: admin"
echo "   Senha:  admin123"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Altere a senha padrão em produção"
echo "   - Configure HTTPS para ambiente de produção"
echo "   - Verifique se o ADB está funcionando: adb devices"
echo ""
