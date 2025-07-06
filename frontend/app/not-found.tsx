'use client';

// Force dynamic rendering - prevent static generation
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 text-white relative overflow-hidden">
      <style jsx global>{`
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
        
        .particle-1 {
          position: absolute;
          top: 25%;
          left: 25%;
          width: 0.5rem;
          height: 0.5rem;
          background-color: #fbbf24;
          border-radius: 50%;
          opacity: 0.6;
          pointer-events: none;
          animation: float 6s ease-in-out infinite;
        }
        
        .particle-2 {
          position: absolute;
          top: 75%;
          right: 25%;
          width: 0.25rem;
          height: 0.25rem;
          background-color: #f87171;
          border-radius: 50%;
          opacity: 0.4;
          pointer-events: none;
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .particle-3 {
          position: absolute;
          top: 50%;
          left: 75%;
          width: 0.375rem;
          height: 0.375rem;
          background-color: #fb923c;
          border-radius: 50%;
          opacity: 0.5;
          pointer-events: none;
          animation: float 6s ease-in-out infinite;
          animation-delay: 4s;
        }
      `}</style>
      
      <div className="max-w-lg mx-auto text-center relative z-10">
        <div>
          <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-br from-red-500 to-orange-500 bg-clip-text text-transparent mb-8 leading-none">
            404
          </h1>
        </div>
        
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Dragon&apos;s Lair Not Found
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            The mystical path you seek has been consumed by dragon fire. 
            Even the legendary Seiron cannot grant wishes for pages that don&apos;t exist.
          </p>
        </div>

        <div>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg font-medium text-white bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all duration-300 hover:-translate-y-0.5 no-underline"
          >
            Return to Dragon&apos;s Domain
          </a>
          
          <div className="text-sm text-gray-400 mt-4">
            Or navigate back to continue your mystical journey
          </div>
        </div>
      </div>

      <div className="particle-1"></div>
      <div className="particle-2"></div>
      <div className="particle-3"></div>
    </div>
  );
}