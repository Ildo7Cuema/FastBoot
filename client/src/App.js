import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AuthContext } from './contexts/AuthContext';
import { SocketContext } from './contexts/SocketContext';
import { DeviceContext } from './contexts/DeviceContext';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há um token salvo
    const token = localStorage.getItem('token');
    if (token) {
      // Verificar se o token ainda é válido
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Conectar ao WebSocket
      const newSocket = io();
      setSocket(newSocket);

      // Eventos do WebSocket
      newSocket.on('devices-update', (updatedDevices) => {
        setDevices(updatedDevices);
      });

      newSocket.on('logs-update', (logs) => {
        // Atualizar logs se necessário
        console.log('Logs atualizados:', logs);
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    setDevices([]);
    localStorage.removeItem('token');
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <SocketContext.Provider value={{ socket }}>
        <DeviceContext.Provider value={{ devices, setDevices }}>
          <div className="App">
            <Routes>
              <Route 
                path="/login" 
                element={user ? <Navigate to="/" /> : <Login />} 
              />
              <Route 
                path="/" 
                element={user ? <Dashboard /> : <Navigate to="/login" />} 
              />
              <Route 
                path="*" 
                element={<Navigate to="/" />} 
              />
            </Routes>
          </div>
        </DeviceContext.Provider>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
