const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1000 * 1024 * 1024 // 1GB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.img', '.zip', '.bin', '.tar', '.gz'];
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

// Middleware para verificar permissões admin em operações críticas
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores podem executar esta operação.' 
    });
  }
  next;
};

// Factory Reset
router.post('/factory-reset', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
    }

    req.logger.warn('Factory reset iniciado', {
      deviceId,
      user: req.user.username,
      timestamp: new Date().toISOString(),
    });

    const result = await req.fastbootManager.factoryReset(deviceId);

    req.logger.info('Factory reset concluído com sucesso', {
      deviceId,
      user: req.user.username,
      result,
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro no factory reset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verificar status do fastboot
router.get('/status', async (req, res) => {
  try {
    const available = await req.fastbootManager.checkFastbootAvailability();
    res.json({ success: true, fastbootAvailable: available });
  } catch (error) {
    req.logger.error('Erro ao verificar status do fastboot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpar cache (operação adicional)
router.post('/clear-cache', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
    }

    req.logger.info('Limpeza de cache iniciada', {
      deviceId,
      user: req.user.username,
    });

    const result = await req.fastbootManager.clearCache(deviceId);

    req.logger.info('Limpeza de cache concluída', {
      deviceId,
      user: req.user.username,
      result,
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro na limpeza de cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reiniciar dispositivo
router.post('/reboot', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
    }

    req.logger.info('Reinicialização iniciada', {
      deviceId,
      user: req.user.username,
    });

    const result = await req.fastbootManager.rebootDevice(deviceId);

    req.logger.info('Reinicialização concluída', {
      deviceId,
      user: req.user.username,
      result,
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro na reinicialização:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Flash de imagem customizada
router.post('/flash/:deviceId', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { partition } = req.body;
    const imagePath = req.file?.path;

    if (!imagePath) {
      return res.status(400).json({ error: 'Arquivo de imagem é obrigatório' });
    }

    if (!partition) {
      return res.status(400).json({ error: 'Partição é obrigatória' });
    }

    req.logger.warn('Flash de imagem iniciado', {
      deviceId,
      partition,
      imagePath,
      user: req.user.username,
    });

    // Emitir evento de progresso via WebSocket
    const io = req.app.get('io');
    io.emit('operation-progress', {
      deviceId,
      type: 'flash',
      status: 'starting',
      progress: 0,
      partition
    });

    const result = await req.fastbootManager.flashImage(deviceId, partition, imagePath);

    // Limpar arquivo após flash
    fs.unlinkSync(imagePath);

    req.logger.info('Flash de imagem concluído', {
      deviceId,
      partition,
      user: req.user.username,
      result,
    });

    io.emit('operation-complete', {
      deviceId,
      type: 'flash',
      success: true,
      message: `Imagem gravada com sucesso na partição ${partition}`
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro no flash de imagem:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const io = req.app.get('io');
    io.emit('operation-complete', {
      deviceId: req.params.deviceId,
      type: 'flash',
      success: false,
      error: error.message
    });

    res.status(500).json({ success: false, error: error.message });
  }
});

// Desbloquear bootloader
router.post('/unlock-bootloader', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
    }

    req.logger.warn('Desbloqueio de bootloader iniciado', {
      deviceId,
      user: req.user.username,
    });

    const result = await req.fastbootManager.unlockBootloader(deviceId);

    req.logger.info('Desbloqueio de bootloader concluído', {
      deviceId,
      user: req.user.username,
      result,
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro no desbloqueio de bootloader:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bloquear bootloader
router.post('/lock-bootloader', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
    }

    req.logger.warn('Bloqueio de bootloader iniciado', {
      deviceId,
      user: req.user.username,
    });

    const result = await req.fastbootManager.lockBootloader(deviceId);

    req.logger.info('Bloqueio de bootloader concluído', {
      deviceId,
      user: req.user.username,
      result,
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro no bloqueio de bootloader:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter informações do dispositivo em modo fastboot
router.get('/device-info/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const info = await req.fastbootManager.getDeviceInfo(deviceId);

    res.json({ success: true, info });
  } catch (error) {
    req.logger.error('Erro ao obter informações do dispositivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar dispositivos em modo fastboot
router.get('/devices', async (req, res) => {
  try {
    const devices = await req.fastbootManager.listDevices();

    res.json({ success: true, devices });
  } catch (error) {
    req.logger.error('Erro ao listar dispositivos fastboot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Executar comando fastboot customizado (apenas admin)
router.post('/command', requireAdmin, async (req, res) => {
  try {
    const { deviceId, command } = req.body;

    if (!deviceId || !command) {
      return res.status(400).json({ error: 'ID do dispositivo e comando são obrigatórios' });
    }

    // Lista de comandos perigosos que devem ser bloqueados
    const dangerousCommands = ['erase', 'format', 'flashing', 'oem'];
    const isDangerous = dangerousCommands.some(cmd => command.toLowerCase().includes(cmd));

    if (isDangerous) {
      req.logger.warn('Tentativa de executar comando perigoso bloqueada', {
        deviceId,
        command,
        user: req.user.username,
      });
      return res.status(403).json({ 
        error: 'Comando bloqueado por questões de segurança' 
      });
    }

    req.logger.info('Comando fastboot customizado executado', {
      deviceId,
      command,
      user: req.user.username,
    });

    const result = await req.fastbootManager.executeCommand(deviceId, command);

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro ao executar comando fastboot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
