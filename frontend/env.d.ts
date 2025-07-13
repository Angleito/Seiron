/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface ImportMetaEnv {
  // Core Configuration
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_ORCHESTRATOR_API: string
  readonly VITE_ORCHESTRATOR_WS: string
  
  // Blockchain & Wallet Configuration
  readonly VITE_PRIVY_APP_ID: string
  readonly VITE_PRIVY_CLIENT_ID?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_SEI_RPC_URL: string
  
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Voice Configuration (Backend Proxy)
  readonly VITE_API_URL: string
  readonly VITE_VOICE_ENABLED: string
  readonly VITE_VOICE_STABILITY: string
  readonly VITE_VOICE_SIMILARITY_BOOST: string
  readonly VITE_VOICE_STYLE: string
  readonly VITE_VOICE_USE_SPEAKER_BOOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}