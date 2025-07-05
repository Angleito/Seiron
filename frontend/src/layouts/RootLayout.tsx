import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LocalFontProvider } from '@/components/ui/LocalFontProvider'

export function RootLayout() {
  return (
    <LocalFontProvider>
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