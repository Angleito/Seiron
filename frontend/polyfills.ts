// Browser polyfills
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.global = window
}

// Export for TypeScript
declare global {
  interface Window {
    Buffer: typeof Buffer
    global: Window
  }
}

export {}