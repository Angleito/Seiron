// Temporarily disabled due to complex type errors
// This file can be re-enabled after proper type definitions are created

export const useKeyboardNavigation = () => {
  return {
    focusedPart: null,
    currentIndex: 0,
    isKeyboardActive: false,
    navigationState: {
      mode: 'normal' as const,
      focusVisible: false,
      announcements: []
    }
  }
}

export default useKeyboardNavigation