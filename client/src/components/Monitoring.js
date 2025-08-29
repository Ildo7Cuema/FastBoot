import React, { useState, useEffect } from 'react';
import { systemAPI } from '../utils/api';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';

const Monitoring = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSystemStats, 5000); // Atualiza a cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemStats = async () => {
    try {
      const response = await systemAPI.stats();
      setSystemStats(response.data);
      setError(null);
    } catch (error) {
      setError('Erro ao carregar estatísticas do sistema');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.critical) return 'text-red-600 dark:text-red-400';
    if (value >= thresholds.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = (value, thresholds) => {
    if (value >= thresholds.critical) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading && !systemStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !systemStats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
              Erro ao carregar monitoramento
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Dados de exemplo se não houver dados reais
  const stats = systemStats || {
    cpu: { usage: 45, cores: 4, model: 'Intel Core i5' },
    memory: { used: 8.5, total: 16, percentage: 53 },
    disk: { used: 120, total: 500, percentage: 24 },
    network: { in: 124, out: 89 },
    uptime: 259200, // 3 dias em segundos
    processes: { total: 178, running: 5 }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Monitoramento do Sistema
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Estatísticas em tempo real do servidor
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Atualização automática
              </span>
            </label>
            <button
              onClick={fetchSystemStats}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Atualizar agora"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Cpu className="h-6 w-6 text-blue-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">CPU</h4>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(stats.cpu.usage, { warning: 70, critical: 90 })}`}>
              {stats.cpu.usage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(stats.cpu.usage, { warning: 70, critical: 90 })}`}
              style={{ width: `${stats.cpu.usage}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {stats.cpu.cores} cores • {stats.cpu.model}
          </p>
        </div>

        {/* Memória */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Server className="h-6 w-6 text-green-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Memória</h4>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(stats.memory.percentage, { warning: 75, critical: 90 })}`}>
              {stats.memory.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(stats.memory.percentage, { warning: 75, critical: 90 })}`}
              style={{ width: `${stats.memory.percentage}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {stats.memory.used.toFixed(1)}GB / {stats.memory.total}GB
          </p>
        </div>

        {/* Disco */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="h-6 w-6 text-purple-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Disco</h4>
            </div>
            <span className={`text-2xl font-bold ${getStatusColor(stats.disk.percentage, { warning: 80, critical: 95 })}`}>
              {stats.disk.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(stats.disk.percentage, { warning: 80, critical: 95 })}`}
              style={{ width: `${stats.disk.percentage}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {stats.disk.used}GB / {stats.disk.total}GB
          </p>
        </div>

        {/* Uptime */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-orange-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Uptime</h4>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatUptime(stats.uptime)}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Sistema online
          </p>
        </div>
      </div>

      {/* Gráficos e Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rede */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Wifi className="h-6 w-6 text-blue-600 mr-2" />
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Tráfego de Rede
            </h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Download</span>
              </div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {stats.network.in} MB/s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Upload</span>
              </div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {stats.network.out} MB/s
              </span>
            </div>
          </div>
        </div>

        {/* Processos */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600 mr-2" />
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Processos
            </h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total de processos</span>
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {stats.processes.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Em execução</span>
              <span className="text-lg font-medium text-green-600 dark:text-green-400">
                {stats.processes.running}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
          <div>
            <h4 className="text-md font-medium text-green-900 dark:text-green-200">
              Sistema Operacional
            </h4>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Todos os serviços estão funcionando normalmente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;