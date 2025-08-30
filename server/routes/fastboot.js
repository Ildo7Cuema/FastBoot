const express = require('express');
const { FastbootManager } = require('../../src/modules/FastbootManager');
const { Logger } = require('../../src/modules/Logger');

const router = express.Router();

// Inicializar logger e gerenciador de fastboot
const logger = new Logger();
const fastbootManager = new FastbootManager(logger);

// Middleware simples para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Listar dispositivos em modo fastboot
router.get('/devices', async (req, res) => {
    try {
        const fastbootAvailable = await fastbootManager.checkFastbootAvailability();
        if (!fastbootAvailable) {
            return res.status(503).json({ 
                error: 'Fastboot não está disponível. Instale o Android SDK Platform Tools.',
                instructions: 'Baixe em: https://developer.android.com/studio/releases/platform-tools'
            });
        }
        
        const devices = await fastbootManager.listFastbootDevices();
        res.json({ success: true, devices });
    } catch (error) {
        logger.error('Erro ao listar dispositivos fastboot:', error);
        res.status(500).json({ error: error.message || 'Erro ao listar dispositivos fastboot' });
    }
});

// Flash de imagem
router.post('/flash/:deviceId', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { imagePath, partition } = req.body;
        
        if (!imagePath) {
            return res.status(400).json({ error: 'Caminho da imagem é obrigatório' });
        }
        
        if (!partition) {
            return res.status(400).json({ error: 'Partição é obrigatória' });
        }
        
        const command = `flash ${partition} "${imagePath}"`;
        const result = await fastbootManager.executeFastbootCommand(deviceId, command);
        
        res.json({ 
            success: true,
            message: 'Flash iniciado com sucesso', 
            deviceId, 
            imagePath,
            partition,
            output: result 
        });
    } catch (error) {
        logger.error('Erro durante flash:', error);
        res.status(500).json({ error: error.message || 'Erro ao executar flash' });
    }
});

// Unlock bootloader
router.post('/unlock-bootloader', requireAdmin, async (req, res) => {
    try {
        const { deviceId, confirmation } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
        }
        
        if (!confirmation) {
            return res.status(400).json({ 
                error: 'Confirmação explícita é obrigatória',
                warning: 'Desbloquear o bootloader apagará todos os dados do dispositivo!' 
            });
        }
        
        const result = await fastbootManager.unlockBootloader(deviceId, confirmation);
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao desbloquear bootloader:', error);
        res.status(500).json({ error: error.message || 'Erro ao desbloquear bootloader' });
    }
});

// Lock bootloader
router.post('/lock-bootloader', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
        }
        
        const result = await fastbootManager.lockBootloader(deviceId);
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao bloquear bootloader:', error);
        res.status(500).json({ error: error.message || 'Erro ao bloquear bootloader' });
    }
});

// Informações do dispositivo fastboot
router.get('/device-info/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        const deviceInfo = await fastbootManager.getDeviceInfo(deviceId);
        
        res.json({ 
            success: true,
            device: deviceInfo
        });
    } catch (error) {
        logger.error('Erro ao obter informações do dispositivo fastboot:', error);
        res.status(500).json({ error: error.message || 'Erro ao obter informações do dispositivo' });
    }
});

// Comando customizado fastboot
router.post('/command', requireAdmin, async (req, res) => {
    try {
        const { command, deviceId } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Comando é obrigatório' });
        }
        
        if (!deviceId) {
            return res.status(400).json({ error: 'ID do dispositivo é obrigatório' });
        }
        
        const result = await fastbootManager.executeFastbootCommand(deviceId, command);
        
        res.json({ 
            success: true,
            message: 'Comando fastboot executado com sucesso', 
            command, 
            deviceId,
            output: result 
        });
    } catch (error) {
        logger.error('Erro ao executar comando fastboot:', error);
        res.status(500).json({ error: error.message || 'Erro ao executar comando fastboot' });
    }
});

// Factory reset via fastboot
router.post('/factory-reset/:deviceId', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        // Emitir evento de início da operação
        if (req.io) {
            req.io.emit('operation-progress', {
                deviceId,
                type: 'factory-reset',
                status: 'starting',
                progress: 0
            });
        }
        
        const result = await fastbootManager.factoryReset(deviceId);
        
        // Emitir evento de conclusão
        if (req.io) {
            req.io.emit('operation-complete', {
                deviceId,
                success: true,
                message: 'Factory reset concluído'
            });
        }
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao executar factory reset:', error);
        
        if (req.io) {
            req.io.emit('operation-complete', {
                deviceId: req.params.deviceId,
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({ error: error.message || 'Erro ao executar factory reset' });
    }
});

// Limpar cache via fastboot
router.post('/clear-cache/:deviceId', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        const result = await fastbootManager.executeFastbootCommand(deviceId, 'erase cache');
        
        res.json({ 
            success: true,
            message: 'Cache limpo com sucesso',
            output: result
        });
    } catch (error) {
        logger.error('Erro ao limpar cache:', error);
        res.status(500).json({ error: error.message || 'Erro ao limpar cache' });
    }
});

module.exports = router;
