'use client';

import React, { useState } from 'react';

interface SeiroonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  interactive?: boolean;
  className?: string;
}

const SeiroonLogo: React.FC<SeiroonLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  interactive = true,
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'text-2xl h-8',
    md: 'text-4xl h-12',
    lg: 'text-6xl h-16',
    xl: 'text-8xl h-20'
  };

  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-18 h-18'
  };

  const DragonIcon = ({ className: iconClassName = '' }) => (
    <div className={`relative ${iconSizeClasses[size]} ${iconClassName}`}>
      {/* Dragon Head Silhouette */}
      <div className="absolute inset-0 bg-gradient-to-br from-dragon-red-500 to-dragon-red-700 rounded-full shadow-dragon transform transition-all duration-300 hover:scale-110">
        <div className="absolute inset-1 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full opacity-80"></div>
        
        {/* Dragon Eyes */}
        <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-cosmic-purple-500 rounded-full animate-mystical-glow"></div>
        <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-cosmic-purple-500 rounded-full animate-mystical-glow"></div>
        
        {/* Dragon Scales Effect */}
        <div className="absolute inset-0 bg-dragon-scales-subtle rounded-full opacity-50"></div>
        
        {/* Power Aura */}
        {isHovered && (
          <div className="absolute -inset-2 bg-gradient-to-br from-dragon-red-400 to-cosmic-purple-400 rounded-full animate-power-surge opacity-30"></div>
        )}
      </div>
    </div>
  );

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (interactive) setIsHovered(false);
  };

  if (variant === 'icon') {
    return (
      <div 
        className={`inline-flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DragonIcon />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div 
        className={`inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <h1 className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-dragon-red-500 via-gold-500 to-cosmic-purple-500 bg-clip-text text-transparent transition-all duration-300 ${isHovered ? 'animate-scale-shimmer' : ''}`}>
          <span className="relative">
            Seiron
            {isHovered && (
              <span className="absolute -inset-1 bg-gradient-to-r from-dragon-red-400 to-cosmic-purple-400 opacity-20 blur-sm animate-pulse"></span>
            )}
          </span>
        </h1>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div 
      className={`inline-flex items-center space-x-3 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <DragonIcon className={isHovered ? 'animate-dragon-pulse' : ''} />
      
      <div className="flex flex-col">
        <h1 className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-dragon-red-500 via-gold-500 to-cosmic-purple-500 bg-clip-text text-transparent transition-all duration-300 ${isHovered ? 'animate-scale-shimmer' : ''}`}>
          <span className="relative">
            Seiron
            {isHovered && (
              <span className="absolute -inset-1 bg-gradient-to-r from-dragon-red-400 to-cosmic-purple-400 opacity-20 blur-sm animate-pulse"></span>
            )}
          </span>
        </h1>
        
        <p className={`text-sei-gray-400 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg'} font-medium tracking-wide transition-all duration-300 ${isHovered ? 'text-gold-400' : ''}`}>
          AI Portfolio Manager
        </p>
      </div>
      
      {/* Mystical Particles */}
      {isHovered && (
        <>
          <div className="absolute -top-2 -right-2 w-2 h-2 bg-dragon-red-400 rounded-full animate-cosmic-float opacity-70"></div>
          <div className="absolute -bottom-2 -left-2 w-1.5 h-1.5 bg-gold-400 rounded-full animate-cosmic-float opacity-70" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute -top-1 left-1/3 w-1 h-1 bg-cosmic-purple-400 rounded-full animate-cosmic-float opacity-70" style={{ animationDelay: '1s' }}></div>
        </>
      )}
    </div>
  );
};

export default SeiroonLogo;