import React, { useState, useEffect } from 'react';
import { DragonSVG } from './DragonSVG';
import type { DragonState, DragonMood } from '../types';
import './DragonSVG.css';

interface DragonSVGDemoProps {
  className?: string;
}

export const DragonSVGDemo: React.FC<DragonSVGDemoProps> = ({ className = '' }) => {
  const [state, setState] = useState<DragonState>('idle');
  const [mood, setMood] = useState<DragonMood>('neutral');
  const [powerLevel, setPowerLevel] = useState(1000);
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'xxl'>('lg');
  const [armsVariant, setArmsVariant] = useState<'crossed' | 'ready' | 'attack' | 'defensive' | 'open'>('ready');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Auto-cycle through states for demo
  useEffect(() => {
    const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'powering-up', 'arms-crossed', 'sleeping', 'awakening'];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % states.length;
      setState(states[currentIndex]);
      
      // Adjust power level based on state
      if (states[currentIndex] === 'powering-up') {
        setPowerLevel(9001);
      } else if (states[currentIndex] === 'active') {
        setPowerLevel(5000);
      } else {
        setPowerLevel(1000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Track mouse position for attention state
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    if (state === 'attention') {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [state]);

  const handleDragonInteraction = (type: string) => {
    console.log('Dragon interaction:', type);
    
    if (type === 'click') {
      setState('powering-up');
      setPowerLevel(9001);
      setMood('powerful');
    } else if (type === 'hover') {
      setMood('excited');
    } else if (type === 'leave') {
      setMood('neutral');
    }
  };

  return (
    <div className={`dragon-svg-demo ${className}`}>
      <div className="demo-container max-w-4xl mx-auto p-8">
        {/* Demo Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Dragon Ball Z Shenron SVG Demo
          </h2>
          <p className="text-gray-600">
            Interactive SVG dragon with authentic DBZ aesthetics
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current State: <span className="font-semibold text-emerald-600">{state}</span> | 
            Power Level: <span className="font-semibold text-orange-600">{powerLevel.toLocaleString()}</span>
            {powerLevel > 9000 && <span className="text-yellow-500 font-bold"> - IT'S OVER 9000!</span>}
          </p>
        </div>

        {/* Dragon Display */}
        <div className="dragon-display flex justify-center mb-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 shadow-lg">
          <DragonSVG
            size={size}
            state={state}
            mood={mood}
            powerLevel={powerLevel}
            armsVariant={armsVariant}
            enableAnimations={true}
            attentionTarget={state === 'attention' ? mousePosition : undefined}
            onInteraction={handleDragonInteraction}
            className="drop-shadow-lg"
          />
        </div>

        {/* Controls */}
        <div className="controls grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* State Control */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dragon State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as DragonState)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="idle">Idle</option>
              <option value="attention">Attention</option>
              <option value="ready">Ready</option>
              <option value="active">Active</option>
              <option value="powering-up">Powering Up</option>
              <option value="arms-crossed">Arms Crossed</option>
              <option value="sleeping">Sleeping</option>
              <option value="awakening">Awakening</option>
            </select>
          </div>

          {/* Mood Control */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dragon Mood
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value as DragonMood)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="neutral">Neutral</option>
              <option value="happy">Happy</option>
              <option value="excited">Excited</option>
              <option value="powerful">Powerful</option>
              <option value="mystical">Mystical</option>
              <option value="focused">Focused</option>
              <option value="aggressive">Aggressive</option>
              <option value="confident">Confident</option>
            </select>
          </div>

          {/* Size Control */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dragon Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="sm">Small (120px)</option>
              <option value="md">Medium (200px)</option>
              <option value="lg">Large (300px)</option>
              <option value="xl">Extra Large (400px)</option>
              <option value="xxl">XXL (500px)</option>
            </select>
          </div>

          {/* Arms Variant Control */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arms Variant
            </label>
            <select
              value={armsVariant}
              onChange={(e) => setArmsVariant(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ready">Ready</option>
              <option value="crossed">Crossed</option>
              <option value="attack">Attack</option>
              <option value="defensive">Defensive</option>
              <option value="open">Open</option>
            </select>
          </div>

          {/* Power Level Control */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Power Level: {powerLevel.toLocaleString()}
            </label>
            <input
              type="range"
              min="1000"
              max="9001"
              step="100"
              value={powerLevel}
              onChange={(e) => setPowerLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1,000</span>
              <span className="text-yellow-600 font-bold">9,001</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="control-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setState('powering-up');
                  setPowerLevel(9001);
                  setMood('powerful');
                }}
                className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors"
              >
                Power Up!
              </button>
              <button
                onClick={() => {
                  setState('sleeping');
                  setMood('neutral');
                  setPowerLevel(1000);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                Sleep
              </button>
              <button
                onClick={() => {
                  setState('idle');
                  setMood('neutral');
                  setPowerLevel(1000);
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="features mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ✨ SVG Dragon Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="feature">
              <strong>🎨 Authentic DBZ Design:</strong> Traditional Shenron with green scales, brown antlers, and red eyes
            </div>
            <div className="feature">
              <strong>🔄 8 Dragon States:</strong> From idle to legendary power-up animations
            </div>
            <div className="feature">
              <strong>😊 8 Mood Expressions:</strong> Facial expressions and eye animations
            </div>
            <div className="feature">
              <strong>📱 Fully Responsive:</strong> 5 size configurations with optimized performance
            </div>
            <div className="feature">
              <strong>♿ Accessible:</strong> ARIA labels, keyboard navigation, reduced motion support
            </div>
            <div className="feature">
              <strong>⚡ Performance Optimized:</strong> Hardware-accelerated CSS animations
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-emerald-800 text-sm">
            <strong>💡 Try these interactions:</strong> Click the dragon to power up, hover for excitement, 
            select "Attention" state and move your mouse to see eye tracking, or adjust the power level slider 
            to see visual effects change.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DragonSVGDemo;