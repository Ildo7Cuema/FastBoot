const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class AndroidDeviceManager {
  constructor(logger) {
    this.logger = logger;
    this.devices = new Map();
    this.adbPath = this.findAdbPath();
    this.isMonitoring = false;
  }

  /**
   * Encontra o caminho do ADB no sistema
   */
  findAdbPath() {
    const platform = os.platform();
    let adbPath = 'adb'; // Assume que está no PATH

    // Verificar se o ADB está no PATH
    if (this.checkCommandInPath('adb')) {
      return adbPath;
    }

    // Caminhos específicos por plataforma
    if (platform === 'win32') {
      const possiblePaths = [
        'C:\\Android\\platform-tools\\adb.exe',
        'C:\\Program Files\\Android\\platform-tools\\adb.exe',
        path.join(
          process.env.USERPROFILE,
          'AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'
        ),
      ];

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
    } else if (platform === 'darwin') {
      const possiblePaths = [
        '/usr/local/bin/adb',
        '/opt/homebrew/bin/adb',
        path.join(process.env.HOME, 'Library/Android/sdk/platform-tools/adb'),
        path.join(process.env.HOME, 'Android/Sdk/platform-tools/adb'),
      ];

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
    }

    this.logger.warn(
      'ADB não encontrado no sistema. Será necessário instalar.'
    );
    return null;
  }

  /**
   * Verifica se um comando está disponível no PATH
   */
  checkCommandInPath(command) {
    try {
      require('child_process').execSync(`which ${command}`, {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o ADB está disponível
   */
  async checkAdbAvailability() {
    if (!this.adbPath) {
      return false;
    }

    try {
      return new Promise(resolve => {
        exec(`${this.adbPath} version`, (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao verificar versão do ADB:', error);
            resolve(false);
          } else {
            this.logger.info('ADB disponível:', stdout.trim());
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.logger.error('Erro ao verificar ADB:', error);
      return false;
    }
  }

  /**
   * Detecta dispositivos Android conectados
   */
  async detectDevices() {
    if (!this.adbPath) {
      throw new Error(
        'ADB não está disponível. Instale o Android SDK Platform Tools.'
      );
    }

    return new Promise(async (resolve, reject) => {
      exec(`${this.adbPath} devices -l`, async (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Erro ao executar adb devices:', error);
          reject(error);
          return;
        }

        const lines = stdout.trim().split('\n');
        const devices = [];

        // Pular a primeira linha (header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              const deviceId = parts[0];
              const status = parts[1];

              if (status === 'device') {
                const device = {
                  id: deviceId,
                  status: status,
                  model: this.extractModel(parts),
                  manufacturer: this.extractManufacturer(parts),
                  androidVersion: await this.getAndroidVersion(deviceId),
                  connected: true,
                };

                devices.push(device);
                this.devices.set(deviceId, device);
              }
            }
          }
        }

        this.logger.info(`Dispositivos detectados: ${devices.length}`);
        resolve(devices);
      });
    });
  }

  /**
   * Extrai o modelo do dispositivo das informações do ADB
   */
  extractModel(parts) {
    for (const part of parts) {
      if (part.startsWith('model:')) {
        return part.replace('model:', '');
      }
    }
    return 'Unknown';
  }

  /**
   * Extrai o fabricante do dispositivo das informações do ADB
   */
  extractManufacturer(parts) {
    for (const part of parts) {
      if (part.startsWith('manufacturer:')) {
        return part.replace('manufacturer:', '');
      }
    }
    return 'Unknown';
  }

  /**
   * Obtém a versão do Android do dispositivo
   */
  async getAndroidVersion(deviceId) {
    try {
      return new Promise(resolve => {
        exec(
          `${this.adbPath} -s ${deviceId} shell getprop ro.build.version.release`,
          (error, stdout, stderr) => {
            if (error) {
              resolve('Unknown');
            } else {
              resolve(stdout.trim());
            }
          }
        );
      });
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Reinicia o dispositivo para o modo bootloader
   */
  async rebootToBootloader(deviceId) {
    if (!this.adbPath) {
      throw new Error('ADB não está disponível');
    }

    if (!this.devices.has(deviceId)) {
      throw new Error('Dispositivo não encontrado');
    }

    return new Promise((resolve, reject) => {
      this.logger.info(
        `Reiniciando dispositivo ${deviceId} para bootloader...`
      );

      exec(
        `${this.adbPath} -s ${deviceId} reboot bootloader`,
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao reiniciar para bootloader:', error);
            reject(error);
          } else {
            this.logger.info(
              `Dispositivo ${deviceId} reiniciado para bootloader com sucesso`
            );
            resolve({
              success: true,
              message: 'Dispositivo reiniciado para bootloader',
            });
          }
        }
      );
    });
  }

  /**
   * Inicia o monitoramento de dispositivos
   */
  startDeviceMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.logger.info('Iniciando monitoramento de dispositivos...');

    setInterval(async () => {
      try {
        const currentDevices = await this.detectDevices();
        const currentDeviceIds = new Set(currentDevices.map(d => d.id));
        const previousDeviceIds = new Set(this.devices.keys());

        // Dispositivos conectados
        for (const device of currentDevices) {
          if (!previousDeviceIds.has(device.id)) {
            this.logger.info(`Novo dispositivo conectado: ${device.id}`);
            // Emitir evento de dispositivo conectado
          }
        }

        // Dispositivos desconectados
        for (const deviceId of previousDeviceIds) {
          if (!currentDeviceIds.has(deviceId)) {
            this.logger.info(`Dispositivo desconectado: ${deviceId}`);
            this.devices.delete(deviceId);
            // Emitir evento de dispositivo desconectado
          }
        }
      } catch (error) {
        this.logger.error('Erro no monitoramento de dispositivos:', error);
      }
    }, 2000); // Verificar a cada 2 segundos
  }

  /**
   * Para o monitoramento de dispositivos
   */
  stopDeviceMonitoring() {
    this.isMonitoring = false;
    this.logger.info('Monitoramento de dispositivos parado');
  }

  /**
   * Instala drivers ADB (Windows)
   */
  async installAdbDrivers() {
    if (os.platform() !== 'win32') {
      throw new Error('Instalação de drivers só é suportada no Windows');
    }

    // Esta é uma implementação básica
    // Em produção, você pode querer baixar e instalar drivers específicos
    this.logger.info('Para instalar drivers ADB no Windows:');
    this.logger.info('1. Baixe o Android SDK Platform Tools');
    this.logger.info('2. Instale os drivers USB do fabricante do dispositivo');
    this.logger.info('3. Configure as variáveis de ambiente');

    return { message: 'Instruções de instalação exibidas nos logs' };
  }

  /**
   * Obtém informações detalhadas de um dispositivo
   */
  async getDeviceInfo(deviceId) {
    if (!this.devices.has(deviceId)) {
      throw new Error('Dispositivo não encontrado');
    }

    const device = this.devices.get(deviceId);

    try {
      const [buildProps, batteryInfo] = await Promise.all([
        this.getBuildProperties(deviceId),
        this.getBatteryInfo(deviceId),
      ]);

      return {
        ...device,
        buildProperties: buildProps,
        batteryInfo: batteryInfo,
      };
    } catch (error) {
      this.logger.error('Erro ao obter informações do dispositivo:', error);
      return device;
    }
  }

  /**
   * Obtém propriedades de build do dispositivo
   */
  async getBuildProperties(deviceId) {
    return new Promise(resolve => {
      exec(
        `${this.adbPath} -s ${deviceId} shell getprop`,
        (error, stdout, stderr) => {
          if (error) {
            resolve({});
          } else {
            const props = {};
            const lines = stdout.split('\n');

            for (const line of lines) {
              const match = line.match(/\[([^\]]+)\]:\s*\[([^\]]*)\]/);
              if (match) {
                props[match[1]] = match[2];
              }
            }

            resolve(props);
          }
        }
      );
    });
  }

  /**
   * Obtém informações da bateria do dispositivo
   */
  async getBatteryInfo(deviceId) {
    return new Promise(resolve => {
      exec(
        `${this.adbPath} -s ${deviceId} shell dumpsys battery`,
        (error, stdout, stderr) => {
          if (error) {
            resolve({});
          } else {
            const batteryInfo = {};
            const lines = stdout.split('\n');

            for (const line of lines) {
              if (line.includes('level:')) {
                batteryInfo.level = parseInt(line.split(':')[1].trim());
              } else if (line.includes('status:')) {
                batteryInfo.status = line.split(':')[1].trim();
              }
            }

            resolve(batteryInfo);
          }
        }
      );
    });
  }

  /**
   * Reinicia o dispositivo
   */
  async rebootDevice(deviceId) {
    return new Promise((resolve, reject) => {
      this.logger.info(`Reiniciando dispositivo ${deviceId}...`);

      exec(`${this.adbPath} -s ${deviceId} reboot`, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Erro ao reiniciar dispositivo:', error);
          reject(error);
        } else {
          this.logger.info(`Dispositivo ${deviceId} reiniciado com sucesso`);
          resolve({ success: true, message: 'Dispositivo reiniciado' });
        }
      });
    });
  }

  /**
   * Executa comando ADB customizado
   */
  async executeCommand(deviceId, command) {
    return new Promise((resolve, reject) => {
      // Sanitizar comando
      const sanitizedCommand = command.replace(/[;&|`$]/g, '');
      const fullCommand = `${this.adbPath} -s ${deviceId} shell ${sanitizedCommand}`;

      this.logger.info(`Executando comando: ${fullCommand}`);

      exec(fullCommand, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Erro ao executar comando:', error);
          reject(error);
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        }
      });
    });
  }

  /**
   * Captura screenshot do dispositivo
   */
  async captureScreenshot(deviceId) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(
        os.tmpdir(),
        `screenshot-${deviceId}-${Date.now()}.png`
      );
      const devicePath = '/sdcard/screenshot.png';

      // Capturar screenshot no dispositivo
      exec(
        `${this.adbPath} -s ${deviceId} shell screencap -p ${devicePath}`,
        error => {
          if (error) {
            reject(error);
            return;
          }

          // Transferir para o computador
          exec(
            `${this.adbPath} -s ${deviceId} pull ${devicePath} ${tempPath}`,
            error => {
              if (error) {
                reject(error);
                return;
              }

              // Ler arquivo e limpar
              fs.readFile(tempPath, (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  fs.unlink(tempPath, () => {});
                  exec(
                    `${this.adbPath} -s ${deviceId} shell rm ${devicePath}`,
                    () => {}
                  );
                  resolve(data);
                }
              });
            }
          );
        }
      );
    });
  }

  /**
   * Instala APK no dispositivo
   */
  async installAPK(deviceId, apkPath) {
    return new Promise((resolve, reject) => {
      this.logger.info(
        `Instalando APK ${apkPath} no dispositivo ${deviceId}...`
      );

      exec(
        `${this.adbPath} -s ${deviceId} install -r "${apkPath}"`,
        { timeout: 120000 }, // 2 minutos de timeout
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao instalar APK:', error);
            reject(error);
          } else {
            const success = stdout.includes('Success');
            resolve({
              success,
              output: stdout.trim(),
            });
          }
        }
      );
    });
  }

  /**
   * Cria backup do dispositivo
   */
  async createBackup(deviceId, options = {}) {
    return new Promise((resolve, reject) => {
      const backupDir = path.join(__dirname, '../../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(
        backupDir,
        `backup-${deviceId}-${Date.now()}.ab`
      );
      let backupCmd = `${this.adbPath} -s ${deviceId} backup -f "${backupPath}"`;

      if (options.includeApk) backupCmd += ' -apk';
      if (options.includeObb) backupCmd += ' -obb';
      if (options.includeShared) backupCmd += ' -shared';
      if (options.includeSystem) backupCmd += ' -system';
      else backupCmd += ' -nosystem';

      backupCmd += ' -all';

      this.logger.info(`Criando backup: ${backupCmd}`);

      exec(
        backupCmd,
        { timeout: 600000 }, // 10 minutos de timeout
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao criar backup:', error);
            reject(error);
          } else {
            resolve(backupPath);
          }
        }
      );
    });
  }

  /**
   * Restaura backup no dispositivo
   */
  async restoreBackup(deviceId, backupPath) {
    return new Promise((resolve, reject) => {
      this.logger.info(
        `Restaurando backup ${backupPath} no dispositivo ${deviceId}...`
      );

      exec(
        `${this.adbPath} -s ${deviceId} restore "${backupPath}"`,
        { timeout: 600000 }, // 10 minutos de timeout
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao restaurar backup:', error);
            reject(error);
          } else {
            resolve({
              success: true,
              message: 'Backup restaurado com sucesso',
            });
          }
        }
      );
    });
  }

  /**
   * Lista pacotes instalados
   */
  async getInstalledPackages(deviceId, type = 'all') {
    return new Promise((resolve, reject) => {
      let cmd = `${this.adbPath} -s ${deviceId} shell pm list packages`;

      if (type === 'system') {
        cmd += ' -s';
      } else if (type === 'third-party') {
        cmd += ' -3';
      }

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          const packages = stdout
            .split('\n')
            .filter(line => line.startsWith('package:'))
            .map(line => line.replace('package:', '').trim())
            .filter(pkg => pkg.length > 0);

          resolve(packages);
        }
      });
    });
  }

  /**
   * Desinstala pacote
   */
  async uninstallPackage(deviceId, packageName) {
    return new Promise((resolve, reject) => {
      this.logger.info(
        `Desinstalando pacote ${packageName} do dispositivo ${deviceId}...`
      );

      exec(
        `${this.adbPath} -s ${deviceId} uninstall ${packageName}`,
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error('Erro ao desinstalar pacote:', error);
            reject(error);
          } else {
            const success = stdout.includes('Success');
            resolve({
              success,
              output: stdout.trim(),
            });
          }
        }
      );
    });
  }

  /**
   * Ativa/desativa modo desenvolvedor
   */
  async setDeveloperMode(deviceId, enabled) {
    return new Promise((resolve, reject) => {
      const value = enabled ? '1' : '0';

      exec(
        `${this.adbPath} -s ${deviceId} shell settings put global development_settings_enabled ${value}`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              success: true,
              enabled,
            });
          }
        }
      );
    });
  }
}

module.exports = { AndroidDeviceManager };
