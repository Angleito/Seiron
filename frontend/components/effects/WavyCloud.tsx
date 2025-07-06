import { cn } from '@lib/utils'

interface WavyCloudProps {
  className?: string
}

export function WavyCloud({ className }: WavyCloudProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <svg className="absolute w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#991b1b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#b91c1c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          className="animate-wave"
          d="M0,100 Q150,50 300,100 T600,100 L600,0 L0,0 Z"
          fill="url(#cloudGradient)"
          filter="url(#glow)"
          transform="scale(2, 1)"
        />
        <path
          className="animate-wave-reverse"
          d="M0,150 Q200,100 400,150 T800,150 L800,0 L0,0 Z"
          fill="url(#cloudGradient)"
          opacity="0.5"
          transform="scale(1.5, 0.8)"
        />
      </svg>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.1); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes wave-reverse {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(25%) scaleY(0.9); }
          100% { transform: translateX(0) scaleY(1); }
        }
        .animate-wave {
          animation: wave 8s ease-in-out infinite;
        }
        .animate-wave-reverse {
          animation: wave-reverse 12s ease-in-out infinite;
        }
      `}} />
    </div>
  )
}