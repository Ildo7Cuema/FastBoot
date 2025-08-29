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
