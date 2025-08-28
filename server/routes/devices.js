const express = require('express');
const router = express.Router();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fastboot-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

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

module.exports = router;
