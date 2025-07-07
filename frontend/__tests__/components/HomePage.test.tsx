import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../../pages/HomePage'

// Mock the navigate function
const mockNavigate = jest.fn()

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// Mock the StormBackground component to avoid complexity in testing
jest.mock('../../components/effects/StormBackground', () => {
  return {
    StormBackground: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div className={className} data-testid="storm-background">
        {children}
      </div>
    )
  }
})

// Mock console methods to capture debug output
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
}

describe('HomePage Button Click Functionality', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    consoleSpy.log.mockClear()
    consoleSpy.error.mockClear()
  })

  afterAll(() => {
    consoleSpy.log.mockRestore()
    consoleSpy.error.mockRestore()
  })

  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
  }

  describe('SUMMON Button', () => {
    it('should be visible and clickable', async () => {
      renderHomePage()
      
      // Wait for the component to load (animation delay)
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
        expect(summonButton).toBeEnabled()
      }, { timeout: 3000 })
    })

    it('should have correct styling and classes', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toHaveClass('cursor-pointer')
        expect(summonButton).toHaveClass('pointer-events-auto')
        expect(summonButton).not.toHaveClass('pointer-events-none')
      })
    })

    it('should trigger click event and call handleNavigation', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Click the button
      fireEvent.click(summonButton)
      
      // Verify debug console output
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: SUMMON button clicked!')
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: handleNavigation called with path: /chat')
      
      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/chat')
    })

    it('should handle click events properly', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Test multiple click events
      fireEvent.click(summonButton)
      fireEvent.click(summonButton)
      
      // Should have been called twice
      expect(mockNavigate).toHaveBeenCalledTimes(2)
      expect(mockNavigate).toHaveBeenCalledWith('/chat')
    })

    it('should not prevent default behavior', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Create a mock event
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: summonButton,
        currentTarget: summonButton,
      }
      
      // Fire event manually
      fireEvent.click(summonButton, mockEvent)
      
      // Verify preventDefault was not called (unless we want it to be)
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('ABOUT Button', () => {
    it('should be visible and clickable', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const aboutButton = screen.getByRole('button', { name: /about/i })
        expect(aboutButton).toBeVisible()
        expect(aboutButton).toBeEnabled()
      }, { timeout: 3000 })
    })

    it('should trigger click event and call handleNavigation', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const aboutButton = screen.getByRole('button', { name: /about/i })
        expect(aboutButton).toBeVisible()
      })

      const aboutButton = screen.getByRole('button', { name: /about/i })
      
      // Click the button
      fireEvent.click(aboutButton)
      
      // Verify debug console output
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: ABOUT button clicked!')
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: handleNavigation called with path: /about')
      
      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/about')
    })
  })

  describe('Navigation Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      // Mock navigate to throw an error
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed')
      })

      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Click the button
      fireEvent.click(summonButton)
      
      // Verify error was logged (check for the specific error message)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Navigation error:'),
        expect.any(Error)
      )
    })

    it('should handle missing navigate function', async () => {
      // Mock navigate to be undefined
      mockNavigate.mockImplementation(undefined as any)

      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Click the button
      fireEvent.click(summonButton)
      
      // Verify error was logged
      expect(consoleSpy.error).toHaveBeenCalledWith('🚨 Navigation error:', expect.any(Error))
    })
  })

  describe('Component Loading and Animation', () => {
    it('should show loading state initially', () => {
      renderHomePage()
      
      // Initially buttons should be hidden (opacity-0)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const parentDiv = button.closest('div')
        expect(parentDiv).toHaveClass('opacity-0')
      })
    })

    it('should complete loading animation', async () => {
      renderHomePage()
      
      // Wait for animation to complete
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          const parentDiv = button.closest('div')
          expect(parentDiv).not.toHaveClass('opacity-0')
        })
      }, { timeout: 3000 })
    })
  })

  describe('Button Accessibility', () => {
    it('should have proper accessibility attributes', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      const aboutButton = screen.getByRole('button', { name: /about/i })
      
      // Check button roles
      expect(summonButton).toHaveAttribute('type', 'button')
      expect(aboutButton).toHaveAttribute('type', 'button')
      
      // Check that buttons are not disabled
      expect(summonButton).not.toBeDisabled()
      expect(aboutButton).not.toBeDisabled()
    })

    it('should be keyboard accessible', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Focus the button
      summonButton.focus()
      expect(summonButton).toHaveFocus()
      
      // Press Enter
      fireEvent.keyDown(summonButton, { key: 'Enter', code: 'Enter' })
      
      // Should trigger navigation
      expect(mockNavigate).toHaveBeenCalledWith('/chat')
    })
  })

  describe('Debug Information', () => {
    it('should log comprehensive debug information', async () => {
      renderHomePage()
      
      await waitFor(() => {
        const summonButton = screen.getByRole('button', { name: /summon/i })
        expect(summonButton).toBeVisible()
      })

      const summonButton = screen.getByRole('button', { name: /summon/i })
      
      // Click the button
      fireEvent.click(summonButton)
      
      // Verify all debug logs
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: SUMMON button clicked!')
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: handleNavigation called with path: /chat')
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: navigate function exists:', true)
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: Current timestamp:', expect.any(String))
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: About to call navigate(/chat)')
      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 DEBUG: navigate() called successfully')
    })
  })
})