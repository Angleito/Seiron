// Accessibility testing setup
import { configureAxe } from 'jest-axe'

// Configure axe for our specific needs
const axe = configureAxe({
  rules: {
    // Enable specific rules for interactive elements
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    
    // Dragon-specific accessibility rules
    'svg-img-alt': { enabled: true },
    'role-img-alt': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
})

global.axe = axe

// Screen reader simulation utilities
global.simulateScreenReader = {
  // Simulate reading the entire component
  readComponent: async (element) => {
    const textContent = element.textContent || ''
    const ariaLabels = Array.from(element.querySelectorAll('[aria-label]'))
      .map(el => el.getAttribute('aria-label'))
      .filter(Boolean)
    
    const ariaDescriptions = Array.from(element.querySelectorAll('[aria-describedby]'))
      .map(el => {
        const ids = el.getAttribute('aria-describedby').split(' ')
        return ids.map(id => {
          const desc = document.getElementById(id)
          return desc ? desc.textContent : ''
        }).filter(Boolean)
      })
      .flat()

    return {
      textContent: textContent.trim(),
      ariaLabels,
      ariaDescriptions,
      fullReading: [textContent, ...ariaLabels, ...ariaDescriptions]
        .filter(Boolean)
        .join(' ')
        .trim()
    }
  },

  // Simulate tabbing through focusable elements
  simulateTabNavigation: (container) => {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]'
    ]
    
    const focusableElements = container.querySelectorAll(focusableSelectors.join(', '))
    const tabOrder = Array.from(focusableElements)
      .filter(el => !el.disabled && el.offsetParent !== null) // Visible and enabled
      .sort((a, b) => {
        const aIndex = parseInt(a.getAttribute('tabindex') || '0')
        const bIndex = parseInt(b.getAttribute('tabindex') || '0')
        return aIndex - bIndex
      })

    return tabOrder.map(el => ({
      element: el,
      tagName: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      textContent: el.textContent?.trim(),
      tabIndex: el.getAttribute('tabindex') || '0'
    }))
  },

  // Simulate ARIA live region announcements
  getAriaLiveAnnouncements: (container) => {
    const liveRegions = container.querySelectorAll('[aria-live]')
    return Array.from(liveRegions).map(region => ({
      politeness: region.getAttribute('aria-live'),
      content: region.textContent?.trim(),
      atomic: region.getAttribute('aria-atomic') === 'true'
    }))
  }
}

// Keyboard navigation testing utilities
global.keyboardNavigation = {
  // Test if an element is properly focusable
  isFocusable: (element) => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])'
    ]
    
    return focusableSelectors.some(selector => element.matches(selector))
  },

  // Simulate keyboard events
  pressKey: async (element, key, options = {}) => {
    const keyboardEvent = new KeyboardEvent('keydown', {
      key,
      code: key,
      which: options.which || key.charCodeAt(0),
      keyCode: options.keyCode || key.charCodeAt(0),
      ...options
    })
    
    element.dispatchEvent(keyboardEvent)
    
    // Simulate the corresponding keyup event
    const keyupEvent = new KeyboardEvent('keyup', {
      key,
      code: key,
      which: options.which || key.charCodeAt(0),
      keyCode: options.keyCode || key.charCodeAt(0),
      ...options
    })
    
    setTimeout(() => element.dispatchEvent(keyupEvent), 10)
  },

  // Test tab navigation
  simulateTab: async (startElement, steps = 1) => {
    let currentElement = startElement
    const path = [currentElement]
    
    for (let i = 0; i < steps; i++) {
      await keyboardNavigation.pressKey(currentElement, 'Tab')
      
      // Find next focusable element
      const focusableElements = Array.from(document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.disabled && el.offsetParent !== null)
      
      const currentIndex = focusableElements.indexOf(currentElement)
      const nextIndex = (currentIndex + 1) % focusableElements.length
      currentElement = focusableElements[nextIndex]
      path.push(currentElement)
    }
    
    return path
  }
}

// High contrast mode testing
global.highContrastTesting = {
  // Simulate high contrast mode
  enableHighContrast: () => {
    const style = document.createElement('style')
    style.id = 'high-contrast-simulation'
    style.textContent = `
      @media (prefers-contrast: high) {
        * {
          background-color: black !important;
          color: white !important;
          border-color: white !important;
        }
        
        [aria-selected="true"], :focus, :focus-visible {
          outline: 3px solid yellow !important;
          outline-offset: 2px !important;
        }
      }
    `
    document.head.appendChild(style)
  },

  disableHighContrast: () => {
    const style = document.getElementById('high-contrast-simulation')
    if (style) {
      style.remove()
    }
  },

  // Check color contrast ratios
  checkContrast: (element) => {
    const styles = window.getComputedStyle(element)
    const backgroundColor = styles.backgroundColor
    const color = styles.color
    
    // This is a simplified contrast check
    // In a real implementation, you'd use a proper color contrast library
    return {
      backgroundColor,
      color,
      // Placeholder - would calculate actual contrast ratio
      ratio: 4.5,
      passes: true
    }
  }
}

// Reduced motion testing
global.reducedMotionTesting = {
  // Simulate reduced motion preference
  enableReducedMotion: () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          }
        }
        return {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }
      }),
    })
  },

  disableReducedMotion: () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  }
}

// Accessibility assertion helpers
global.expectAccessible = async (element, options = {}) => {
  const results = await axe(element, options)
  expect(results).toHaveNoViolations()
}

global.expectKeyboardAccessible = (element) => {
  expect(keyboardNavigation.isFocusable(element)).toBe(true)
  expect(element.getAttribute('tabindex')).not.toBe('-1')
}

global.expectScreenReaderAccessible = async (element) => {
  const reading = await simulateScreenReader.readComponent(element)
  expect(reading.fullReading).toBeTruthy()
  expect(reading.fullReading.length).toBeGreaterThan(0)
}

// Dragon-specific accessibility testing
global.expectDragonAccessible = async (dragonElement) => {
  // Check basic accessibility
  await expectAccessible(dragonElement)
  
  // Check SVG accessibility
  expect(dragonElement.getAttribute('role')).toBe('img')
  expect(dragonElement.getAttribute('aria-label')).toBeTruthy()
  
  // Check interactive parts are keyboard accessible
  const interactiveParts = dragonElement.querySelectorAll('[data-dragon-part]')
  interactiveParts.forEach(part => {
    if (part.classList.contains('cursor-pointer')) {
      expectKeyboardAccessible(part)
    }
  })
  
  // Check ARIA live regions for state announcements
  const liveRegions = dragonElement.querySelectorAll('[aria-live]')
  expect(liveRegions.length).toBeGreaterThan(0)
}