import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { Suspense, lazy } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const DragonDemoPage = lazy(() => import('./pages/DragonDemoPage'))
const DragonShowcasePage = lazy(() => import('./pages/DragonShowcasePage'))
const VoiceTestPage = lazy(() => import('./pages/VoiceTestPage'))
const AgentTestPage = lazy(() => import('./pages/AgentTestPage'))
const AnimationDemoPage = lazy(() => import('./pages/AnimationDemoPage'))

const PageLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <PageLoader>
            <HomePage />
          </PageLoader>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <PageLoader>
            <DashboardPage />
          </PageLoader>
        ),
      },
      {
        path: 'demo',
        element: (
          <PageLoader>
            <DemoPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragon-demo',
        element: (
          <PageLoader>
            <DragonDemoPage />
          </PageLoader>
        ),
      },
      {
        path: 'dragon-showcase',
        element: (
          <PageLoader>
            <DragonShowcasePage />
          </PageLoader>
        ),
      },
      {
        path: 'voice-test',
        element: (
          <PageLoader>
            <VoiceTestPage />
          </PageLoader>
        ),
      },
      {
        path: 'agent-test',
        element: (
          <PageLoader>
            <AgentTestPage />
          </PageLoader>
        ),
      },
      {
        path: 'animation-demo',
        element: (
          <PageLoader>
            <AnimationDemoPage />
          </PageLoader>
        ),
      },
    ],
  },
])