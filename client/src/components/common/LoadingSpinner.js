import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'medium', 
  fullScreen = false, 
  message = 'Carregando...' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.medium;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className={`${spinnerSize} animate-spin text-blue-500`}>
            <Loader2 className="w-full h-full" />
          </div>
          <div className="absolute inset-0 animate-pulse">
            <div className={`${spinnerSize} rounded-full bg-blue-500 opacity-20`}></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className={`${spinnerSize} animate-spin text-blue-500`}>
        <Loader2 className="w-full h-full" />
      </div>
      {message && (
        <span className="text-gray-600 dark:text-gray-400">{message}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;