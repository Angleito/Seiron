import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/layouts/RootLayout'
import { lazy } from 'react'
import { PageErrorBoundary, CompositeErrorBoundary } from '@components/error-boundaries'
import { LazyLoadingBoundary } from '@components/ui/LazyLoadingBoundary'
import { 
  VoiceFeatureLoader, 
  PerformanceMonitorLoader,
  ChatFeatureLoader,
  PortfolioFeatureLoader,
  GenericFeatureLoader
} from '@components/ui/FeatureLoadingStates'

// Lazy load pages for code splitting - using explicit relative paths from frontend root
const HomePage = lazy(() => import('./pages/HomePage.tsx'))
const AgentTestPage = lazy(() => import('./pages/AgentTestPage.tsx'))
const ChatPage = lazy(() => import('./pages/chat.tsx'))
const AboutPage = lazy(() => import('./pages/about.tsx'))

// Dragon Demo Pages - temporarily disabled as pages don't exist
// const AsciiComplexPage = lazy(() => import('./pages/dragons/AsciiComplexPage'))
// const AsciiAnimatedPage = lazy(() => import('./pages/dragons/AsciiAnimatedPage'))
// const Sprite2DPage = lazy(() => import('./pages/dragons/Sprite2DPage'))
// const WebGL3DPage = lazy(() => import('./pages/dragons/WebGL3DPage'))

// Verification Pages
const ReactError310VerificationPage = lazy(() => import('./pages/verification/ReactError310VerificationPage.tsx'))

const PageLoader = ({ 
  children, 
  pageName, 
  featureType 
}: { 
  children: React.ReactNode
  pageName?: string
  featureType?: 'voice' | 'performance' | 'chat' | 'portfolio' | 'generic'
}) => {
  const getFeatureLoader = () => {
    switch (featureType) {
      case 'voice':
        return <VoiceFeatureLoader />
      case 'performance':
        return <PerformanceMonitorLoader />
      case 'chat':
        return <ChatFeatureLoader />
      case 'portfolio':
        return <PortfolioFeatureLoader />
      default:
        return <GenericFeatureLoader featureName={pageName || 'Page'} />
    }
  }

  return (
    <PageErrorBoundary pageName={pageName}>
      <LazyLoadingBoundary
        fallback={getFeatureLoader()}
        featureName={pageName}
        showProgress={true}
      >
        {children}
      </LazyLoadingBoundary>
    </PageErrorBoundary>
  )
}

// Enhanced page loader for WebGL/3D content with comprehensive error boundary
const WebGL3DPageLoader = ({ 
  children, 
  pageName,
  modelPath,
  fallbackModelPath
}: { 
  children: React.ReactNode
  pageName?: string
  modelPath?: string
  fallbackModelPath?: string
}) => {
  // Use seiron.glb as the default model path (seiron_animated.gltf is corrupted)
  const defaultModelPath = '/models/seiron.glb'
  const defaultFallbackPath = '/models/dragon_head.glb'
  const effectiveModelPath = modelPath || defaultModelPath
  const effectiveFallbackPath = fallbackModelPath || defaultFallbackPath
  
  return (
    <CompositeErrorBoundary
      enableAutoRecovery={true}
      enablePerformanceMonitoring={true}
      enableWebGLRecovery={true}
      enableGLTFRecovery={true}
      enableSuspenseRecovery={true}
      maxRetries={3}
      retryDelay={2000}
      onError={(error, errorInfo, errorSource) => {
        console.error(`WebGL3D Error in ${pageName}:`, { error, errorInfo, errorSource })
        console.error(`Model path was: ${effectiveModelPath}`)
        console.error(`Fallback path was: ${effectiveFallbackPath}`)
        
        // Log additional debugging info for model loading errors
        if (errorSource === 'gltf_loading') {
          console.error('GLTF Loading failed. Attempting fallback...')
        }
      }}
      onRecovery={(recoveryType) => {
        console.info(`WebGL3D Recovery successful in ${pageName}: ${recoveryType}`)
      }}
    >
      <LazyLoadingBoundary
        fallback={<GenericFeatureLoader featureName={pageName || '3D Content'} />}
        featureName={pageName}
        showProgress={true}
      >
        {children}
      </LazyLoadingBoundary>
    </CompositeErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <PageLoader pageName="Home">
            <HomePage />
          </PageLoader>
        ),
      },
      {
        path: 'agent-test',
        element: (
          <PageLoader pageName="Agent Test">
            <AgentTestPage />
          </PageLoader>
        ),
      },
      {
        path: 'chat',
        element: (
          <PageLoader pageName="Chat" featureType="chat">
            <ChatPage />
          </PageLoader>
        ),
      },
      {
        path: 'about',
        element: (
          <PageLoader pageName="About">
            <AboutPage />
          </PageLoader>
        ),
      },
      // Dragon routes temporarily disabled - pages don't exist
      // {
      //   path: 'dragons/ascii-complex',
      //   element: (
      //     <PageLoader pageName="Complex ASCII Dragons">
      //       <AsciiComplexPage />
      //     </PageLoader>
      //   ),
      // },
      // {
      //   path: 'dragons/ascii-animated',
      //   element: (
      //     <PageLoader pageName="Animated ASCII Dragons">
      //       <AsciiAnimatedPage />
      //     </PageLoader>
      //   ),
      // },
      // {
      //   path: 'dragons/sprite-2d',
      //   element: (
      //     <PageLoader pageName="2D Sprite Dragons">
      //       <Sprite2DPage />
      //     </PageLoader>
      //   ),
      // },
      // {
      //   path: 'dragons/webgl-3d',
      //   element: (
      //     <WebGL3DPageLoader 
      //       pageName="3D WebGL Dragons"
      //       modelPath="/models/seiron.glb"
      //       fallbackModelPath="/models/dragon_head.glb"
      //     >
      //       <WebGL3DPage modelPath="/models/seiron.glb" />
      //     </WebGL3DPageLoader>
      //   ),
      // },
      {
        path: 'verification/react-error-310',
        element: (
          <PageLoader pageName="React Error #310 Verification">
            <ReactError310VerificationPage />
          </PageLoader>
        ),
      },
    ],
  },
], {
  future: {
    // Enable React.startTransition for router state updates to prepare for React Router v7
    // This eliminates the "React Router Future Flag Warning" and provides better React 18+ compatibility
    // @ts-expect-error v7_startTransition is a valid future flag but types may not be updated yet
    v7_startTransition: true,
  },
})