import { Eye, EyeOff, Info, Key, RefreshCw, Save, Shield } from 'lucide-react';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';

const Security = () => {
  const { user } = useContext(AuthContext);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
  });

  const checkPasswordStrength = password => {
    let score = 0;
    let message = '';

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        message = 'Muito fraca';
        break;
      case 2:
        message = 'Fraca';
        break;
      case 3:
        message = 'Média';
        break;
      case 4:
        message = 'Forte';
        break;
      case 5:
        message = 'Muito forte';
        break;
      default:
        message = 'Desconhecida';
        break;
    }

    return { score, message };
  };

  const handlePasswordChange = e => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));

    if (name === 'newPassword') {
      setPasswordStrength(checkPasswordStrength(value));
    }

    // Limpar erro do campo
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Senha atual é obrigatória';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Nova senha é obrigatória';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'A senha deve ter pelo menos 6 caracteres';
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = 'A nova senha deve ser diferente da atual';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Senha alterada com sucesso!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordStrength({ score: 0, message: '' });
    } catch (error) {
      if (error.response?.status === 401) {
        setPasswordErrors({ currentPassword: 'Senha atual incorreta' });
      } else {
        toast.error('Erro ao alterar senha');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      case 5:
        return 'bg-green-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className='space-y-6'>
      {/* Cabeçalho */}
      <div className='bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6'>
        <div className='flex items-center'>
          <Shield className='h-8 w-8 text-blue-600 mr-3' />
          <div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
              Configurações de Segurança
            </h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Gerencie a segurança da sua conta
            </p>
          </div>
        </div>
      </div>

      {/* Informações da Conta */}
      <div className='bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6'>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-4'>
          Informações da Conta
        </h4>
        <div className='space-y-3'>
          <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              Utilizador
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {user?.username}
            </span>
          </div>
          <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              Email
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {user?.email || 'Não definido'}
            </span>
          </div>
          <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              Papel
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </span>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className='bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6'>
        <div className='flex items-center mb-4'>
          <Key className='h-6 w-6 text-gray-400 mr-2' />
          <h4 className='text-md font-medium text-gray-900 dark:text-white'>
            Alterar Senha
          </h4>
        </div>

        <form onSubmit={handlePasswordSubmit} className='space-y-4 max-w-md'>
          {/* Senha Atual */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Senha Atual
            </label>
            <div className='relative'>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                name='currentPassword'
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordErrors.currentPassword
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              <button
                type='button'
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className='absolute inset-y-0 right-0 pr-3 flex items-center'
              >
                {showCurrentPassword ? (
                  <EyeOff className='h-5 w-5 text-gray-400' />
                ) : (
                  <Eye className='h-5 w-5 text-gray-400' />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                {passwordErrors.currentPassword}
              </p>
            )}
          </div>

          {/* Nova Senha */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Nova Senha
            </label>
            <div className='relative'>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name='newPassword'
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordErrors.newPassword
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              <button
                type='button'
                onClick={() => setShowNewPassword(!showNewPassword)}
                className='absolute inset-y-0 right-0 pr-3 flex items-center'
              >
                {showNewPassword ? (
                  <EyeOff className='h-5 w-5 text-gray-400' />
                ) : (
                  <Eye className='h-5 w-5 text-gray-400' />
                )}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                {passwordErrors.newPassword}
              </p>
            )}

            {/* Indicador de Força da Senha */}
            {passwordForm.newPassword && (
              <div className='mt-2'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    Força da senha
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength.score <= 2
                        ? 'text-red-600'
                        : passwordStrength.score === 3
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    {passwordStrength.message}
                  </span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-1.5'>
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Confirmar Nova Senha
            </label>
            <input
              type='password'
              name='confirmPassword'
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                passwordErrors.confirmPassword
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            />
            {passwordErrors.confirmPassword && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                {passwordErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type='submit'
            disabled={isChangingPassword}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isChangingPassword
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isChangingPassword ? (
              <>
                <RefreshCw className='animate-spin h-4 w-4 mr-2' />
                Alterando...
              </>
            ) : (
              <>
                <Save className='h-4 w-4 mr-2' />
                Alterar Senha
              </>
            )}
          </button>
        </form>
      </div>

      {/* Dicas de Segurança */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6'>
        <div className='flex'>
          <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
          <div className='ml-3'>
            <h4 className='text-sm font-medium text-blue-900 dark:text-blue-200'>
              Dicas de Segurança
            </h4>
            <ul className='mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside'>
              <li>Use uma senha forte com pelo menos 8 caracteres</li>
              <li>Combine letras maiúsculas, minúsculas, números e símbolos</li>
              <li>Não use informações pessoais na sua senha</li>
              <li>Altere sua senha regularmente</li>
              <li>Não compartilhe sua senha com ninguém</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
