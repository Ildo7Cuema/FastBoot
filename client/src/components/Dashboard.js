import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDevices } from '../contexts/DeviceContext';
import { useSocket } from '../contexts/SocketContext';
import DeviceManager from './DeviceManager';
import LogsViewer from './LogsViewer';
import { Smartphone, LogOut, Menu, X, Activity, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { devices } = useDevices();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('devices');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso!');
  };

  const tabs = [
    { id: 'devices', name: 'Dispositivos', icon: Smartphone },
    { id: 'logs', name: 'Logs', icon: FileText },
  ];

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <header className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center'>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className='lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                {sidebarOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
              </button>
              <div className='flex items-center'>
                <Smartphone className='h-8 w-8 text-primary-600' />
                <h1 className='ml-2 text-xl font-semibold text-gray-900 dark:text-white'>
                  FastBoot Factory Reset
                </h1>
              </div>
            </div>

            <div className='flex items-center space-x-4'>
              <span className='text-sm text-gray-700 dark:text-gray-300'>
                Olá, {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className='flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
              >
                <LogOut className='h-4 w-4' />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className='flex'>
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block lg:w-64 lg:flex-shrink-0`}>
          <div className='bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 h-full'>
            <nav className='mt-5 px-2'>
              <div className='space-y-1'>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full transition-colors`}
                    >
                      <Icon className='mr-3 h-5 w-5' />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className='flex-1'>
          <main className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8'>
            {/* Status bar */}
            <div className='mb-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <div className='flex items-center space-x-2'>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        socket ? 'bg-success-500' : 'bg-danger-500'
                      }`}
                    ></div>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {socket ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Activity className='h-4 w-4 text-gray-400' />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {devices.length} dispositivo(s) detectado(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className='animate-fade-in'>
              {activeTab === 'devices' && <DeviceManager />}
              {activeTab === 'logs' && <LogsViewer />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
