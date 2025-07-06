import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/layouts/RootLayout'
import { lazy } from 'react'
import { PageErrorBoundary } from '@components/error-boundaries'
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
const DemoPage = lazy(() => import('./pages/DemoPage'))
const VoiceTestPage = lazy(() => import('./pages/VoiceTestPage'))
const AgentTestPage = lazy(() => import('./pages/AgentTestPage'))
const SecurityTestPage = lazy(() => import('./pages/SecurityTestPage'))
const ChatPage = lazy(() => import('./pages/chat'))
const AboutPage = lazy(() => import('./pages/about'))

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
    ],
  },
])