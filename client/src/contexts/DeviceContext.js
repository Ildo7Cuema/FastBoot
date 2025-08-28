import { createContext, useContext } from 'react';

export const DeviceContext = createContext();

export const useDevices = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevices deve ser usado dentro de um DeviceProvider');
  }
  return context;
};
