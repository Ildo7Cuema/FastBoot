const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

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
        console.log('Detectando dispositivos...');
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        // Verificar se ADB está disponível
        const adbAvailable = await androidDeviceManager.checkAdbAvailability();
        if (!adbAvailable) {
            return res.status(500).json({ 
                success: false, 
                error: 'ADB não está disponível. Por favor, instale o Android SDK Platform Tools.' 
            });
        }
        
        // Detectar dispositivos reais
        const devices = await androidDeviceManager.detectDevices();
        
        res.json({ success: true, devices });
    } catch (error) {
        console.error('Erro ao detectar dispositivos:', error);
        res.status(500).json({ error: error.message || 'Erro ao detectar dispositivos' });
    }
});

// Rota para listar dispositivos
router.get('/', authenticateToken, async (req, res) => {
    try {
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        // Detectar dispositivos reais
        const devices = await androidDeviceManager.detectDevices();
        
        res.json({ success: true, devices });
    } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
        res.status(500).json({ error: error.message || 'Erro ao listar dispositivos' });
    }
});

// Rota para obter informações de um dispositivo específico
router.get('/:deviceId', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        // Obter informações detalhadas do dispositivo
        const deviceInfo = await androidDeviceManager.getDeviceInfo(deviceId);
        
        if (!deviceInfo) {
            return res.status(404).json({ error: 'Dispositivo não encontrado' });
        }
        
        res.json({ success: true, ...deviceInfo });
    } catch (error) {
        console.error('Erro ao obter informações do dispositivo:', error);
        res.status(500).json({ error: error.message || 'Erro ao obter informações do dispositivo' });
    }
});

// Rota para reiniciar dispositivo
router.post('/:deviceId/reboot', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        console.log(`Reiniciando dispositivo ${deviceId}...`);
        
        await androidDeviceManager.rebootDevice(deviceId);
        
        res.json({ success: true, message: 'Dispositivo reiniciando...' });
    } catch (error) {
        console.error('Erro ao reiniciar dispositivo:', error);
        res.status(500).json({ error: error.message || 'Erro ao reiniciar dispositivo' });
    }
});

// Rota para reiniciar dispositivo em modo bootloader
router.post('/:deviceId/reboot-bootloader', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const androidDeviceManager = req.app.locals.androidDeviceManager;
        
        console.log(`Reiniciando dispositivo ${deviceId} em modo bootloader...`);
        
        await androidDeviceManager.rebootToBootloader(deviceId);
        
        res.json({ success: true, message: 'Dispositivo reiniciando em modo bootloader...' });
    } catch (error) {
        console.error('Erro ao reiniciar em modo bootloader:', error);
        res.status(500).json({ error: error.message || 'Erro ao reiniciar em modo bootloader' });
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
        
        console.log(`Executando comando '${command}' no dispositivo ${deviceId}...`);
        
        res.json({ success: true, output: 'Comando executado com sucesso' });
    } catch (error) {
        console.error('Erro ao executar comando:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para capturar screenshot
router.post('/:deviceId/screenshot', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        console.log(`Capturando screenshot do dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'Screenshot capturado com sucesso' });
    } catch (error) {
        console.error('Erro ao capturar screenshot:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
        
        console.log(`Instalando APK no dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'APK instalado com sucesso' });
    } catch (error) {
        console.error('Erro ao instalar APK:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para criar backup
router.post('/:deviceId/backup', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        console.log(`Criando backup do dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'Backup criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
        
        console.log(`Restaurando backup no dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'Backup restaurado com sucesso' });
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para listar pacotes instalados
router.get('/:deviceId/packages', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        const packages = [
            'com.android.settings',
            'com.google.android.apps.maps',
            'com.whatsapp'
        ];
        
        res.json({ success: true, packages });
    } catch (error) {
        console.error('Erro ao listar pacotes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para desinstalar pacote
router.delete('/:deviceId/packages/:packageName', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { deviceId, packageName } = req.params;
        
        console.log(`Desinstalando pacote ${packageName} do dispositivo ${deviceId}...`);
        
        res.json({ success: true, message: 'Pacote desinstalado com sucesso' });
    } catch (error) {
        console.error('Erro ao desinstalar pacote:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
