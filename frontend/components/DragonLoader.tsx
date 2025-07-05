'use client';

import React from 'react';

interface DragonLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'classic' | 'spinning' | 'pulsing';
  className?: string;
}

const DragonLoader: React.FC<DragonLoaderProps> = ({ 
  size = 'md', 
  variant = 'classic',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const orbSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const containerClass = `relative ${sizeClasses[size]} ${className}`;
  const orbClass = `absolute rounded-full ${orbSizeClasses[size]}`;

  if (variant === 'spinning') {
    return (
      <div className={containerClass}>
        <div className="relative w-full h-full animate-spin">
          {/* Main Dragon Ball */}
          <div className={`${orbClass} bg-gradient-to-br from-gold-300 to-gold-600 shadow-gold-glow animate-dragon-pulse`}
               style={{ top: '0%', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-gold-100 to-gold-300 rounded-full opacity-70"></div>
          </div>
          
          {/* Orbiting Dragon Balls */}
          <div className={`${orbClass} bg-gradient-to-br from-dragon-red-300 to-dragon-red-600 shadow-dragon`}
               style={{ top: '25%', left: '85%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-dragon-red-100 to-dragon-red-300 rounded-full opacity-70"></div>
          </div>
          
          <div className={`${orbClass} bg-gradient-to-br from-cosmic-purple-300 to-cosmic-purple-600 shadow-mystical`}
               style={{ top: '75%', left: '85%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-cosmic-purple-100 to-cosmic-purple-300 rounded-full opacity-70"></div>
          </div>
          
          <div className={`${orbClass} bg-gradient-to-br from-gold-300 to-gold-600 shadow-gold-glow`}
               style={{ top: '100%', left: '50%', transform: 'translate(-50%, -100%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-gold-100 to-gold-300 rounded-full opacity-70"></div>
          </div>
          
          <div className={`${orbClass} bg-gradient-to-br from-cosmic-purple-300 to-cosmic-purple-600 shadow-mystical`}
               style={{ top: '75%', left: '15%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-cosmic-purple-100 to-cosmic-purple-300 rounded-full opacity-70"></div>
          </div>
          
          <div className={`${orbClass} bg-gradient-to-br from-dragon-red-300 to-dragon-red-600 shadow-dragon`}
               style={{ top: '25%', left: '15%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-dragon-red-100 to-dragon-red-300 rounded-full opacity-70"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pulsing') {
    return (
      <div className={containerClass}>
        <div className="relative w-full h-full">
          {/* Center Dragon Ball */}
          <div className={`${orbClass} bg-gradient-to-br from-gold-300 to-gold-600 shadow-gold-glow animate-dragon-pulse`}
               style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-1 bg-gradient-to-br from-gold-100 to-gold-300 rounded-full opacity-70"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-gold-300 to-gold-600 rounded-full animate-ping opacity-30"></div>
          </div>
          
          {/* Pulsing Ring of Orbs */}
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = (index * 60) * (Math.PI / 180);
            const radius = size === 'sm' ? 12 : size === 'md' ? 24 : size === 'lg' ? 36 : 48;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const colors = [
              'from-dragon-red-300 to-dragon-red-600',
              'from-cosmic-purple-300 to-cosmic-purple-600',
              'from-gold-300 to-gold-600'
            ];
            const shadows = ['shadow-dragon', 'shadow-mystical', 'shadow-gold-glow'];
            const colorIndex = index % 3;
            
            return (
              <div
                key={index}
                className={`${orbClass} bg-gradient-to-br ${colors[colorIndex]} ${shadows[colorIndex]} animate-dragon-pulse`}
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(${x - 50}%, ${y - 50}%)`,
                  animationDelay: `${index * 0.2}s`
                }}
              >
                <div className={`absolute inset-1 bg-gradient-to-br ${colors[colorIndex]?.replace('300', '100').replace('600', '300')} rounded-full opacity-70`}></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Classic variant (default)
  return (
    <div className={containerClass}>
      <div className="relative w-full h-full">
        {/* Main Dragon Ball */}
        <div className={`${orbClass} bg-gradient-to-br from-gold-300 to-gold-600 shadow-gold-glow animate-dragon-pulse`}
             style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="absolute inset-1 bg-gradient-to-br from-gold-100 to-gold-300 rounded-full opacity-70"></div>
          {/* Dragon Ball Stars */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 h-1/3 bg-dragon-red-500 rounded-full opacity-80"></div>
          </div>
        </div>
        
        {/* Floating Energy Orbs */}
        <div className={`${orbClass} bg-gradient-to-br from-dragon-red-300 to-dragon-red-600 shadow-dragon animate-cosmic-float`}
             style={{ 
               top: '20%', 
               left: '20%', 
               transform: 'translate(-50%, -50%)',
               animationDelay: '0.5s'
             }}>
          <div className="absolute inset-1 bg-gradient-to-br from-dragon-red-100 to-dragon-red-300 rounded-full opacity-70"></div>
        </div>
        
        <div className={`${orbClass} bg-gradient-to-br from-cosmic-purple-300 to-cosmic-purple-600 shadow-mystical animate-cosmic-float`}
             style={{ 
               top: '80%', 
               left: '80%', 
               transform: 'translate(-50%, -50%)',
               animationDelay: '1s'
             }}>
          <div className="absolute inset-1 bg-gradient-to-br from-cosmic-purple-100 to-cosmic-purple-300 rounded-full opacity-70"></div>
        </div>
        
        <div className={`${orbClass} bg-gradient-to-br from-gold-300 to-gold-600 shadow-gold-glow animate-cosmic-float`}
             style={{ 
               top: '20%', 
               left: '80%', 
               transform: 'translate(-50%, -50%)',
               animationDelay: '1.5s'
             }}>
          <div className="absolute inset-1 bg-gradient-to-br from-gold-100 to-gold-300 rounded-full opacity-70"></div>
        </div>
      </div>
    </div>
  );
};

export default DragonLoader;