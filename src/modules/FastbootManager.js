const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class FastbootManager {
  constructor(logger) {
    this.logger = logger;
    this.fastbootPath = this.findFastbootPath();
    this.isOperationInProgress = false;
    this.currentOperation = null;
  }

  /**
   * Encontra o caminho do fastboot no sistema
   */
  findFastbootPath() {
    const platform = os.platform();
    let fastbootPath = 'fastboot'; // Assume que está no PATH

    // Verificar se o fastboot está no PATH
    if (this.checkCommandInPath('fastboot')) {
      return fastbootPath;
    }

    // Caminhos específicos por plataforma
    if (platform === 'win32') {
      const possiblePaths = [
        'C:\\Android\\platform-tools\\fastboot.exe',
        'C:\\Program Files\\Android\\platform-tools\\fastboot.exe',
        path.join(
          process.env.USERPROFILE,
          'AppData\\Local\\Android\\Sdk\\platform-tools\\fastboot.exe'
        ),
      ];

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
    } else if (platform === 'darwin') {
      const possiblePaths = [
        '/usr/local/bin/fastboot',
        '/opt/homebrew/bin/fastboot',
        path.join(process.env.HOME, 'Library/Android/sdk/platform-tools/fastboot'),
        path.join(process.env.HOME, 'Android/Sdk/platform-tools/fastboot'),
      ];

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
    }

    this.logger.warn('Fastboot não encontrado no sistema. Será necessário instalar.');
    return null;
  }

  /**
   * Verifica se um comando está disponível no PATH
   */
  checkCommandInPath(command) {
    try {
      if (os.platform() === 'win32') {
        require('child_process').execSync(`where ${command}`, { stdio: 'ignore' });
      } else {
        require('child_process').execSync(`which ${command}`, { stdio: 'ignore' });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o fastboot está disponível
   */
  async checkFastbootAvailability() {
    if (!this.fastbootPath) {
      return false;
    }

    try {
      return new Promise(resolve => {
        exec(`${this.fastbootPath} version`, (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao verificar versão do fastboot:', error);
            resolve(false);
          } else {
            this.logger.info('Fastboot disponível:', stdout.trim());
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.logger.error('Erro ao verificar fastboot:', error);
      return false;
    }
  }

  /**
   * Lista dispositivos em modo fastboot
   */
  async listFastbootDevices() {
    if (!this.fastbootPath) {
      throw new Error('Fastboot não está disponível. Instale o Android SDK Platform Tools.');
    }

    return new Promise((resolve, reject) => {
      exec(`${this.fastbootPath} devices`, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Erro ao executar fastboot devices:', error);
          reject(error);
          return;
        }

        const lines = stdout.trim().split('\n');
        const devices = [];

        for (const line of lines) {
          if (line.trim()) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              devices.push({
                id: parts[0],
                status: parts[1],
                type: 'fastboot',
              });
            }
          }
        }

        this.logger.info(`Dispositivos fastboot detectados: ${devices.length}`);
        resolve(devices);
      });
    });
  }

  /**
   * Executa factory reset completo no dispositivo
   */
  async factoryReset(deviceId) {
    if (this.isOperationInProgress) {
      throw new Error('Operação já em andamento. Aguarde a conclusão.');
    }

    if (!this.fastbootPath) {
      throw new Error('Fastboot não está disponível');
    }

    this.isOperationInProgress = true;
    this.currentOperation = 'factory-reset';

    try {
      this.logger.info(`Iniciando factory reset para dispositivo ${deviceId}...`);

      // Verificar se o dispositivo está em modo fastboot
      const fastbootDevices = await this.listFastbootDevices();
      const targetDevice = fastbootDevices.find(d => d.id === deviceId);

      if (!targetDevice) {
        throw new Error(`Dispositivo ${deviceId} não está em modo fastboot`);
      }

      // Executar comandos de factory reset
      const results = await this.executeFactoryResetCommands(deviceId);

      this.logger.info(`Factory reset concluído com sucesso para dispositivo ${deviceId}`);

      return {
        success: true,
        message: 'Factory reset concluído com sucesso',
        details: results,
      };
    } catch (error) {
      this.logger.error(`Erro durante factory reset para dispositivo ${deviceId}:`, error);
      throw error;
    } finally {
      this.isOperationInProgress = false;
      this.currentOperation = null;
    }
  }

  /**
   * Executa comandos específicos para factory reset
   */
  async executeFactoryResetCommands(deviceId) {
    const commands = [
      { name: 'erase-userdata', command: `erase userdata` },
      { name: 'erase-cache', command: `erase cache` },
      { name: 'erase-system', command: `erase system` },
      { name: 'reboot', command: `reboot` },
    ];

    const results = [];

    for (const cmd of commands) {
      try {
        this.logger.info(`Executando: fastboot ${cmd.command}`);

        const result = await this.executeFastbootCommand(deviceId, cmd.command);
        results.push({
          command: cmd.name,
          success: true,
          output: result,
        });

        // Aguardar um pouco entre comandos
        await this.delay(1000);
      } catch (error) {
        this.logger.error(`Erro ao executar ${cmd.name}:`, error);
        results.push({
          command: cmd.name,
          success: false,
          error: error.message,
        });

        // Para comandos críticos, interromper o processo
        if (cmd.name === 'erase-userdata') {
          throw new Error(`Falha no comando crítico: ${cmd.name}`);
        }
      }
    }

    return results;
  }

  /**
   * Executa um comando fastboot específico
   */
  executeFastbootCommand(deviceId, command) {
    return new Promise((resolve, reject) => {
      const fullCommand = `${this.fastbootPath} -s ${deviceId} ${command}`;

      this.logger.info(`Executando comando: ${fullCommand}`);

      exec(fullCommand, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Erro no comando fastboot: ${error.message}`);
          reject(error);
          return;
        }

        resolve(stdout.trim());
      });
    });
  }

  /**
   * Executa comando fastboot com output em tempo real
   */
  executeFastbootCommandWithProgress(deviceId, command, onProgress) {
    return new Promise((resolve, reject) => {
      const fullCommand = `${this.fastbootPath} -s ${deviceId} ${command}`;
      const args = fullCommand.split(' ');
      const fastbootProcess = spawn(args[0], args.slice(1));

      let output = '';
      let errorOutput = '';

      fastbootProcess.stdout.on('data', data => {
        const message = data.toString();
        output += message;

        if (onProgress) {
          onProgress({ type: 'stdout', data: message });
        }
      });

      fastbootProcess.stderr.on('data', data => {
        const message = data.toString();
        errorOutput += message;

        if (onProgress) {
          onProgress({ type: 'stderr', data: message });
        }
      });

      fastbootProcess.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Fastboot process exited with code ${code}. Error: ${errorOutput}`));
        }
      });

      fastbootProcess.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Obtém informações do dispositivo em modo fastboot
   */
  async getDeviceInfo(deviceId) {
    if (!this.fastbootPath) {
      throw new Error('Fastboot não está disponível');
    }

    try {
      const [getvarProduct, getvarManufacturer, getvarSerial] = await Promise.all([
        this.executeFastbootCommand(deviceId, 'getvar product'),
        this.executeFastbootCommand(deviceId, 'getvar manufacturer'),
        this.executeFastbootCommand(deviceId, 'getvar serial'),
      ]);

      return {
        product: getvarProduct.replace('product: ', ''),
        manufacturer: getvarManufacturer.replace('manufacturer: ', ''),
        serial: getvarSerial.replace('serial: ', ''),
        mode: 'fastboot',
      };
    } catch (error) {
      this.logger.error('Erro ao obter informações do dispositivo fastboot:', error);
      throw error;
    }
  }

  /**
   * Executa comando de unlock bootloader (requer confirmação)
   */
  async unlockBootloader(deviceId, confirmation = false) {
    if (!confirmation) {
      throw new Error('Unlock bootloader requer confirmação explícita');
    }

    if (!this.fastbootPath) {
      throw new Error('Fastboot não está disponível');
    }

    this.logger.warn(
      `ATENÇÃO: Unlock bootloader irá apagar todos os dados do dispositivo ${deviceId}`
    );

    try {
      const result = await this.executeFastbootCommand(deviceId, 'oem unlock');
      this.logger.info(`Bootloader desbloqueado para dispositivo ${deviceId}`);
      return { success: true, message: 'Bootloader desbloqueado', output: result };
    } catch (error) {
      this.logger.error(`Erro ao desbloquear bootloader:`, error);
      throw error;
    }
  }

  /**
   * Executa comando de lock bootloader
   */
  async lockBootloader(deviceId) {
    if (!this.fastbootPath) {
      throw new Error('Fastboot não está disponível');
    }

    try {
      const result = await this.executeFastbootCommand(deviceId, 'oem lock');
      this.logger.info(`Bootloader bloqueado para dispositivo ${deviceId}`);
      return { success: true, message: 'Bootloader bloqueado', output: result };
    } catch (error) {
      this.logger.error(`Erro ao bloquear bootloader:`, error);
      throw error;
    }
  }

  /**
   * Verifica o status da operação atual
   */
  getOperationStatus() {
    return {
      isInProgress: this.isOperationInProgress,
      currentOperation: this.currentOperation,
    };
  }

  /**
   * Cancela a operação atual (se possível)
   */
  cancelCurrentOperation() {
    if (this.isOperationInProgress) {
      this.logger.warn('Cancelando operação atual...');
      this.isOperationInProgress = false;
      this.currentOperation = null;
      return true;
    }
    return false;
  }

  /**
   * Utilitário para delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se o dispositivo está pronto para comandos fastboot
   */
  async isDeviceReady(deviceId) {
    try {
      const devices = await this.listFastbootDevices();
      return devices.some(d => d.id === deviceId && d.status === 'fastboot');
    } catch (error) {
      return false;
    }
  }
}

module.exports = { FastbootManager };
