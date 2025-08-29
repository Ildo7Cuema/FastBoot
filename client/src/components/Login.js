import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { LogIn, User, Lock, AlertCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    // Verificar se há mensagem de sessão expirada
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      toast.error('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({ username, password });
      const { token, refreshToken, user, expiresIn } = response.data;
      
      // Salvar refresh token também
      localStorage.setItem('refreshToken', refreshToken);
      
      // Configurar auto-renovação do token
      const expirationTime = parseExpirationTime(expiresIn);
      if (expirationTime > 0) {
        setTimeout(() => {
          renewToken();
        }, expirationTime - 60000); // Renovar 1 minuto antes de expirar
      }

      login(user, token);
      toast.success(`Bem-vindo de volta, ${user.username}!`);
      navigate('/');
    } catch (error) {
      const errorData = error.response?.data;
      
      if (errorData?.remainingAttempts !== undefined) {
        setRemainingAttempts(errorData.remainingAttempts);
        if (errorData.remainingAttempts === 0) {
          toast.error('Conta bloqueada. Tente novamente mais tarde.');
        } else {
          toast.error(`Credenciais inválidas. ${errorData.remainingAttempts} tentativas restantes.`);
        }
      } else if (error.response?.status === 429) {
        toast.error(errorData?.error || 'Muitas tentativas. Tente novamente mais tarde.');
      } else {
        toast.error(errorData?.error || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const parseExpirationTime = (expiresIn) => {
    const match = expiresIn.match(/^(\d+)([hdm])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return 0;
    }
  };

  const renewToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return;

      const response = await authAPI.refresh({ refreshToken });
      const { token, expiresIn } = response.data;
      
      localStorage.setItem('token', token);
      
      // Configurar próxima renovação
      const expirationTime = parseExpirationTime(expiresIn);
      if (expirationTime > 0) {
        setTimeout(() => {
          renewToken();
        }, expirationTime - 60000);
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      // Se falhar, redirecionar para login
      window.location.href = '/login?expired=true';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            FastBoot System
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistema de Restauração de Dispositivos Android
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Campo de Usuário */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuário
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Digite seu usuário"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>
              </div>
            </div>

            {/* Alertas */}
            {remainingAttempts !== null && remainingAttempts < 3 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Atenção: {remainingAttempts} tentativas restantes antes do bloqueio.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Login */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Entrar
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Informações de Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Credenciais padrão
                </span>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Usuário: <span className="font-mono font-semibold">admin</span></p>
              <p>Senha: <span className="font-mono font-semibold">admin123</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          &copy; 2024 FastBoot System. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;