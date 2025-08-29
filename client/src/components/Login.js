import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, User, Lock, Loader2, Shield, AlertCircle } from 'lucide-react';

const Login = () => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
        // Limpar erro do campo quando o usuário começar a digitar
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!credentials.username.trim()) {
            newErrors.username = 'O campo utilizador é obrigatório';
        } else if (credentials.username.length < 3) {
            newErrors.username = 'O utilizador deve ter pelo menos 3 caracteres';
        }
        
        if (!credentials.password) {
            newErrors.password = 'O campo senha é obrigatório';
        } else if (credentials.password.length < 6) {
            newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);

        try {
            const response = await authAPI.login(credentials);
            
            if (response.data.accessToken) {
                localStorage.setItem('token', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                login(response.data.user, response.data.accessToken);
                toast.success('Login realizado com sucesso!');
                navigate('/dashboard');
            }
        } catch (error) {
            if (error.response) {
                const { status, data } = error.response;
                
                if (status === 401) {
                    setErrors({ general: 'Utilizador ou senha incorretos' });
                    if (data.remainingAttempts) {
                        toast.error(`Tentativas restantes: ${data.remainingAttempts}`);
                    }
                } else if (status === 429) {
                    setErrors({ general: data.message || 'Conta temporariamente bloqueada' });
                    toast.error(data.message);
                } else {
                    setErrors({ general: data.error || 'Erro ao fazer login' });
                }
            } else {
                setErrors({ general: 'Erro de conexão com o servidor' });
                toast.error('Erro de conexão. Verifique sua internet.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Logo e Título */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-200">
                        <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        Bem-vindo de volta
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Entre com suas credenciais para acessar o sistema
                    </p>
                </div>

                {/* Card do Formulário */}
                <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Erro Geral */}
                        {errors.general && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                            </div>
                        )}

                        {/* Campo Utilizador */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Utilizador
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
                                    className={`appearance-none block w-full pl-10 pr-3 py-2.5 border ${
                                        errors.username 
                                            ? 'border-red-300 dark:border-red-600' 
                                            : 'border-gray-300 dark:border-gray-600'
                                    } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200`}
                                    placeholder="Digite seu utilizador"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Campo Senha */}
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
                                    className={`appearance-none block w-full pl-10 pr-10 py-2.5 border ${
                                        errors.password 
                                            ? 'border-red-300 dark:border-red-600' 
                                            : 'border-gray-300 dark:border-gray-600'
                                    } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200`}
                                    placeholder="Digite sua senha"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                            )}
                        </div>

                        {/* Links auxiliares */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Lembrar-me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Esqueceu a senha?
                                </a>
                            </div>
                        </div>

                        {/* Botão de Login */}
                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                                    isLoading 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                } shadow-lg transform transition-all duration-200 ${
                                    !isLoading && 'hover:scale-[1.02] hover:shadow-xl'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                        Entrando...
                                    </>
                                ) : (
                                    'Entrar'
                                )}
                            </button>
                        </div>

                        {/* Divisor */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Novo por aqui?</span>
                            </div>
                        </div>

                        {/* Link para criar conta */}
                        <div>
                            <button
                                type="button"
                                className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                onClick={() => toast.info('Entre em contato com o administrador para criar uma conta')}
                            >
                                Solicitar Acesso
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Protegido por criptografia de ponta a ponta
                </p>
            </div>
        </div>
    );
};

export default Login;