import React, { useState, useEffect, useContext, useRef } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { logsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';

const LogsViewer = () => {
  const { on, off } = useContext(SocketContext);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('today');
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  const logLevels = {
    DEBUG: { color: 'text-gray-500 dark:text-gray-400', icon: Info },
    INFO: { color: 'text-blue-600 dark:text-blue-400', icon: Info },
    WARN: { color: 'text-yellow-600 dark:text-yellow-400', icon: AlertTriangle },
    ERROR: { color: 'text-red-600 dark:text-red-400', icon: XCircle }
  };

  useEffect(() => {
    fetchLogs();

    const handleNewLog = (newLog) => {
      setLogs(prev => [...prev, newLog]);
    };

    const handleLogsUpdate = (newLogs) => {
      setLogs(prev => {
        const existingIds = new Set(prev.map(log => log.id || log.timestamp));
        const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id || log.timestamp));
        return [...prev, ...uniqueNewLogs];
      });
    };

    on('new-log', handleNewLog);
    on('logs-update', handleLogsUpdate);

    return () => {
      off('new-log', handleNewLog);
      off('logs-update', handleLogsUpdate);
    };
  }, [on, off]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, levelFilter, dateFilter]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await logsAPI.get({
        level: levelFilter !== 'ALL' ? levelFilter : undefined,
        date: dateFilter
      });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filtro por nível
    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.context?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por data
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  const handleExport = async () => {
    try {
      const response = await logsAPI.export();
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Logs exportados com sucesso');
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todos os logs?')) {
      return;
    }

    try {
      await logsAPI.clear();
      setLogs([]);
      setFilteredLogs([]);
      toast.success('Logs limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
    }
  };

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (!isNearBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isNearBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getLevelIcon = (level) => {
    const Icon = logLevels[level]?.icon || Info;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visualizador de Logs
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Monitore todas as operações do sistema em tempo real
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                autoScroll
                  ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
              }`}
            >
              {autoScroll ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Auto-scroll ON
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Auto-scroll OFF
                </>
              )}
            </button>
            
            <button
              onClick={fetchLogs}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </button>
            
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </button>
            
            <button
              onClick={handleClear}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nos logs..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="ALL">Todos os níveis</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Hoje</option>
            <option value="week">Última semana</option>
            <option value="month">Último mês</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredLogs.length} logs encontrados
            </span>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span> Debug
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span> Info
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span> Warning
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span> Error
              </span>
            </div>
          </div>
        </div>

        <div
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Carregando logs...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum log encontrado
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id || index}
                  className="flex items-start space-x-3 text-sm font-mono"
                >
                  <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <div className={`flex items-center ${logLevels[log.level]?.color}`}>
                    {getLevelIcon(log.level)}
                    <span className="ml-1 font-semibold">[{log.level}]</span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 break-all">
                    {log.message}
                    {log.context && (
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        [{log.context}]
                      </span>
                    )}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsViewer;