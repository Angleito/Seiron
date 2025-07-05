'use client'

import { cn } from '@lib/utils'
import { cn } from '@lib/utils'

interface SeironDragonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'hero' | 'floating' | 'corner'
}

const sizeConfig = {
  sm: { width: 200, height: 200 },
  md: { width: 300, height: 300 },
  lg: { width: 400, height: 400 },
  xl: { width: 500, height: 500 }
}

export function SeironDragon({ 
  className, 
  size = 'lg',
  variant = 'hero'
}: SeironDragonProps) {
  const dimensions = sizeConfig[size]
  
  const containerStyles = {
    hero: 'relative mx-auto',
    floating: 'relative',
    corner: 'relative'
  }

  return (
    <div className={cn('dragon-container', containerStyles[variant], className)}>
      {/* Dark fiery environment background matching the image */}
      <div className="absolute inset-0 -z-10">
        {/* Base dark background */}
        <div className="absolute inset-0 bg-gradient-radial from-red-950 via-black to-black rounded-full scale-150" />
        
        {/* Fiery glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-900/40 via-red-900/30 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-red-800/30 to-transparent rounded-full blur-2xl animate-pulse delay-1000" />
        </div>
        
        {/* Dragon ball glow effects */}
        <div className="absolute top-0 left-0 w-16 h-16 bg-orange-500/30 rounded-full blur-xl animate-float" />
        <div className="absolute top-20 right-10 w-12 h-12 bg-orange-400/25 rounded-full blur-lg animate-float delay-500" />
        <div className="absolute bottom-10 left-20 w-14 h-14 bg-orange-500/20 rounded-full blur-xl animate-float delay-1000" />
        <div className="absolute bottom-20 right-0 w-10 h-10 bg-orange-400/30 rounded-full blur-lg animate-float delay-1500" />
      </div>

      {/* Seiron Dragon Image */}
      <div className="relative z-10">
        <img
          src="/seiron.png"
          alt="Seiron - The Eternal Dragon"
          width={dimensions.width}
          height={dimensions.height}
          className="drop-shadow-[0_0_50px_rgba(255,100,0,0.5)] animate-subtle-float"
          loading="eager"
        />
        
        {/* Additional glow effect around the dragon */}
        <div className="absolute inset-0 bg-gradient-radial from-orange-600/10 via-red-600/5 to-transparent blur-2xl -z-10 scale-110" />
      </div>

      {/* Animated embers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="ember ember-1" />
        <div className="ember ember-2" />
        <div className="ember ember-3" />
        <div className="ember ember-4" />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }

        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-subtle-float {
          animation: subtle-float 4s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }

        .ember {
          position: absolute;
          width: 3px;
          height: 3px;
          background: radial-gradient(circle, rgba(255, 150, 0, 0.8), transparent);
          border-radius: 50%;
          animation: ember-rise 4s linear infinite;
        }

        .ember-1 {
          left: 20%;
          animation-delay: 0s;
        }

        .ember-2 {
          left: 40%;
          animation-delay: 1s;
        }

        .ember-3 {
          left: 60%;
          animation-delay: 2s;
        }

        .ember-4 {
          left: 80%;
          animation-delay: 3s;
        }

        @keyframes ember-rise {
          0% {
            bottom: 0;
            opacity: 0;
            transform: translateX(0) scale(0);
          }
          10% {
            opacity: 1;
            transform: translateX(10px) scale(1);
          }
          90% {
            opacity: 1;
            transform: translateX(-10px) scale(1);
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: translateX(0) scale(0);
          }
        }
      `}</style>
    </div>
  )
}