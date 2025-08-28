const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { AndroidDeviceManager } = require('./modules/AndroidDeviceManager');
const { FastbootManager } = require('./modules/FastbootManager');
const { Logger } = require('./modules/Logger');

let mainWindow;
let deviceManager;
let fastbootManager;
let logger;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'FastBoot Factory Reset',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Desabilitar menu padrão em produção
  if (process.env.NODE_ENV === 'production') {
    mainWindow.setMenu(null);
  }
}

app.whenReady().then(() => {
  // Inicializar módulos
  logger = new Logger();
  deviceManager = new AndroidDeviceManager(logger);
  fastbootManager = new FastbootManager(logger);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers para comunicação com o renderer
ipcMain.handle('detect-devices', async () => {
  try {
    const devices = await deviceManager.detectDevices();
    return { success: true, devices };
  } catch (error) {
    logger.error('Erro ao detectar dispositivos:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reboot-bootloader', async (event, deviceId) => {
  try {
    const result = await deviceManager.rebootToBootloader(deviceId);
    return { success: true, result };
  } catch (error) {
    logger.error('Erro ao reiniciar para bootloader:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('factory-reset', async (event, deviceId) => {
  try {
    const result = await fastbootManager.factoryReset(deviceId);
    return { success: true, result };
  } catch (error) {
    logger.error('Erro ao fazer factory reset:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-logs', async () => {
  try {
    const logs = logger.getLogs();
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-adb-availability', async () => {
  try {
    const isAvailable = await deviceManager.checkAdbAvailability();
    return { success: true, available: isAvailable };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-adb-drivers', async () => {
  try {
    const result = await deviceManager.installAdbDrivers();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', error => {
  logger.error('Erro não capturado:', error);
  dialog.showErrorBox(
    'Erro Crítico',
    'Ocorreu um erro inesperado. Verifique os logs para mais detalhes.'
  );
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada:', reason);
});
