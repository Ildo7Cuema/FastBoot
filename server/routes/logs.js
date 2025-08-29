const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const path = require('path');
const fs = require('fs');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Obter logs com filtros
router.get('/', async (req, res) => {
  try {
    const { 
      level, 
      date, 
      search, 
      context,
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = req.query;

    // Usar searchLogs se houver filtros
    if (level || startDate || endDate || search || context) {
      const logs = req.logger.searchLogs({
        level,
        startDate,
        endDate,
        message: search,
        context,
        limit: parseInt(limit)
      });
      
      res.json({ 
        success: true, 
        logs,
        total: logs.length,
        hasMore: logs.length >= parseInt(limit)
      });
    } else {
      // Retornar todos os logs com paginação
      const allLogs = req.logger.getLogs();
      const start = parseInt(offset);
      const end = start + parseInt(limit);
      const paginatedLogs = allLogs.slice(start, end);
      
      res.json({ 
        success: true, 
        logs: paginatedLogs,
        total: allLogs.length,
        hasMore: end < allLogs.length
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter estatísticas dos logs
router.get('/stats', async (req, res) => {
  try {
    const stats = req.logger.getLogStats();
    const systemInfo = req.logger.getSystemInfo();
    
    res.json({ 
      success: true, 
      stats,
      system: systemInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stream de logs em tempo real via SSE
router.get('/stream', async (req, res) => {
  // Configurar Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Enviar heartbeat a cada 30 segundos
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);

  // Stream de logs
  const { level, context } = req.query;
  const stopStream = req.logger.streamLogs((log) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }, { level, context });

  // Limpar ao desconectar
  req.on('close', () => {
    stopStream();
    clearInterval(heartbeat);
    res.end();
  });
});

// Limpar logs
router.delete('/', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Apenas administradores podem limpar logs' 
      });
    }

    req.logger.clearLogs();
    req.logger.info('Logs limpos manualmente', { user: req.user.username });
    
    res.json({ success: true, message: 'Logs limpos com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar logs
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;
    
    // Obter logs com filtros
    const logs = filters.level || filters.startDate || filters.endDate || filters.search
      ? req.logger.searchLogs(filters)
      : req.logger.getLogs();

    const filename = `fastboot-logs-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Exportar como CSV
      const csv = [
        'Timestamp,Level,Message,Context,Data',
        ...logs.map(log => 
          `"${log.timestamp}","${log.level}","${log.message}","${log.context || ''}","${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // Exportar como JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        filters,
        totalLogs: logs.length,
        logs
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar arquivos de log
router.get('/files', async (req, res) => {
  try {
    const files = req.logger.getLogFiles();
    
    res.json({ 
      success: true, 
      files,
      directory: req.logger.getSystemInfo().logDirectory
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ler arquivo de log específico
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validar nome do arquivo
    if (!filename.endsWith('.log') || filename.includes('..')) {
      return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    const logs = req.logger.readLogFile(filename);
    
    res.json({ 
      success: true, 
      filename,
      logs,
      total: logs.length
    });
  } catch (error) {
    if (error.message.includes('não encontrado')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Deletar arquivo de log específico
router.delete('/files/:filename', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Apenas administradores podem deletar arquivos de log' 
      });
    }

    const { filename } = req.params;
    
    // Validar nome do arquivo
    if (!filename.endsWith('.log') || filename.includes('..')) {
      return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    const logPath = path.join(req.logger.logDir, filename);
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    fs.unlinkSync(logPath);
    req.logger.info('Arquivo de log deletado', { filename, user: req.user.username });
    
    res.json({ success: true, message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
