import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface DragonHeadProps {
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
  gradientId: string;
  attentionTarget?: { x: number; y: number };
  className?: string;
}

export const DragonHead: React.FC<DragonHeadProps> = ({
  state,
  mood,
  powerIntensity,
  gradientId,
  attentionTarget,
  className = ''
}) => {
  // Calculate head rotation based on attention target
  const headRotation = attentionTarget ? 
    Math.atan2(attentionTarget.y - 0, attentionTarget.x - 0) * (180 / Math.PI) * 0.1 : 0;

  // Calculate jaw opening based on state
  const getJawOpening = () => {
    switch (state) {
      case 'active':
      case 'powering-up':
        return 8; // Wide open for roaring
      case 'ready':
        return 4; // Slightly open
      case 'sleeping':
        return 0; // Closed
      default:
        return 2; // Slightly parted
    }
  };

  const jawOpening = getJawOpening();

  // Calculate antler positioning based on mood
  const getAntlerSpread = () => {
    switch (mood) {
      case 'aggressive':
        return 15; // Wide spread
      case 'confident':
        return 12; // Medium spread
      case 'excited':
        return 10; // Slight spread
      default:
        return 8; // Natural position
    }
  };

  const antlerSpread = getAntlerSpread();

  return (
    <g className={`dragon-head ${className}`} transform={`rotate(${headRotation})`}>
      {/* Head base shape - elongated oval */}
      <ellipse
        cx="0"
        cy="-40"
        rx="45"
        ry="35"
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="2"
        filter={state === 'powering-up' ? `url(#dragon-glow-${gradientId})` : undefined}
      />

      {/* Snout */}
      <ellipse
        cx="0"
        cy="-15"
        rx="25"
        ry="15"
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="1"
      />

      {/* Nostrils */}
      <ellipse cx="-8" cy="-10" rx="3" ry="2" fill="#064E3B" />
      <ellipse cx="8" cy="-10" rx="3" ry="2" fill="#064E3B" />

      {/* Upper jaw */}
      <path
        d={`M -20 -5 Q 0 -2 20 -5 Q 15 ${5 + jawOpening} 0 ${8 + jawOpening} Q -15 ${5 + jawOpening} -20 -5`}
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="1"
      />

      {/* Lower jaw */}
      <path
        d={`M -15 ${5 + jawOpening} Q 0 ${12 + jawOpening} 15 ${5 + jawOpening} Q 10 ${2 + jawOpening} 0 ${2 + jawOpening} Q -10 ${2 + jawOpening} -15 ${5 + jawOpening}`}
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="1"
      />

      {/* Teeth - upper */}
      <g className="dragon-teeth-upper">
        <polygon
          points="-15,-2 -12,5 -9,-2"
          fill={`url(#dragon-teeth-${gradientId})`}
        />
        <polygon
          points="-6,-2 -3,6 0,-2"
          fill={`url(#dragon-teeth-${gradientId})`}
        />
        <polygon
          points="0,-2 3,6 6,-2"
          fill={`url(#dragon-teeth-${gradientId})`}
        />
        <polygon
          points="9,-2 12,5 15,-2"
          fill={`url(#dragon-teeth-${gradientId})`}
        />
      </g>

      {/* Teeth - lower */}
      <g className="dragon-teeth-lower">
        <polygon
          points={`-12,${8 + jawOpening} -9,${2 + jawOpening} -6,${8 + jawOpening}`}
          fill={`url(#dragon-teeth-${gradientId})`}
        />
        <polygon
          points={`-3,${8 + jawOpening} 0,${2 + jawOpening} 3,${8 + jawOpening}`}
          fill={`url(#dragon-teeth-${gradientId})`}
        />
        <polygon
          points={`6,${8 + jawOpening} 9,${2 + jawOpening} 12,${8 + jawOpening}`}
          fill={`url(#dragon-teeth-${gradientId})`}
        />
      </g>

      {/* Antlers */}
      <g className="dragon-antlers">
        {/* Left antler */}
        <g transform={`rotate(${-20 - antlerSpread}) translate(-30, -60)`}>
          <path
            d="M 0 0 Q -5 -15 -8 -25 Q -10 -35 -6 -45 Q -2 -50 2 -48 Q 6 -45 4 -35 Q 2 -25 0 -15 Q 5 -5 0 0"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="1"
          />
          {/* Antler branches */}
          <path
            d="M -4 -30 Q -12 -32 -15 -38 Q -16 -42 -12 -40 Q -8 -38 -4 -30"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="0.5"
          />
          <path
            d="M 2 -25 Q 8 -28 12 -35 Q 14 -38 10 -36 Q 6 -33 2 -25"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="0.5"
          />
        </g>

        {/* Right antler */}
        <g transform={`rotate(${20 + antlerSpread}) translate(30, -60)`}>
          <path
            d="M 0 0 Q 5 -15 8 -25 Q 10 -35 6 -45 Q 2 -50 -2 -48 Q -6 -45 -4 -35 Q -2 -25 0 -15 Q -5 -5 0 0"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="1"
          />
          {/* Antler branches */}
          <path
            d="M 4 -30 Q 12 -32 15 -38 Q 16 -42 12 -40 Q 8 -38 4 -30"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="0.5"
          />
          <path
            d="M -2 -25 Q -8 -28 -12 -35 Q -14 -38 -10 -36 Q -6 -33 -2 -25"
            fill={`url(#dragon-antler-${gradientId})`}
            stroke="#92400E"
            strokeWidth="0.5"
          />
        </g>
      </g>

      {/* Whiskers */}
      <g className="dragon-whiskers">
        <line
          x1="-35"
          y1="-20"
          x2="-55"
          y2="-25"
          stroke={`url(#dragon-antler-${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="-35"
          y1="-10"
          x2="-50"
          y2="-10"
          stroke={`url(#dragon-antler-${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="35"
          y1="-20"
          x2="55"
          y2="-25"
          stroke={`url(#dragon-antler-${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="35"
          y1="-10"
          x2="50"
          y2="-10"
          stroke={`url(#dragon-antler-${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Neck connection */}
      <ellipse
        cx="0"
        cy="10"
        rx="20"
        ry="12"
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="1"
      />

      {/* Facial details */}
      <g className="dragon-face-details">
        {/* Brow ridge */}
        <path
          d="M -25 -50 Q 0 -55 25 -50 Q 20 -45 0 -48 Q -20 -45 -25 -50"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.6"
        />
        
        {/* Cheek scales */}
        <circle cx="-20" cy="-30" r="4" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        <circle cx="-15" cy="-25" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.3" />
        <circle cx="20" cy="-30" r="4" fill={`url(#dragon-scales-${gradientId})`} opacity="0.4" />
        <circle cx="15" cy="-25" r="3" fill={`url(#dragon-scales-${gradientId})`} opacity="0.3" />
      </g>

      {/* Power aura effect for high power states */}
      {powerIntensity > 0.8 && (
        <ellipse
          cx="0"
          cy="-40"
          rx="60"
          ry="45"
          fill="none"
          stroke={`url(#dragon-energy-${gradientId})`}
          strokeWidth="2"
          opacity="0.6"
          filter={`url(#dragon-glow-${gradientId})`}
        />
      )}
    </g>
  );
};

export default DragonHead;