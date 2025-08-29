import {
  AlertTriangle,
  Bell,
  CheckCircle,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { DeviceContext } from '../contexts/DeviceContext';
import { SocketContext } from '../contexts/SocketContext';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { connected } = useContext(SocketContext);
  const { devices } = useContext(DeviceContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Dispositivos', href: '/devices', icon: Smartphone },
    { name: 'Logs', href: '/logs', icon: FileText },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  const connectedDevices = devices.filter(d => d.connected).length;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Mobile sidebar */}
      <div
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } fixed inset-0 z-40 md:hidden`}
      >
        <div
          className='fixed inset-0 bg-gray-600 bg-opacity-75'
          onClick={() => setSidebarOpen(false)}
        />

        <div className='fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-800'>
          <div className='flex items-center justify-between h-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600'>
            <h1 className='text-xl font-bold text-white'>FastBoot</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className='text-white hover:text-gray-200'
            >
              <X className='h-6 w-6' />
            </button>
          </div>

          <nav className='flex-1 px-2 py-4 space-y-1'>
            {navigation.map(item => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className='mr-3 h-5 w-5' />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0'>
        <div className='flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700'>
          <div className='flex items-center h-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg'>
            <Smartphone className='h-8 w-8 text-white mr-3' />
            <h1 className='text-xl font-bold text-white'>FastBoot System</h1>
          </div>

          <div className='flex-1 flex flex-col overflow-y-auto'>
            <nav className='flex-1 px-2 py-4 space-y-1'>
              {navigation.map(item => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <item.icon className='mr-3 h-5 w-5' />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Status do Sistema */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    WebSocket
                  </span>
                  <div className='flex items-center'>
                    {connected ? (
                      <>
                        <Wifi className='h-4 w-4 text-green-500 mr-1' />
                        <span className='text-sm text-green-600 dark:text-green-400'>
                          Conectado
                        </span>
                      </>
                    ) : (
                      <>
                        <WifiOff className='h-4 w-4 text-red-500 mr-1' />
                        <span className='text-sm text-red-600 dark:text-red-400'>
                          Desconectado
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Dispositivos
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-white'>
                    {connectedDevices} conectado
                    {connectedDevices !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações do Usuário */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
                    <span className='text-white font-medium text-sm'>
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className='ml-3 flex-1'>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>
                    {user?.username}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {user?.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className='ml-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  title='Sair'
                >
                  <LogOut className='h-5 w-5' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='md:pl-64 flex flex-col flex-1'>
        {/* Top bar */}
        <div className='sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden'
          >
            <Menu className='h-6 w-6' />
          </button>

          <div className='flex-1 px-4 flex justify-between'>
            <div className='flex-1 flex items-center'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                {navigation.find(item => window.location.pathname === item.href)
                  ?.name || 'Dashboard'}
              </h2>
            </div>

            <div className='ml-4 flex items-center space-x-4'>
              {/* Notifications */}
              <button className='relative p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
                <Bell className='h-6 w-6' />
                {connectedDevices > 0 && (
                  <span className='absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800' />
                )}
              </button>

              {/* Connection Status Indicator */}
              <div className='flex items-center'>
                {connected ? (
                  <CheckCircle
                    className='h-5 w-5 text-green-500'
                    title='Sistema Online'
                  />
                ) : (
                  <AlertTriangle
                    className='h-5 w-5 text-yellow-500'
                    title='Sistema Offline'
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className='flex-1'>
          <div className='py-6'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 md:px-8'>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
