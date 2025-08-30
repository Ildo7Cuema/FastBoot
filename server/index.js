const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const fastbootRoutes = require('./routes/fastboot');
const logRoutes = require('./routes/logs');
const systemRoutes = require('./routes/system');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Importar módulos de gerenciamento
const { AndroidDeviceManager } = require('../src/modules/AndroidDeviceManager');
const { FastbootManager } = require('../src/modules/FastbootManager');
const { Logger } = require('../src/modules/Logger');

// Inicializar gerenciadores globais
const mainLogger = new Logger();
const deviceManager = new AndroidDeviceManager(mainLogger);
const fastbootManager = new FastbootManager(mainLogger);

// Configurações de segurança
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logger simples
const logger = {
    info: (message, data = {}) => console.log(`[INFO] ${message}`, data),
    error: (message, data = {}) => console.error(`[ERROR] ${message}`, data),
    warn: (message, data = {}) => console.warn(`[WARN] ${message}`, data),
    debug: (message, data = {}) => console.log(`[DEBUG] ${message}`, data)
};

logger.info('Logger inicializado', {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
});

// Middleware para adicionar io às requisições
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/fastboot', fastbootRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/system', systemRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// WebSocket events
io.on('connection', (socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
    });

    socket.on('device-operation', async (data) => {
        try {
            const { operation, deviceId, ...params } = data;
            let result = { message: `${operation} initiated for device ${deviceId}` };

            socket.emit('operation-result', { operation, deviceId, result });
        } catch (error) {
            logger.error('Error in device operation', { error: error.message, operation: data.operation });
            socket.emit('operation-result', {
                operation: data.operation,
                deviceId: data.deviceId,
                error: error.message
            });
        }
    });
});

// Em produção, servir arquivos estáticos do frontend
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// Tratamento de erros global
app.use((err, req, res, next) => {
    logger.error('Global error handler', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Enviar notificação via WebSocket se disponível
    if (req.io) {
        req.io.emit('server-error', {
            message: 'Erro no servidor',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            timestamp: new Date().toISOString()
        });
    }

    // Determinar status code apropriado
    const statusCode = err.statusCode || err.status || 500;
    
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Inicializar servidor
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, async () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info('WebSocket server started');
    
    // Verificar disponibilidade de ADB e Fastboot
    const adbAvailable = await deviceManager.checkAdbAvailability();
    const fastbootAvailable = await fastbootManager.checkFastbootAvailability();
    
    if (adbAvailable) {
        logger.info('ADB está disponível');
        // Iniciar monitoramento de dispositivos
        deviceManager.startDeviceMonitoring();
        
        // Configurar eventos de dispositivos
        setInterval(async () => {
            try {
                const devices = await deviceManager.detectDevices();
                io.emit('devices-update', { devices });
            } catch (error) {
                logger.error('Erro no monitoramento de dispositivos:', error);
            }
        }, 5000); // Atualizar a cada 5 segundos
    } else {
        logger.warn('ADB não está disponível. Funcionalidades de dispositivos limitadas.');
    }
    
    if (fastbootAvailable) {
        logger.info('Fastboot está disponível');
    } else {
        logger.warn('Fastboot não está disponível. Funcionalidades de fastboot limitadas.');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
