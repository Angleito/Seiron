/**
 * React Error #310 Debugging Utilities
 * Helps identify and debug React Error #310 issues
 */

import React from 'react'

export interface ReactError310Info {
  isReactError310: boolean
  errorType: 'function-render' | 'invalid-element' | 'useeffect-return' | 'import-error' | 'unknown'
  suggestions: string[]
  componentStack?: string
}

/**
 * Analyzes an error to determine if it's React Error #310 and provides debugging info
 */
export function analyzeReactError310(error: Error, componentStack?: string): ReactError310Info {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''
  
  // Check if this is React Error #310
  const isReactError310 = 
    message.includes('element type is invalid') ||
    message.includes('got: undefined') ||
    message.includes('got: function') ||
    message.includes('objects are not valid as a react child') ||
    message.includes('cannot read property') && message.includes('$$typeof')

  if (!isReactError310) {
    return {
      isReactError310: false,
      errorType: 'unknown',
      suggestions: []
    }
  }

  // Determine specific error type and provide suggestions
  let errorType: ReactError310Info['errorType'] = 'unknown'
  const suggestions: string[] = []

  if (message.includes('got: function')) {
    errorType = 'function-render'
    suggestions.push(
      'You\'re rendering a function instead of calling it. Add () to function calls.',
      'Check if you\'re using {someFunction} instead of {someFunction()}',
      'Make sure useEffect hooks don\'t return JSX elements'
    )
  } else if (message.includes('got: undefined')) {
    errorType = 'import-error'
    suggestions.push(
      'Component import is undefined. Check your import statements.',
      'Verify the component is exported correctly (default vs named export)',
      'Make sure the component file exists and is accessible'
    )
  } else if (message.includes('objects are not valid as a react child')) {
    errorType = 'invalid-element'
    suggestions.push(
      'You\'re trying to render a non-React object as a child.',
      'Check if Three.js objects are being rendered directly in JSX',
      'Make sure all JSX children are valid React elements'
    )
  } else if (stack.includes('useeffect') || componentStack?.includes('useEffect')) {
    errorType = 'useeffect-return'
    suggestions.push(
      'useEffect hook is returning JSX instead of a cleanup function',
      'Make sure useEffect only returns undefined or a cleanup function',
      'Move JSX rendering outside of useEffect'
    )
  }

  // Add general suggestions
  suggestions.push(
    'Enable React strict mode for better error detection',
    'Check the component stack trace for the exact location',
    'Use React DevTools to inspect the component tree'
  )

  return {
    isReactError310: true,
    errorType,
    suggestions,
    componentStack
  }
}

/**
 * Logs detailed debugging information for React Error #310
 */
export function logReactError310Debug(error: Error, componentStack?: string) {
  const analysis = analyzeReactError310(error, componentStack)
  
  if (!analysis.isReactError310) {
    return
  }

  console.group('🚨 React Error #310 Debug Information')
  console.error('Error:', error.message)
  console.error('Error Type:', analysis.errorType)
  
  if (componentStack) {
    console.error('Component Stack:', componentStack)
  }
  
  console.group('💡 Suggestions:')
  analysis.suggestions.forEach((suggestion, index) => {
    console.info(`${index + 1}. ${suggestion}`)
  })
  console.groupEnd()
  
  console.group('🔍 Common Patterns to Check:')
  console.info('1. useEffect returning JSX: useEffect(() => <Component />, []) ❌')
  console.info('2. Function not called: {myFunction} instead of {myFunction()} ❌')
  console.info('3. Three.js objects in JSX: <mesh>{threeJsObject}</mesh> ❌')
  console.info('4. Incorrect imports: import Component from "./Component" but Component is undefined ❌')
  console.groupEnd()
  
  console.groupEnd()
}

/**
 * Validates that a value is a valid React element
 */
export function validateReactElement(value: any, elementName: string = 'element'): boolean {
  if (value === null || value === undefined) {
    return true // null and undefined are valid
  }
  
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true // primitives are valid
  }
  
  if (Array.isArray(value)) {
    return value.every((item, index) => validateReactElement(item, `${elementName}[${index}]`))
  }
  
  if (typeof value === 'object' && value.$$typeof) {
    return true // React element
  }
  
  console.warn(`⚠️ Invalid React element detected: ${elementName}`, value)
  console.warn('Type:', typeof value)
  console.warn('Constructor:', value.constructor?.name)
  
  return false
}

/**
 * Development mode helper to catch React Error #310 early
 */
export function devModeReactValidator() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  // Override React.createElement to catch invalid elements early
  const originalCreateElement = React.createElement
  
  ;(React as any).createElement = function(type: any, props: any, ...children: any[]) {
    try {
      if (typeof type === 'function' && type.length === 0 && !type.prototype?.render) {
        // This might be a function component being passed without calling
        console.warn('⚠️ Potential React Error #310: Function component not called?', type)
      }
      
      if (type === undefined) {
        console.error('🚨 React Error #310: Element type is undefined!', { type, props, children })
        throw new Error('Element type is undefined - check your imports')
      }
      
      if (typeof type === 'function' && type.toString().includes('useEffect')) {
        console.warn('⚠️ Potential React Error #310: useEffect in render?')
      }
      
      return originalCreateElement.call(this, type, props, ...children)
    } catch (error) {
      console.error('🚨 React.createElement error:', error)
      logReactError310Debug(error as Error)
      throw error
    }
  }
}

// Auto-enable in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  devModeReactValidator()
}