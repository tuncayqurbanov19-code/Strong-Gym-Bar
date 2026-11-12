import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackOnFail?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showFallbackOnFail = true,
}) => {
  const { settings } = useApp();
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-sm',
    md: 'w-10 h-10 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-2xl text-xl',
    xl: 'w-20 h-20 rounded-3xl text-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6 stroke-[2.2]',
    lg: 'w-8 h-8 stroke-[2.2]',
    xl: 'w-11 h-11 stroke-[2.2]',
  };

  const logoUrl = settings.customLogoUrl;

  if (logoUrl && !imgError) {
    return (
      <div
        className={`${sizeClasses[size]} overflow-hidden bg-zinc-900 border border-zinc-700/80 shadow-md flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src={logoUrl}
          alt={settings.barName || 'Logo'}
          onError={() => {
            if (showFallbackOnFail) {
              setImgError(true);
            }
          }}
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  // Default Brand Icon: Stylized Red Gradient with Dumbbell
  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 font-bold shrink-0 ${className}`}
    >
      <Dumbbell className={iconSizes[size]} />
    </div>
  );
};
