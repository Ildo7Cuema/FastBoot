const express = require('express');
const os = require('os');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware de autenticação (copiado de auth.js)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'sua-chave-secreta-aqui', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        req.user = user;
        next();
    });
};

// Rota para obter estatísticas do sistema
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);
        
        // Cálculo simplificado de uso de CPU
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
        
        const stats = {
            cpu: {
                usage: cpuUsage,
                cores: cpus.length,
                model: cpus[0].model
            },
            memory: {
                used: (usedMemory / 1024 / 1024 / 1024).toFixed(2),
                total: Math.round(totalMemory / 1024 / 1024 / 1024),
                percentage: memoryPercentage
            },
            disk: {
                used: 120, // Simulado - em produção, usar bibliotecas como 'diskusage'
                total: 500,
                percentage: 24
            },
            network: {
                in: Math.round(Math.random() * 200),
                out: Math.round(Math.random() * 150)
            },
            uptime: os.uptime(),
            processes: {
                total: 178, // Simulado
                running: Math.round(Math.random() * 10) + 1
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas do sistema' });
    }
});

// Rota para criar backup
router.post('/backup', authenticateToken, async (req, res) => {
    try {
        // Simulação de criação de backup
        // Em produção, você implementaria a lógica real de backup do SQLite
        
        setTimeout(() => {
            res.json({
                message: 'Backup criado com sucesso',
                backup: {
                    id: Date.now(),
                    name: `backup_${new Date().toISOString().replace(/[:.]/g, '_')}.db`,
                    size: '45.2 MB',
                    created_at: new Date().toISOString()
                }
            });
        }, 2000);
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        res.status(500).json({ error: 'Erro ao criar backup' });
    }
});

// Rota para restaurar backup
router.post('/restore/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        
        // Simulação de restauração
        // Em produção, você implementaria a lógica real de restauração
        
        setTimeout(() => {
            res.json({
                message: 'Backup restaurado com sucesso',
                backupId
            });
        }, 3000);
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: 'Erro ao restaurar backup' });
    }
});

// Rota de health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development'
    });
});

module.exports = router;