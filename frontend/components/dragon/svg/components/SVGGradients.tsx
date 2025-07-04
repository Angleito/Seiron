import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface SVGGradientsProps {
  gradientId: string;
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
}

export const SVGGradients: React.FC<SVGGradientsProps> = ({
  gradientId,
  state,
  mood,
  powerIntensity
}) => {
  // Dragon Ball Z Shenron colors
  const getDragonColors = () => {
    const baseGreen = '#10B981'; // Emerald green
    const darkGreen = '#065F46'; // Dark green
    const highlightGreen = '#34D399'; // Light green
    const shadowGreen = '#064E3B'; // Very dark green
    
    // Power level affects color intensity
    const intensity = Math.min(powerIntensity, 1.2);
    
    return {
      primary: baseGreen,
      secondary: darkGreen,
      highlight: highlightGreen,
      shadow: shadowGreen,
      intensity
    };
  };

  const colors = getDragonColors();

  return (
    <defs>
      {/* Dragon body gradient */}
      <linearGradient id={`dragon-body-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.highlight} stopOpacity={0.9} />
        <stop offset="35%" stopColor={colors.primary} stopOpacity={1} />
        <stop offset="65%" stopColor={colors.secondary} stopOpacity={1} />
        <stop offset="100%" stopColor={colors.shadow} stopOpacity={0.8} />
      </linearGradient>

      {/* Dragon scales gradient */}
      <radialGradient id={`dragon-scales-${gradientId}`} cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor={colors.highlight} stopOpacity={0.6} />
        <stop offset="50%" stopColor={colors.primary} stopOpacity={0.8} />
        <stop offset="100%" stopColor={colors.secondary} stopOpacity={1} />
      </radialGradient>

      {/* Dragon belly gradient (lighter) */}
      <linearGradient id={`dragon-belly-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" stopOpacity={0.9} />
        <stop offset="50%" stopColor="#FDE68A" stopOpacity={1} />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
      </linearGradient>

      {/* Dragon antler gradient (brown/tan) */}
      <linearGradient id={`dragon-antler-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" stopOpacity={1} />
        <stop offset="50%" stopColor="#D97706" stopOpacity={1} />
        <stop offset="100%" stopColor="#92400E" stopOpacity={1} />
      </linearGradient>

      {/* Dragon eyes gradient (red) */}
      <radialGradient id={`dragon-eyes-${gradientId}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FEF2F2" stopOpacity={1} />
        <stop offset="30%" stopColor="#FCA5A5" stopOpacity={1} />
        <stop offset="70%" stopColor="#EF4444" stopOpacity={1} />
        <stop offset="100%" stopColor="#B91C1C" stopOpacity={1} />
      </radialGradient>

      {/* Dragon teeth gradient (white/cream) */}
      <linearGradient id={`dragon-teeth-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
        <stop offset="50%" stopColor="#F9FAFB" stopOpacity={1} />
        <stop offset="100%" stopColor="#E5E7EB" stopOpacity={1} />
      </linearGradient>

      {/* Power aura gradient (changes with power level) */}
      <radialGradient id={`dragon-aura-${gradientId}`} cx="50%" cy="50%" r="60%">
        <stop 
          offset="0%" 
          stopColor={colors.primary} 
          stopOpacity={0.1 * colors.intensity} 
        />
        <stop 
          offset="50%" 
          stopColor={colors.highlight} 
          stopOpacity={0.3 * colors.intensity} 
        />
        <stop 
          offset="100%" 
          stopColor={colors.primary} 
          stopOpacity={0.6 * colors.intensity} 
        />
      </radialGradient>

      {/* Power-up energy gradient (for extreme power levels) */}
      <radialGradient id={`dragon-energy-${gradientId}`} cx="50%" cy="50%" r="80%">
        <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.8} />
        <stop offset="40%" stopColor="#F59E0B" stopOpacity={0.6} />
        <stop offset="80%" stopColor="#D97706" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#92400E" stopOpacity={0.2} />
      </radialGradient>

      {/* Shadow gradient */}
      <radialGradient id={`dragon-shadow-${gradientId}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0.8} />
      </radialGradient>

      {/* Scale pattern */}
      <pattern 
        id={`dragon-scale-pattern-${gradientId}`} 
        x="0" 
        y="0" 
        width="20" 
        height="20" 
        patternUnits="userSpaceOnUse"
      >
        <circle cx="10" cy="10" r="8" fill={colors.primary} opacity="0.3" />
        <circle cx="10" cy="10" r="6" fill={colors.highlight} opacity="0.5" />
        <circle cx="10" cy="10" r="3" fill={colors.secondary} opacity="0.7" />
      </pattern>

      {/* Filters for various effects */}
      <filter id={`dragon-glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <filter id={`dragon-aura-${gradientId}`} x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
        <feColorMatrix 
          in="coloredBlur" 
          type="matrix" 
          values={`0 0 0 0 ${colors.intensity * 0.1}
                   0 0 0 0 ${colors.intensity * 0.7}
                   0 0 0 0 ${colors.intensity * 0.5}
                   0 0 0 ${colors.intensity * 0.3} 0`}
        />
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <filter id={`dragon-shadow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.3"/>
      </filter>

      {/* Power-up energy filter (for legendary power levels) */}
      <filter id={`dragon-energy-${gradientId}`} x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="8" result="energyBlur"/>
        <feColorMatrix 
          in="energyBlur" 
          type="matrix" 
          values="0 0 0 0 1
                  0 0 0 0 0.8
                  0 0 0 0 0.2
                  0 0 0 0.6 0"
        />
        <feMerge>
          <feMergeNode in="energyBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      {/* Breathing animation (subtle scale filter) */}
      <filter id={`dragon-breathing-${gradientId}`}>
        <feGaussianBlur stdDeviation="0.5" result="breathe"/>
        <feMerge>
          <feMergeNode in="breathe"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      {/* State-specific patterns */}
      {state === 'powering-up' && (
        <pattern 
          id={`dragon-energy-pattern-${gradientId}`} 
          x="0" 
          y="0" 
          width="30" 
          height="30" 
          patternUnits="userSpaceOnUse"
        >
          <circle cx="15" cy="15" r="12" fill="#FBBF24" opacity="0.2" />
          <circle cx="15" cy="15" r="8" fill="#F59E0B" opacity="0.4" />
          <circle cx="15" cy="15" r="4" fill="#D97706" opacity="0.6" />
        </pattern>
      )}

      {/* Sleeping state - dimmed colors */}
      {state === 'sleeping' && (
        <filter id={`dragon-sleep-${gradientId}`}>
          <feColorMatrix 
            type="matrix" 
            values="0.5 0 0 0 0
                    0 0.5 0 0 0
                    0 0 0.5 0 0
                    0 0 0 0.8 0"
          />
        </filter>
      )}

      {/* Attention state - enhanced focus */}
      {state === 'attention' && (
        <filter id={`dragon-focus-${gradientId}`}>
          <feColorMatrix 
            type="matrix" 
            values="1.2 0 0 0 0
                    0 1.2 0 0 0
                    0 0 1.2 0 0
                    0 0 0 1 0"
          />
        </filter>
      )}
    </defs>
  );
};

export default SVGGradients;