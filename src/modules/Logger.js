const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.logs = [];
    this.maxLogs = options.maxLogs || parseInt(process.env.LOG_MAX_FILES) || 1000;
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      FATAL: 4
    };
    
    // Configurar nível de log baseado no ambiente
    const envLevel = process.env.LOG_LEVEL || 'INFO';
    this.currentLevel = this.logLevels[envLevel] || this.logLevels.INFO;
    
    // Configurações de rotação de logs
    this.maxFileSize = this.parseSize(process.env.LOG_MAX_SIZE || '10MB');
    this.maxFiles = parseInt(process.env.LOG_MAX_FILES) || 30;
    
    // Criar diretório de logs se não existir
    this.logDir = options.logDir || this.getLogDirectory();
    this.ensureLogDirectory();
    
    // Buffer para escrita em lote
    this.writeBuffer = [];
    this.writeInterval = setInterval(() => this.flushBuffer(), 1000);
    
    // Configurar limpeza automática de logs antigos
    this.setupLogRotation();
    
    // Inicializar com log de início
    this.info('Logger inicializado', {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      logLevel: envLevel,
      logDir: this.logDir
    });
  }

  /**
   * Converte tamanho em string para bytes
   */
  parseSize(sizeStr) {
    const units = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+)(B|KB|MB|GB)?$/i);
    if (!match) return 10 * 1024 * 1024; // 10MB default
    
    const value = parseInt(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    return value * (units[unit] || 1);
  }

  /**
   * Obtém o diretório de logs baseado na plataforma
   */
  getLogDirectory() {
    // Se estiver no servidor, usar diretório local
    if (!process.versions.electron) {
      return path.join(process.cwd(), process.env.LOG_DIRECTORY || 'logs');
    }
    
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
   * Configura rotação automática de logs
   */
  setupLogRotation() {
    // Verificar a cada hora
    setInterval(() => {
      this.rotateLogs();
      this.cleanOldLogs();
    }, 60 * 60 * 1000);
    
    // Verificar na inicialização
    this.rotateLogs();
    this.cleanOldLogs();
  }

  /**
   * Rotaciona logs se necessário
   */
  rotateLogs() {
    try {
      const currentLogFile = path.join(this.logDir, this.getLogFileName());
      
      if (fs.existsSync(currentLogFile)) {
        const stats = fs.statSync(currentLogFile);
        
        if (stats.size >= this.maxFileSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = currentLogFile.replace('.log', `-${timestamp}.log`);
          
          fs.renameSync(currentLogFile, rotatedFile);
          this.info('Log rotacionado', { from: currentLogFile, to: rotatedFile });
        }
      }
    } catch (error) {
      console.error('Erro ao rotacionar logs:', error);
    }
  }

  /**
   * Remove logs antigos
   */
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length > this.maxFiles) {
        const filesToDelete = files.slice(this.maxFiles);
        
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
          this.info('Log antigo removido', { file: file.name });
        });
      }
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
    }
  }

  /**
   * Adiciona log à memória e arquivo
   */
  addLog(level, message, data = null, context = null) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      level,
      message,
      data,
      context,
      pid: process.pid,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
    };

    // Adicionar à memória
    this.logs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Adicionar ao buffer de escrita
    this.writeBuffer.push(logEntry);

    // Emitir evento para listeners
    this.emit('log', logEntry);
    this.emit(`log:${level.toLowerCase()}`, logEntry);

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const color = this.getConsoleColor(level);
      console.log(`${color}[${timestamp}] ${level}: ${message}`, data || '', '\x1b[0m');
    }
  }

  /**
   * Obtém cor para console baseado no nível
   */
  getConsoleColor(level) {
    const colors = {
      DEBUG: '\x1b[36m',    // Cyan
      INFO: '\x1b[32m',     // Green
      WARN: '\x1b[33m',     // Yellow
      ERROR: '\x1b[31m',    // Red
      FATAL: '\x1b[35m',    // Magenta
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * Flush do buffer de escrita
   */
  flushBuffer() {
    if (this.writeBuffer.length === 0) return;
    
    try {
      const logFile = path.join(this.logDir, this.getLogFileName());
      const logLines = this.writeBuffer.map(entry => JSON.stringify(entry) + '\n').join('');
      
      fs.appendFileSync(logFile, logLines, 'utf8');
      this.writeBuffer = [];
    } catch (error) {
      console.error('Erro ao escrever logs no arquivo:', error);
    }
  }

  /**
   * Escreve log no arquivo imediatamente
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
  debug(message, data = null, context = null) {
    if (this.currentLevel <= this.logLevels.DEBUG) {
      this.addLog('DEBUG', message, data, context);
    }
  }

  /**
   * Log de informação
   */
  info(message, data = null, context = null) {
    if (this.currentLevel <= this.logLevels.INFO) {
      this.addLog('INFO', message, data, context);
    }
  }

  /**
   * Log de aviso
   */
  warn(message, data = null, context = null) {
    if (this.currentLevel <= this.logLevels.WARN) {
      this.addLog('WARN', message, data, context);
    }
  }

  /**
   * Log de erro
   */
  error(message, data = null, context = null) {
    if (this.currentLevel <= this.logLevels.ERROR) {
      this.addLog('ERROR', message, data, context);
    }
  }

  /**
   * Log fatal
   */
  fatal(message, data = null, context = null) {
    if (this.currentLevel <= this.logLevels.FATAL) {
      this.addLog('FATAL', message, data, context);
      // Em logs fatais, forçar flush imediato
      this.flushBuffer();
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

  /**
   * Busca logs com filtros
   */
  searchLogs(query) {
    const { 
      level, 
      startDate, 
      endDate, 
      message, 
      context,
      limit = 100 
    } = query;
    
    let filtered = [...this.logs];
    
    // Filtrar por nível
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    // Filtrar por data
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Filtrar por mensagem
    if (message) {
      const regex = new RegExp(message, 'i');
      filtered = filtered.filter(log => regex.test(log.message));
    }
    
    // Filtrar por contexto
    if (context) {
      filtered = filtered.filter(log => log.context === context);
    }
    
    // Aplicar limite
    if (limit && limit > 0) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }

  /**
   * Stream de logs em tempo real
   */
  streamLogs(callback, filter = {}) {
    const listener = (log) => {
      // Aplicar filtros se fornecidos
      if (filter.level && log.level !== filter.level) return;
      if (filter.context && log.context !== filter.context) return;
      
      callback(log);
    };
    
    this.on('log', listener);
    
    // Retornar função para parar o stream
    return () => {
      this.off('log', listener);
    };
  }

  /**
   * Destrutor - limpar recursos
   */
  destroy() {
    // Flush buffer final
    this.flushBuffer();
    
    // Limpar intervalos
    if (this.writeInterval) {
      clearInterval(this.writeInterval);
    }
    
    // Remover todos os listeners
    this.removeAllListeners();
    
    this.info('Logger finalizado');
  }
}

module.exports = { Logger };
