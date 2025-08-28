import React, { useState, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useSocket } from '../contexts/SocketContext';
import { Smartphone, RefreshCw, AlertTriangle, CheckCircle, XCircle, Power, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DeviceManager = () => {
  const { devices, setDevices } = useDevices();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [operationInProgress, setOperationInProgress] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.emit('detect-devices');
      
      socket.on('devices-detected', (data) => {
        if (data.success) {
          setDevices(data.devices);
        } else {
          toast.error('Erro ao detectar dispositivos: ' + data.error);
        }
      });

      socket.on('factory-reset-result', (data) => {
        setOperationInProgress(false);
        if (data.success) {
          toast.success('Factory reset concluído com sucesso!');
        } else {
          toast.error('Erro no factory reset: ' + data.error);
        }
      });
    }
  }, [socket, setDevices]);

  const detectDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/devices/detect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices);
        toast.success(`${data.devices.length} dispositivo(s) detectado(s)`);
      } else {
        toast.error('Erro ao detectar dispositivos');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async (deviceId) => {
    if (!confirm('⚠️ ATENÇÃO: Esta operação irá apagar TODOS os dados do dispositivo!\n\nTem certeza que deseja continuar?')) {
      return;
    }

    setOperationInProgress(true);
    try {
      const response = await fetch('/api/fastboot/factory-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ deviceId }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Factory reset iniciado com sucesso!');
      } else {
        toast.error('Erro ao iniciar factory reset: ' + data.error);
        setOperationInProgress(false);
      }
    } catch (error) {
      toast.error('Erro de conexão');
      setOperationInProgress(false);
    }
  };

  const handleReboot = async (deviceId) => {
    try {
      const response = await fetch('/api/fastboot/reboot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ deviceId }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Reinicialização iniciada!');
      } else {
        toast.error('Erro ao reiniciar: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const handleClearCache = async (deviceId) => {
    try {
      const response = await fetch('/api/fastboot/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ deviceId }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Cache limpo com sucesso!');
      } else {
        toast.error('Erro ao limpar cache: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const getDeviceStatusIcon = (status) => {
    switch (status) {
      case 'device':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'recovery':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'bootloader':
        return <Power className="h-5 w-5 text-primary-500" />;
      default:
        return <XCircle className="h-5 w-5 text-danger-500" />;
    }
  };

  const getDeviceStatusText = (status) => {
    switch (status) {
      case 'device':
        return 'Conectado';
      case 'recovery':
        return 'Modo Recovery';
      case 'bootloader':
        return 'Modo Bootloader';
      default:
        return 'Desconectado';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gerenciamento de Dispositivos
        </h2>
        <button
          onClick={detectDevices}
          disabled={loading || operationInProgress}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Detectar Dispositivos</span>
        </button>
      </div>

      {/* Status do ADB */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Status do Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${socket ? 'bg-success-500' : 'bg-danger-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              WebSocket: {socket ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ADB: Disponível
            </span>
          </div>
        </div>
      </div>

      {/* Lista de dispositivos */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Dispositivos Conectados ({devices.length})
        </h3>
        
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhum dispositivo detectado
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Conecte um dispositivo Android via USB e clique em "Detectar Dispositivos"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-8 w-8 text-primary-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {device.model || 'Dispositivo Android'}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {getDeviceStatusIcon(device.status)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getDeviceStatusText(device.status)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          • {device.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleReboot(device.id)}
                      disabled={operationInProgress}
                      className="btn-secondary flex items-center space-x-1"
                      title="Reiniciar dispositivo"
                    >
                      <Power className="h-4 w-4" />
                      <span>Reiniciar</span>
                    </button>
                    
                    <button
                      onClick={() => handleClearCache(device.id)}
                      disabled={operationInProgress}
                      className="btn-secondary flex items-center space-x-1"
                      title="Limpar cache"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Limpar Cache</span>
                    </button>
                    
                    <button
                      onClick={() => handleFactoryReset(device.id)}
                      disabled={operationInProgress}
                      className="btn-danger flex items-center space-x-1"
                      title="Restaurar fábrica"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Factory Reset</span>
                    </button>
                  </div>
                </div>
                
                {device.info && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Fabricante:</span>
                        <p className="text-gray-900 dark:text-white">{device.info.manufacturer || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Modelo:</span>
                        <p className="text-gray-900 dark:text-white">{device.info.model || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Android:</span>
                        <p className="text-gray-900 dark:text-white">{device.info.androidVersion || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <p className="text-gray-900 dark:text-white">{device.status}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aviso de segurança */}
      <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Aviso de Segurança
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              O Factory Reset irá apagar TODOS os dados do dispositivo Android, incluindo aplicativos, 
              fotos, vídeos e configurações. Esta operação é irreversível. Certifique-se de fazer backup 
              de todos os dados importantes antes de prosseguir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManager;
