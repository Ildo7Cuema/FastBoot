const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.img', '.zip', '.bin'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar dispositivos conectados
router.get('/', async (req, res) => {
  try {
    const devices = await req.deviceManager.detectDevices();
    res.json({ success: true, devices });
  } catch (error) {
    req.logger.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detectar dispositivos
router.post('/detect', async (req, res) => {
  try {
    const devices = await req.deviceManager.detectDevices();
    res.json({ success: true, devices });
  } catch (error) {
    req.logger.error('Erro ao detectar dispositivos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter informações de um dispositivo específico
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const deviceInfo = await req.deviceManager.getDeviceInfo(deviceId);
    res.json({ success: true, device: deviceInfo });
  } catch (error) {
    req.logger.error('Erro ao obter informações do dispositivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reiniciar dispositivo para bootloader
router.post('/:deviceId/reboot-bootloader', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await req.deviceManager.rebootToBootloader(deviceId);
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao reiniciar para bootloader:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verificar status do ADB
router.get('/status/adb', async (req, res) => {
  try {
    const available = await req.deviceManager.checkAdbAvailability();
    res.json({ success: true, adbAvailable: available });
  } catch (error) {
    req.logger.error('Erro ao verificar status do ADB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reiniciar dispositivo (normal)
router.post('/:deviceId/reboot', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await req.deviceManager.rebootDevice(deviceId);
    req.logger.info(`Dispositivo ${deviceId} reiniciado`);
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao reiniciar dispositivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Executar comando ADB customizado
router.post('/:deviceId/command', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command } = req.body;
    
    // Validar comandos perigosos
    const dangerousCommands = ['rm', 'format', 'wipe', 'dd'];
    const isDangerous = dangerousCommands.some(cmd => command.toLowerCase().includes(cmd));
    
    if (isDangerous && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Comando não permitido para seu nível de acesso' 
      });
    }
    
    const result = await req.deviceManager.executeCommand(deviceId, command);
    req.logger.info(`Comando executado no dispositivo ${deviceId}: ${command}`);
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao executar comando:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Capturar screenshot
router.get('/:deviceId/screenshot', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const screenshot = await req.deviceManager.captureScreenshot(deviceId);
    
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    req.logger.error('Erro ao capturar screenshot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Instalar APK
router.post('/:deviceId/install', upload.single('apk'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { path: apkPath } = req.file;
    
    const result = await req.deviceManager.installAPK(deviceId, apkPath);
    req.logger.info(`APK instalado no dispositivo ${deviceId}`);
    
    // Limpar arquivo após instalação
    require('fs').unlinkSync(apkPath);
    
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao instalar APK:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fazer backup do dispositivo
router.post('/:deviceId/backup', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { includeApk, includeObb, includeShared, includeSystem } = req.body;
    
    const options = {
      includeApk: includeApk || false,
      includeObb: includeObb || false,
      includeShared: includeShared || true,
      includeSystem: includeSystem || false
    };
    
    const backupPath = await req.deviceManager.createBackup(deviceId, options);
    req.logger.info(`Backup criado para dispositivo ${deviceId}: ${backupPath}`);
    
    res.json({ success: true, backupPath });
  } catch (error) {
    req.logger.error('Erro ao criar backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restaurar backup
router.post('/:deviceId/restore', upload.single('backup'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { path: backupPath } = req.file;
    
    const result = await req.deviceManager.restoreBackup(deviceId, backupPath);
    req.logger.info(`Backup restaurado no dispositivo ${deviceId}`);
    
    // Limpar arquivo após restauração
    require('fs').unlinkSync(backupPath);
    
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao restaurar backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter lista de aplicativos instalados
router.get('/:deviceId/packages', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type = 'all' } = req.query; // all, system, third-party
    
    const packages = await req.deviceManager.getInstalledPackages(deviceId, type);
    res.json({ success: true, packages });
  } catch (error) {
    req.logger.error('Erro ao listar pacotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Desinstalar aplicativo
router.delete('/:deviceId/packages/:packageName', async (req, res) => {
  try {
    const { deviceId, packageName } = req.params;
    
    const result = await req.deviceManager.uninstallPackage(deviceId, packageName);
    req.logger.info(`Pacote ${packageName} desinstalado do dispositivo ${deviceId}`);
    
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao desinstalar pacote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ativar/desativar modo desenvolvedor
router.post('/:deviceId/developer-mode', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { enabled } = req.body;
    
    const result = await req.deviceManager.setDeveloperMode(deviceId, enabled);
    req.logger.info(`Modo desenvolvedor ${enabled ? 'ativado' : 'desativado'} no dispositivo ${deviceId}`);
    
    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao alterar modo desenvolvedor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
