const winston = require('winston');
const path = require('path');
const os = require('os');

// Configurações de logging
const logConfig = {
  // Níveis de log
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },

  // Cores para cada nível
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
  },

  // Formato dos logs
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),

  // Transports (destinos dos logs)
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),

    // Arquivo de logs de erro
    new winston.transports.File({
      filename: path.join(getLogDirectory(), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),

    // Arquivo de logs combinados
    new winston.transports.File({
      filename: path.join(getLogDirectory(), 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
};

// Função para obter diretório de logs baseado na plataforma
function getLogDirectory() {
  const platform = os.platform();
  const appName = 'FastBoot-Web';

  if (platform === 'win32') {
    return path.join(process.env.APPDATA, appName, 'logs');
  } else if (platform === 'darwin') {
    return path.join(process.env.HOME, 'Library', 'Logs', appName);
  } else {
    return path.join(process.env.HOME, '.config', appName, 'logs');
  }
}

// Função para criar diretório de logs se não existir
function ensureLogDirectory() {
  const logDir = getLogDirectory();
  try {
    if (!require('fs').existsSync(logDir)) {
      require('fs').mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    console.error('Erro ao criar diretório de logs:', error);
  }
}

// Criar diretório de logs
ensureLogDirectory();

// Configurações específicas por ambiente
if (process.env.NODE_ENV === 'production') {
  // Em produção, adicionar mais configurações de segurança
  logConfig.transports.push(
    new winston.transports.File({
      filename: path.join(getLogDirectory(), 'security.log'),
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    })
  );
}

// Criar logger
const logger = winston.createLogger(logConfig);

// Adicionar cores ao winston
winston.addColors(logConfig.colors);

// Função para log de auditoria
function auditLog(action, user, details = {}) {
  logger.info('AUDIT', {
    action,
    user: user?.username || 'anonymous',
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent,
    details,
  });
}

// Função para log de segurança
function securityLog(level, message, details = {}) {
  logger.log(level, `SECURITY: ${message}`, {
    timestamp: new Date().toISOString(),
    details,
  });
}

module.exports = {
  logger,
  auditLog,
  securityLog,
  getLogDirectory,
  ensureLogDirectory,
};
