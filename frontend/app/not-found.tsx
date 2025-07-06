export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Dragon's Lair Not Found | Seiron</title>
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
              background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%);
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
              margin-bottom: 2rem;
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
            
            .particle {
              position: absolute;
              border-radius: 50%;
              pointer-events: none;
              animation: float 6s ease-in-out infinite;
            }
            
            .particle:nth-child(1) {
              top: 25%;
              left: 25%;
              width: 0.5rem;
              height: 0.5rem;
              background-color: #fbbf24;
              opacity: 0.6;
            }
            
            .particle:nth-child(2) {
              top: 75%;
              right: 25%;
              width: 0.25rem;
              height: 0.25rem;
              background-color: #f87171;
              opacity: 0.4;
              animation-delay: 2s;
            }
            
            .particle:nth-child(3) {
              top: 50%;
              left: 75%;
              width: 0.375rem;
              height: 0.375rem;
              background-color: #fb923c;
              opacity: 0.5;
              animation-delay: 4s;
            }
            
            @keyframes float {
              0%, 100% {
                transform: translateY(0px) rotate(0deg);
              }
              33% {
                transform: translateY(-20px) rotate(120deg);
              }
              66% {
                transform: translateY(10px) rotate(240deg);
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
            <h1 className="title">404</h1>
          </div>
          
          <div>
            <h2 className="heading">
              Dragon&apos;s Lair Not Found
            </h2>
            <p className="description">
              The mystical path you seek has been consumed by dragon fire. 
              Even the legendary Seiron cannot grant wishes for pages that don't exist.
            </p>
          </div>

          <div>
            <a href="/" className="button">
              Return to Dragon&apos;s Domain
            </a>
            
            <div className="help-text">
              Or navigate back to continue your mystical journey
            </div>
          </div>
        </div>

        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </body>
    </html>
  );
}