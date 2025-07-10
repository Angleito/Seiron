import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LocalFontProvider } from '@components/ui/LocalFontProvider'

export function RootLayout() {
  // Debug logging
  console.log('🎯 RootLayout rendering')
  console.log('Window location:', window.location.pathname)
  
  return (
    <LocalFontProvider>
      {/* DEBUG: ALWAYS VISIBLE BAR */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '30px', 
          backgroundColor: 'green', 
          color: 'white', 
          textAlign: 'center',
          lineHeight: '30px',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ROOT LAYOUT LOADED - PATH: {window.location.pathname}
      </div>
      
      <div className="min-h-screen bg-dragon-dark text-white antialiased">
        <main>
          <Outlet />
        </main>
        <Toaster 
          theme="dark"
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'bg-dragon-surface border-dragon-gold/20',
              title: 'text-dragon-text',
              description: 'text-dragon-muted',
            },
          }}
        />
      </div>
    </LocalFontProvider>
  )
}