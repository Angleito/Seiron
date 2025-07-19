// Browser polyfills
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.global = window
}

// Also ensure it's available on globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer
  globalThis.global = globalThis
}

// Export for TypeScript
declare global {
  interface Window {
    Buffer: typeof Buffer
    global: Window
  }
  
  namespace globalThis {
    var Buffer: typeof import('buffer').Buffer
    var global: typeof globalThis
  }
}

export {}