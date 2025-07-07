import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🐉</div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Dragon&apos;s Lair Not Found
          </h1>
          <p className="text-gray-300 mb-6">
            The mystical path you seek has been consumed by dragon fire. 
            Even the legendary Seiron cannot grant wishes for pages that don&apos;t exist.
          </p>
        </div>
        
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Return to Dragon&apos;s Domain
        </Link>
      </div>
    </div>
  )
}