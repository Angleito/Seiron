'use client';

import { useEffect } from 'react';

export const dynamic = "force-dynamic";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>500 - Dragon&apos;s Power Overload | Seiron</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              min-height: 100vh;
              background: linear-gradient(135deg, #0f172a 0%, #7f1d1d 50%, #0f172a 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 1rem;
              color: white;
              position: relative;
              overflow: hidden;
            }
            
            .container {
              max-width: 32rem;
              margin: 0 auto;
              text-align: center;
              position: relative;
              z-index: 10;
            }
            
            .title {
              font-size: 9rem;
              font-weight: 900;
              background: linear-gradient(135deg, #ef4444, #f97316);
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              margin-bottom: 2rem;
              line-height: 1;
            }
            
            .heading {
              font-size: 1.875rem;
              font-weight: 700;
              color: white;
              margin-bottom: 1rem;
            }
            
            .description {
              color: #d1d5db;
              font-size: 1.125rem;
              line-height: 1.75;
              margin-bottom: 1.5rem;
            }
            
            .error-card {
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 0.5rem;
              padding: 1rem;
              margin-bottom: 1.5rem;
            }
            
            .error-id {
              color: #fca5a5;
              font-size: 0.875rem;
              font-family: 'Monaco', 'Consolas', monospace;
            }
            
            .button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 0.75rem 2rem;
              border: none;
              border-radius: 0.5rem;
              font-weight: 500;
              color: white;
              background: linear-gradient(135deg, #ef4444, #f97316);
              text-decoration: none;
              transition: all 0.3s ease;
              cursor: pointer;
              font-size: 1rem;
            }
            
            .button:hover {
              background: linear-gradient(135deg, #dc2626, #ea580c);
              transform: translateY(-1px);
            }
            
            .help-text {
              font-size: 0.875rem;
              color: #9ca3af;
              margin-top: 1rem;
            }
            
            .pulse-particle {
              position: absolute;
              border-radius: 50%;
              pointer-events: none;
              animation: pulse 2s ease-in-out infinite;
            }
            
            .pulse-particle:nth-child(1) {
              top: 25%;
              left: 25%;
              width: 0.75rem;
              height: 0.75rem;
              background-color: #ef4444;
              opacity: 0.7;
            }
            
            .pulse-particle:nth-child(2) {
              top: 75%;
              right: 25%;
              width: 0.5rem;
              height: 0.5rem;
              background-color: #f97316;
              opacity: 0.6;
              animation-delay: 1s;
            }
            
            .pulse-particle:nth-child(3) {
              top: 50%;
              left: 75%;
              width: 0.625rem;
              height: 0.625rem;
              background-color: #fbbf24;
              opacity: 0.5;
              animation-delay: 2s;
            }
            
            .lightning {
              position: absolute;
              background-color: #f87171;
              opacity: 0.3;
              animation: pulse 1.5s ease-in-out infinite;
            }
            
            .lightning:nth-child(1) {
              top: 2.5rem;
              left: 2.5rem;
              width: 0.25rem;
              height: 2rem;
            }
            
            .lightning:nth-child(2) {
              bottom: 2.5rem;
              right: 2.5rem;
              width: 0.25rem;
              height: 1.5rem;
              background-color: #fb923c;
              opacity: 0.4;
              animation-delay: 0.5s;
            }
            
            @keyframes pulse {
              0%, 100% {
                opacity: var(--start-opacity, 0.3);
                transform: scale(1);
              }
              50% {
                opacity: 1;
                transform: scale(1.2);
              }
            }
            
            @media (max-width: 768px) {
              .title {
                font-size: 6rem;
              }
              
              .heading {
                font-size: 1.5rem;
              }
              
              .description {
                font-size: 1rem;
              }
            }
          `
        }} />
      </head>
      <body>
        <div className="container">
          <div>
            <h1 className="title">500</h1>
          </div>
          
          <div>
            <h2 className="heading">
              Dragon&apos;s Power Overload
            </h2>
            <p className="description">
              The mystical energies have surged beyond control! Even the legendary Seiron 
              needs a moment to channel the cosmic forces properly.
            </p>
            
            {error.digest && (
              <div className="error-card">
                <p className="error-id">
                  Error ID: {error.digest}
                </p>
              </div>
            )}
          </div>

          <div>
            <button onClick={reset} className="button">
              Recharge Dragon&apos;s Power
            </button>
            
            <div className="help-text">
              If the problem persists, the dragon may need more time to recover
            </div>
          </div>
        </div>

        <div className="pulse-particle"></div>
        <div className="pulse-particle"></div>
        <div className="pulse-particle"></div>
        <div className="lightning"></div>
        <div className="lightning"></div>
      </body>
    </html>
  );
}