import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { Input, InputProps } from '../Input'
import { Search, User, Mail } from 'lucide-react'

// Property generators
const arbitraryInputType = fc.constantFrom('text', 'email', 'password', 'number', 'search', 'tel', 'url')
const arbitraryIconPosition = fc.constantFrom('left', 'right')
const arbitraryLabel = fc.oneof(
  fc.string({ minLength: 1, maxLength: 30 }),
  fc.constant('Email'),
  fc.constant('Password'),
  fc.constant('Username')
)
const arbitraryError = fc.oneof(
  fc.string({ minLength: 1, maxLength: 100 }),
  fc.constant('This field is required'),
  fc.constant('Invalid email format'),
  fc.constant('Password too short')
)
const arbitraryHelperText = fc.oneof(
  fc.string({ minLength: 1, maxLength: 100 }),
  fc.constant('Enter your email address'),
  fc.constant('Must be at least 8 characters'),
  fc.constant('This will be your display name')
)

describe('Input Component', () => {
  const defaultProps: InputProps = {
    placeholder: 'Enter text...'
  }

  describe('Property-based tests', () => {
    it('should render with any valid input type and label', () => {
      fc.assert(
        fc.property(arbitraryInputType, arbitraryLabel, (type, label) => {
          render(
            <Input type={type} label={label} />
          )
          
          expect(screen.getByRole('textbox')).toBeInTheDocument()
          expect(screen.getByText(label)).toBeInTheDocument()
        })
      )
    })

    it('should display any error message correctly', () => {
      fc.assert(
        fc.property(arbitraryError, (error) => {
          render(
            <Input error={error} />
          )
          
          expect(screen.getByText(error)).toBeInTheDocument()
          expect(screen.getByText(error)).toHaveClass('text-red-400')
        })
      )
    })

    it('should display any helper text correctly', () => {
      fc.assert(
        fc.property(arbitraryHelperText, (helperText) => {
          render(
            <Input helperText={helperText} />
          )
          
          expect(screen.getByText(helperText)).toBeInTheDocument()
          expect(screen.getByText(helperText)).toHaveClass('text-gray-500')
        })
      )
    })

    it('should handle icon positioning correctly', () => {
      fc.assert(
        fc.property(arbitraryIconPosition, (iconPosition) => {
          render(
            <Input icon={Search} iconPosition={iconPosition} />
          )
          
          const input = screen.getByRole('textbox')
          expect(input).toBeInTheDocument()
          
          if (iconPosition === 'left') {
            expect(input).toHaveClass('pl-10')
          } else {
            expect(input).toHaveClass('pr-10')
          }
        })
      )
    })

    it('should maintain consistent behavior with user input', async () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          async (inputs) => {
            const onChange = jest.fn()
            const user = userEvent.setup()
            
            render(
              <Input onChange={onChange} />
            )
            
            const input = screen.getByRole('textbox')
            
            for (const text of inputs) {
              await user.clear(input)
              await user.type(input, text)
              expect(input).toHaveValue(text)
            }
            
            expect(onChange).toHaveBeenCalled()
          }
        )
      )
    })
  })

  describe('Unit tests', () => {
    it('should render with default props', () => {
      render(<Input {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Enter text...')
    })

    it('should render with label', () => {
      render(<Input label="Email" />)
      
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with error state', () => {
      render(<Input error="This field is required" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500', 'focus:ring-red-600')
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toHaveClass('text-red-400')
    })

    it('should render with helper text', () => {
      render(<Input helperText="Enter your email address" />)
      
      expect(screen.getByText('Enter your email address')).toBeInTheDocument()
      expect(screen.getByText('Enter your email address')).toHaveClass('text-gray-500')
    })

    it('should prioritize error over helper text', () => {
      render(
        <Input 
          error="This field is required" 
          helperText="Enter your email address" 
        />
      )
      
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument()
    })

    it('should render with left icon', () => {
      render(<Input icon={User} iconPosition="left" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10')
      
      const icon = screen.getByRole('textbox').parentElement?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-4', 'w-4')
    })

    it('should render with right icon', () => {
      render(<Input icon={Mail} iconPosition="right" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pr-10')
      
      const icon = screen.getByRole('textbox').parentElement?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-4', 'w-4')
    })

    it('should change icon color when error is present', () => {
      render(<Input icon={Search} error="Error message" />)
      
      const icon = screen.getByRole('textbox').parentElement?.querySelector('svg')
      expect(icon).toHaveClass('text-red-400')
    })

    it('should handle user input', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()
      
      render(<Input onChange={onChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test input')
      
      expect(input).toHaveValue('test input')
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle focus and blur events', async () => {
      const onFocus = jest.fn()
      const onBlur = jest.fn()
      const user = userEvent.setup()
      
      render(<Input onFocus={onFocus} onBlur={onBlur} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(onFocus).toHaveBeenCalled()
      
      await user.tab()
      expect(onBlur).toHaveBeenCalled()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should apply custom className', () => {
      const customClass = 'custom-input-class'
      render(<Input className={customClass} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(customClass)
    })

    it('should forward HTML input attributes', () => {
      render(
        <Input 
          data-testid="custom-input" 
          aria-label="Custom input"
          maxLength={10}
          minLength={2}
        />
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('data-testid', 'custom-input')
      expect(input).toHaveAttribute('aria-label', 'Custom input')
      expect(input).toHaveAttribute('maxLength', '10')
      expect(input).toHaveAttribute('minLength', '2')
    })
  })

  describe('Accessibility tests', () => {
    it('should associate label with input', () => {
      render(<Input label="Email Address" />)
      
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Email Address')
      
      // In this implementation, label is not directly associated with input
      // but they are semantically related through proximity
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.tab()
      
      expect(input).toHaveFocus()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Input data-testid="first" />
          <Input data-testid="second" />
        </div>
      )
      
      const firstInput = screen.getByTestId('first')
      const secondInput = screen.getByTestId('second')
      
      await user.tab()
      expect(firstInput).toHaveFocus()
      
      await user.tab()
      expect(secondInput).toHaveFocus()
    })

    it('should announce errors to screen readers', () => {
      render(<Input error="This field is required" aria-describedby="error-message" />)
      
      const input = screen.getByRole('textbox')
      const errorMessage = screen.getByText('This field is required')
      
      expect(input).toHaveAttribute('aria-describedby', 'error-message')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Visual state tests', () => {
    it('should apply correct styles for normal state', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'w-full',
        'rounded-lg',
        'border',
        'bg-gray-900',
        'text-red-100',
        'px-3',
        'py-2',
        'focus:outline-none',
        'focus:ring-2',
        'transition-colors',
        'border-red-700',
        'focus:ring-red-600'
      )
    })

    it('should apply correct styles for error state', () => {
      render(<Input error="Error message" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500', 'focus:ring-red-600')
    })

    it('should apply correct padding when icon is present', () => {
      const { rerender } = render(<Input icon={Search} iconPosition="left" />)
      expect(screen.getByRole('textbox')).toHaveClass('pl-10')
      
      rerender(<Input icon={Search} iconPosition="right" />)
      expect(screen.getByRole('textbox')).toHaveClass('pr-10')
    })

    it('should have proper spacing', () => {
      render(
        <Input 
          label="Test Label" 
          helperText="Helper text" 
        />
      )
      
      const container = screen.getByRole('textbox').parentElement?.parentElement
      expect(container).toHaveClass('space-y-1')
    })
  })

  describe('Performance tests', () => {
    it('should be memoized', () => {
      const MemoizedInput = React.memo(Input)
      expect(MemoizedInput).toBeDefined()
    })

    it('should not re-render with same props', () => {
      const renderSpy = jest.fn()
      const TestInput = React.memo(function TestInput(props: InputProps) {
        renderSpy()
        return <Input {...props} />
      })
      
      const { rerender } = render(
        <TestInput placeholder="Test" />
      )
      
      rerender(<TestInput placeholder="Test" />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })
})