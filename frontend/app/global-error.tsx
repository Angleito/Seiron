'use client';

import { useEffect } from 'react';

// Force dynamic rendering - prevent static generation
export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 p-0 box-border font-sans antialiased min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4 text-white relative overflow-hidden">
        <style jsx global>{`
          .animated-particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            animation: pulse 2s ease-in-out infinite;
          }
          
          .animated-particle:nth-child(1) {
            top: 25%;
            left: 25%;
            width: 0.75rem;
            height: 0.75rem;
            background-color: #ef4444;
            opacity: 0.7;
          }
          
          .animated-particle:nth-child(2) {
            top: 75%;
            right: 25%;
            width: 0.5rem;
            height: 0.5rem;
            background-color: #f97316;
            opacity: 0.6;
            animation-delay: 0.7s;
          }
          
          .animated-particle:nth-child(3) {
            top: 50%;
            left: 75%;
            width: 0.625rem;
            height: 0.625rem;
            background-color: #fbbf24;
            opacity: 0.5;
            animation-delay: 1.4s;
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: var(--start-opacity, 0.3);
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.3);
            }
          }
        `}</style>
        
        <div className="max-w-lg mx-auto text-center relative z-10">
          <div>
            <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-br from-red-500 to-orange-500 bg-clip-text text-transparent mb-8 leading-none">
              500
            </h1>
          </div>
          
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Critical Dragon System Error
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              The dragon&apos;s core systems have encountered a catastrophic failure. 
              All mystical energies need to be restored from the beginning.
            </p>
            
            {error.digest && (
              <div className="bg-black/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm font-mono">
                  Error ID: {error.digest}
                </p>
              </div>
            )}
          </div>

          <div>
            <button 
              onClick={reset} 
              className="inline-flex items-center justify-center px-8 py-3 rounded-lg font-medium text-white bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300 hover:-translate-y-0.5"
            >
              Restart Dragon System
            </button>
            
            <div className="text-sm text-gray-400 mt-4">
              This will reload the entire application
            </div>
          </div>
        </div>

        <div className="animated-particle"></div>
        <div className="animated-particle"></div>
        <div className="animated-particle"></div>
      </body>
    </html>
  );
}