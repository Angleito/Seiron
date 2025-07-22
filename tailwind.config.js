/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Override default scales to enforce design system
    fontSize: {
      // Only 4 font sizes allowed
      'size-1': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px - Large headings
      'size-2': ['1rem', { lineHeight: '1.5rem' }],        // 16px - Subheadings
      'size-3': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - Body text
      'size-4': ['0.75rem', { lineHeight: '1rem' }],       // 12px - Small text
      // Legacy mapping for gradual migration
      'xs': ['0.75rem', { lineHeight: '1rem' }],           // → size-4
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],       // → size-3
      'base': ['1rem', { lineHeight: '1.5rem' }],          // → size-2
      'lg': ['1.25rem', { lineHeight: '1.75rem' }],        // → size-1
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],        // → size-1
      '2xl': ['1.25rem', { lineHeight: '1.75rem' }],       // → size-1
      '3xl': ['1.25rem', { lineHeight: '1.75rem' }],       // → size-1
      '4xl': ['1.25rem', { lineHeight: '1.75rem' }],       // → size-1
    },
    fontWeight: {
      // Only 2 font weights allowed
      normal: '400',
      semibold: '600',
      // Legacy mapping
      light: '400',
      regular: '400',
      medium: '600',
      bold: '600',
    },
    spacing: {
      // 8pt grid system
      px: '1px',
      0: '0px',
      0.5: '2px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
      32: '128px',
      40: '160px',
      48: '192px',
      56: '224px',
      64: '256px',
    },
    colors: {
      // Core colors
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      
      // Primary colors
      primary: {
        DEFAULT: '#2563eb', // Blue
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      
      // Gray scale
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      
      // Semantic colors
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6',
    },
    borderRadius: {
      none: '0px',
      sm: '0.125rem',
      DEFAULT: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },
    extend: {
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
      },
    },
  },
  plugins: [],
};