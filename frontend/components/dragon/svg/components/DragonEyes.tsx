import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface DragonEyesProps {
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
  gradientId: string;
  attentionTarget?: { x: number; y: number };
  className?: string;
}

export const DragonEyes: React.FC<DragonEyesProps> = ({
  state,
  mood,
  powerIntensity,
  gradientId,
  attentionTarget,
  className = ''
}) => {
  // Calculate eye size based on state
  const getEyeSize = () => {
    switch (state) {
      case 'sleeping':
        return { width: 2, height: 1 }; // Nearly closed
      case 'awakening':
        return { width: 8, height: 4 }; // Half open
      case 'attention':
        return { width: 12, height: 10 }; // Wide open
      case 'active':
      case 'powering-up':
        return { width: 14, height: 12 }; // Fully open
      default:
        return { width: 10, height: 8 }; // Normal
    }
  };

  const eyeSize = getEyeSize();

  // Calculate pupil dilation based on mood and power
  const getPupilSize = () => {
    const basePupilSize = 3;
    
    switch (mood) {
      case 'aggressive':
        return basePupilSize * 0.6; // Contracted
      case 'excited':
        return basePupilSize * 1.2; // Dilated
      case 'focused':
        return basePupilSize * 0.8; // Slightly contracted
      default:
        return basePupilSize;
    }
  };

  const pupilSize = getPupilSize();

  // Calculate eye glow intensity based on power level
  const getGlowIntensity = () => {
    if (powerIntensity > 1.0) return 1.0; // Legendary power
    if (powerIntensity > 0.8) return 0.8; // High power
    if (powerIntensity > 0.6) return 0.6; // Medium power
    return 0.3; // Low power
  };

  const glowIntensity = getGlowIntensity();

  // Calculate eye direction based on attention target
  const getEyeDirection = () => {
    if (!attentionTarget) return { x: 0, y: 0 };
    
    const maxOffset = 2; // Maximum pupil offset
    const dx = attentionTarget.x * 0.01; // Scale down the movement
    const dy = attentionTarget.y * 0.01;
    
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, dx)),
      y: Math.max(-maxOffset, Math.min(maxOffset, dy))
    };
  };

  const eyeDirection = getEyeDirection();

  // Calculate eyelid position based on state
  const getEyelidPosition = () => {
    switch (state) {
      case 'sleeping':
        return 8; // Fully closed
      case 'awakening':
        return 4; // Half closed
      case 'attention':
        return -2; // Slightly raised
      case 'active':
      case 'powering-up':
        return -4; // Fully raised
      default:
        return 0; // Normal
    }
  };

  const eyelidPosition = getEyelidPosition();

  // Calculate eye color based on state and mood
  const getEyeColor = () => {
    if (state === 'powering-up' && powerIntensity > 1.0) {
      return '#FBBF24'; // Golden for legendary power
    }
    
    switch (mood) {
      case 'aggressive':
        return '#DC2626'; // Deep red
      case 'excited':
        return '#F59E0B'; // Orange-red
      case 'mystical':
        return '#8B5CF6'; // Purple
      default:
        return '#EF4444'; // Standard red
    }
  };

  const eyeColor = getEyeColor();

  return (
    <g className={`dragon-eyes ${className}`}>
      {/* Eye sockets/brow area */}
      <g className="dragon-eye-sockets">
        <ellipse
          cx="-18"
          cy="-45"
          rx="15"
          ry="12"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.6"
        />
        <ellipse
          cx="18"
          cy="-45"
          rx="15"
          ry="12"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.6"
        />
      </g>

      {/* Left Eye */}
      <g className="dragon-left-eye">
        {/* Eye white */}
        <ellipse
          cx="-18"
          cy="-45"
          rx={eyeSize.width}
          ry={eyeSize.height}
          fill="#FFFFFF"
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* Eye iris */}
        <ellipse
          cx={-18 + eyeDirection.x}
          cy={-45 + eyeDirection.y}
          rx={eyeSize.width * 0.7}
          ry={eyeSize.height * 0.8}
          fill={`url(#dragon-eyes-${gradientId})`}
        />
        
        {/* Eye pupil */}
        <ellipse
          cx={-18 + eyeDirection.x}
          cy={-45 + eyeDirection.y}
          rx={pupilSize}
          ry={pupilSize}
          fill="#000000"
        />
        
        {/* Eye highlight */}
        <ellipse
          cx={-16 + eyeDirection.x}
          cy={-47 + eyeDirection.y}
          rx="2"
          ry="2"
          fill="#FFFFFF"
          opacity="0.8"
        />
        
        {/* Power glow */}
        {powerIntensity > 0.5 && (
          <ellipse
            cx="-18"
            cy="-45"
            rx={eyeSize.width + 3}
            ry={eyeSize.height + 3}
            fill="none"
            stroke={eyeColor}
            strokeWidth="2"
            opacity={glowIntensity}
            filter={`url(#dragon-glow-${gradientId})`}
          />
        )}
      </g>

      {/* Right Eye */}
      <g className="dragon-right-eye">
        {/* Eye white */}
        <ellipse
          cx="18"
          cy="-45"
          rx={eyeSize.width}
          ry={eyeSize.height}
          fill="#FFFFFF"
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* Eye iris */}
        <ellipse
          cx={18 + eyeDirection.x}
          cy={-45 + eyeDirection.y}
          rx={eyeSize.width * 0.7}
          ry={eyeSize.height * 0.8}
          fill={`url(#dragon-eyes-${gradientId})`}
        />
        
        {/* Eye pupil */}
        <ellipse
          cx={18 + eyeDirection.x}
          cy={-45 + eyeDirection.y}
          rx={pupilSize}
          ry={pupilSize}
          fill="#000000"
        />
        
        {/* Eye highlight */}
        <ellipse
          cx={20 + eyeDirection.x}
          cy={-47 + eyeDirection.y}
          rx="2"
          ry="2"
          fill="#FFFFFF"
          opacity="0.8"
        />
        
        {/* Power glow */}
        {powerIntensity > 0.5 && (
          <ellipse
            cx="18"
            cy="-45"
            rx={eyeSize.width + 3}
            ry={eyeSize.height + 3}
            fill="none"
            stroke={eyeColor}
            strokeWidth="2"
            opacity={glowIntensity}
            filter={`url(#dragon-glow-${gradientId})`}
          />
        )}
      </g>

      {/* Eyelids */}
      <g className="dragon-eyelids">
        {/* Left eyelid */}
        <path
          d={`M -28 ${-45 + eyelidPosition} Q -18 ${-50 + eyelidPosition} -8 ${-45 + eyelidPosition} Q -18 ${-40 + eyelidPosition} -28 ${-45 + eyelidPosition}`}
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
          opacity={state === 'sleeping' ? 1.0 : 0.3}
        />
        
        {/* Right eyelid */}
        <path
          d={`M 28 ${-45 + eyelidPosition} Q 18 ${-50 + eyelidPosition} 8 ${-45 + eyelidPosition} Q 18 ${-40 + eyelidPosition} 28 ${-45 + eyelidPosition}`}
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
          opacity={state === 'sleeping' ? 1.0 : 0.3}
        />
      </g>

      {/* Eye expressions based on mood */}
      {mood === 'aggressive' && (
        <g className="dragon-angry-expression">
          {/* Angry brow */}
          <path
            d="M -25 -55 L -15 -50 L -10 -55"
            fill="none"
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 25 -55 L 15 -50 L 10 -55"
            fill="none"
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {mood === 'happy' && (
        <g className="dragon-happy-expression">
          {/* Happy crinkles */}
          <path
            d="M -25 -40 Q -20 -35 -15 -40"
            fill="none"
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 25 -40 Q 20 -35 15 -40"
            fill="none"
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      )}

      {mood === 'mystical' && (
        <g className="dragon-mystical-expression">
          {/* Mystical sparkles */}
          <g className="dragon-eye-sparkles">
            <polygon
              points="-25,-50 -23,-52 -25,-54 -27,-52"
              fill="#FFFFFF"
              opacity="0.8"
            />
            <polygon
              points="25,-50 27,-52 25,-54 23,-52"
              fill="#FFFFFF"
              opacity="0.8"
            />
            <polygon
              points="-12,-52 -10,-54 -12,-56 -14,-54"
              fill="#FFFFFF"
              opacity="0.6"
            />
            <polygon
              points="12,-52 14,-54 12,-56 10,-54"
              fill="#FFFFFF"
              opacity="0.6"
            />
          </g>
        </g>
      )}

      {/* Legendary power eye beams */}
      {powerIntensity > 1.0 && (
        <g className="dragon-legendary-eye-beams">
          <path
            d="M -18 -45 L -40 -60 L -35 -55 L -15 -42 Z"
            fill={eyeColor}
            opacity="0.6"
            filter={`url(#dragon-glow-${gradientId})`}
          />
          <path
            d="M 18 -45 L 40 -60 L 35 -55 L 15 -42 Z"
            fill={eyeColor}
            opacity="0.6"
            filter={`url(#dragon-glow-${gradientId})`}
          />
        </g>
      )}

      {/* Blinking animation overlay */}
      {state === 'awakening' && (
        <g className="dragon-blinking-overlay">
          <ellipse
            cx="-18"
            cy="-45"
            rx={eyeSize.width}
            ry="1"
            fill={`url(#dragon-body-${gradientId})`}
            opacity="0.5"
          />
          <ellipse
            cx="18"
            cy="-45"
            rx={eyeSize.width}
            ry="1"
            fill={`url(#dragon-body-${gradientId})`}
            opacity="0.5"
          />
        </g>
      )}
    </g>
  );
};

export default DragonEyes;