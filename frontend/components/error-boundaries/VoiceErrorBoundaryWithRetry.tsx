'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';
// Note: voiceLogger removed - using console methods for logging

interface VoiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  errorId: string;
}

interface VoiceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
  enableAutoRetry?: boolean;
  className?: string;
}

/**
 * Enhanced error boundary specifically for voice components
 * Includes retry logic and voice-specific error handling
 */
export class VoiceErrorBoundaryWithRetry extends Component<VoiceErrorBoundaryProps, VoiceErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private errorReportingTimeout: NodeJS.Timeout | null = null;
  
  constructor(props: VoiceErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorId: ''
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<VoiceErrorBoundaryState> {
    // Generate unique error ID
    const errorId = `voice-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableAutoRetry = true, maxRetries = 3, retryDelay = 2000 } = this.props;
    
    this.setState({
      errorInfo
    });
    
    // Log the error
    console.error('🔊 Voice component error caught', {
      errorId: this.state.errorId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });
    
    // Report to external error handler
    onError?.(error, errorInfo);
    
    // Auto-retry if enabled and under retry limit
    if (enableAutoRetry && this.state.retryCount < maxRetries) {
      this.scheduleRetry(retryDelay);
    }
  }
  
  override componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.errorReportingTimeout) {
      clearTimeout(this.errorReportingTimeout);
    }
  }
  
  private scheduleRetry = (delay: number): void => {
    this.setState({ isRetrying: true });
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };
  
  private handleRetry = (): void => {
    const { onRetry, maxRetries = 3, onMaxRetriesReached } = this.props;
    const newRetryCount = this.state.retryCount + 1;
    
    console.log('🔄 Voice component retry attempt', {
      errorId: this.state.errorId,
      retryCount: newRetryCount,
      maxRetries
    });
    
    if (newRetryCount >= maxRetries) {
      console.error('🚫 Voice component max retries reached', {
        errorId: this.state.errorId,
        finalRetryCount: newRetryCount,
        maxRetries
      });
      
      onMaxRetriesReached?.(this.state.error!);
      
      this.setState({
        isRetrying: false,
        retryCount: newRetryCount
      });
      
      return;
    }
    
    // Reset error state and retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
      isRetrying: false
    });
    
    onRetry?.(newRetryCount);
  };
  
  private handleManualRetry = (): void => {
    console.log('👆 Manual retry triggered', {
      errorId: this.state.errorId,
      retryCount: this.state.retryCount
    });
    
    this.handleRetry();
  };
  
  private renderErrorUI(): ReactNode {
    const { fallback, maxRetries = 3, className = '' } = this.props;
    const { error, retryCount, isRetrying, errorId } = this.state;
    
    if (fallback) {
      return fallback;
    }
    
    const canRetry = retryCount < maxRetries;
    const isVoiceError = error?.message?.toLowerCase().includes('voice') || 
                        error?.message?.toLowerCase().includes('audio') ||
                        error?.message?.toLowerCase().includes('microphone');
    
    return (
      <div className={`voice-error-boundary ${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              {isVoiceError ? (
                <span className="text-2xl">🔊</span>
              ) : (
                <span className="text-2xl">⚠️</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                {isVoiceError ? 'Voice System Error' : 'Component Error'}
              </h3>
              <p className="text-sm text-red-300/70">
                Error ID: {errorId.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-300/90 mb-2">
              {isVoiceError ? (
                'The voice system encountered an error. This might be due to microphone permissions, audio device issues, or network connectivity.'
              ) : (
                'A component error occurred. The system is attempting to recover.'
              )}
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-3">
                <summary className="text-xs text-red-400/70 cursor-pointer hover:text-red-400">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-red-950/30 rounded text-xs text-red-300/60 font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {error?.message}
                  </div>
                  <div className="mb-2">
                    <strong>Type:</strong> {error?.name}
                  </div>
                  <div>
                    <strong>Retries:</strong> {retryCount}/{maxRetries}
                  </div>
                </div>
              </details>
            )}
          </div>
          
          <div className="flex gap-2">
            {canRetry && (
              <button
                onClick={this.handleManualRetry}
                disabled={isRetrying}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 
                          border border-red-500/30 rounded px-4 py-2 text-sm text-red-300 
                          disabled:text-red-300/50 transition-colors"
              >
                {isRetrying ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🔄</span>
                    Retrying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>🔄</span>
                    Retry ({maxRetries - retryCount} left)
                  </span>
                )}
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 
                        rounded px-4 py-2 text-sm text-gray-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>🔄</span>
                Reload Page
              </span>
            </button>
          </div>
          
          {!canRetry && (
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded">
              <p className="text-sm text-amber-300">
                <span className="font-semibold">Maximum retries reached.</span>
                <br />
                Please reload the page or contact support if the problem persists.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  override render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }
    
    return this.props.children;
  }
}

/**
 * Hook for retry logic in functional components
 */
export function useRetryLogic({
  maxRetries = 3,
  retryDelay = 1000,
  onRetry,
  onMaxRetriesReached
}: {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
} = {}) {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [lastError, setLastError] = React.useState<Error | null>(null);
  
  const retry = React.useCallback(async (operation: () => Promise<any>, error?: Error): Promise<any> => {
    if (retryCount >= maxRetries) {
      console.error('🚫 Max retries reached for operation', { retryCount, maxRetries });
      onMaxRetriesReached?.(error || lastError || new Error('Unknown error'));
      return Promise.reject(error || lastError || new Error('Max retries reached'));
    }
    
    setIsRetrying(true);
    setLastError(error || null);
    
    try {
      // Wait for retry delay
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      console.log('🔄 Retrying operation', { retryCount: retryCount + 1, maxRetries });
      
      const result = await operation();
      
      // Success - reset retry count
      setRetryCount(0);
      setIsRetrying(false);
      setLastError(null);
      
      onRetry?.(retryCount + 1);
      
      return result;
    } catch (retryError) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setIsRetrying(false);
      
      console.warn('🔄 Retry failed', { 
        retryCount: newRetryCount, 
        maxRetries, 
        error: retryError instanceof Error ? retryError.message : retryError 
      });
      
      if (newRetryCount >= maxRetries) {
        onMaxRetriesReached?.(retryError as Error);
      }
      
      throw retryError;
    }
  }, [retryCount, maxRetries, retryDelay, onRetry, onMaxRetriesReached, lastError]);
  
  const reset = React.useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
  }, []);
  
  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    lastError
  };
}

/**
 * Higher-order component for adding retry logic to any component
 */
export function withRetryLogic<P extends object>(
  Component: React.ComponentType<P>,
  retryOptions: {
    maxRetries?: number;
    retryDelay?: number;
    enableAutoRetry?: boolean;
  } = {}
) {
  return function WithRetryLogic(props: P) {
    return (
      <VoiceErrorBoundaryWithRetry {...retryOptions}>
        <Component {...props} />
      </VoiceErrorBoundaryWithRetry>
    );
  };
}

// Export default
export default VoiceErrorBoundaryWithRetry;
