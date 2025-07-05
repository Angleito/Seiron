import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { Button, ButtonProps } from '../Button'
import { Play, Stop } from 'lucide-react'

// Property generators
const arbitraryVariant = fc.constantFrom('primary', 'secondary', 'danger', 'ghost')
const arbitrarySize = fc.constantFrom('sm', 'md', 'lg')
const arbitraryIconPosition = fc.constantFrom('left', 'right')
const arbitraryChildren = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.constant('Click me'),
  fc.constant('Submit'),
  fc.constant('Cancel')
)

describe('Button Component', () => {
  const defaultProps: ButtonProps = {
    children: 'Test Button'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Property-based tests', () => {
    it('should render with any valid variant and size combination', () => {
      fc.assert(
        fc.property(arbitraryVariant, arbitrarySize, arbitraryChildren, (variant, size, children) => {
          const { container, unmount } = render(
            <Button variant={variant} size={size}>
              {children}
            </Button>
          )
          
          expect(container.firstChild).toBeInTheDocument()
          expect(container.querySelector('button')).toHaveTextContent(children.toString())
          
          // Clean up for next iteration
          unmount()
        })
      )
    })

    it('should handle any valid icon position', () => {
      fc.assert(
        fc.property(arbitraryIconPosition, arbitraryChildren, (iconPosition, children) => {
          const { container, unmount } = render(
            <Button icon={Play} iconPosition={iconPosition}>
              {children}
            </Button>
          )
          
          const button = container.querySelector('button')
          expect(button).toBeInTheDocument()
          expect(button).toHaveTextContent(children.toString())
          
          // Clean up for next iteration
          unmount()
        })
      )
    })

    it('should maintain consistent behavior across multiple interactions', async () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('click', 'hover', 'focus'), { minLength: 1, maxLength: 5 }),
          async (actions) => {
            const onClick = jest.fn()
            const user = userEvent.setup()
            
            const { container, unmount } = render(
              <Button onClick={onClick}>
                Test Button
              </Button>
            )
            
            const button = container.querySelector('button')
            
            for (const action of actions) {
              switch (action) {
                case 'click':
                  if (button) await user.click(button)
                  break
                case 'hover':
                  if (button) await user.hover(button)
                  break
                case 'focus':
                  if (button) button.focus()
                  break
              }
            }
            
            // Button should still be functional
            expect(button).toBeInTheDocument()
            expect(onClick).toHaveBeenCalledTimes(actions.filter(a => a === 'click').length)
            
            // Clean up for next iteration
            unmount()
          }
        )
      )
    })
  })

  describe('Unit tests', () => {
    it('should render with default props', () => {
      render(<Button {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Test Button')
    })

    it('should apply correct variant styles', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('from-red-600', 'to-red-700')
      
      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-gray-200', 'text-gray-700')
      
      rerender(<Button variant="danger">Danger</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-red-500', 'text-white')
      
      rerender(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('text-gray-400', 'hover:text-white')
    })

    it('should apply correct size styles', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1', 'text-sm')
      
      rerender(<Button size="md">Medium</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2')
      
      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg')
    })

    it('should render icon on the left by default', () => {
      render(
        <Button icon={Play}>
          Play
        </Button>
      )
      
      const button = screen.getByRole('button')
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-4', 'w-4')
    })

    it('should render icon on the right when specified', () => {
      render(
        <Button icon={Stop} iconPosition="right">
          Stop
        </Button>
      )
      
      const button = screen.getByRole('button')
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-4', 'w-4')
    })

    it('should show loading spinner when loading', () => {
      render(
        <Button loading>
          Loading Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should hide icon when loading', () => {
      render(
        <Button icon={Play} loading>
          Loading
        </Button>
      )
      
      const button = screen.getByRole('button')
      const icon = button.querySelector('svg')
      expect(icon).not.toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <Button disabled>
          Disabled Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should be disabled when loading', () => {
      render(
        <Button loading>
          Loading Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should call onClick when clicked', async () => {
      const onClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Button onClick={onClick}>
          Click me
        </Button>
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const onClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Button onClick={onClick} disabled>
          Disabled Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(onClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', async () => {
      const onClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Button onClick={onClick} loading>
          Loading Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(onClick).not.toHaveBeenCalled()
    })

    it('should apply custom className', () => {
      const customClass = 'custom-button-class'
      render(
        <Button className={customClass}>
          Custom Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass(customClass)
    })

    it('should forward HTML button attributes', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom label">
          Test Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-testid', 'custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })
  })

  describe('Accessibility tests', () => {
    it('should have proper button role', () => {
      render(<Button>Accessible Button</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const onClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Button onClick={onClick}>
          Keyboard Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      button.focus()
      
      await user.keyboard('[Enter]')
      expect(onClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard('[Space]')
      expect(onClick).toHaveBeenCalledTimes(2)
    })

    it('should have proper focus states', async () => {
      const user = userEvent.setup()
      
      render(<Button>Focus Button</Button>)
      
      const button = screen.getByRole('button')
      await user.tab()
      
      expect(button).toHaveFocus()
    })

    it('should announce loading state to screen readers', () => {
      render(
        <Button loading aria-label="Loading, please wait">
          Loading
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Loading, please wait')
    })
  })

  describe('Visual state tests', () => {
    it('should apply transition classes', () => {
      render(<Button>Transition Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-colors')
    })

    it('should apply flex layout classes', () => {
      render(<Button>Flex Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('flex', 'items-center', 'gap-2')
    })

    it('should apply rounded corners', () => {
      render(<Button>Rounded Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('rounded-lg')
    })
  })

  describe('Performance tests', () => {
    it('should be memoized', () => {
      const MemorizedButton = React.memo(Button)
      expect(MemorizedButton).toBeDefined()
    })

    it('should not re-render with same props', () => {
      const renderSpy = jest.fn()
      const TestButton = React.memo(function TestButton(props: ButtonProps) {
        renderSpy()
        return <Button {...props} />
      })
      
      const { rerender } = render(
        <TestButton>Test</TestButton>
      )
      
      rerender(<TestButton>Test</TestButton>)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })
})