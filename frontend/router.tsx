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

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const HomePage3D = lazy(() => import('./src/pages/HomePage3D'))
const SimpleHomePage = lazy(() => import('./src/pages/SimpleHomePage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const VoiceTestPage = lazy(() => import('./pages/VoiceTestPage'))
const AgentTestPage = lazy(() => import('./pages/AgentTestPage'))
const SecurityTestPage = lazy(() => import('./pages/SecurityTestPage'))
const ChatPage = lazy(() => import('./pages/chat'))
const AboutPage = lazy(() => import('./pages/about'))
const DragonDebugPage = lazy(() => import('./pages/dragon-debug'))

// Dragon Demo Pages
const AsciiComplexPage = lazy(() => import('./pages/dragons/AsciiComplexPage'))
const AsciiAnimatedPage = lazy(() => import('./pages/dragons/AsciiAnimatedPage'))
const Sprite2DPage = lazy(() => import('./pages/dragons/Sprite2DPage'))
const WebGL3DPage = lazy(() => import('./pages/dragons/WebGL3DPage'))

// Verification Pages
const ReactError310VerificationPage = lazy(() => import('./pages/verification/ReactError310VerificationPage'))

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
  modelPath
}: { 
  children: React.ReactNode
  pageName?: string
  modelPath?: string
}) => {
  return (
    <CompositeErrorBoundary
      enableAutoRecovery={true}
      enablePerformanceMonitoring={true}
      enableWebGLRecovery={true}
      enableGLTFRecovery={true}
      enableSuspenseRecovery={true}
      maxRetries={3}
      retryDelay={2000}
      modelPath={modelPath}
      onError={(error, errorInfo, errorSource) => {
        console.error(`WebGL3D Error in ${pageName}:`, { error, errorInfo, errorSource })
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
        path: 'simple',
        element: (
          <PageLoader pageName="Simple Home">
            <SimpleHomePage />
          </PageLoader>
        ),
      },
      {
        path: '3d',
        element: (
          <PageLoader pageName="3D Dragon">
            <HomePage3D />
          </PageLoader>
        ),
      },
      {
        path: 'demo',
        element: (
          <PageLoader pageName="Demo">
            <DemoPage />
          </PageLoader>
        ),
      },
      {
        path: 'voice-test',
        element: (
          <PageLoader pageName="Voice Test" featureType="voice">
            <VoiceTestPage />
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
        path: 'security-test',
        element: (
          <PageLoader pageName="Security Test">
            <SecurityTestPage />
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
      {
        path: 'dragon-debug',
        element: (
          <PageLoader pageName="Dragon Debug">
            <DragonDebugPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragons/ascii-complex',
        element: (
          <PageLoader pageName="Complex ASCII Dragons">
            <AsciiComplexPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragons/ascii-animated',
        element: (
          <PageLoader pageName="Animated ASCII Dragons">
            <AsciiAnimatedPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragons/sprite-2d',
        element: (
          <PageLoader pageName="2D Sprite Dragons">
            <Sprite2DPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragons/webgl-3d',
        element: (
          <WebGL3DPageLoader 
            pageName="3D WebGL Dragons"
            modelPath="/models/dragon.glb"
          >
            <WebGL3DPage />
          </WebGL3DPageLoader>
        ),
      },
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
])