'use client';

import React, { useEffect, useState } from 'react';

interface MysticalBackgroundProps {
  variant?: 'subtle' | 'intense' | 'cosmic';
  particleCount?: number;
  enableDragonScales?: boolean;
  enableFloatingOrbs?: boolean;
  className?: string;
}

const MysticalBackground: React.FC<MysticalBackgroundProps> = ({ 
  variant = 'subtle',
  particleCount = 20,
  enableDragonScales = true,
  enableFloatingOrbs = true,
  className = '' 
}) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    animationDelay: number;
    animationDuration: number;
  }>>([]);

  useEffect(() => {
    const generateParticles = () => {
      const colors = variant === 'cosmic' 
        ? ['bg-cosmic-purple-400', 'bg-gold-400', 'bg-dragon-red-400']
        : variant === 'intense'
        ? ['bg-dragon-red-400', 'bg-gold-400', 'bg-dragon-red-300']
        : ['bg-dragon-red-200', 'bg-gold-200', 'bg-cosmic-purple-200'];

      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        color: colors[Math.floor(Math.random() * colors.length)] || 'bg-gray-400',
        animationDelay: Math.random() * 5,
        animationDuration: Math.random() * 3 + 2,
      }));

      setParticles(newParticles);
    };

    generateParticles();
  }, [particleCount, variant]);

  const getBackgroundIntensity = () => {
    switch (variant) {
      case 'intense':
        return 'bg-gradient-to-br from-dragon-red-900/20 via-sei-gray-900/10 to-cosmic-purple-900/20';
      case 'cosmic':
        return 'bg-gradient-to-br from-cosmic-purple-900/30 via-dragon-red-900/20 to-gold-900/20';
      default:
        return 'bg-gradient-to-br from-dragon-red-900/5 via-sei-gray-900/5 to-cosmic-purple-900/5';
    }
  };

  const getScaleIntensity = () => {
    switch (variant) {
      case 'intense':
        return 'opacity-20';
      case 'cosmic':
        return 'opacity-30';
      default:
        return 'opacity-10';
    }
  };

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Base Background Gradient */}
      <div className={`absolute inset-0 ${getBackgroundIntensity()}`}></div>
      
      {/* Dragon Scales Pattern */}
      {enableDragonScales && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 bg-dragon-scales-subtle ${getScaleIntensity()}`}></div>
          
          {/* Additional Scale Patterns */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-dragon-scales-subtle opacity-5 rounded-full blur-xl"></div>
          <div className="absolute top-1/4 right-0 w-48 h-48 bg-dragon-scales-subtle opacity-5 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-dragon-scales-subtle opacity-5 rounded-full blur-xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-dragon-scales-subtle opacity-5 rounded-full blur-xl"></div>
        </div>
      )}
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute rounded-full ${particle.color} opacity-60 animate-cosmic-float blur-sm`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.animationDelay}s`,
              animationDuration: `${particle.animationDuration}s`,
            }}
          />
        ))}
      </div>
      
      {/* Floating Orbs */}
      {enableFloatingOrbs && (
        <div className="absolute inset-0">
          {/* Large Mystical Orbs */}
          <div 
            className="absolute w-20 h-20 bg-gradient-to-br from-dragon-red-400/20 to-dragon-red-600/20 rounded-full blur-lg animate-cosmic-float"
            style={{ 
              top: '20%', 
              left: '10%', 
              animationDelay: '0s',
              animationDuration: '8s'
            }}
          ></div>
          
          <div 
            className="absolute w-16 h-16 bg-gradient-to-br from-gold-400/20 to-gold-600/20 rounded-full blur-lg animate-cosmic-float"
            style={{ 
              top: '60%', 
              right: '15%', 
              animationDelay: '2s',
              animationDuration: '10s'
            }}
          ></div>
          
          <div 
            className="absolute w-12 h-12 bg-gradient-to-br from-cosmic-purple-400/20 to-cosmic-purple-600/20 rounded-full blur-lg animate-cosmic-float"
            style={{ 
              bottom: '20%', 
              left: '30%', 
              animationDelay: '4s',
              animationDuration: '7s'
            }}
          ></div>
          
          <div 
            className="absolute w-14 h-14 bg-gradient-to-br from-dragon-red-300/20 to-cosmic-purple-400/20 rounded-full blur-lg animate-cosmic-float"
            style={{ 
              top: '40%', 
              right: '40%', 
              animationDelay: '6s',
              animationDuration: '9s'
            }}
          ></div>
          
          {/* Small Sparkles */}
          <div 
            className="absolute w-2 h-2 bg-gold-400 rounded-full animate-mystical-glow opacity-40"
            style={{ 
              top: '15%', 
              right: '20%', 
              animationDelay: '1s'
            }}
          ></div>
          
          <div 
            className="absolute w-1.5 h-1.5 bg-dragon-red-400 rounded-full animate-mystical-glow opacity-40"
            style={{ 
              bottom: '30%', 
              left: '70%', 
              animationDelay: '3s'
            }}
          ></div>
          
          <div 
            className="absolute w-1 h-1 bg-cosmic-purple-400 rounded-full animate-mystical-glow opacity-40"
            style={{ 
              top: '70%', 
              left: '15%', 
              animationDelay: '5s'
            }}
          ></div>
        </div>
      )}
      
      {/* Cosmic Glow Effects */}
      {variant === 'cosmic' && (
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-cosmic-glow opacity-10"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cosmic-glow opacity-20 transform -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        </div>
      )}
      
      {/* Intensity Overlay */}
      {variant === 'intense' && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-dragon-red-900/10 via-transparent to-gold-900/10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-dragon-red-900/5 to-transparent animate-scale-shimmer"></div>
        </div>
      )}
    </div>
  );
};

export default MysticalBackground;