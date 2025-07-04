import React from 'react';
import type { DragonState, DragonMood } from '../../types';

interface DragonLimbsProps {
  state: DragonState;
  mood: DragonMood;
  powerIntensity: number;
  gradientId: string;
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open';
  className?: string;
}

export const DragonLimbs: React.FC<DragonLimbsProps> = ({
  state,
  mood,
  powerIntensity,
  gradientId,
  armsVariant = 'ready',
  className = ''
}) => {
  // Calculate arm positions based on state and variant
  const getArmPositions = () => {
    switch (armsVariant) {
      case 'crossed':
        return {
          leftArm: { rotation: -45, offsetX: 15, offsetY: 0 },
          rightArm: { rotation: 45, offsetX: -15, offsetY: 0 }
        };
      case 'attack':
        return {
          leftArm: { rotation: -30, offsetX: -10, offsetY: -20 },
          rightArm: { rotation: 30, offsetX: 10, offsetY: -20 }
        };
      case 'defensive':
        return {
          leftArm: { rotation: -60, offsetX: -20, offsetY: -10 },
          rightArm: { rotation: 60, offsetX: 20, offsetY: -10 }
        };
      case 'open':
        return {
          leftArm: { rotation: -90, offsetX: -30, offsetY: 0 },
          rightArm: { rotation: 90, offsetX: 30, offsetY: 0 }
        };
      default: // 'ready'
        return {
          leftArm: { rotation: -15, offsetX: -5, offsetY: 0 },
          rightArm: { rotation: 15, offsetX: 5, offsetY: 0 }
        };
    }
  };

  const armPositions = getArmPositions();

  // Calculate leg positions based on state
  const getLegPositions = () => {
    switch (state) {
      case 'ready':
        return {
          leftLeg: { rotation: 10, offsetX: -5, offsetY: -5 },
          rightLeg: { rotation: -10, offsetX: 5, offsetY: -5 }
        };
      case 'active':
        return {
          leftLeg: { rotation: 15, offsetX: -10, offsetY: -10 },
          rightLeg: { rotation: -15, offsetX: 10, offsetY: -10 }
        };
      case 'powering-up':
        return {
          leftLeg: { rotation: 20, offsetX: -15, offsetY: -15 },
          rightLeg: { rotation: -20, offsetX: 15, offsetY: -15 }
        };
      case 'sleeping':
        return {
          leftLeg: { rotation: -5, offsetX: 10, offsetY: 10 },
          rightLeg: { rotation: 5, offsetX: -10, offsetY: 10 }
        };
      default:
        return {
          leftLeg: { rotation: 0, offsetX: 0, offsetY: 0 },
          rightLeg: { rotation: 0, offsetX: 0, offsetY: 0 }
        };
    }
  };

  const legPositions = getLegPositions();

  // Four-fingered claw component
  const DragonClaw = ({ size = 1, rotation = 0 }) => (
    <g className="dragon-claw" transform={`rotate(${rotation}) scale(${size})`}>
      {/* Palm */}
      <ellipse
        cx="0"
        cy="0"
        rx="8"
        ry="6"
        fill={`url(#dragon-body-${gradientId})`}
        stroke={`url(#dragon-scales-${gradientId})`}
        strokeWidth="1"
      />
      
      {/* Four fingers */}
      <g className="dragon-fingers">
        {/* Thumb */}
        <ellipse
          cx="-10"
          cy="-3"
          rx="3"
          ry="8"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* Index finger */}
        <ellipse
          cx="-3"
          cy="-12"
          rx="2.5"
          ry="10"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* Middle finger */}
        <ellipse
          cx="3"
          cy="-12"
          rx="2.5"
          ry="10"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* Ring finger */}
        <ellipse
          cx="8"
          cy="-10"
          rx="2"
          ry="8"
          fill={`url(#dragon-body-${gradientId})`}
          stroke={`url(#dragon-scales-${gradientId})`}
          strokeWidth="0.5"
        />
      </g>
      
      {/* Claws */}
      <g className="dragon-claws">
        <polygon
          points="-13,-8 -11,-15 -9,-8"
          fill={`url(#dragon-teeth-${gradientId})`}
          stroke="#E5E7EB"
          strokeWidth="0.3"
        />
        <polygon
          points="-5,-18 -3,-25 -1,-18"
          fill={`url(#dragon-teeth-${gradientId})`}
          stroke="#E5E7EB"
          strokeWidth="0.3"
        />
        <polygon
          points="1,-18 3,-25 5,-18"
          fill={`url(#dragon-teeth-${gradientId})`}
          stroke="#E5E7EB"
          strokeWidth="0.3"
        />
        <polygon
          points="6,-15 8,-22 10,-15"
          fill={`url(#dragon-teeth-${gradientId})`}
          stroke="#E5E7EB"
          strokeWidth="0.3"
        />
      </g>
    </g>
  );

  return (
    <g className={`dragon-limbs ${className}`}>
      {/* Left Arm */}
      <g className="dragon-left-arm">
        <g 
          transform={`translate(${-35 + armPositions.leftArm.offsetX}, ${60 + armPositions.leftArm.offsetY}) rotate(${armPositions.leftArm.rotation})`}
        >
          {/* Upper arm */}
          <ellipse
            cx="0"
            cy="0"
            rx="12"
            ry="25"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Elbow joint */}
          <circle
            cx="0"
            cy="20"
            r="8"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Forearm */}
          <ellipse
            cx="0"
            cy="35"
            rx="8"
            ry="20"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Wrist */}
          <circle
            cx="0"
            cy="50"
            r="6"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Hand */}
          <g transform="translate(0, 60)">
            <DragonClaw size={1} rotation={0} />
          </g>
        </g>
      </g>

      {/* Right Arm */}
      <g className="dragon-right-arm">
        <g 
          transform={`translate(${35 + armPositions.rightArm.offsetX}, ${60 + armPositions.rightArm.offsetY}) rotate(${armPositions.rightArm.rotation})`}
        >
          {/* Upper arm */}
          <ellipse
            cx="0"
            cy="0"
            rx="12"
            ry="25"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Elbow joint */}
          <circle
            cx="0"
            cy="20"
            r="8"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Forearm */}
          <ellipse
            cx="0"
            cy="35"
            rx="8"
            ry="20"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Wrist */}
          <circle
            cx="0"
            cy="50"
            r="6"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Hand */}
          <g transform="translate(0, 60)">
            <DragonClaw size={1} rotation={0} />
          </g>
        </g>
      </g>

      {/* Left Leg */}
      <g className="dragon-left-leg">
        <g 
          transform={`translate(${-25 + legPositions.leftLeg.offsetX}, ${130 + legPositions.leftLeg.offsetY}) rotate(${legPositions.leftLeg.rotation})`}
        >
          {/* Upper leg */}
          <ellipse
            cx="0"
            cy="0"
            rx="15"
            ry="30"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
          />
          
          {/* Knee joint */}
          <circle
            cx="0"
            cy="25"
            r="10"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Lower leg */}
          <ellipse
            cx="0"
            cy="45"
            rx="10"
            ry="25"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
          />
          
          {/* Ankle */}
          <circle
            cx="0"
            cy="65"
            r="8"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Foot */}
          <g transform="translate(0, 80)">
            <DragonClaw size={1.2} rotation={0} />
          </g>
        </g>
      </g>

      {/* Right Leg */}
      <g className="dragon-right-leg">
        <g 
          transform={`translate(${25 + legPositions.rightLeg.offsetX}, ${130 + legPositions.rightLeg.offsetY}) rotate(${legPositions.rightLeg.rotation})`}
        >
          {/* Upper leg */}
          <ellipse
            cx="0"
            cy="0"
            rx="15"
            ry="30"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
          />
          
          {/* Knee joint */}
          <circle
            cx="0"
            cy="25"
            r="10"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1.5"
          />
          
          {/* Lower leg */}
          <ellipse
            cx="0"
            cy="45"
            rx="10"
            ry="25"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="2"
          />
          
          {/* Ankle */}
          <circle
            cx="0"
            cy="65"
            r="8"
            fill={`url(#dragon-body-${gradientId})`}
            stroke={`url(#dragon-scales-${gradientId})`}
            strokeWidth="1"
          />
          
          {/* Foot */}
          <g transform="translate(0, 80)">
            <DragonClaw size={1.2} rotation={0} />
          </g>
        </g>
      </g>

      {/* Muscle definition and scale details */}
      <g className="dragon-limb-details">
        {/* Arm muscles */}
        <ellipse
          cx="-35"
          cy="50"
          rx="8"
          ry="15"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.3"
        />
        <ellipse
          cx="35"
          cy="50"
          rx="8"
          ry="15"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.3"
        />
        
        {/* Leg muscles */}
        <ellipse
          cx="-25"
          cy="140"
          rx="10"
          ry="18"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.3"
        />
        <ellipse
          cx="25"
          cy="140"
          rx="10"
          ry="18"
          fill={`url(#dragon-scales-${gradientId})`}
          opacity="0.3"
        />
      </g>

      {/* Power aura effect for high power states */}
      {powerIntensity > 0.8 && (
        <g className="dragon-limb-aura">
          <ellipse
            cx="-35"
            cy="80"
            rx="20"
            ry="50"
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="2"
            opacity="0.4"
            filter={`url(#dragon-glow-${gradientId})`}
          />
          <ellipse
            cx="35"
            cy="80"
            rx="20"
            ry="50"
            fill="none"
            stroke={`url(#dragon-energy-${gradientId})`}
            strokeWidth="2"
            opacity="0.4"
            filter={`url(#dragon-glow-${gradientId})`}
          />
        </g>
      )}
    </g>
  );
};

export default DragonLimbs;