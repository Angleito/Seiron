import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface DragonBodyProps {
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
  gradientId: string;
  className?: string;
}

export const DragonBody: React.FC<DragonBodyProps> = ({
  state,
  mood,
  powerIntensity,
  gradientId,
  className = ''
}) => {
  // Calculate body position based on state
  const getBodyOffset = () => {
    switch (state) {
      case 'ready':
        return { x: 0, y: -5 };
      case 'active':
        return { x: 0, y: -10 };
      case 'powering-up':
        return { x: 0, y: -15 };
      case 'sleeping':
        return { x: 0, y: 10 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const bodyOffset = getBodyOffset();

  // Calculate body expansion based on power level
  const getBodyScale = () => {
    if (powerIntensity > 1.0) return 1.1; // Legendary power
    if (powerIntensity > 0.8) return 1.05; // High power
    return 1.0; // Normal
  };

  const bodyScale = getBodyScale();

  // Calculate spine curve based on state
  const getSpineCurve = () => {
    switch (state) {
      case 'attention':
        return 'M 0 20 Q -10 40 -5 70 Q 0 100 5 130 Q 10 160 0 190';
      case 'ready':
        return 'M 0 20 Q -5 40 0 70 Q 5 100 0 130 Q -5 160 0 190';
      case 'active':
        return 'M 0 20 Q -15 40 -10 70 Q 0 100 10 130 Q 15 160 0 190';
      case 'sleeping':
        return 'M 0 20 Q 15 40 20 70 Q 15 100 10 130 Q 5 160 0 190';
      default:
        return 'M 0 20 Q -8 40 -3 70 Q 2 100 -2 130 Q -8 160 0 190';
    }
  };

  const spineCurve = getSpineCurve();

  return (
    <g 
      className={`dragon-body ${className}`} 
      transform={`translate(${bodyOffset.x}, ${bodyOffset.y}) scale(${bodyScale})`}
    >
      {/* Main body segments */}
      <g className="dragon-body-segments">
        {/* Neck/chest segment */}
        <ellipse
          cx="0"
          cy="25"
          rx="30"
          ry="20"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />

        {/* Upper torso */}
        <ellipse
          cx="0"
          cy="55"
          rx="40"
          ry="25"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />

        {/* Mid torso */}
        <ellipse
          cx="0"
          cy="90"
          rx="35"
          ry="22"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />

        {/* Lower torso */}
        <ellipse
          cx="0"
          cy="125"
          rx="30"
          ry="18"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />

        {/* Hip/tail connection */}
        <ellipse
          cx="0"
          cy="155"
          rx="25"
          ry="15"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />
      </g>

      {/* Belly/chest detail */}
      <g className="dragon-belly">
        <ellipse
          cx="0"
          cy="55"
          rx="25"
          ry="18"
          fill={`url(#dragon-belly-${gradientId})`}
          opacity="0.8"
        />
        <ellipse
          cx="0"
          cy="90"
          rx="22"
          ry="15"
          fill={`url(#dragon-belly-${gradientId})`}
          opacity="0.7"
        />
        <ellipse
          cx="0"
          cy="125"
          rx="18"
          ry="12"
          fill={`url(#dragon-belly-${gradientId})`}
          opacity="0.6"
        />
      </g>

      {/* Spine ridge */}
      <path
        d={spineCurve}
        fill="none"
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Spine spikes */}
      <g className="dragon-spine-spikes">
        <polygon
          points="0,30 -4,22 4,22"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,50 -5,40 5,40"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,70 -6,58 6,58"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,90 -6,78 6,78"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,110 -5,100 5,100"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,130 -4,122 4,122"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="0,150 -3,144 3,144"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
      </g>

      {/* Scale details */}
      <g className="dragon-scale-details">
        {/* Left side scales */}
        <g className="dragon-scales-left">
          <circle cx="-20" cy="40" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="-18" cy="48" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="-25" cy="60" r="4" fill={`url(#dragon-scales-${gradientId})`} opacity="0.6" />
          <circle cx="-22" cy="70" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="-20" cy="80" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="-23" cy="95" r="3.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="-18" cy="105" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="-20" cy="115" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="-15" cy="135" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        </g>

        {/* Right side scales */}
        <g className="dragon-scales-right">
          <circle cx="20" cy="40" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="18" cy="48" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="25" cy="60" r="4" fill={`url(#dragon-scales-${gradientId})`} opacity="0.6" />
          <circle cx="22" cy="70" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="20" cy="80" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="23" cy="95" r="3.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="18" cy="105" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="20" cy="115" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="15" cy="135" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        </g>
      </g>

      {/* Muscle definition */}
      <g className="dragon-muscle-definition">
        <path
          d="M -25 45 Q -15 50 -25 55 Q -20 60 -25 65"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M 25 45 Q 15 50 25 55 Q 20 60 25 65"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M -20 80 Q -10 85 -20 90 Q -15 95 -20 100"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M 20 80 Q 10 85 20 90 Q 15 95 20 100"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="1"
          opacity="0.3"
        />
      </g>

      {/* Power aura effect for high power states */}
      {powerIntensity > 0.8 && (
        <g className="dragon-power-aura">
          <ellipse
            cx="0"
            cy="55"
            rx="50"
            ry="35"
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="2"
            opacity="0.4"
            filter={`url(#dragon-glow-${gradientId})`}
          />
          <ellipse
            cx="0"
            cy="90"
            rx="45"
            ry="30"
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="2"
            opacity="0.3"
            filter={`url(#dragon-glow-${gradientId})`}
          />
        </g>
      )}

      {/* Breathing effect overlay */}
      {state !== 'sleeping' && (
        <g className="dragon-breathing-overlay">
          <ellipse
            cx="0"
            cy="55"
            rx="38"
            ry="23"
            fill={`url(#dragon-body-${gradientId})`}
            opacity="0.1"
          />
          <ellipse
            cx="0"
            cy="90"
            rx="33"
            ry="20"
            fill={`url(#dragon-body-${gradientId})`}
            opacity="0.1"
          />
        </g>
      )}
    </g>
  );
};

export default DragonBody;