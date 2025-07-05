import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Seiron Dragon Red Palette
        dragon: {
          red: "#DC2626",
          "red-hover": "#EF4444",
          "red-dark": "#991B1B",
          "red-light": "#FCA5A5",
          "red-50": "#FEF2F2",
          "red-100": "#FEE2E2",
          "red-200": "#FECACA",
          "red-300": "#FCA5A5",
          "red-400": "#F87171",
          "red-500": "#EF4444",
          "red-600": "#DC2626",
          "red-700": "#B91C1C",
          "red-800": "#991B1B",
          "red-900": "#7F1D1D",
        },
        // Sei Gray Palette
        sei: {
          gray: "#6B7280",
          "gray-light": "#9CA3AF",
          "gray-dark": "#374151",
          "gray-50": "#F9FAFB",
          "gray-100": "#F3F4F6",
          "gray-200": "#E5E7EB",
          "gray-300": "#D1D5DB",
          "gray-400": "#9CA3AF",
          "gray-500": "#6B7280",
          "gray-600": "#4B5563",
          "gray-700": "#374151",
          "gray-800": "#1F2937",
          "gray-900": "#111827",
        },
        // Gold Palette (Dragon's Power)
        gold: {
          DEFAULT: "#F59E0B",
          "50": "#FFFBEB",
          "100": "#FEF3C7",
          "200": "#FDE68A",
          "300": "#FCD34D",
          "400": "#FBBF24",
          "500": "#F59E0B",
          "600": "#D97706",
          "700": "#B45309",
          "800": "#92400E",
          "900": "#78350F",
        },
        // Cosmic Purple Palette (Mystical Elements)
        cosmic: {
          purple: "#7C3AED",
          "purple-light": "#A78BFA",
          "purple-dark": "#5B21B6",
          "purple-50": "#F5F3FF",
          "purple-100": "#EDE9FE",
          "purple-200": "#DDD6FE",
          "purple-300": "#C4B5FD",
          "purple-400": "#A78BFA",
          "purple-500": "#8B5CF6",
          "purple-600": "#7C3AED",
          "purple-700": "#6D28D9",
          "purple-800": "#5B21B6",
          "purple-900": "#4C1D95",
        },
        // Legacy support
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        // Dragon scale patterns
        "dragon-scales": "radial-gradient(circle at 50% 50%, #DC2626 0%, #991B1B 50%, #7F1D1D 100%)",
        "dragon-scales-subtle": "radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.1) 0%, rgba(153, 27, 27, 0.05) 100%)",
        // Mystical gradients
        "mystical-primary": "linear-gradient(135deg, #DC2626 0%, #7C3AED 100%)",
        "mystical-secondary": "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
        "mystical-dark": "linear-gradient(135deg, #991B1B 0%, #5B21B6 100%)",
        "cosmic-glow": "radial-gradient(ellipse at center, #7C3AED 0%, transparent 70%)",
        // Power gradients
        "dragon-power": "linear-gradient(45deg, #DC2626, #F59E0B, #DC2626)",
        "sei-gradient": "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
      },
      animation: {
        // Dragon-themed animations
        "dragon-pulse": "dragon-pulse 2s ease-in-out infinite",
        "scale-shimmer": "scale-shimmer 3s ease-in-out infinite",
        "mystical-glow": "mystical-glow 4s ease-in-out infinite",
        "power-surge": "power-surge 1.5s ease-in-out infinite",
        "cosmic-float": "cosmic-float 6s ease-in-out infinite",
        // Performance optimized versions
        "dragon-pulse-slow": "dragon-pulse 4s ease-in-out infinite",
        "mystical-glow-slow": "mystical-glow 6s ease-in-out infinite",
        // Mobile optimized animations
        "dragon-float-mobile": "dragon-float-mobile 5s ease-in-out infinite",
        "dragon-balls-reduced": "dragon-balls-orbit-reduced 30s linear infinite",
        // Touch gesture feedback
        "touch-ripple": "touch-ripple 0.6s ease-out",
        "swipe-hint": "swipe-hint 1s ease-in-out infinite",
        // Slow spin animation
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        "dragon-pulse": {
          "0%, 100%": { 
            transform: "scale(1)", 
            opacity: "1" 
          },
          "50%": { 
            transform: "scale(1.05)", 
            opacity: "0.8" 
          },
        },
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
        "dragon-float-mobile": {
          "0%, 100%": { 
            transform: "translateY(0px)" 
          },
          "50%": { 
            transform: "translateY(-5px)" 
          },
        },
        "dragon-balls-orbit-reduced": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
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
        // Dragon-themed shadows
        "dragon": "0 10px 25px rgba(220, 38, 38, 0.3)",
        "dragon-hover": "0 20px 40px rgba(220, 38, 38, 0.4)",
        "mystical": "0 10px 25px rgba(124, 58, 237, 0.3)",
        "gold-glow": "0 10px 25px rgba(245, 158, 11, 0.3)",
        "sei-subtle": "0 4px 12px rgba(107, 114, 128, 0.1)",
      },
      fontFamily: {
        // Geist fonts
        "sans": ['Geist Sans', 'system-ui', 'sans-serif'],
        "mono": ['Geist Mono', 'monospace'],
        // Dragon-themed typography
        "dragon": ["var(--font-dragon)", "serif"],
        "mystical": ["var(--font-mystical)", "fantasy"],
      },
      spacing: {
        // Dragon scale sizes
        "scale-xs": "0.125rem",
        "scale-sm": "0.25rem",
        "scale-md": "0.5rem",
        "scale-lg": "1rem",
        "scale-xl": "2rem",
      },
      borderRadius: {
        // Dragon-themed radius
        "dragon": "0.75rem",
        "scale": "50%",
      },
    },
  },
  plugins: [],
};
export default config;
