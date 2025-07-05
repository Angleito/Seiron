import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { Suspense, lazy } from 'react'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { PageErrorBoundary } from '@components/error-boundaries'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const DragonDemoPage = lazy(() => import('./pages/DragonDemoPage'))
const DragonShowcasePage = lazy(() => import('./pages/DragonShowcasePage'))
const VoiceTestPage = lazy(() => import('./pages/VoiceTestPage'))
const AgentTestPage = lazy(() => import('./pages/AgentTestPage'))
const AnimationDemoPage = lazy(() => import('./pages/AnimationDemoPage'))
const SecurityTestPage = lazy(() => import('./pages/SecurityTestPage'))

const PageLoader = ({ children, pageName }: { children: React.ReactNode, pageName?: string }) => (
  <PageErrorBoundary pageName={pageName}>
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  </PageErrorBoundary>
)

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
        path: 'dashboard',
        element: (
          <PageLoader pageName="Dashboard">
            <DashboardPage />
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
        path: 'dragon-demo',
        element: (
          <PageLoader pageName="Dragon Demo">
            <DragonDemoPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragon-showcase',
        element: (
          <PageLoader pageName="Dragon Showcase">
            <DragonShowcasePage />
          </PageLoader>
        ),
      },
      {
        path: 'voice-test',
        element: (
          <PageLoader pageName="Voice Test">
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
        path: 'animation-demo',
        element: (
          <PageLoader pageName="Animation Demo">
            <AnimationDemoPage />
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
    ],
  },
])