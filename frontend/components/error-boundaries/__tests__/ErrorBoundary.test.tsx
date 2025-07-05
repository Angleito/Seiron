import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { 
  ErrorBoundary, 
  withErrorBoundary, 
  useErrorHandler,
  RootErrorBoundary,
  PageErrorBoundary,
  ChatErrorBoundary,
  VoiceErrorBoundary,
  DragonErrorBoundary
} from '../index'

// Mock console.error to avoid cluttering test output
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})

// Test component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
  
  it('renders error UI when child throws an error', () => {
    render(
      <ErrorBoundary name="Test Component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument()
    expect(screen.getByText(/The Test Component encountered an unexpected error/)).toBeInTheDocument()
  })
  
  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
  })
  
  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.any(Object)
    )
  })
  
  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    
    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'))
    
    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>
    const WrappedComponent = withErrorBoundary(TestComponent, { name: 'Test' })
    
    render(<WrappedComponent />)
    
    expect(screen.getByText('Test component')).toBeInTheDocument()
  })
  
  it('catches errors in wrapped component', () => {
    const BuggyComponent = () => {
      throw new Error('Component error')
    }
    const WrappedComponent = withErrorBoundary(BuggyComponent)
    
    render(<WrappedComponent />)
    
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })
})

describe('useErrorHandler hook', () => {
  it('throws error that can be caught by error boundary', () => {
    function TestComponent() {
      const throwError = useErrorHandler()
      
      return (
        <button onClick={() => throwError(new Error('Hook error'))}>
          Throw Error
        </button>
      )
    }
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )
    
    fireEvent.click(screen.getByText('Throw Error'))
    
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })
})

describe('Specialized Error Boundaries', () => {
  describe('RootErrorBoundary', () => {
    it('renders critical error UI', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      )
      
      expect(screen.getByText('The Dragon Has Fallen')).toBeInTheDocument()
      expect(screen.getByText('Seiron encountered a critical error')).toBeInTheDocument()
    })
  })
  
  describe('PageErrorBoundary', () => {
    it('renders page error UI with page name', () => {
      render(
        <PageErrorBoundary pageName="Test Page">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      )
      
      expect(screen.getByText('Page Load Error')).toBeInTheDocument()
      expect(screen.getByText(/We couldn't load the Test Page page/)).toBeInTheDocument()
    })
  })
  
  describe('ChatErrorBoundary', () => {
    it('renders chat-specific error UI', () => {
      render(
        <ChatErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ChatErrorBoundary>
      )
      
      expect(screen.getByText('Chat Unavailable')).toBeInTheDocument()
      expect(screen.getByText(/The chat interface encountered an error/)).toBeInTheDocument()
    })
    
    it('calls onReset when restart is clicked', () => {
      const onReset = vi.fn()
      
      render(
        <ChatErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ChatErrorBoundary>
      )
      
      fireEvent.click(screen.getByText('Restart Chat'))
      
      expect(onReset).toHaveBeenCalled()
    })
  })
  
  describe('VoiceErrorBoundary', () => {
    it('renders voice-specific error UI', () => {
      render(
        <VoiceErrorBoundary>
          <ThrowError shouldThrow={true} />
        </VoiceErrorBoundary>
      )
      
      expect(screen.getByText('Voice Interface Error')).toBeInTheDocument()
      expect(screen.getByText(/The voice system encountered an error/)).toBeInTheDocument()
    })
  })
  
  describe('DragonErrorBoundary', () => {
    it('renders dragon-specific error UI', () => {
      render(
        <DragonErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DragonErrorBoundary>
      )
      
      expect(screen.getByText('Dragon is Resting')).toBeInTheDocument()
      expect(screen.getByText(/The dragon animation system needs a moment/)).toBeInTheDocument()
    })
  })
})