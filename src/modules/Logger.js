const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Máximo de logs em memória
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
    this.currentLevel = this.logLevels.INFO;

    // Criar diretório de logs se não existir
    this.logDir = this.getLogDirectory();
    this.ensureLogDirectory();

    // Inicializar com log de início
    this.info('Logger inicializado', {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
    });
  }

  /**
   * Obtém o diretório de logs baseado na plataforma
   */
  getLogDirectory() {
    const platform = os.platform();
    const appName = 'FastBoot-Factory-Reset';

    if (platform === 'win32') {
      return path.join(process.env.APPDATA, appName, 'logs');
    } else if (platform === 'darwin') {
      return path.join(process.env.HOME, 'Library', 'Logs', appName);
    } else {
      return path.join(process.env.HOME, '.config', appName, 'logs');
    }
  }

  /**
   * Cria o diretório de logs se não existir
   */
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error);
    }
  }

  /**
   * Gera nome do arquivo de log baseado na data
   */
  getLogFileName() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `fastboot-${dateStr}.log`;
  }

  /**
   * Obtém timestamp formatado
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Adiciona log à memória e arquivo
   */
  addLog(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      platform: os.platform(),
      arch: os.arch(),
    };

    // Adicionar à memória
    this.logs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Escrever no arquivo
    this.writeToFile(logEntry);

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] ${level}: ${message}`, data || '');
    }
  }

  /**
   * Escreve log no arquivo
   */
  writeToFile(logEntry) {
    try {
      const logFile = path.join(this.logDir, this.getLogFileName());
      const logLine = JSON.stringify(logEntry) + '\n';

      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Erro ao escrever log no arquivo:', error);
    }
  }

  /**
   * Log de debug
   */
  debug(message, data = null) {
    if (this.currentLevel <= this.logLevels.DEBUG) {
      this.addLog('DEBUG', message, data);
    }
  }

  /**
   * Log de informação
   */
  info(message, data = null) {
    if (this.currentLevel <= this.logLevels.INFO) {
      this.addLog('INFO', message, data);
    }
  }

  /**
   * Log de aviso
   */
  warn(message, data = null) {
    if (this.currentLevel <= this.logLevels.WARN) {
      this.addLog('WARN', message, data);
    }
  }

  /**
   * Log de erro
   */
  error(message, data = null) {
    if (this.currentLevel <= this.logLevels.ERROR) {
      this.addLog('ERROR', message, data);
    }
  }

  /**
   * Log de operação de sistema
   */
  system(message, data = null) {
    this.addLog('SYSTEM', message, data);
  }

  /**
   * Log de operação de dispositivo
   */
  device(deviceId, message, data = null) {
    this.addLog('DEVICE', `[${deviceId}] ${message}`, data);
  }

  /**
   * Log de operação de fastboot
   */
  fastboot(deviceId, message, data = null) {
    this.addLog('FASTBOOT', `[${deviceId}] ${message}`, data);
  }

  /**
   * Log de operação de ADB
   */
  adb(deviceId, message, data = null) {
    this.addLog('ADB', `[${deviceId}] ${message}`, data);
  }

  /**
   * Obtém todos os logs em memória
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Obtém logs filtrados por nível
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Obtém logs filtrados por dispositivo
   */
  getLogsByDevice(deviceId) {
    return this.logs.filter(
      log => log.message.includes(`[${deviceId}]`) || (log.data && log.data.deviceId === deviceId)
    );
  }

  /**
   * Obtém logs de uma data específica
   */
  getLogsByDate(date) {
    const targetDate = new Date(date).toISOString().split('T')[0];
    return this.logs.filter(log => log.timestamp.startsWith(targetDate));
  }

  /**
   * Obtém logs das últimas N horas
   */
  getLogsLastHours(hours) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  /**
   * Limpa logs da memória
   */
  clearLogs() {
    this.logs = [];
    this.info('Logs em memória limpos');
  }

  /**
   * Exporta logs para arquivo
   */
  exportLogs(filename = null) {
    try {
      if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `fastboot-logs-${timestamp}.json`;
      }

      const exportPath = path.join(this.logDir, filename);
      const exportData = {
        exportDate: new Date().toISOString(),
        totalLogs: this.logs.length,
        logs: this.logs,
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
      this.info(`Logs exportados para: ${exportPath}`);

      return { success: true, path: exportPath };
    } catch (error) {
      this.error('Erro ao exportar logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Define o nível de log
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLevel = this.logLevels[level];
      this.info(`Nível de log alterado para: ${level}`);
    } else {
      this.warn(`Nível de log inválido: ${level}`);
    }
  }

  /**
   * Obtém estatísticas dos logs
   */
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byHour: {},
      recentErrors: 0,
    };

    // Contar por nível
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Contar erros das últimas 24h
      if (log.level === 'ERROR') {
        const logDate = new Date(log.timestamp);
        const hoursAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60);
        if (hoursAgo <= 24) {
          stats.recentErrors++;
        }
      }
    });

    // Contar por hora (últimas 24h)
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.getHours();
      stats.byHour[hourKey] = 0;
    }

    this.logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const hoursAgo = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);
      if (hoursAgo <= 24) {
        const hour = logDate.getHours();
        stats.byHour[hour]++;
      }
    });

    return stats;
  }

  /**
   * Obtém informações do sistema de logs
   */
  getSystemInfo() {
    return {
      logDirectory: this.logDir,
      maxLogs: this.maxLogs,
      currentLevel: Object.keys(this.logLevels).find(
        key => this.logLevels[key] === this.currentLevel
      ),
      totalLogs: this.logs.length,
      logFiles: this.getLogFiles(),
    };
  }

  /**
   * Lista arquivos de log disponíveis
   */
  getLogFiles() {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      const files = fs.readdirSync(this.logDir);
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          size: fs.statSync(path.join(this.logDir, file)).size,
          modified: fs.statSync(path.join(this.logDir, file)).mtime,
        }))
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.error('Erro ao listar arquivos de log:', error);
      return [];
    }
  }

  /**
   * Lê conteúdo de um arquivo de log específico
   */
  readLogFile(filename) {
    try {
      const filePath = path.join(this.logDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo de log não encontrado');
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
    } catch (error) {
      this.error('Erro ao ler arquivo de log:', error);
      throw error;
    }
  }
}

module.exports = { Logger };
