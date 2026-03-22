import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`} data-testid="loading-spinner">
      <Loader2 className={`${sizeClasses[size]} text-[#D4A373] animate-spin`} />
    </div>
  );
};

export const PageLoader = () => {
  return (
    <div className="min-h-screen bg-[#161412] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-[#A89F95]">Loading...</p>
      </div>
    </div>
  );
};
