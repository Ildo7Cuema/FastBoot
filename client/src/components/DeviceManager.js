import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Info,
  Loader2,
  Power,
  RefreshCw,
  Smartphone,
  Trash2,
  XCircle,
  Camera,
  Package,
  HardDrive,
  Terminal,
} from 'lucide-react';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DeviceContext } from '../contexts/DeviceContext';
import { SocketContext } from '../contexts/SocketContext';
import { deviceAPI, fastbootAPI } from '../utils/api';

const DeviceManager = () => {
  const { devices, setDevices, selectedDevice } = useContext(DeviceContext);
  const { emit, on, off } = useContext(SocketContext);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [operations, setOperations] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [showScreenshot, setShowScreenshot] = useState(null);
  const [showPackages, setShowPackages] = useState(null);
  const [showTerminal, setShowTerminal] = useState(null);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    // Detectar dispositivos ao montar o componente
    detectDevices();

    // Listeners para eventos de dispositivos
    const handleOperationProgress = data => {
      setOperations(prev => ({
        ...prev,
        [data.deviceId]: {
          ...prev[data.deviceId],
          ...data,
        },
      }));
    };

    const handleOperationComplete = data => {
      setOperations(prev => {
        const newOps = { ...prev };
        delete newOps[data.deviceId];
        return newOps;
      });

      if (data.success) {
        toast.success(`Operação concluída: ${data.message}`);
      } else {
        toast.error(`Erro na operação: ${data.error}`);
      }
    };

    on('operation-progress', handleOperationProgress);
    on('operation-complete', handleOperationComplete);

    // Listener para atualizações automáticas de dispositivos
    const handleDevicesUpdate = data => {
      if (data.devices) {
        setDevices(data.devices);
      }
    };

    on('devices-update', handleDevicesUpdate);

    return () => {
      off('operation-progress', handleOperationProgress);
      off('operation-complete', handleOperationComplete);
      off('devices-update', handleDevicesUpdate);
    };
  }, [on, off]);

  const detectDevices = async () => {
    setDetecting(true);
    try {
      const response = await deviceAPI.detect();
      setDevices(response.data.devices || []);

      if (response.data.devices.length === 0) {
        toast.info('Nenhum dispositivo encontrado. Verifique as conexões USB.');
      } else {
        toast.success(
          `${response.data.devices.length} dispositivo(s) detectado(s)`
        );
      }
    } catch (error) {
      console.error('Erro ao detectar dispositivos:', error);
      if (error.response?.status === 503) {
        toast.error(
          'ADB não está instalado. Instale o Android SDK Platform Tools.',
          { duration: 5000 }
        );
      } else {
        toast.error('Erro ao detectar dispositivos');
      }
    } finally {
      setDetecting(false);
    }
  };

  const getDeviceInfo = async deviceId => {
    try {
      setLoading(true);
      const response = await deviceAPI.getInfo(deviceId);
      setDeviceInfo(prev => ({
        ...prev,
        [deviceId]: response.data,
      }));
      toast.success('Informações do dispositivo atualizadas');
    } catch (error) {
      console.error('Erro ao obter informações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async device => {
    setShowConfirmDialog(null);

    try {
      setOperations(prev => ({
        ...prev,
        [device.id]: {
          type: 'factory-reset',
          status: 'starting',
          progress: 0,
        },
      }));

      const response = await fastbootAPI.factoryReset(device.id);

      if (response.data.success) {
        toast.success('Factory reset iniciado');
      }
    } catch (error) {
      setOperations(prev => {
        const newOps = { ...prev };
        delete newOps[device.id];
        return newOps;
      });
      console.error('Erro ao executar factory reset:', error);
    }
  };

  const handleReboot = async (deviceId, mode = 'normal') => {
    try {
      setOperations(prev => ({
        ...prev,
        [deviceId]: { type: 'reboot', status: 'starting' },
      }));

      let response;
      if (mode === 'bootloader') {
        response = await deviceAPI.rebootToBootloader(deviceId);
      } else {
        response = await deviceAPI.reboot(deviceId);
      }

      if (response.data.success) {
        toast.success(
          `Reiniciando dispositivo ${
            mode === 'bootloader' ? 'em modo bootloader' : ''
          }`
        );
      }
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
    } finally {
      setTimeout(() => {
        setOperations(prev => {
          const newOps = { ...prev };
          delete newOps[deviceId];
          return newOps;
        });
      }, 2000);
    }
  };

  const handleClearCache = async deviceId => {
    try {
      setOperations(prev => ({
        ...prev,
        [deviceId]: { type: 'clear-cache', status: 'starting' },
      }));

      const response = await fastbootAPI.clearCache(deviceId);

      if (response.data.success) {
        toast.success('Cache limpo com sucesso');
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast.error('Erro ao limpar cache. Verifique se o dispositivo está em modo fastboot.');
    } finally {
      setTimeout(() => {
        setOperations(prev => {
          const newOps = { ...prev };
          delete newOps[deviceId];
          return newOps;
        });
      }, 2000);
    }
  };

  const getStatusIcon = device => {
    if (operations[device.id]) {
      return <Loader2 className='h-5 w-5 animate-spin text-blue-500' />;
    }

    if (device.connected) {
      return <CheckCircle className='h-5 w-5 text-green-500' />;
    }

    return <XCircle className='h-5 w-5 text-red-500' />;
  };

  const getStatusText = device => {
    if (operations[device.id]) {
      const op = operations[device.id];
      return `${op.type} - ${op.status} ${
        op.progress ? `(${op.progress}%)` : ''
      }`;
    }

    return device.connected ? 'Conectado' : 'Desconectado';
  };

  const handleScreenshot = async deviceId => {
    try {
      setOperations(prev => ({
        ...prev,
        [deviceId]: { type: 'screenshot', status: 'capturing' },
      }));

      const response = await deviceAPI.screenshot(deviceId);
      
      if (response.data.success) {
        setShowScreenshot({
          deviceId,
          image: `data:${response.data.mimeType};base64,${response.data.data}`,
        });
        toast.success('Screenshot capturado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao capturar screenshot:', error);
      toast.error('Erro ao capturar screenshot');
    } finally {
      setOperations(prev => {
        const newOps = { ...prev };
        delete newOps[deviceId];
        return newOps;
      });
    }
  };

  const handleListPackages = async deviceId => {
    try {
      setLoading(true);
      const response = await deviceAPI.packages(deviceId);
      setPackages(response.data.packages || []);
      setShowPackages(deviceId);
    } catch (error) {
      console.error('Erro ao listar pacotes:', error);
      toast.error('Erro ao listar pacotes');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstallPackage = async (deviceId, packageName) => {
    try {
      const response = await deviceAPI.uninstall(deviceId, packageName);
      if (response.data.success) {
        toast.success(`Pacote ${packageName} desinstalado com sucesso`);
        // Recarregar lista de pacotes
        handleListPackages(deviceId);
      }
    } catch (error) {
      console.error('Erro ao desinstalar pacote:', error);
      toast.error('Erro ao desinstalar pacote');
    }
  };

  const handleExecuteCommand = async (deviceId, command) => {
    try {
      const response = await deviceAPI.command(deviceId, command);
      return response.data;
    } catch (error) {
      console.error('Erro ao executar comando:', error);
      toast.error('Erro ao executar comando');
      throw error;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Gerenciador de Dispositivos
            </h2>
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
              Gerencie e execute operações em dispositivos Android conectados
            </p>
          </div>

          <button
            onClick={detectDevices}
            disabled={detecting}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {detecting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Detectando...
              </>
            ) : (
              <>
                <RefreshCw className='mr-2 h-4 w-4' />
                Detectar Dispositivos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Device List */}
      {devices.length === 0 ? (
        <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-12'>
          <div className='text-center'>
            <Smartphone className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
              Nenhum dispositivo detectado
            </h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Conecte um dispositivo Android via USB e habilite a depuração USB
            </p>
            <div className='mt-6'>
              <button
                onClick={detectDevices}
                className='inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-2 xl:grid-cols-3'>
          {devices.map(device => (
            <div
              key={device.id}
              className='bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden'
            >
              {/* Device Header */}
              <div className='px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <Smartphone className='h-8 w-8 mr-3' />
                    <div>
                      <h3 className='text-lg font-semibold'>
                        {device.model || 'Dispositivo Android'}
                      </h3>
                      <p className='text-sm opacity-90'>
                        {device.manufacturer || 'Fabricante'}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(device)}
                </div>
              </div>

              {/* Device Info */}
              <div className='px-6 py-4'>
                <dl className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <dt className='text-gray-600 dark:text-gray-400'>ID:</dt>
                    <dd className='font-mono text-gray-900 dark:text-white'>
                      {device.id}
                    </dd>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <dt className='text-gray-600 dark:text-gray-400'>
                      Android:
                    </dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {device.androidVersion || 'N/A'}
                    </dd>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <dt className='text-gray-600 dark:text-gray-400'>
                      Status:
                    </dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {getStatusText(device)}
                    </dd>
                  </div>
                  {deviceInfo[device.id]?.batteryInfo && (
                    <div className='flex justify-between text-sm'>
                      <dt className='text-gray-600 dark:text-gray-400'>
                        Bateria:
                      </dt>
                      <dd className='text-gray-900 dark:text-white'>
                        {deviceInfo[device.id].batteryInfo.level}%
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Device Actions */}
              <div className='px-6 py-4 bg-gray-50 dark:bg-gray-700 space-y-2'>
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={() => getDeviceInfo(device.id)}
                    disabled={
                      !device.connected || loading || operations[device.id]
                    }
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Info className='h-4 w-4 mr-1' />
                    Info
                  </button>

                  <button
                    onClick={() => handleReboot(device.id)}
                    disabled={!device.connected || operations[device.id]}
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Power className='h-4 w-4 mr-1' />
                    Reiniciar
                  </button>

                  <button
                    onClick={() => handleScreenshot(device.id)}
                    disabled={!device.connected || operations[device.id]}
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Camera className='h-4 w-4 mr-1' />
                    Screenshot
                  </button>

                  <button
                    onClick={() => handleListPackages(device.id)}
                    disabled={!device.connected || operations[device.id]}
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Package className='h-4 w-4 mr-1' />
                    Apps
                  </button>

                  <button
                    onClick={() => setShowTerminal(device.id)}
                    disabled={!device.connected || operations[device.id]}
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Terminal className='h-4 w-4 mr-1' />
                    Terminal
                  </button>

                  <button
                    onClick={() => handleReboot(device.id, 'bootloader')}
                    disabled={!device.connected || operations[device.id]}
                    className='inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Download className='h-4 w-4 mr-1' />
                    Bootloader
                  </button>
                </div>

                <button
                  onClick={() => setShowConfirmDialog(device)}
                  disabled={!device.connected || operations[device.id]}
                  className='w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Factory Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className='fixed z-10 inset-0 overflow-y-auto'>
          <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div
              className='fixed inset-0 transition-opacity'
              aria-hidden='true'
            >
              <div className='absolute inset-0 bg-gray-500 opacity-75'></div>
            </div>

            <span
              className='hidden sm:inline-block sm:align-middle sm:h-screen'
              aria-hidden='true'
            >
              &#8203;
            </span>

            <div className='inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
              <div className='bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <div className='sm:flex sm:items-start'>
                  <div className='mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10'>
                    <AlertTriangle className='h-6 w-6 text-red-600 dark:text-red-400' />
                  </div>
                  <div className='mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left'>
                    <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white'>
                      Confirmar Factory Reset
                    </h3>
                    <div className='mt-2'>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Tem certeza que deseja executar factory reset no
                        dispositivo{' '}
                        <span className='font-semibold'>
                          {showConfirmDialog.model}
                        </span>
                        ?
                      </p>
                      <p className='mt-2 text-sm text-red-600 dark:text-red-400 font-semibold'>
                        Esta ação é IRREVERSÍVEL e todos os dados serão
                        perdidos!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <button
                  onClick={() => handleFactoryReset(showConfirmDialog)}
                  className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Confirmar Factory Reset
                </button>
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshot && (
        <div className='fixed z-10 inset-0 overflow-y-auto'>
          <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
              <div className='absolute inset-0 bg-gray-500 opacity-75'></div>
            </div>

            <div className='inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'>
              <div className='bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <div className='sm:flex sm:items-start'>
                  <div className='mt-3 text-center sm:mt-0 sm:text-left w-full'>
                    <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4'>
                      Screenshot do Dispositivo
                    </h3>
                    <div className='mt-2'>
                      <img
                        src={showScreenshot.image}
                        alt='Device screenshot'
                        className='max-w-full h-auto mx-auto'
                        style={{ maxHeight: '70vh' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <a
                  href={showScreenshot.image}
                  download={`screenshot-${showScreenshot.deviceId}-${Date.now()}.png`}
                  className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Baixar
                </a>
                <button
                  onClick={() => setShowScreenshot(null)}
                  className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages Modal */}
      {showPackages && (
        <div className='fixed z-10 inset-0 overflow-y-auto'>
          <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
              <div className='absolute inset-0 bg-gray-500 opacity-75'></div>
            </div>

            <div className='inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'>
              <div className='bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <div className='sm:flex sm:items-start'>
                  <div className='mt-3 text-center sm:mt-0 sm:text-left w-full'>
                    <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4'>
                      Aplicativos Instalados
                    </h3>
                    <div className='mt-2 max-h-96 overflow-y-auto'>
                      {loading ? (
                        <div className='flex justify-center py-8'>
                          <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
                        </div>
                      ) : (
                        <div className='space-y-2'>
                          {packages.map(pkg => (
                            <div
                              key={pkg}
                              className='flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                            >
                              <span className='text-sm font-mono text-gray-700 dark:text-gray-300'>
                                {pkg}
                              </span>
                              <button
                                onClick={() => handleUninstallPackage(showPackages, pkg)}
                                className='text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                                title='Desinstalar'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <button
                  onClick={() => setShowPackages(null)}
                  className='w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {showTerminal && (
        <div className='fixed z-10 inset-0 overflow-y-auto'>
          <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
              <div className='absolute inset-0 bg-gray-500 opacity-75'></div>
            </div>

            <div className='inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'>
              <div className='bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <div className='sm:flex sm:items-start'>
                  <div className='mt-3 text-center sm:mt-0 sm:text-left w-full'>
                    <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4'>
                      Terminal ADB - Dispositivo {showTerminal}
                    </h3>
                    <div className='mt-2'>
                      <div className='bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto'>
                        <div className='mb-2'>$ adb -s {showTerminal} shell</div>
                        <input
                          type='text'
                          className='bg-transparent border-none outline-none w-full text-green-400'
                          placeholder='Digite um comando...'
                          onKeyPress={async (e) => {
                            if (e.key === 'Enter') {
                              const command = e.target.value;
                              e.target.value = '';
                              try {
                                const result = await handleExecuteCommand(showTerminal, command);
                                console.log(result);
                              } catch (error) {
                                console.error(error);
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <button
                  onClick={() => setShowTerminal(null)}
                  className='w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;
