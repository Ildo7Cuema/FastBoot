#!/bin/bash

# FastBoot Factory Reset - Installation Script
# Supports Ubuntu/Debian, CentOS/RHEL, macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root!"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    print_success "Detected OS: $OS"
}

# Install Node.js
install_nodejs() {
    print_info "Installing Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js already installed: $NODE_VERSION"
        return
    fi
    
    if [[ "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "redhat" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew not found. Please install Homebrew first."
            exit 1
        fi
        brew install node
    fi
    
    print_success "Node.js installed successfully"
}

# Install Android SDK Platform Tools
install_android_tools() {
    print_info "Installing Android SDK Platform Tools..."
    
    if command -v adb &> /dev/null; then
        ADB_VERSION=$(adb version | head -n 1)
        print_success "ADB already installed: $ADB_VERSION"
        return
    fi
    
    if [[ "$OS" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y android-tools-adb android-tools-fastboot
    elif [[ "$OS" == "redhat" ]]; then
        sudo yum install -y android-tools
    elif [[ "$OS" == "macos" ]]; then
        brew install --cask android-platform-tools
    else
        # Manual installation
        print_info "Downloading Android SDK Platform Tools..."
        PLATFORM_TOOLS_URL="https://dl.google.com/android/repository/platform-tools-latest-linux.zip"
        if [[ "$OS" == "macos" ]]; then
            PLATFORM_TOOLS_URL="https://dl.google.com/android/repository/platform-tools-latest-darwin.zip"
        fi
        
        wget -q $PLATFORM_TOOLS_URL -O platform-tools.zip
        unzip -q platform-tools.zip
        sudo mv platform-tools /opt/
        sudo ln -sf /opt/platform-tools/adb /usr/local/bin/adb
        sudo ln -sf /opt/platform-tools/fastboot /usr/local/bin/fastboot
        rm platform-tools.zip
    fi
    
    print_success "Android tools installed successfully"
}

# Install PM2
install_pm2() {
    print_info "Installing PM2..."
    
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 -v)
        print_success "PM2 already installed: $PM2_VERSION"
        return
    fi
    
    sudo npm install -g pm2
    pm2 install pm2-logrotate
    
    # Setup PM2 startup
    pm2 startup systemd -u $USER --hp $HOME
    
    print_success "PM2 installed successfully"
}

# Install Docker (optional)
install_docker() {
    read -p "Do you want to install Docker? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    print_info "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker already installed: $DOCKER_VERSION"
        return
    fi
    
    if [[ "$OS" == "debian" ]]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    elif [[ "$OS" == "redhat" ]]; then
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    elif [[ "$OS" == "macos" ]]; then
        brew install --cask docker
    fi
    
    # Install Docker Compose
    if [[ "$OS" != "macos" ]]; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    print_success "Docker installed successfully"
}

# Setup application
setup_application() {
    print_info "Setting up FastBoot application..."
    
    # Install dependencies
    print_info "Installing Node.js dependencies..."
    npm run install:all
    
    # Setup environment
    if [ ! -f .env ]; then
        cp .env.example .env
        print_info "Created .env file. Please update it with your configurations."
    fi
    
    # Create necessary directories
    mkdir -p logs uploads/images uploads/backups data backups
    
    # Set permissions
    chmod -R 755 logs uploads data backups
    
    # Build client
    print_info "Building React application..."
    cd client && npm run build && cd ..
    
    print_success "Application setup completed"
}

# Setup systemd service (Linux only)
setup_systemd_service() {
    if [[ "$OS" == "macos" ]]; then
        return
    fi
    
    read -p "Do you want to setup systemd service? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    print_info "Setting up systemd service..."
    
    cat > fastboot.service << EOF
[Unit]
Description=FastBoot Factory Reset Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=fastboot
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo mv fastboot.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable fastboot
    
    print_success "Systemd service created"
}

# Main installation process
main() {
    echo "========================================"
    echo "FastBoot Factory Reset Installation"
    echo "========================================"
    echo
    
    check_root
    detect_os
    
    # Install dependencies
    install_nodejs
    install_android_tools
    install_pm2
    install_docker
    
    # Setup application
    setup_application
    setup_systemd_service
    
    echo
    echo "========================================"
    print_success "Installation completed successfully!"
    echo "========================================"
    echo
    echo "Next steps:"
    echo "1. Update the .env file with your configurations"
    echo "2. Start the application:"
    echo "   - Development: npm run dev"
    echo "   - Production with PM2: pm2 start ecosystem.config.js"
    echo "   - Production with Docker: docker-compose up -d"
    echo "   - Production with systemd: sudo systemctl start fastboot"
    echo
    echo "Access the application at: http://localhost:5000"
    echo "Default credentials: admin / admin123"
    echo
}

# Run main function
main