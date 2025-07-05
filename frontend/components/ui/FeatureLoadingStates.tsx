import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Specialized loading states for different features
 */

export const DragonAnimationLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
          <span className="text-2xl">🐉</span>
        </div>
      </div>
      <LoadingSpinner className="text-orange-600" />
      <p className="mt-2 font-medium text-gray-900">Awakening the Dragon</p>
      <p className="mt-1 text-sm text-gray-600">Loading dragon animations...</p>
    </div>
  </div>
)

export const VoiceFeatureLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      </div>
      <LoadingSpinner className="text-blue-600" />
      <p className="mt-2 font-medium text-gray-900">Initializing Voice Features</p>
      <p className="mt-1 text-sm text-gray-600">Loading speech recognition and TTS...</p>
    </div>
  </div>
)

export const PerformanceMonitorLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
      <LoadingSpinner className="text-green-600" />
      <p className="mt-2 font-medium text-gray-900">Loading Performance Monitor</p>
      <p className="mt-1 text-sm text-gray-600">Initializing performance tracking...</p>
    </div>
  </div>
)

export const ChatFeatureLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
      <LoadingSpinner className="text-indigo-600" />
      <p className="mt-2 font-medium text-gray-900">Loading Chat Features</p>
      <p className="mt-1 text-sm text-gray-600">Initializing chat interface...</p>
    </div>
  </div>
)

export const PortfolioFeatureLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg">
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
      </div>
      <LoadingSpinner className="text-emerald-600" />
      <p className="mt-2 font-medium text-gray-900">Loading Portfolio Features</p>
      <p className="mt-1 text-sm text-gray-600">Initializing portfolio analytics...</p>
    </div>
  </div>
)

/**
 * Generic feature loader with customizable appearance
 */
export const GenericFeatureLoader: React.FC<{
  featureName: string
  description?: string
  icon?: React.ReactNode
  colorScheme?: 'orange' | 'blue' | 'green' | 'indigo' | 'purple' | 'emerald'
}> = ({ featureName, description, icon, colorScheme = 'blue' }) => {
  const colorClasses = {
    orange: 'from-orange-100 to-red-100 from-orange-500 to-red-500 text-orange-600',
    blue: 'from-blue-100 to-purple-100 from-blue-500 to-purple-500 text-blue-600',
    green: 'from-green-100 to-teal-100 from-green-500 to-teal-500 text-green-600',
    indigo: 'from-indigo-100 to-purple-100 from-indigo-500 to-purple-500 text-indigo-600',
    purple: 'from-purple-100 to-pink-100 from-purple-500 to-pink-500 text-purple-600',
    emerald: 'from-emerald-100 to-teal-100 from-emerald-500 to-teal-500 text-emerald-600'
  }

  const [bgGradient, iconGradient, textColor] = colorClasses[colorScheme].split(' ')

  return (
    <div className={`flex items-center justify-center p-8 bg-gradient-to-r ${bgGradient} rounded-lg`}>
      <div className="text-center">
        {icon && (
          <div className="mb-4">
            <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${iconGradient} flex items-center justify-center animate-pulse`}>
              {icon}
            </div>
          </div>
        )}
        <LoadingSpinner className={textColor} />
        <p className="mt-2 font-medium text-gray-900">Loading {featureName}</p>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
    </div>
  )
}

/**
 * Loading progress bar component
 */
export const FeatureLoadingProgress: React.FC<{
  progress: number
  featureName: string
  details?: string[]
}> = ({ progress, featureName, details }) => (
  <div className="w-full max-w-md mx-auto">
    <div className="mb-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-900">Loading {featureName}</span>
        <span className="text-gray-600">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
    {details && details.length > 0 && (
      <div className="text-xs text-gray-500 space-y-1">
        {details.map((detail, index) => (
          <div key={index} className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
            {detail}
          </div>
        ))}
      </div>
    )}
  </div>
)