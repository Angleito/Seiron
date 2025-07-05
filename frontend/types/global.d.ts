// Global type definitions for the Seiron project
// This file contains common types used throughout the application

// ============================================================================
// Browser API Extensions
// ============================================================================

// Speech Recognition API (Web Speech API)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: unknown;
  emma: Document;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  grammars: SpeechGrammarList;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// ============================================================================
// Common Data Structures
// ============================================================================

// Generic API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: number;
    requestId?: string;
    version?: string;
  };
}

// Generic Event Data
export interface EventData<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

// Generic Configuration
export interface Config {
  [key: string]: string | number | boolean | Config | undefined;
}

// Generic Metrics
export interface Metrics {
  [key: string]: number | string | boolean | Metrics | undefined;
}

// Generic Parameters
export interface Parameters {
  [key: string]: string | number | boolean | Parameters | string[] | number[] | undefined;
}

// ============================================================================
// Animation and Performance Types
// ============================================================================

// Performance Metrics
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  fps?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  frameDrops?: number;
  metadata?: Record<string, unknown>;
}

// Animation Frame Data
export interface AnimationFrameData {
  timestamp: number;
  frameId: number;
  deltaTime: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

// Touch Event Data
export interface TouchEventData {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
  touches: TouchPoint[];
  changedTouches: TouchPoint[];
  targetTouches: TouchPoint[];
  timestamp: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface TouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;
}

// ============================================================================
// Blockchain and Wallet Types
// ============================================================================

// Transaction Data
export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  data?: string;
  chainId: number;
  timestamp?: number;
  blockNumber?: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

// Wallet Balance
export interface WalletBalance {
  address: string;
  balance: string;
  tokens: TokenBalance[];
  lastUpdated: number;
}

export interface TokenBalance {
  symbol: string;
  address?: string;
  balance: string;
  decimals: number;
  name?: string;
  logoUri?: string;
  price?: number;
  value?: number;
}

// ============================================================================
// Error Types
// ============================================================================

// Structured Error
export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  timestamp: number;
  recoverable: boolean;
  category: 'network' | 'validation' | 'authorization' | 'system' | 'user' | 'unknown';
}

// Validation Error
export interface ValidationError extends StructuredError {
  category: 'validation';
  field?: string;
  value?: unknown;
  constraints?: string[];
}

// Network Error
export interface NetworkError extends StructuredError {
  category: 'network';
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

// Deep Partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep Required
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Extract Properties of Type
export type ExtractPropertiesOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Make Properties Optional
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make Properties Required
export type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// JSON Serializable
export type JSONSerializable = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONSerializable[] 
  | { [key: string]: JSONSerializable };

// Safe String
export type SafeString = string & { __brand: 'SafeString' };

// Safe Number
export type SafeNumber = number & { __brand: 'SafeNumber' };

// ============================================================================
// Environment Variables
// ============================================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_WS_URL: string;
      NEXT_PUBLIC_CHAIN_ID: string;
      NEXT_PUBLIC_ELEVENLABS_API_KEY: string;
      NEXT_PUBLIC_ELEVENLABS_VOICE_ID: string;
      NEXT_PUBLIC_VOICE_ENABLED: 'true' | 'false';
      NEXT_PUBLIC_SENTRY_DSN?: string;
      NEXT_PUBLIC_ANALYTICS_ID?: string;
      NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID?: string;
      NEXT_PUBLIC_INFURA_KEY?: string;
      NEXT_PUBLIC_ALCHEMY_KEY?: string;
    }
  }
}

// ============================================================================
// Window Extensions
// ============================================================================

declare global {
  interface Window {
    // Speech Recognition
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof webkitSpeechRecognition;
    
    // Wallet Extensions
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (eventName: string, handler: (data: unknown) => void) => void;
      removeListener: (eventName: string, handler: (data: unknown) => void) => void;
      isMetaMask?: boolean;
      isConnected?: () => boolean;
      selectedAddress?: string;
      chainId?: string;
    };
    
    // Keplr Wallet
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
      signTx: (chainId: string, tx: unknown) => Promise<unknown>;
      getOfflineSigner: (chainId: string) => unknown;
    };
    
    // Performance Monitoring
    __SEIRON_PERFORMANCE__?: {
      mark: (name: string) => void;
      measure: (name: string, startMark?: string, endMark?: string) => void;
      getMetrics: () => Record<string, PerformanceMetrics>;
    };
    
    // Debug Mode
    __SEIRON_DEBUG__?: boolean;
  }
}

export {};