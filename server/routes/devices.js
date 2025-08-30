const express = require('express');
const multer = require('multer');
const path = require('path');
const { AndroidDeviceManager } = require('../../src/modules/AndroidDeviceManager');
const { Logger } = require('../../src/modules/Logger');

const router = express.Router();

// Inicializar logger e gerenciador de dispositivos
const logger = new Logger();
const deviceManager = new AndroidDeviceManager(logger);

// Middleware simples para autenticação (temporário)
const authenticateToken = (req, res, next) => {
    // Por enquanto, permitir todas as requisições
    next();
};

// Middleware simples para verificar se é admin (temporário)
const requireAdmin = (req, res, next) => {
    next();
};

// Configuração do multer para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Rota para detectar dispositivos conectados
router.post('/detect', authenticateToken, async (req, res) => {
    try {
        logger.info('Detectando dispositivos conectados...');
        
        // Verificar se ADB está disponível
        const adbAvailable = await deviceManager.checkAdbAvailability();
        if (!adbAvailable) {
            return res.status(503).json({ 
                error: 'ADB não está disponível. Instale o Android SDK Platform Tools.',
                instructions: 'Baixe em: https://developer.android.com/studio/releases/platform-tools'
            });
        }
        
        // Detectar dispositivos reais
        const devices = await deviceManager.detectDevices();
        
        // Emitir evento via websocket
        if (req.io) {
            req.io.emit('devices-detected', { devices });
        }
        
        res.json({ success: true, devices });
    } catch (error) {
        logger.error('Erro ao detectar dispositivos:', error);
        res.status(500).json({ error: error.message || 'Erro ao detectar dispositivos' });
    }
});

// Rota para listar dispositivos
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Retornar dispositivos já detectados
        const devices = Array.from(deviceManager.devices.values());
        res.json({ success: true, devices });
    } catch (error) {
        logger.error('Erro ao listar dispositivos:', error);
        res.status(500).json({ error: error.message || 'Erro ao listar dispositivos' });
    }
});

// Rota para obter informações de um dispositivo específico
router.get('/:deviceId/info', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        const deviceInfo = await deviceManager.getDeviceInfo(deviceId);
        res.json({ success: true, data: deviceInfo });
    } catch (error) {
        logger.error('Erro ao obter informações do dispositivo:', error);
        res.status(500).json({ error: error.message || 'Erro ao obter informações do dispositivo' });
    }
});

// Rota para reiniciar dispositivo
router.post('/:deviceId/reboot', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { mode } = req.body;
        
        let result;
        if (mode === 'bootloader') {
            result = await deviceManager.rebootToBootloader(deviceId);
        } else {
            result = await deviceManager.rebootDevice(deviceId);
        }
        
        // Emitir evento via websocket
        if (req.io) {
            req.io.emit('device-reboot', { deviceId, mode });
        }
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao reiniciar dispositivo:', error);
        res.status(500).json({ error: error.message || 'Erro ao reiniciar dispositivo' });
    }
});

// Rota para executar comando ADB
router.post('/:deviceId/command', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Comando não especificado' });
        }
        
        const result = await deviceManager.executeCommand(deviceId, command);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Erro ao executar comando:', error);
        res.status(500).json({ error: error.message || 'Erro ao executar comando' });
    }
});

// Rota para capturar screenshot
router.post('/:deviceId/screenshot', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        const screenshotData = await deviceManager.captureScreenshot(deviceId);
        
        // Enviar screenshot como base64
        res.json({ 
            success: true, 
            data: screenshotData.toString('base64'),
            mimeType: 'image/png'
        });
    } catch (error) {
        logger.error('Erro ao capturar screenshot:', error);
        res.status(500).json({ error: error.message || 'Erro ao capturar screenshot' });
    }
});

// Rota para instalar APK
router.post('/:deviceId/install', authenticateToken, upload.single('apk'), async (req, res) => {
    try {
        const { deviceId } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo APK enviado' });
        }
        
        const result = await deviceManager.installAPK(deviceId, file.path);
        
        // Limpar arquivo temporário
        require('fs').unlink(file.path, () => {});
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao instalar APK:', error);
        res.status(500).json({ error: error.message || 'Erro ao instalar APK' });
    }
});

// Rota para criar backup
router.post('/:deviceId/backup', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { includeApk, includeObb, includeShared, includeSystem } = req.body;
        
        const options = {
            includeApk: includeApk || false,
            includeObb: includeObb || false,
            includeShared: includeShared || false,
            includeSystem: includeSystem || false
        };
        
        const backupPath = await deviceManager.createBackup(deviceId, options);
        
        res.json({ 
            success: true, 
            message: 'Backup criado com sucesso',
            backupPath 
        });
    } catch (error) {
        logger.error('Erro ao criar backup:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar backup' });
    }
});

// Rota para restaurar backup
router.post('/:deviceId/restore', authenticateToken, upload.single('backup'), async (req, res) => {
    try {
        const { deviceId } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo de backup enviado' });
        }
        
        const result = await deviceManager.restoreBackup(deviceId, file.path);
        
        // Limpar arquivo temporário
        require('fs').unlink(file.path, () => {});
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: error.message || 'Erro ao restaurar backup' });
    }
});

// Rota para listar pacotes instalados
router.get('/:deviceId/packages', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { type } = req.query; // all, system, third-party
        
        const packages = await deviceManager.getInstalledPackages(deviceId, type || 'all');
        
        res.json({ success: true, packages });
    } catch (error) {
        logger.error('Erro ao listar pacotes:', error);
        res.status(500).json({ error: error.message || 'Erro ao listar pacotes' });
    }
});

// Rota para desinstalar pacote
router.delete('/:deviceId/packages/:packageName', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { deviceId, packageName } = req.params;
        
        const result = await deviceManager.uninstallPackage(deviceId, packageName);
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao desinstalar pacote:', error);
        res.status(500).json({ error: error.message || 'Erro ao desinstalar pacote' });
    }
});

// Rota para alternar modo desenvolvedor
router.post('/:deviceId/developer-mode', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        console.log(`Alternando modo desenvolvedor do dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'Modo desenvolvedor alternado' });
    } catch (error) {
        console.error('Erro ao alternar modo desenvolvedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
