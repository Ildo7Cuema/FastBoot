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
      timestamp: new Date().toISOString()
    });

    const result = await req.fastbootManager.factoryReset(deviceId);
    
    req.logger.info('Factory reset concluído com sucesso', { 
      deviceId, 
      user: req.user.username,
      result 
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
      user: req.user.username 
    });

    const result = await req.fastbootManager.clearCache(deviceId);
    
    req.logger.info('Limpeza de cache concluída', { 
      deviceId, 
      user: req.user.username,
      result 
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
      user: req.user.username 
    });

    const result = await req.fastbootManager.rebootDevice(deviceId);
    
    req.logger.info('Reinicialização concluída', { 
      deviceId, 
      user: req.user.username,
      result 
    });

    res.json({ success: true, result });
  } catch (error) {
    req.logger.error('Erro na reinicialização:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
