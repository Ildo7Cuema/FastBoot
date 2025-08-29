const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Importar módulos existentes
const { AndroidDeviceManager } = require('../src/modules/AndroidDeviceManager');
const { FastbootManager } = require('../src/modules/FastbootManager');
const { Logger } = require('../src/modules/Logger');

// Importar rotas
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const fastbootRoutes = require('./routes/fastboot');
const logRoutes = require('./routes/logs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Configurações
const PORT = process.env.PORT || 5000;

// Middleware de segurança
app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicializar módulos
const logger = new Logger();
const deviceManager = new AndroidDeviceManager(logger);
const fastbootManager = new FastbootManager(logger);

// Middleware para disponibilizar módulos nas rotas
app.use((req, res, next) => {
  req.deviceManager = deviceManager;
  req.fastbootManager = fastbootManager;
  req.logger = logger;
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/fastboot', fastbootRoutes);
app.use('/api/logs', logRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// WebSocket para comunicação em tempo real
io.on('connection', socket => {
  logger.info('Cliente conectado via WebSocket', { socketId: socket.id });

  // Enviar logs em tempo real
  const logInterval = setInterval(() => {
    const logs = logger.getLogs();
    if (logs.length > 0) {
      socket.emit('logs-update', logs.slice(-10)); // Últimos 10 logs
    }
  }, 1000);

  // Enviar status dos dispositivos em tempo real
  const deviceInterval = setInterval(async () => {
    try {
      const devices = await deviceManager.detectDevices();
      socket.emit('devices-update', devices);
    } catch (error) {
      logger.error('Erro ao atualizar dispositivos via WebSocket:', error);
    }
  }, 2000);

  socket.on('disconnect', () => {
    logger.info('Cliente desconectado via WebSocket', { socketId: socket.id });
    clearInterval(logInterval);
    clearInterval(deviceInterval);
  });

  // Eventos específicos do dispositivo
  socket.on('detect-devices', async () => {
    try {
      const devices = await deviceManager.detectDevices();
      socket.emit('devices-detected', { success: true, devices });
    } catch (error) {
      socket.emit('devices-detected', { success: false, error: error.message });
    }
  });

  socket.on('factory-reset', async data => {
    try {
      const { deviceId } = data;
      const result = await fastbootManager.factoryReset(deviceId);
      socket.emit('factory-reset-result', { success: true, result });
    } catch (error) {
      socket.emit('factory-reset-result', { success: false, error: error.message });
    }
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
server.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });

  // Verificar disponibilidade do ADB
  deviceManager.checkAdbAvailability().then(available => {
    if (available) {
      logger.info('ADB disponível no sistema');
    } else {
      logger.warn('ADB não disponível. Verifique a instalação.');
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado');
    process.exit(0);
  });
});

module.exports = { app, server, io };
