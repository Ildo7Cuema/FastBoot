import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { AuthContext } from './contexts/AuthContext';
import { DeviceContext } from './contexts/DeviceContext';
import { SocketContext } from './contexts/SocketContext';
import useWebSocket from './hooks/useWebSocket';
import { authAPI } from './utils/api';

// Lazy loading dos componentes
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DeviceManager = lazy(() => import('./components/DeviceManager'));
const LogsViewer = lazy(() => import('./components/LogsViewer'));
const Settings = lazy(() => import('./components/Settings'));

function App() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Hook customizado para WebSocket
  const { socket, connected, emit, on, off } = useWebSocket(token);

  useEffect(() => {
    // Verificar se há um token salvo
    if (token) {
      authAPI
        .verify()
        .then(response => {
          if (response.data.valid) {
            setUser(response.data.user);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (socket && connected) {
      // Eventos do WebSocket
      const handleDevicesUpdate = updatedDevices => {
        setDevices(updatedDevices);
      };

      const handleLogsUpdate = logs => {
        // Logs são tratados no componente LogsViewer
        console.log('Novos logs recebidos:', logs.length);
      };

      const handleDeviceConnected = device => {
        setDevices(prev => [...prev, device]);
      };

      const handleDeviceDisconnected = deviceId => {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
      };

      on('devices-update', handleDevicesUpdate);
      on('logs-update', handleLogsUpdate);
      on('device-connected', handleDeviceConnected);
      on('device-disconnected', handleDeviceDisconnected);

      // Solicitar dispositivos atuais
      emit('get-devices');

      return () => {
        off('devices-update', handleDevicesUpdate);
        off('logs-update', handleLogsUpdate);
        off('device-connected', handleDeviceConnected);
        off('device-disconnected', handleDeviceDisconnected);
      };
    }
  }, [socket, connected, on, off, emit]);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setDevices([]);
    setToken(null);
    localStorage.removeItem('token');
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider
        value={{
          user,
          token,
          login: handleLogin,
          logout: handleLogout,
          isAuthenticated: !!user,
        }}
      >
        <SocketContext.Provider
          value={{
            socket,
            connected,
            emit,
            on,
            off,
          }}
        >
          <DeviceContext.Provider
            value={{
              devices,
              setDevices,
              selectedDevice: devices[0] || null,
            }}
          >
            <div className='App min-h-screen bg-gray-50 dark:bg-gray-900'>
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <Routes>
                  <Route
                    path='/login'
                    element={user ? <Navigate to='/' /> : <Login />}
                  />
                  <Route
                    path='/'
                    element={user ? <Dashboard /> : <Navigate to='/login' />}
                  >
                    <Route index element={<DeviceManager />} />
                    <Route path='devices' element={<DeviceManager />} />
                    <Route path='logs' element={<LogsViewer />} />
                    <Route path='settings' element={<Settings />} />
                  </Route>
                  <Route path='*' element={<Navigate to='/' />} />
                </Routes>
              </Suspense>
            </div>
          </DeviceContext.Provider>
        </SocketContext.Provider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
