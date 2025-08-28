const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Detecção de dispositivos
  detectDevices: () => ipcRenderer.invoke('detect-devices'),

  // Operações de bootloader
  rebootBootloader: deviceId => ipcRenderer.invoke('reboot-bootloader', deviceId),

  // Factory reset
  factoryReset: deviceId => ipcRenderer.invoke('factory-reset', deviceId),

  // Logs
  getLogs: () => ipcRenderer.invoke('get-logs'),

  // Verificação de ADB
  checkAdbAvailability: () => ipcRenderer.invoke('check-adb-availability'),

  // Instalação de drivers
  installAdbDrivers: () => ipcRenderer.invoke('install-adb-drivers'),

  // Utilitários
  platform: process.platform,
  arch: process.arch,

  // Eventos do sistema
  onDeviceConnected: callback => {
    ipcRenderer.on('device-connected', callback);
  },

  onDeviceDisconnected: callback => {
    ipcRenderer.on('device-disconnected', callback);
  },

  onProgressUpdate: callback => {
    ipcRenderer.on('progress-update', callback);
  },

  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Configurações de segurança
contextBridge.exposeInMainWorld('process', {
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
});
