@echo off
REM FastBoot Factory Reset - Windows Installation Script

setlocal enabledelayedexpansion

echo ========================================
echo FastBoot Factory Reset Installation
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires administrator privileges.
    echo Please run as administrator.
    pause
    exit /b 1
)

REM Check for Node.js
echo Checking for Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js not found. Installing...
    echo Please download and install Node.js from https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js installed: !NODE_VERSION!
)

REM Check for Git
echo Checking for Git...
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Git not found. Installing...
    echo Please download and install Git from https://git-scm.com/
    start https://git-scm.com/download/win
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [OK] Git installed: !GIT_VERSION!
)

REM Check for ADB
echo Checking for Android SDK Platform Tools...
adb version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo Android SDK Platform Tools not found.
    echo.
    echo Would you like to download and install it? (Y/N)
    set /p INSTALL_ADB=
    if /i "!INSTALL_ADB!"=="Y" (
        echo Downloading Android SDK Platform Tools...
        powershell -Command "Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile 'platform-tools.zip'"

        echo Extracting...
        powershell -Command "Expand-Archive -Path 'platform-tools.zip' -DestinationPath 'C:\' -Force"

        echo Adding to PATH...
        setx PATH "%PATH%;C:\platform-tools" /M

        del platform-tools.zip
        echo [OK] Android SDK Platform Tools installed
        echo Please restart this script for the changes to take effect.
        pause
        exit /b 0
    )
) else (
    echo [OK] ADB already installed
)

REM Install PM2 globally
echo.
echo Installing PM2...
call npm install -g pm2
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install PM2
    pause
    exit /b 1
)
echo [OK] PM2 installed

REM Install pm2-windows-startup
echo Installing PM2 Windows startup...
call npm install -g pm2-windows-startup
call pm2-startup install
echo [OK] PM2 Windows startup configured

REM Install application dependencies
echo.
echo Installing application dependencies...
call npm run install:all
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Setup environment file
if not exist .env (
    echo.
    echo Creating environment file...
    copy env.example .env >nul
    echo [OK] Created .env file - Please update it with your configurations
)

REM Create necessary directories
echo.
echo Creating directories...
if not exist logs mkdir logs
if not exist uploads\images mkdir uploads\images
if not exist uploads\backups mkdir uploads\backups
if not exist data mkdir data
if not exist backups mkdir backups
echo [OK] Directories created

REM Build React application
echo.
echo Building React application...
cd client
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Failed to build React application
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] React application built

REM Create Windows shortcuts
echo.
echo Creating shortcuts...

REM Start Development shortcut
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\FastBoot Dev.lnk'); $Shortcut.TargetPath = 'cmd.exe'; $Shortcut.Arguments = '/k cd /d %CD% && npm run dev'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,13'; $Shortcut.Save()"

REM Start Production shortcut
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\FastBoot Production.lnk'); $Shortcut.TargetPath = 'cmd.exe'; $Shortcut.Arguments = '/k cd /d %CD% && pm2 start ecosystem.config.js'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,13'; $Shortcut.Save()"

echo [OK] Desktop shortcuts created

REM Optional: Install as Windows Service
echo.
echo Would you like to install FastBoot as a Windows Service? (Y/N)
set /p INSTALL_SERVICE=
if /i "!INSTALL_SERVICE!"=="Y" (
    echo Installing as Windows Service...
    call pm2 start ecosystem.config.js
    call pm2 save
    echo [OK] FastBoot installed as Windows Service
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Update the .env file with your configurations
echo 2. Start the application:
echo    - Development: npm run dev (or use desktop shortcut)
echo    - Production: pm2 start ecosystem.config.js (or use desktop shortcut)
echo.
echo Access the application at: http://localhost:5000
echo Default credentials: admin / admin123
echo.
echo USB Debugging Notes:
echo - Enable Developer Mode on your Android device
echo - Enable USB Debugging in Developer Options
echo - Install device drivers if necessary
echo.
pause
