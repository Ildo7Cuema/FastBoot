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

// Configurações de segurança
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
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
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Inicializar servidor
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info('WebSocket server started');
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
