import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface DragonTailProps {
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
  gradientId: string;
  className?: string;
}

export const DragonTail: React.FC<DragonTailProps> = ({
  state,
  mood,
  powerIntensity,
  gradientId,
  className = ''
}) => {
  // Calculate tail curve based on state and mood
  const getTailCurve = () => {
    switch (state) {
      case 'attention':
        return 'M 0 170 Q 30 200 60 220 Q 90 240 120 250 Q 150 255 180 245 Q 200 235 210 220';
      case 'ready':
        return 'M 0 170 Q 20 190 40 210 Q 70 230 100 240 Q 130 245 160 240 Q 180 230 190 215';
      case 'active':
        return 'M 0 170 Q -20 190 -40 210 Q -60 230 -80 240 Q -100 245 -120 240 Q -140 230 -150 215';
      case 'powering-up':
        return 'M 0 170 Q -30 180 -50 200 Q -70 220 -90 240 Q -110 260 -130 270 Q -150 275 -170 270';
      case 'arms-crossed':
        return 'M 0 170 Q 40 190 80 200 Q 120 210 160 215 Q 190 220 220 215 Q 240 210 250 200';
      case 'sleeping':
        return 'M 0 170 Q 60 180 120 185 Q 180 190 240 185 Q 280 180 300 170 Q 320 160 330 145';
      case 'awakening':
        return 'M 0 170 Q 25 185 50 195 Q 80 205 110 210 Q 140 215 170 210 Q 190 205 200 195';
      default: // idle
        return 'M 0 170 Q 35 190 70 205 Q 105 220 140 230 Q 175 235 210 230 Q 235 225 245 215';
    }
  };

  const tailCurve = getTailCurve();

  // Calculate tail segments for flowing motion
  const getTailSegments = () => {
    const segments = [];
    const numSegments = 8;
    
    for (let i = 0; i < numSegments; i++) {
      const progress = i / numSegments;
      const size = 25 - (progress * 20); // Tapering from 25 to 5
      const x = 170 + (progress * 80); // Approximate positions along curve
      const y = 170 + (progress * 45);
      
      segments.push({ x, y, size });
    }
    
    return segments;
  };

  const tailSegments = getTailSegments();

  // Calculate tail fin spread based on power level
  const getFinSpread = () => {
    return Math.min(1 + (powerIntensity * 0.3), 1.5);
  };

  const finSpread = getFinSpread();

  return (
    <g className={`dragon-tail ${className}`}>
      {/* Main tail curve */}
      <path
        d={tailCurve}
        fill="none"
        stroke={`url(#dragon-body-${gradientId})`}
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Tail segments for better definition */}
      <g className="dragon-tail-segments">
        {tailSegments.map((segment, index) => (
          <ellipse
            key={index}
            cx={segment.x}
            cy={segment.y}
            rx={segment.size}
            ry={segment.size * 0.7}
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
            opacity="0.8"
          />
        ))}
      </g>

      {/* Tail belly/underside */}
      <path
        d={tailCurve}
        fill="none"
        stroke={`url(#dragon-belly-${gradientId})`}
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Tail spine ridge */}
      <path
        d={tailCurve}
        fill="none"
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* Tail spikes along the spine */}
      <g className="dragon-tail-spikes">
        <polygon
          points="0,165 -3,158 3,158"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="25,175 22,167 28,167"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="50,185 47,176 53,176"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="75,195 72,185 78,185"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="100,205 97,194 103,194"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="125,215 122,203 128,203"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
      </g>

      {/* Tail fin at the end */}
      <g className="dragon-tail-fin" transform={`translate(245, 215) scale(${finSpread})`}>
        {/* Main fin */}
        <path
          d="M 0 0 Q -15 -20 -10 -40 Q -5 -50 5 -45 Q 15 -40 20 -20 Q 25 -10 20 0 Q 15 10 5 15 Q -5 20 -10 10 Q -15 5 0 0"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="2"
        />
        
        {/* Fin details */}
        <path
          d="M 0 0 Q -8 -15 -5 -30 Q 0 -35 5 -30 Q 10 -25 15 -15 Q 18 -8 15 0"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.6"
        />
        
        {/* Fin spikes */}
        <polygon
          points="0,-35 -3,-42 3,-42"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="-8,-25 -11,-32 -5,-32"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
        <polygon
          points="8,-25 5,-32 11,-32"
          fill={`url(#dragon-antler-${gradientId})`}
          stroke="#92400E"
          strokeWidth="0.5"
        />
      </g>

      {/* Tail scale details */}
      <g className="dragon-tail-scale-details">
        {/* Left side scales */}
        <g className="dragon-tail-scales-left">
          <circle cx="15" cy="180" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="35" cy="185" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="55" cy="190" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="75" cy="195" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="95" cy="200" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="115" cy="205" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="135" cy="210" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="155" cy="215" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        </g>

        {/* Right side scales */}
        <g className="dragon-tail-scales-right">
          <circle cx="15" cy="185" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="35" cy="192" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="55" cy="198" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="75" cy="205" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="95" cy="212" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="115" cy="218" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
          <circle cx="135" cy="223" r="2" fill={`url(#dragon-scales-${gradientId})`} opacity="0.5" />
          <circle cx="155" cy="228" r="2.5" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        </g>
      </g>

      {/* Tail muscle definition */}
      <g className="dragon-tail-muscle-definition">
        <path
          d="M 10 175 Q 30 180 50 185 Q 70 190 90 195"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M 10 185 Q 30 190 50 195 Q 70 200 90 205"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M 90 200 Q 110 205 130 210 Q 150 215 170 220"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M 90 210 Q 110 215 130 220 Q 150 225 170 230"
          fill="none"
          stroke={`url(#dragon-shadow-${gradientId})`}
          strokeWidth="2"
          opacity="0.3"
        />
      </g>

      {/* Power aura effect for high power states */}
      {powerIntensity > 0.8 && (
        <g className="dragon-tail-aura">
          <path
            d={tailCurve}
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="40"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            filter={`url(#dragon-glow-${gradientId})`}
          />
          <path
            d={tailCurve}
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="50"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.2"
            filter={`url(#dragon-glow-${gradientId})`}
          />
        </g>
      )}

      {/* Tail motion blur effect for active states */}
      {(state === 'active' || state === 'powering-up') && (
        <g className="dragon-tail-motion-blur">
          <path
            d={tailCurve}
            fill="none"
            stroke={`url(#dragon-body-${gradientId})`}
            strokeWidth="35"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.2"
            filter={`url(#dragon-glow-${gradientId})`}
          />
        </g>
      )}
    </g>
  );
};

export default DragonTail;