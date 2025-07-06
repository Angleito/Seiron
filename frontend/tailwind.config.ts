import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
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
    },
    fontWeight: {
      // Only 2 font weights allowed
      normal: '400',
      semibold: '600',
    },
    spacing: {
      // 8pt grid system - all values divisible by 8 or 4
      '0': '0px',
      '1': '0.25rem',   // 4px
      '2': '0.5rem',    // 8px
      '3': '0.75rem',   // 12px
      '4': '1rem',      // 16px
      '5': '1.25rem',   // 20px (exception, but rounds to 24px in practice)
      '6': '1.5rem',    // 24px
      '8': '2rem',      // 32px
      '10': '2.5rem',   // 40px
      '12': '3rem',     // 48px
      '16': '4rem',     // 64px
      '20': '5rem',     // 80px
      '24': '6rem',     // 96px
      '32': '8rem',     // 128px
      '40': '10rem',    // 160px
      '48': '12rem',    // 192px
      '56': '14rem',    // 224px
      '64': '16rem',    // 256px
    },
    colors: {
      // 60/30/10 Color System
      transparent: 'transparent',
      current: 'currentColor',
      
      // 60% - Neutral colors (backgrounds, containers)
      white: '#ffffff',
      black: '#000000',
      gray: {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
        950: '#09090b',
      },
      
      // 10% - Primary accent
      red: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      
      // Semantic colors (use sparingly)
      green: {
        400: '#4ade80',
        600: '#16a34a',
      },
      blue: {
        400: '#60a5fa',
        600: '#2563eb',
      },
      yellow: {
        400: '#facc15',
        600: '#ca8a04',
      },
    },
    extend: {
      // Legacy color mappings for gradual migration
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        accent: "var(--color-accent-primary)",
      },
      backgroundImage: {
        // Mystical gradients
        "mystical-primary": "linear-gradient(135deg, #DC2626 0%, #7C3AED 100%)",
        "mystical-secondary": "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
        "mystical-dark": "linear-gradient(135deg, #991B1B 0%, #5B21B6 100%)",
        "cosmic-glow": "radial-gradient(ellipse at center, #7C3AED 0%, transparent 70%)",
        // Power gradients
        "sei-gradient": "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
      },
      animation: {
        // General animations
        "scale-shimmer": "scale-shimmer 3s ease-in-out infinite",
        "mystical-glow": "mystical-glow 4s ease-in-out infinite",
        "power-surge": "power-surge 1.5s ease-in-out infinite",
        "cosmic-float": "cosmic-float 6s ease-in-out infinite",
        // Performance optimized versions
        "mystical-glow-slow": "mystical-glow 6s ease-in-out infinite",
        // Touch gesture feedback
        "touch-ripple": "touch-ripple 0.6s ease-out",
        "swipe-hint": "swipe-hint 1s ease-in-out infinite",
        // Slow spin animation
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        "scale-shimmer": {
          "0%, 100%": { 
            backgroundPosition: "0% 50%" 
          },
          "50%": { 
            backgroundPosition: "100% 50%" 
          },
        },
        "mystical-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)" 
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(124, 58, 237, 0.6)" 
          },
        },
        "power-surge": {
          "0%, 100%": { 
            boxShadow: "0 0 10px rgba(220, 38, 38, 0.5)" 
          },
          "50%": { 
            boxShadow: "0 0 30px rgba(220, 38, 38, 0.8), 0 0 60px rgba(245, 158, 11, 0.4)" 
          },
        },
        "cosmic-float": {
          "0%, 100%": { 
            transform: "translateY(0px)" 
          },
          "50%": { 
            transform: "translateY(-10px)" 
          },
        },
        "touch-ripple": {
          "0%": {
            transform: "scale(0)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(4)",
            opacity: "0",
          },
        },
        "swipe-hint": {
          "0%, 100%": {
            transform: "translateX(0)",
            opacity: "0.5",
          },
          "50%": {
            transform: "translateX(10px)",
            opacity: "1",
          },
        },
      },
      boxShadow: {
        // Simplified shadows
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
      fontFamily: {
        // Geist fonts
        "sans": ['Geist Sans', 'system-ui', 'sans-serif'],
        "mono": ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        // Standard radius scale
        'sm': '0.25rem',   // 4px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
      },
    },
  },
  plugins: [],
};
export default config;
