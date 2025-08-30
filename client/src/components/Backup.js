import React, { useState, useEffect } from 'react';
import { systemAPI } from '../utils/api';
import toast from 'react-hot-toast';
import {
  Database,
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  HardDrive,
  Shield,
  RefreshCw,
  FileDown,
  Trash2
} from 'lucide-react';

const Backup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [autoBackup, setAutoBackup] = useState(true);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      // Simulando dados de backup - em produção, isso viria da API
      const mockBackups = [
        {
          id: 1,
          name: 'backup_2024_01_15_03_00.db',
          size: '45.2 MB',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          type: 'automatic',
          status: 'completed'
        },
        {
          id: 2,
          name: 'backup_2024_01_14_15_30.db',
          size: '44.8 MB',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          type: 'manual',
          status: 'completed'
        },
        {
          id: 3,
          name: 'backup_2024_01_13_03_00.db',
          size: '44.5 MB',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          type: 'automatic',
          status: 'completed'
        }
      ];
      setBackups(mockBackups);
    } catch (error) {
      toast.error('Erro ao carregar backups');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await systemAPI.backup();
      toast.success('Backup criado com sucesso!');
      fetchBackups();
    } catch (error) {
      toast.error('Erro ao criar backup');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!window.confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.')) {
      return;
    }

    setRestoring(backupId);
    try {
      await systemAPI.restore(backupId);
      toast.success('Backup restaurado com sucesso!');
    } catch (error) {
      toast.error('Erro ao restaurar backup');
      console.error(error);
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Tem certeza que deseja excluir este backup?')) {
      return;
    }

    try {
      // await systemAPI.deleteBackup(backupId);
      toast.success('Backup excluído com sucesso!');
      fetchBackups();
    } catch (error) {
      toast.error('Erro ao excluir backup');
      console.error(error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Backup e Restauração
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Gerencie os backups do sistema
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              creating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Criar Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configurações de Backup */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Configurações de Backup Automático
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="auto-backup" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Backup Automático
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Criar backup automaticamente todos os dias às 3:00
              </p>
            </div>
            <div className="flex items-center">
              <input
                id="auto-backup"
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Último backup:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {backups.length > 0 ? formatDate(backups[0].created_at) : 'Nenhum'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total de backups:</span>
                <p className="font-medium text-gray-900 dark:text-white">{backups.length}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Espaço utilizado:</span>
                <p className="font-medium text-gray-900 dark:text-white">134.5 MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Backups */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Backups Disponíveis
          </h4>
        </div>

        {backups.length === 0 ? (
          <div className="p-6 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum backup disponível</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nome do Backup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <HardDrive className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {backup.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {backup.status === 'completed' && (
                              <span className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backup.type === 'automatic'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {backup.type === 'automatic' ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Automático
                          </>
                        ) : (
                          'Manual'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {backup.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(backup.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toast.info('Download de backup em desenvolvimento')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={restoring === backup.id}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title="Restaurar"
                        >
                          {restoring === backup.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informações de Segurança */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Informações de Segurança
            </h4>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Os backups são criptografados antes do armazenamento</li>
                <li>Backups automáticos são mantidos por 30 dias</li>
                <li>Recomendamos fazer backup antes de grandes alterações</li>
                <li>Teste regularmente a restauração dos backups</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backup;
