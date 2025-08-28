const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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

// Obter logs
router.get('/', async (req, res) => {
  try {
    const logs = req.logger.getLogs();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpar logs
router.delete('/', async (req, res) => {
  try {
    req.logger.clearLogs();
    res.json({ success: true, message: 'Logs limpos com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar logs
router.get('/export', async (req, res) => {
  try {
    const logs = req.logger.getLogs();
    const logData = logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      data: log.data,
      platform: log.platform,
      arch: log.arch
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fastboot-logs-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(logData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
