'use client';

import React, { useState, useEffect } from 'react';
import DragonLoader from './DragonLoader';
import SeiroonLogo from './SeiroonLogo';
import MysticalBackground from './MysticalBackground';
import DragonBallProgress from './DragonBallProgress';

const SeiroonDemo: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsLoading(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-sei-gray-900 overflow-hidden">
      {/* Mystical Background */}
      <MysticalBackground variant="cosmic" particleCount={30} />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Logo */}
        <div className="mb-12">
          <SeiroonLogo size="xl" variant="full" />
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 text-center">
            <DragonLoader size="lg" variant="pulsing" />
            <p className="mt-4 text-sei-gray-400">Awakening the dragon...</p>
          </div>
        )}
        
        {/* Progress Indicator */}
        <div className="mb-8 w-full max-w-md">
          <DragonBallProgress 
            progress={progress} 
            variant="classic" 
            size="md" 
            showPercentage={true}
            showLabels={false}
          />
        </div>
        
        {/* Demo Controls */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Seiron Component Demo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {/* Loader Variants */}
            <div className="bg-sei-gray-800/50 backdrop-blur-sm rounded-dragon p-6 border border-dragon-red-500/20">
              <h3 className="text-lg font-semibold text-gold-400 mb-4">Dragon Loaders</h3>
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <DragonLoader size="sm" variant="classic" />
                  <p className="text-xs text-sei-gray-400 mt-2">Classic</p>
                </div>
                <div className="text-center">
                  <DragonLoader size="sm" variant="spinning" />
                  <p className="text-xs text-sei-gray-400 mt-2">Spinning</p>
                </div>
                <div className="text-center">
                  <DragonLoader size="sm" variant="pulsing" />
                  <p className="text-xs text-sei-gray-400 mt-2">Pulsing</p>
                </div>
              </div>
            </div>
            
            {/* Logo Variants */}
            <div className="bg-sei-gray-800/50 backdrop-blur-sm rounded-dragon p-6 border border-dragon-red-500/20">
              <h3 className="text-lg font-semibold text-gold-400 mb-4">Seiron Logos</h3>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <SeiroonLogo size="sm" variant="full" />
                </div>
                <div className="flex justify-center">
                  <SeiroonLogo size="sm" variant="icon" />
                </div>
                <div className="flex justify-center">
                  <SeiroonLogo size="sm" variant="text" />
                </div>
              </div>
            </div>
            
            {/* Progress Variants */}
            <div className="bg-sei-gray-800/50 backdrop-blur-sm rounded-dragon p-6 border border-dragon-red-500/20">
              <h3 className="text-lg font-semibold text-gold-400 mb-4">Progress Indicators</h3>
              <div className="space-y-4">
                <DragonBallProgress progress={25} variant="compact" size="sm" />
                <DragonBallProgress progress={50} variant="compact" size="sm" />
                <DragonBallProgress progress={75} variant="compact" size="sm" />
              </div>
            </div>
            
            {/* Background Variants */}
            <div className="bg-sei-gray-800/50 backdrop-blur-sm rounded-dragon p-6 border border-dragon-red-500/20">
              <h3 className="text-lg font-semibold text-gold-400 mb-4">Background Effects</h3>
              <div className="text-sei-gray-300 space-y-2 text-sm">
                <p>• Particle effects with floating orbs</p>
                <p>• Dragon scale patterns</p>
                <p>• Mystical glowing elements</p>
                <p>• Customizable intensity levels</p>
              </div>
            </div>
          </div>
          
          {/* Reset Button */}
          <button
            onClick={() => {
              setProgress(0);
              setIsLoading(true);
            }}
            className="mt-8 px-6 py-3 bg-gradient-to-r from-dragon-red-500 to-gold-500 text-white font-semibold rounded-dragon hover:from-dragon-red-600 hover:to-gold-600 transition-all duration-300 transform hover:scale-105 shadow-dragon hover:shadow-dragon-hover"
          >
            Reset Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeiroonDemo;