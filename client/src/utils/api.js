import axios from 'axios';
import toast from 'react-hot-toast';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Erro de resposta do servidor
      switch (error.response.status) {
        case 401:
          // Token inválido ou expirado
          localStorage.removeItem('token');
          window.location.href = '/login';
          toast.error('Sessão expirada. Por favor, faça login novamente.');
          break;
        case 403:
          toast.error('Você não tem permissão para executar esta ação.');
          break;
        case 404:
          toast.error('Recurso não encontrado.');
          break;
        case 429:
          toast.error('Muitas requisições. Por favor, aguarde um momento.');
          break;
        case 500:
          toast.error('Erro interno do servidor. Por favor, tente novamente.');
          break;
        default:
          toast.error(error.response.data.message || 'Erro ao processar requisição.');
      }
    } else if (error.request) {
      // Erro de requisição (sem resposta)
      toast.error('Erro de conexão com o servidor.');
    } else {
      // Erro de configuração
      toast.error('Erro ao configurar requisição.');
    }
    return Promise.reject(error);
  }
);

// Funções de API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const deviceAPI = {
  list: () => api.get('/devices'),
  detect: () => api.post('/devices/detect'),
  getInfo: (deviceId) => api.get(`/devices/${deviceId}`),
  rebootToBootloader: (deviceId) => api.post(`/devices/${deviceId}/reboot-bootloader`),
  reboot: (deviceId) => api.post(`/devices/${deviceId}/reboot`),
};

export const fastbootAPI = {
  factoryReset: (deviceId) => api.post('/fastboot/factory-reset', { deviceId }),
  reboot: (deviceId) => api.post('/fastboot/reboot', { deviceId }),
  clearCache: (deviceId) => api.post('/fastboot/clear-cache', { deviceId }),
  getStatus: () => api.get('/fastboot/status'),
  flashImage: (deviceId, formData) => 
    api.post(`/fastboot/flash/${deviceId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const logsAPI = {
  get: (params) => api.get('/logs', { params }),
  clear: () => api.delete('/logs'),
  export: () => api.get('/logs/export', { responseType: 'blob' }),
  stream: () => api.get('/logs/stream'),
};

export const systemAPI = {
  health: () => api.get('/health'),
  stats: () => api.get('/system/stats'),
  backup: () => api.post('/system/backup'),
  restore: (backupId) => api.post(`/system/restore/${backupId}`),
};

export default api;