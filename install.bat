@echo off
chcp 65001 >nul
echo 🚀 FastBoot Factory Reset - Instalação
echo ======================================

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Por favor, instale o Node.js 16+ primeiro.
    echo    Visite: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar versão do Node.js
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 16 (
    echo ❌ Node.js versão 16+ é necessária. Versão atual:
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
node --version

REM Verificar se o npm está instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm não encontrado. Por favor, instale o npm.
    pause
    exit /b 1
)

echo ✅ npm encontrado
npm --version

REM Verificar se o ADB está instalado
adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  ADB não encontrado no PATH
    echo    Verifique se o Android Platform Tools está instalado
    echo    e adicionado ao PATH do sistema
    echo.
    echo    Caminhos típicos:
    echo    C:\Android\platform-tools\
    echo    C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\
    echo.
    echo    Baixe em: https://developer.android.com/studio/releases/platform-tools
    echo.
    pause
) else (
    echo ✅ ADB encontrado
    adb version
)

REM Instalar dependências do backend
echo 📦 Instalando dependências do backend...
call npm install

REM Instalar dependências do frontend
echo 📦 Instalando dependências do frontend...
cd client
call npm install
cd ..

REM Criar arquivo de ambiente
if not exist .env (
    echo 🔧 Criando arquivo de ambiente...
    copy env.example .env
    echo ✅ Arquivo .env criado. Edite conforme necessário.
)

echo.
echo 🎉 Instalação concluída!
echo.
echo 📋 Para executar a aplicação:
echo    npm run dev
echo.
echo 🌐 Acesse:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 🔑 Credenciais padrão:
echo    Usuário: admin
echo    Senha:  admin123
echo.
echo ⚠️  IMPORTANTE:
echo    - Altere a senha padrão em produção
echo    - Configure HTTPS para ambiente de produção
echo    - Verifique se o ADB está funcionando: adb devices
echo.
pause
