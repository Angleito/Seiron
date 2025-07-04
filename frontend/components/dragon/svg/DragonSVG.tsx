import React, { useMemo } from 'react';
import { DragonHead } from './components/DragonHead';
import { DragonBody } from './components/DragonBody';
import { DragonLimbs } from './components/DragonLimbs';
import { DragonTail } from './components/DragonTail';
import { DragonEyes } from './components/DragonEyes';
import { SVGGradients } from './components/SVGGradients';
import type { DragonState, DragonMood } from '../types';

interface DragonSVGProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  state?: DragonState;
  mood?: DragonMood;
  powerLevel?: number;
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open';
  className?: string;
  enableAnimations?: boolean;
  attentionTarget?: { x: number; y: number };
  onInteraction?: (type: string) => void;
}

const SIZE_CONFIGS = {
  sm: { viewBox: '0 0 120 120', width: 120, height: 120 },
  md: { viewBox: '0 0 200 200', width: 200, height: 200 },
  lg: { viewBox: '0 0 300 300', width: 300, height: 300 },
  xl: { viewBox: '0 0 400 400', width: 400, height: 400 },
  xxl: { viewBox: '0 0 500 500', width: 500, height: 500 }
};

const POWER_LEVEL_INTENSITIES = {
  low: 0.3,      // 1000-3000
  medium: 0.6,   // 3000-5000
  high: 0.8,     // 5000-8000
  extreme: 1.0,  // 8000-9000
  legendary: 1.2 // 9000+
};

const getPowerIntensity = (powerLevel: number = 1000): number => {
  if (powerLevel >= 9000) return POWER_LEVEL_INTENSITIES.legendary;
  if (powerLevel >= 8000) return POWER_LEVEL_INTENSITIES.extreme;
  if (powerLevel >= 5000) return POWER_LEVEL_INTENSITIES.high;
  if (powerLevel >= 3000) return POWER_LEVEL_INTENSITIES.medium;
  return POWER_LEVEL_INTENSITIES.low;
};

