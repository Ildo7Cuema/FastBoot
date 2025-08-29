const express = require('express');

const router = express.Router();

// Middleware simples para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Listar logs
router.get('/', async (req, res) => {
    try {
        const { level, startDate, endDate, context, page = 1, limit = 50 } = req.query;
        
        // Logs de exemplo
        const logs = [
            { id: 1, level: 'INFO', message: 'Server started', context: 'server', timestamp: new Date().toISOString() },
            { id: 2, level: 'INFO', message: 'WebSocket connected', context: 'websocket', timestamp: new Date().toISOString() }
        ];
        
        res.json({ 
            logs,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: logs.length }
        });
    } catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Estatísticas dos logs
router.get('/stats', async (req, res) => {
    try {
        res.json({
            totalLogs: 100,
            levels: { INFO: 50, WARN: 30, ERROR: 15, FATAL: 5 },
            contexts: { server: 40, auth: 30, device: 20, websocket: 10 }
        });
    } catch (error) {
        console.error('Error getting log stats:', error);
        res.status(500).json({ error: 'Failed to get log stats' });
    }
});

// Stream de logs em tempo real
router.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const sendLog = (log) => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    };

    // Enviar log de exemplo a cada 5 segundos
    const interval = setInterval(() => {
        sendLog({
            id: Date.now(),
            level: 'INFO',
            message: 'Heartbeat log',
            context: 'system',
            timestamp: new Date().toISOString()
        });
    }, 5000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// Listar arquivos de log
router.get('/files', async (req, res) => {
    try {
        res.json({
            files: [
                { name: 'app.log', size: '1.2MB', lastModified: new Date().toISOString() },
                { name: 'error.log', size: '500KB', lastModified: new Date().toISOString() }
            ]
        });
    } catch (error) {
        console.error('Error getting log files:', error);
        res.status(500).json({ error: 'Failed to get log files' });
    }
});

// Ler arquivo de log específico
router.get('/files/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        res.json({ 
            filename,
            content: `Log content for ${filename}`,
            lines: 100
        });
    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).json({ error: 'Failed to read log file' });
    }
});

// Deletar arquivo de log (requer admin)
router.delete('/files/:filename', requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        res.json({ message: `Log file ${filename} deleted successfully` });
    } catch (error) {
        console.error('Error deleting log file:', error);
        res.status(500).json({ error: 'Failed to delete log file' });
    }
});

// Deletar logs (requer admin)
router.delete('/', requireAdmin, async (req, res) => {
    try {
        const { level, context, startDate, endDate } = req.query;
        res.json({ message: 'Logs deleted successfully', filters: { level, context, startDate, endDate } });
    } catch (error) {
        console.error('Error deleting logs:', error);
        res.status(500).json({ error: 'Failed to delete logs' });
    }
});

// Exportar logs
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', level, context, startDate, endDate } = req.query;
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
            res.send('timestamp,level,message,context\n2024-01-01,INFO,Test log,server');
        } else {
            res.json({
                format: 'json',
                logs: [
                    { timestamp: '2024-01-01', level: 'INFO', message: 'Test log', context: 'server' }
                ],
                filters: { level, context, startDate, endDate }
            });
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ error: 'Failed to export logs' });
    }
});

module.exports = router;
