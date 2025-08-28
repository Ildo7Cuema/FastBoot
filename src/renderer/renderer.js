// Classe principal da aplicação
class FastBootApp {
  constructor() {
    this.currentDevice = null;
    this.devices = [];
    this.isOperationInProgress = false;
    this.currentOperation = null;
    this.logs = [];

    this.initializeApp();
  }

  // Inicializa a aplicação
  async initializeApp() {
    try {
      // Verificar disponibilidade do ADB
      await this.checkAdbAvailability();

      // Configurar event listeners
      this.setupEventListeners();

      // Inicializar interface
      this.initializeUI();

      // Verificar dispositivos automaticamente
      await this.detectDevices();

      // Atualizar logs
      await this.refreshLogs();

      // Atualizar timestamp
      this.updateLastUpdate();

      console.log('FastBoot App inicializada com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar aplicação:', error);
      this.showNotification('Erro ao inicializar aplicação', error.message, 'error');
    }
  }

  // Configura event listeners
  setupEventListeners() {
    // Botão de detecção de dispositivos
    document.getElementById('detectDevicesBtn').addEventListener('click', () => {
      this.detectDevices();
    });

    // Botões de operações
    document.getElementById('rebootBootloaderBtn').addEventListener('click', () => {
      this.rebootBootloader();
    });

    document.getElementById('factoryResetBtn').addEventListener('click', () => {
      this.showFactoryResetConfirmation();
    });

    document.getElementById('deviceInfoBtn').addEventListener('click', () => {
      this.showDeviceInfo();
    });

    // Botões de logs
    document.getElementById('refreshLogsBtn').addEventListener('click', () => {
      this.refreshLogs();
    });

    document.getElementById('exportLogsBtn').addEventListener('click', () => {
      this.exportLogs();
    });

    document.getElementById('clearLogsBtn').addEventListener('click', () => {
      this.clearLogs();
    });

    // Botão de cancelar operação
    document.getElementById('cancelOperationBtn').addEventListener('click', () => {
      this.cancelOperation();
    });

    // Filtros de log
    document.getElementById('logLevelFilter').addEventListener('change', e => {
      this.filterLogs();
    });

    document.getElementById('logSearch').addEventListener('input', e => {
      this.filterLogs();
    });

    // Botões de configuração e ajuda
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelp();
    });

    // Fechamento de modais
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', e => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    // Botões de confirmação
    document.getElementById('confirmBtn').addEventListener('click', () => {
      this.executeConfirmedOperation();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.closeModal(document.getElementById('confirmationModal'));
    });
  }

  // Inicializa a interface
  initializeUI() {
    // Configurar tema baseado na preferência do sistema
    this.setupTheme();

    // Atualizar status inicial
    this.updateConnectionStatus('Verificando...');
    this.updateAdbStatus('Verificando...');

    // Desabilitar botões inicialmente
    this.setOperationButtonsState(false);
  }

  // Configura tema baseado na preferência do sistema
  setupTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    // Listener para mudanças de tema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }

  // Verifica disponibilidade do ADB
  async checkAdbAvailability() {
    try {
      const result = await window.electronAPI.checkAdbAvailability();

      if (result.success && result.available) {
        this.updateAdbStatus('ADB disponível');
        return true;
      } else {
        this.updateAdbStatus('ADB não disponível');
        this.showNotification(
          'ADB não disponível',
          'Instale o Android SDK Platform Tools',
          'warning'
        );
        return false;
      }
    } catch (error) {
      this.updateAdbStatus('Erro ao verificar ADB');
      console.error('Erro ao verificar ADB:', error);
      return false;
    }
  }

  // Detecta dispositivos Android
  async detectDevices() {
    try {
      this.updateConnectionStatus('Detectando dispositivos...');

      const result = await window.electronAPI.detectDevices();

      if (result.success) {
        this.devices = result.devices;
        this.updateDeviceList();
        this.updateConnectionStatus(`${this.devices.length} dispositivo(s) detectado(s)`);

        if (this.devices.length > 0) {
          this.currentDevice = this.devices[0];
          this.setOperationButtonsState(true);
        } else {
          this.setOperationButtonsState(false);
        }

        this.showNotification(
          'Dispositivos detectados',
          `${this.devices.length} dispositivo(s) encontrado(s)`,
          'success'
        );
      } else {
        this.updateConnectionStatus('Erro ao detectar dispositivos');
        this.showNotification('Erro na detecção', result.error, 'error');
      }
    } catch (error) {
      this.updateConnectionStatus('Erro na detecção');
      console.error('Erro ao detectar dispositivos:', error);
      this.showNotification('Erro na detecção', error.message, 'error');
    }
  }

  // Atualiza a lista de dispositivos na interface
  updateDeviceList() {
    const deviceList = document.getElementById('deviceList');

    if (this.devices.length === 0) {
      deviceList.innerHTML = `
                <div class="no-devices">
                    <i class="fas fa-mobile-alt no-devices-icon"></i>
                    <p>Nenhum dispositivo detectado</p>
                    <p class="no-devices-hint">Conecte um dispositivo Android via USB e habilite a depuração USB</p>
                </div>
            `;
      return;
    }

    deviceList.innerHTML = this.devices
      .map(
        device => `
            <div class="device-item ${device.id === this.currentDevice?.id ? 'selected' : ''}"
                 data-device-id="${device.id}">
                <div class="device-info">
                    <i class="fas fa-mobile-alt device-icon"></i>
                    <div class="device-details">
                        <h4>${device.model || 'Dispositivo Android'}</h4>
                        <p>${device.manufacturer || 'Fabricante desconhecido'} • Android ${
          device.androidVersion || 'N/A'
        }</p>
                        <p class="device-id">ID: ${device.id}</p>
                    </div>
                </div>
                <div class="device-status">
                    <span class="status-badge connected">Conectado</span>
                    <button class="btn btn-secondary btn-sm" onclick="app.selectDevice('${
                      device.id
                    }')">
                        <i class="fas fa-check"></i> Selecionar
                    </button>
                </div>
            </div>
        `
      )
      .join('');

    // Adicionar event listeners para seleção de dispositivo
    deviceList.querySelectorAll('.device-item').forEach(item => {
      item.addEventListener('click', e => {
        if (!e.target.closest('button')) {
          const deviceId = item.dataset.deviceId;
          this.selectDevice(deviceId);
        }
      });
    });
  }

  // Seleciona um dispositivo
  selectDevice(deviceId) {
    this.currentDevice = this.devices.find(d => d.id === deviceId);

    // Atualizar seleção visual
    document.querySelectorAll('.device-item').forEach(item => {
      item.classList.remove('selected');
      if (item.dataset.deviceId === deviceId) {
        item.classList.add('selected');
      }
    });

    // Habilitar botões de operação
    this.setOperationButtonsState(true);

    this.showNotification(
      'Dispositivo selecionado',
      `${this.currentDevice.model || 'Dispositivo'} selecionado`,
      'info'
    );
  }

  // Define o estado dos botões de operação
  setOperationButtonsState(enabled) {
    const buttons = ['rebootBootloaderBtn', 'factoryResetBtn', 'deviceInfoBtn'];

    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = !enabled;
      }
    });
  }

  // Reinicia dispositivo para bootloader
  async rebootBootloader() {
    if (!this.currentDevice) {
      this.showNotification('Erro', 'Nenhum dispositivo selecionado', 'error');
      return;
    }

    try {
      this.showProgressSection('Reiniciando para bootloader...');

      const result = await window.electronAPI.rebootBootloader(this.currentDevice.id);

      if (result.success) {
        this.showNotification('Sucesso', 'Dispositivo reiniciado para bootloader', 'success');
        this.hideProgressSection();

        // Aguardar um pouco e verificar dispositivos novamente
        setTimeout(() => {
          this.detectDevices();
        }, 3000);
      } else {
        this.showNotification('Erro', result.error, 'error');
        this.hideProgressSection();
      }
    } catch (error) {
      this.showNotification('Erro', error.message, 'error');
      this.hideProgressSection();
    }
  }

  // Mostra confirmação para factory reset
  showFactoryResetConfirmation() {
    if (!this.currentDevice) {
      this.showNotification('Erro', 'Nenhum dispositivo selecionado', 'error');
      return;
    }

    const modal = document.getElementById('confirmationModal');
    const title = document.getElementById('confirmationTitle');
    const message = document.getElementById('confirmationMessage');

    title.textContent = 'Confirmar Factory Reset';
    message.textContent = `Esta operação irá apagar TODOS os dados do dispositivo "${
      this.currentDevice.model || 'Android'
    }" e restaurá-lo para as configurações de fábrica. Esta ação NÃO pode ser desfeita.`;

    this.showModal(modal);
  }

  // Executa operação confirmada
  async executeConfirmedOperation() {
    this.closeModal(document.getElementById('confirmationModal'));

    if (!this.currentDevice) {
      return;
    }

    try {
      this.showProgressSection('Executando factory reset...');

      const result = await window.electronAPI.factoryReset(this.currentDevice.id);

      if (result.success) {
        this.showNotification('Sucesso', 'Factory reset concluído com sucesso', 'success');
        this.hideProgressSection();

        // Aguardar e verificar dispositivos
        setTimeout(() => {
          this.detectDevices();
        }, 5000);
      } else {
        this.showNotification('Erro', result.error, 'error');
        this.hideProgressSection();
      }
    } catch (error) {
      this.showNotification('Erro', error.message, 'error');
      this.hideProgressSection();
    }
  }

  // Mostra informações do dispositivo
  async showDeviceInfo() {
    if (!this.currentDevice) {
      this.showNotification('Erro', 'Nenhum dispositivo selecionado', 'error');
      return;
    }

    const modal = document.getElementById('deviceInfoModal');
    const content = document.getElementById('deviceInfoContent');

    content.innerHTML = `
            <div class="device-info-details">
                <div class="info-row">
                    <strong>Modelo:</strong> ${this.currentDevice.model || 'N/A'}
                </div>
                <div class="info-row">
                    <strong>Fabricante:</strong> ${this.currentDevice.manufacturer || 'N/A'}
                </div>
                <div class="info-row">
                    <strong>Versão Android:</strong> ${this.currentDevice.androidVersion || 'N/A'}
                </div>
                <div class="info-row">
                    <strong>ID do Dispositivo:</strong> ${this.currentDevice.id}
                </div>
                <div class="info-row">
                    <strong>Status:</strong> <span class="status-badge connected">Conectado</span>
                </div>
            </div>
        `;

    this.showModal(modal);
  }

  // Atualiza logs
  async refreshLogs() {
    try {
      const result = await window.electronAPI.getLogs();

      if (result.success) {
        this.logs = result.logs;
        this.updateLogsDisplay();
      } else {
        console.error('Erro ao obter logs:', result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar logs:', error);
    }
  }

  // Atualiza exibição dos logs
  updateLogsDisplay() {
    const logsContent = document.getElementById('logsContent');

    if (this.logs.length === 0) {
      logsContent.innerHTML = `
                <div class="no-logs">
                    <i class="fas fa-file-alt no-logs-icon"></i>
                    <p>Nenhum log disponível</p>
                </div>
            `;
      return;
    }

    const filteredLogs = this.getFilteredLogs();

    logsContent.innerHTML = filteredLogs
      .map(
        log => `
            <div class="log-entry ${log.level.toLowerCase()}">
                <span class="log-timestamp">${this.formatTimestamp(log.timestamp)}</span>
                <span class="log-level ${log.level.toLowerCase()}">${log.level}</span>
                <span class="log-message">${log.message}</span>
                ${
                  log.data ? `<pre class="log-data">${JSON.stringify(log.data, null, 2)}</pre>` : ''
                }
            </div>
        `
      )
      .join('');
  }

  // Filtra logs baseado nos filtros aplicados
  getFilteredLogs() {
    let filtered = [...this.logs];

    // Filtro por nível
    const levelFilter = document.getElementById('logLevelFilter').value;
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Filtro por busca
    const searchTerm = document.getElementById('logSearch').value.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(
        log =>
          log.message.toLowerCase().includes(searchTerm) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  }

  // Filtra logs
  filterLogs() {
    this.updateLogsDisplay();
  }

  // Exporta logs
  async exportLogs() {
    try {
      // Em uma implementação real, você poderia usar a API de download do navegador
      const logData = JSON.stringify(this.logs, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `fastboot-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Sucesso', 'Logs exportados com sucesso', 'success');
    } catch (error) {
      this.showNotification('Erro', 'Erro ao exportar logs', 'error');
    }
  }

  // Limpa logs
  async clearLogs() {
    if (confirm('Tem certeza que deseja limpar todos os logs?')) {
      this.logs = [];
      this.updateLogsDisplay();
      this.showNotification('Sucesso', 'Logs limpos com sucesso', 'info');
    }
  }

  // Mostra seção de progresso
  showProgressSection(message) {
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');

    progressText.textContent = message;
    progressSection.style.display = 'block';

    // Simular progresso
    this.simulateProgress();
  }

  // Esconde seção de progresso
  hideProgressSection() {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'none';

    // Resetar progresso
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = '0%';
  }

  // Simula progresso da operação
  simulateProgress() {
    const progressFill = document.getElementById('progressFill');
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      progressFill.style.width = progress + '%';
    }, 200);
  }

  // Cancela operação atual
  cancelOperation() {
    // Em uma implementação real, você enviaria um comando para cancelar
    this.hideProgressSection();
    this.showNotification('Operação cancelada', 'A operação foi cancelada pelo usuário', 'warning');
  }

  // Mostra modal
  showModal(modal) {
    modal.classList.add('show');
  }

  // Fecha modal
  closeModal(modal) {
    modal.classList.remove('show');
  }

  // Mostra notificação
  showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${title}</span>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-message">${message}</div>
        `;

    // Adicionar event listener para fechar
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification);
    });

    container.appendChild(notification);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
  }

  // Remove notificação
  removeNotification(notification) {
    notification.style.animation = 'notificationSlideOut 0.3s ease-in-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Atualiza status de conexão
  updateConnectionStatus(status) {
    const element = document.getElementById('connectionStatus');
    if (element) {
      element.textContent = status;
    }
  }

  // Atualiza status do ADB
  updateAdbStatus(status) {
    const element = document.getElementById('adbStatus');
    if (element) {
      element.textContent = status;
    }
  }

  // Atualiza timestamp da última atualização
  updateLastUpdate() {
    const element = document.getElementById('lastUpdate');
    if (element) {
      element.textContent = new Date().toLocaleTimeString();
    }
  }

  // Formata timestamp para exibição
  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  // Mostra configurações (placeholder)
  showSettings() {
    this.showNotification(
      'Configurações',
      'Funcionalidade de configurações em desenvolvimento',
      'info'
    );
  }

  // Mostra ajuda (placeholder)
  showHelp() {
    this.showNotification('Ajuda', 'Funcionalidade de ajuda em desenvolvimento', 'info');
  }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FastBootApp();
});

// Adicionar CSS para animação de saída de notificação
const style = document.createElement('style');
style.textContent = `
    @keyframes notificationSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    .device-item.selected {
        border-color: var(--primary-color);
        background-color: rgba(37, 99, 235, 0.1);
    }

    .device-info-details .info-row {
        padding: var(--spacing-sm) 0;
        border-bottom: 1px solid var(--border-color);
    }

    .device-info-details .info-row:last-child {
        border-bottom: none;
    }

    .log-data {
        background-color: var(--bg-tertiary);
        padding: var(--spacing-sm);
        border-radius: var(--border-radius-sm);
        font-size: 0.7rem;
        margin-top: var(--spacing-xs);
        overflow-x: auto;
    }
`;
document.head.appendChild(style);
