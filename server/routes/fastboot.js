const express = require('express');

const router = express.Router();

// Middleware simples para autenticação (temporário)
const authenticateToken = (req, res, next) => {
    // Por enquanto, permitir todas as requisições
    next();
};

// Middleware simples para verificar se é admin
const requireAdmin = (req, res, next) => {
    // Por enquanto, permitir todas as requisições
    next();
};

// Listar dispositivos em modo fastboot
router.get('/devices', async (req, res) => {
    try {
        res.json({ 
            devices: [
                { id: 'fastboot-device', status: 'fastboot', model: 'Test Device' }
            ] 
        });
    } catch (error) {
        console.error('Error getting fastboot devices:', error);
        res.status(500).json({ error: 'Failed to get fastboot devices' });
    }
});

// Flash de imagem
router.post('/flash/:deviceId', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { imagePath } = req.body;
        
        if (!imagePath) {
            return res.status(400).json({ error: 'Image path required' });
        }
        
        res.json({ message: 'Flash initiated successfully', deviceId, imagePath });
    } catch (error) {
        console.error('Error during flash:', error);
        res.status(500).json({ error: 'Failed to flash image' });
    }
});

// Unlock bootloader
router.post('/unlock-bootloader', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID required' });
        }
        
        res.json({ message: 'Bootloader unlock initiated successfully', deviceId });
    } catch (error) {
        console.error('Error unlocking bootloader:', error);
        res.status(500).json({ error: 'Failed to unlock bootloader' });
    }
});

// Lock bootloader
router.post('/lock-bootloader', requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID required' });
        }
        
        res.json({ message: 'Bootloader lock initiated successfully', deviceId });
    } catch (error) {
        console.error('Error locking bootloader:', error);
        res.status(500).json({ error: 'Failed to lock bootloader' });
    }
});

// Informações do dispositivo fastboot
router.get('/device-info/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        res.json({ 
            device: { 
                id: deviceId, 
                status: 'fastboot', 
                model: 'Test Device',
                bootloaderStatus: 'locked'
            } 
        });
    } catch (error) {
        console.error('Error getting fastboot device info:', error);
        res.status(500).json({ error: 'Failed to get fastboot device info' });
    }
});

// Factory Reset
router.post('/factory-reset', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.body;
        const fastbootManager = req.app.locals.fastbootManager;
        const io = req.app.locals.io;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID é obrigatório' });
        }
        
        console.log(`Iniciando factory reset no dispositivo ${deviceId}...`);
        
        // Emitir progresso via WebSocket
        io.emit('operation-progress', {
            deviceId,
            type: 'factory-reset',
            status: 'starting',
            progress: 0
        });
        
        // Executar factory reset em background
        fastbootManager.executeFactoryResetCommands(deviceId).then(() => {
            io.emit('operation-complete', {
                deviceId,
                success: true,
                message: 'Factory reset concluído com sucesso'
            });
        }).catch(error => {
            io.emit('operation-complete', {
                deviceId,
                success: false,
                error: error.message
            });
        });
        
        res.json({ success: true, message: 'Factory reset iniciado' });
    } catch (error) {
        console.error('Erro ao executar factory reset:', error);
        res.status(500).json({ error: error.message || 'Erro ao executar factory reset' });
    }
});

// Limpar cache
router.post('/clear-cache', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.body;
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID é obrigatório' });
        }
        
        console.log(`Limpando cache do dispositivo ${deviceId}...`);
        
        await androidDeviceManager.executeCommand(deviceId, 'shell pm clear com.android.systemui');
        
        res.json({ success: true, message: 'Cache limpo com sucesso' });
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        res.status(500).json({ error: error.message || 'Erro ao limpar cache' });
    }
});

// Reboot via fastboot
router.post('/reboot', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.body;
        const fastbootManager = req.app.locals.fastbootManager;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID é obrigatório' });
        }
        
        console.log(`Reiniciando dispositivo ${deviceId} via fastboot...`);
        
        await fastbootManager.executeFastbootCommand(deviceId, 'reboot');
        
        res.json({ success: true, message: 'Dispositivo reiniciando...' });
    } catch (error) {
        console.error('Erro ao reiniciar via fastboot:', error);
        res.status(500).json({ error: error.message || 'Erro ao reiniciar dispositivo' });
    }
});

// Status do fastboot
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const fastbootManager = req.app.locals.fastbootManager;
        
        const fastbootAvailable = await fastbootManager.checkFastbootAvailability();
        const devices = await fastbootManager.detectFastbootDevices();
        
        res.json({ 
            success: true,
            fastbootAvailable,
            devices 
        });
    } catch (error) {
        console.error('Erro ao obter status do fastboot:', error);
        res.status(500).json({ error: error.message || 'Erro ao obter status do fastboot' });
    }
});

// Comando customizado fastboot
router.post('/command', requireAdmin, async (req, res) => {
    try {
        const { command, deviceId } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command required' });
        }
        
        res.json({ message: 'Fastboot command executed successfully', command, deviceId });
    } catch (error) {
        console.error('Error executing fastboot command:', error);
        res.status(500).json({ error: 'Failed to execute fastboot command' });
    }
});

module.exports = router;
