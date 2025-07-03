'use client';

import React from 'react';

interface DragonBallProgressProps {
  progress: number; // 0-100
  variant?: 'classic' | 'compact' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showLabels?: boolean;
  className?: string;
}

const DragonBallProgress: React.FC<DragonBallProgressProps> = ({ 
  progress,
  variant = 'classic',
  size = 'md',
  showPercentage = true,
  showLabels = false,
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const activeBalls = Math.floor((clampedProgress / 100) * 7);
  const currentBallProgress = ((clampedProgress / 100) * 7) - activeBalls;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerSizeClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3'
  };

  const dragonBallColors = [
    'from-gold-300 to-gold-600',
    'from-dragon-red-300 to-dragon-red-600',
    'from-cosmic-purple-300 to-cosmic-purple-600',
    'from-gold-400 to-gold-700',
    'from-dragon-red-400 to-dragon-red-700',
    'from-cosmic-purple-400 to-cosmic-purple-700',
    'from-gold-500 to-gold-800'
  ];

  const dragonBallShadows = [
    'shadow-gold-glow',
    'shadow-dragon',
    'shadow-mystical',
    'shadow-gold-glow',
    'shadow-dragon',
    'shadow-mystical',
    'shadow-gold-glow'
  ];

  const starCounts = [1, 2, 3, 4, 5, 6, 7];

  const DragonBall = ({ 
    index, 
    isActive, 
    isPartial = false, 
    partialProgress = 0 
  }: { 
    index: number; 
    isActive: boolean; 
    isPartial?: boolean; 
    partialProgress?: number; 
  }) => {
    const ballClass = `${sizeClasses[size]} rounded-full relative transition-all duration-500 transform`;
    const colorClass = isActive || isPartial ? dragonBallColors[index] : 'from-sei-gray-200 to-sei-gray-400';
    const shadowClass = isActive || isPartial ? dragonBallShadows[index] : 'shadow-sei-subtle';
    const scaleClass = isActive ? 'scale-110' : 'scale-100';
    const animationClass = isActive ? 'animate-dragon-pulse' : '';

    return (
      <div className={`${ballClass} ${scaleClass} ${animationClass}`}>
        {/* Main Ball */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} ${shadowClass} rounded-full`}>
          {/* Inner Light */}
          <div className={`absolute inset-1 bg-gradient-to-br ${isActive || isPartial ? colorClass.replace('300', '100').replace('600', '300') : 'from-sei-gray-100 to-sei-gray-200'} rounded-full opacity-70`}></div>
          
          {/* Stars */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {Array.from({ length: starCounts[index] }, (_, starIndex) => {
                const angle = (starIndex * (360 / starCounts[index])) * (Math.PI / 180);
                const radius = size === 'sm' ? 6 : size === 'md' ? 8 : 12;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <div
                    key={starIndex}
                    className={`absolute w-1 h-1 ${isActive || isPartial ? 'bg-dragon-red-600' : 'bg-sei-gray-400'} rounded-full`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                      opacity: isActive || isPartial ? 1 : 0.3
                    }}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Partial Progress Overlay */}
          {isPartial && (
            <div 
              className="absolute inset-0 bg-gradient-to-br from-sei-gray-600 to-sei-gray-800 rounded-full transition-all duration-500"
              style={{
                clipPath: `polygon(0 0, ${partialProgress * 100}% 0, ${partialProgress * 100}% 100%, 0 100%)`
              }}
            />
          )}
          
          {/* Glow Effect */}
          {isActive && (
            <div className="absolute -inset-1 bg-gradient-to-br from-transparent via-current to-transparent rounded-full animate-ping opacity-20"></div>
          )}
        </div>
        
        {/* Dragon Ball Labels */}
        {showLabels && (
          <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs ${isActive ? 'text-gold-600' : 'text-sei-gray-400'} font-medium`}>
            {index + 1}★
          </div>
        )}
      </div>
    );
  };

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center ${containerSizeClasses[size]} ${className}`}>
        {/* Progress Percentage */}
        {showPercentage && (
          <div className="mb-4 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-dragon-red-500 to-gold-500 bg-clip-text text-transparent">
              {Math.round(clampedProgress)}%
            </div>
            <div className="text-sm text-sei-gray-400">Power Level</div>
          </div>
        )}
        
        {/* Dragon Balls */}
        <div className={`flex flex-col items-center ${containerSizeClasses[size]} mb-4`}>
          {Array.from({ length: 7 }, (_, index) => (
            <DragonBall
              key={index}
              index={index}
              isActive={index < activeBalls}
              isPartial={index === activeBalls && currentBallProgress > 0}
              partialProgress={currentBallProgress}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Dragon Balls */}
        <div className={`flex items-center ${containerSizeClasses[size]}`}>
          {Array.from({ length: 7 }, (_, index) => (
            <DragonBall
              key={index}
              index={index}
              isActive={index < activeBalls}
              isPartial={index === activeBalls && currentBallProgress > 0}
              partialProgress={currentBallProgress}
            />
          ))}
        </div>
        
        {/* Progress Percentage */}
        {showPercentage && (
          <div className="text-lg font-bold bg-gradient-to-r from-dragon-red-500 to-gold-500 bg-clip-text text-transparent">
            {Math.round(clampedProgress)}%
          </div>
        )}
      </div>
    );
  }

  // Classic variant (default)
  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Progress Percentage */}
      {showPercentage && (
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-dragon-red-500 via-gold-500 to-cosmic-purple-500 bg-clip-text text-transparent">
            {Math.round(clampedProgress)}%
          </div>
          <div className="text-sm text-sei-gray-400 mt-1">Seiron Power Level</div>
        </div>
      )}
      
      {/* Dragon Balls */}
      <div className={`flex items-center ${containerSizeClasses[size]}`}>
        {Array.from({ length: 7 }, (_, index) => (
          <DragonBall
            key={index}
            index={index}
            isActive={index < activeBalls}
            isPartial={index === activeBalls && currentBallProgress > 0}
            partialProgress={currentBallProgress}
          />
        ))}
      </div>
      
      {/* Progress Description */}
      <div className="text-center text-sm text-sei-gray-500 max-w-md">
        {clampedProgress === 0 && "Begin your mystical journey..."}
        {clampedProgress > 0 && clampedProgress < 20 && "The dragon stirs..."}
        {clampedProgress >= 20 && clampedProgress < 40 && "Power awakens within..."}
        {clampedProgress >= 40 && clampedProgress < 60 && "The scales shimmer with energy..."}
        {clampedProgress >= 60 && clampedProgress < 80 && "Dragon's might grows stronger..."}
        {clampedProgress >= 80 && clampedProgress < 100 && "Ancient power nearly unleashed..."}
        {clampedProgress === 100 && "🐉 Seiron's full power achieved! 🐉"}
      </div>
    </div>
  );
};

export default DragonBallProgress;