export const DragonSVG: React.FC<DragonSVGProps> = ({
  size = 'md',
  state = 'idle',
  mood = 'neutral',
  powerLevel = 1000,
  armsVariant = 'ready',
  className = '',
  enableAnimations = true,
  attentionTarget,
  onInteraction
}) => {
  const config = SIZE_CONFIGS[size];
  const powerIntensity = getPowerIntensity(powerLevel);
  
  // Calculate scale factor for responsive sizing
  const scaleFactor = useMemo(() => {
    const baseSize = 400; // xl size as base
    return config.width / baseSize;
  }, [config.width]);

  // Generate unique IDs for gradients to avoid conflicts
  const gradientId = useMemo(() => {
    return `dragon-gradient-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate dragon positioning based on state
  const dragonTransform = useMemo(() => {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    
    let offsetX = 0;
    let offsetY = 0;
    let rotation = 0;
    
    switch (state) {
      case 'attention':
        if (attentionTarget) {
          const dx = attentionTarget.x - centerX;
          const dy = attentionTarget.y - centerY;
          rotation = Math.atan2(dy, dx) * (180 / Math.PI);
        }
        break;
      case 'ready':
        offsetY = -5 * scaleFactor;
        break;
      case 'active':
        offsetY = -10 * scaleFactor;
        break;
      case 'powering-up':
        offsetY = -15 * scaleFactor;
        break;
      case 'arms-crossed':
        offsetX = -5 * scaleFactor;
        break;
      case 'sleeping':
        offsetY = 10 * scaleFactor;
        rotation = -5;
        break;
      case 'awakening':
        offsetY = 5 * scaleFactor;
        break;
    }
    
    return `translate(${centerX + offsetX}, ${centerY + offsetY}) rotate(${rotation}) scale(${scaleFactor})`;
  }, [state, attentionTarget, config, scaleFactor]);

  // Animation classes based on state
  const animationClasses = useMemo(() => {
    if (!enableAnimations) return '';
    
    const classes = [];
    
    switch (state) {
      case 'idle':
        classes.push('dragon-floating', 'dragon-breathing');
        break;
      case 'attention':
        classes.push('dragon-alert', 'dragon-focus');
        break;
      case 'ready':
        classes.push('dragon-ready', 'dragon-pulse');
        break;
      case 'active':
        classes.push('dragon-active', 'dragon-glow');
        break;
      case 'powering-up':
        classes.push('dragon-powering-up', 'dragon-intense-glow');
        break;
      case 'arms-crossed':
        classes.push('dragon-confident', 'dragon-steady');
        break;
      case 'sleeping':
        classes.push('dragon-sleeping', 'dragon-slow-breathing');
        break;
      case 'awakening':
        classes.push('dragon-awakening', 'dragon-stretch');
        break;
    }
    
    return classes.join(' ');
  }, [state, enableAnimations]);

  // Accessibility attributes
  const accessibilityProps = useMemo(() => {
    const stateDescription = state === 'powering-up' && powerLevel > 9000 
      ? `Dragon is powering up with power level over 9000!`
      : `Dragon is in ${state} state with power level ${powerLevel}`;
    
    return {
      role: 'img',
      'aria-label': `Shenron Dragon - ${stateDescription}`,
      'aria-describedby': `dragon-description-${gradientId}`,
      'aria-live': state === 'powering-up' ? 'polite' : 'off'
    };
  }, [state, powerLevel, gradientId]);

  return (
    <svg
      className={`dragon-svg ${animationClasses} ${className}`}
      viewBox={config.viewBox}
      width={config.width}
      height={config.height}
      preserveAspectRatio="xMidYMid meet"
      {...accessibilityProps}
      onClick={() => onInteraction?.('click')}
      onMouseEnter={() => onInteraction?.('hover')}
      onMouseLeave={() => onInteraction?.('leave')}
    >
      {/* Hidden description for screen readers */}
      <desc id={`dragon-description-${gradientId}`}>
        A majestic Dragon Ball Z Shenron-style dragon with vibrant green scales, 
        flowing serpentine body, and powerful presence. The dragon responds to 
        interactions and changes appearance based on its current state and power level.
      </desc>
      
      {/* Define gradients, filters, and patterns */}
      <SVGGradients 
        gradientId={gradientId}
        state={state}
        mood={mood}
        powerIntensity={powerIntensity}
      />
      
      {/* Main dragon group with transforms */}
      <g
        className="dragon-main"
        transform={dragonTransform}
        style={{
          transformOrigin: '0 0',
          filter: powerLevel > 8000 ? `url(#dragon-aura-${gradientId})` : undefined
        }}
      >
        {/* Dragon Tail (background layer) */}
        <DragonTail
          state={state}
          mood={mood}
          powerIntensity={powerIntensity}
          gradientId={gradientId}
          className="dragon-tail"
        />
        
        {/* Dragon Body (middle layer) */}
        <DragonBody
          state={state}
          mood={mood}
          powerIntensity={powerIntensity}
          gradientId={gradientId}
          className="dragon-body"
        />
        
        {/* Dragon Limbs */}
        <DragonLimbs
          state={state}
          mood={mood}
          powerIntensity={powerIntensity}
          gradientId={gradientId}
          armsVariant={armsVariant}
          className="dragon-limbs"
        />
        
        {/* Dragon Head (foreground layer) */}
        <DragonHead
          state={state}
          mood={mood}
          powerIntensity={powerIntensity}
          gradientId={gradientId}
          attentionTarget={attentionTarget}
          className="dragon-head"
        />
        
        {/* Dragon Eyes (top layer for expression) */}
        <DragonEyes
          state={state}
          mood={mood}
          powerIntensity={powerIntensity}
          gradientId={gradientId}
          attentionTarget={attentionTarget}
          className="dragon-eyes"
        />
      </g>
      
      {/* Power level indicator for screen readers */}
      {powerLevel > 9000 && (
        <text
          x={config.width / 2}
          y={config.height - 10}
          textAnchor="middle"
          fontSize="8"
          fill="transparent"
          aria-hidden="false"
        >
          Power level: Over 9000!
        </text>
      )}
    </svg>
  );
};

export default DragonSVG;