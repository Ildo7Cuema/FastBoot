import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5001';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocket = token => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket conectado');
      setConnected(true);
      setReconnectAttempts(0);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', reason => {
      console.log('WebSocket desconectado:', reason);
      setConnected(false);

      if (reason === 'io server disconnect') {
        // Servidor forçou desconexão, tentar reconectar
        attemptReconnect();
      }
    });

    newSocket.on('connect_error', error => {
      console.error('Erro de conexão WebSocket:', error);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        attemptReconnect();
      } else {
        toast.error(
          'Não foi possível conectar ao servidor. Verifique sua conexão.'
        );
      }
    });

    newSocket.on('error', error => {
      console.error('Erro WebSocket:', error);
      toast.error('Erro de comunicação com o servidor');
    });

    // Eventos customizados
    newSocket.on('notification', data => {
      if (data.type === 'success') {
        toast.success(data.message);
      } else if (data.type === 'error') {
        toast.error(data.message);
      } else if (data.type === 'warning') {
        toast(data.message, { icon: '⚠️' });
      } else {
        toast(data.message);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return newSocket;
  }, [token, reconnectAttempts]);

  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;

    setReconnectAttempts(prev => prev + 1);

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(
        `Tentando reconectar... (${
          reconnectAttempts + 1
        }/${MAX_RECONNECT_ATTEMPTS})`
      );
      connect();
      reconnectTimeoutRef.current = null;
    }, RECONNECT_DELAY);
  }, [connect, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const emit = useCallback(
    (event, data) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      } else {
        console.warn('Socket não conectado. Tentando reconectar...');
        connect();
      }
    },
    [connect]
  );

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    socket,
    connected,
    emit,
    on,
    off,
    disconnect,
    reconnect: connect,
  };
};

export default useWebSocket;
