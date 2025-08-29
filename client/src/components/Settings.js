import React, { useState, useContext } from 'react';
import { Save, Key, Bell, Shield, Database, Download } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { authAPI, systemAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      deviceConnected: true,
      deviceDisconnected: true,
      operationComplete: true,
      errors: true,
    },
    security: {
      sessionTimeout: '24h',
      twoFactorAuth: false,
      ipWhitelist: '',
    }
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      toast.success('Senha alterada com sucesso');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key) => {
    setFormData({
      ...formData,
      notifications: {
        ...formData.notifications,
        [key]: !formData.notifications[key],
      },
    });
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const response = await systemAPI.backup();
      toast.success('Backup criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: Key },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'system', label: 'Sistema', icon: Database },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Configurações
      </h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`
                -ml-0.5 mr-2 h-5 w-5
                ${activeTab === tab.id
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-400 group-hover:text-gray-500'
                }
              `} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Informações do Perfil
          </h2>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Nome de usuário</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{user?.username}</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">
              Alterar Senha
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Preferências de Notificação
          </h2>
          
          <div className="space-y-4">
            {Object.entries(formData.notifications).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700 dark:text-gray-300">
                  {key === 'deviceConnected' && 'Dispositivo Conectado'}
                  {key === 'deviceDisconnected' && 'Dispositivo Desconectado'}
                  {key === 'operationComplete' && 'Operação Concluída'}
                  {key === 'errors' && 'Erros e Avisos'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleNotificationChange(key)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Configurações de Segurança
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tempo de Sessão
              </label>
              <select
                value={formData.security.sessionTimeout}
                onChange={(e) => setFormData({
                  ...formData,
                  security: { ...formData.security, sessionTimeout: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="1h">1 hora</option>
                <option value="4h">4 horas</option>
                <option value="8h">8 horas</option>
                <option value="24h">24 horas</option>
                <option value="7d">7 dias</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.security.twoFactorAuth}
                onChange={(e) => setFormData({
                  ...formData,
                  security: { ...formData.security, twoFactorAuth: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Habilitar Autenticação de Dois Fatores
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lista de IPs Permitidos (um por linha)
              </label>
              <textarea
                value={formData.security.ipWhitelist}
                onChange={(e) => setFormData({
                  ...formData,
                  security: { ...formData.security, ipWhitelist: e.target.value }
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="192.168.1.1&#10;10.0.0.0/24"
              />
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Configurações do Sistema
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Informações do Sistema
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Versão: 1.0.0</p>
                <p>Node.js: {process.version}</p>
                <p>Ambiente: {process.env.NODE_ENV}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBackup}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4" />
                Criar Backup
              </button>

              <button
                onClick={() => toast.info('Exportação de logs em desenvolvimento')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;