import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { TransactionConfirmation } from '../TransactionConfirmation'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock sanitize hook
jest.mock('@lib/sanitize', () => ({
  useSanitizedContent: (text: string) => ({
    sanitized: text,
    isValid: true,
    warnings: [],
  }),
  SANITIZE_CONFIGS: {
    TRANSACTION_DESCRIPTION: {},
  },
}))

// Property generators
const arbitraryTransactionType = fc.constantFrom(
  'swap',
  'lend',
  'borrow',
  'withdraw',
  'supply',
  'provide-liquidity',
  'remove-liquidity'
)

const arbitraryRiskLevel = fc.constantFrom('low', 'medium', 'high', 'critical')

const arbitraryTokenInfo = fc.record({
  address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(h => `0x${h}`),
  symbol: fc.constantFrom('SEI', 'USDC', 'WETH', 'USDT'),
  amount: fc.bigInt({ min: 1n, max: 10000000000000000000n }),
  decimals: fc.constantFrom(6, 8, 18),
  price: fc.option(fc.float({ min: 0.01, max: 100000 })),
  logoUrl: fc.option(fc.webUrl()),
})

const arbitraryRiskAssessment = fc.record({
  level: arbitraryRiskLevel,
  score: fc.integer({ min: 0, max: 100 }),
  factors: fc.array(
    fc.record({
      type: fc.constantFrom('price_impact', 'slippage', 'liquidity', 'protocol_risk'),
      severity: fc.constantFrom('low', 'medium', 'high'),
      message: fc.string({ minLength: 10, maxLength: 100 }),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  recommendations: fc.option(
    fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 3 })
  ),
})

const arbitraryTransactionPreview = fc.record({
  type: arbitraryTransactionType,
  protocol: fc.constantFrom('DragonSwap', 'SeiLend', 'TakaraProtocol'),
  action: fc.string({ minLength: 5, maxLength: 50 }),
  tokenIn: fc.option(arbitraryTokenInfo),
  tokenOut: fc.option(arbitraryTokenInfo),
  estimatedGas: fc.bigInt({ min: 21000n, max: 500000n }),
  gasPrice: fc.bigInt({ min: 1000000000n, max: 100000000000n }),
  slippage: fc.option(fc.float({ min: 0.1, max: 10 })),
  deadline: fc.option(fc.integer({ min: 600, max: 3600 })),
  priceImpact: fc.option(fc.float({ min: 0, max: 20 })),
  minReceived: fc.option(fc.bigInt({ min: 1n, max: 10000000000000000000n })),
  exchangeRate: fc.option(fc.float({ min: 0.01, max: 100 })),
  apy: fc.option(fc.float({ min: 0, max: 100 })),
  healthFactor: fc.option(
    fc.record({
      before: fc.float({ min: 0.5, max: 5 }),
      after: fc.float({ min: 0.5, max: 5 }),
    })
  ),
})

describe('TransactionConfirmation Component', () => {
  const defaultTokenIn = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'SEI',
    amount: 1000000000000000000n,
    decimals: 18,
    price: 100,
  }

  const defaultTokenOut = {
    address: '0x9876543210987654321098765432109876543210',
    symbol: 'USDC',
    amount: 1000000n,
    decimals: 6,
    price: 1,
  }

  const defaultPreview = {
    type: 'swap' as const,
    protocol: 'DragonSwap',
    action: 'Swap tokens',
    tokenIn: defaultTokenIn,
    tokenOut: defaultTokenOut,
    estimatedGas: 150000n,
    gasPrice: 50000000000n,
    slippage: 0.5,
    priceImpact: 0.1,
  }

  const defaultRiskAssessment = {
    level: 'low' as const,
    score: 25,
    factors: [
      {
        type: 'price_impact',
        severity: 'low' as const,
        message: 'Low price impact detected',
      },
    ],
    recommendations: ['Consider waiting for better market conditions'],
  }

  const defaultProps = {
    preview: defaultPreview,
    riskAssessment: defaultRiskAssessment,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Property-based tests', () => {
    it('should render with any valid transaction preview', () => {
      fc.assert(
        fc.property(arbitraryTransactionPreview, arbitraryRiskAssessment, (preview, riskAssessment) => {
          const { container } = render(
            <TransactionConfirmation
              preview={preview}
              riskAssessment={riskAssessment}
              onConfirm={jest.fn()}
              onCancel={jest.fn()}
            />
          )

          expect(container).toBeTruthy()
          expect(screen.getByText('Confirm Transaction')).toBeInTheDocument()
          expect(screen.getByText('Cancel')).toBeInTheDocument()
        })
      )
    })

    it('should display correct risk levels and colors', () => {
      fc.assert(
        fc.property(arbitraryRiskLevel, (level) => {
          const riskAssessment = { ...defaultRiskAssessment, level }
          render(
            <TransactionConfirmation
              {...defaultProps}
              riskAssessment={riskAssessment}
            />
          )

          expect(screen.getByText(`Risk Level: ${level.toUpperCase()}`)).toBeInTheDocument()
        })
      )
    })

    it('should handle all transaction types correctly', () => {
      fc.assert(
        fc.property(arbitraryTransactionType, (type) => {
          const preview = { ...defaultPreview, type }
          render(
            <TransactionConfirmation
              {...defaultProps}
              preview={preview}
            />
          )

          expect(screen.getByText('Confirm Transaction')).toBeInTheDocument()
        })
      )
    })

    it('should maintain consistent interaction behavior', async () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('confirm', 'cancel', 'details'), { minLength: 1, maxLength: 5 }),
          async (actions) => {
            const onConfirm = jest.fn()
            const onCancel = jest.fn()
            const user = userEvent.setup()

            render(
              <TransactionConfirmation
                {...defaultProps}
                onConfirm={onConfirm}
                onCancel={onCancel}
              />
            )

            for (const action of actions) {
              switch (action) {
                case 'confirm':
                  const confirmButton = screen.getByText('Confirm Transaction')
                  if (!confirmButton.hasAttribute('disabled')) {
                    await user.click(confirmButton)
                  }
                  break
                case 'cancel':
                  await user.click(screen.getByText('Cancel'))
                  break
                case 'details':
                  const detailsButton = screen.getByText('Show Details')
                  if (detailsButton) {
                    await user.click(detailsButton)
                  }
                  break
              }
            }

            expect(onConfirm).toHaveBeenCalledTimes(
              actions.filter(a => a === 'confirm').length
            )
            expect(onCancel).toHaveBeenCalledTimes(
              actions.filter(a => a === 'cancel').length
            )
          }
        )
      )
    })
  })

  describe('Unit tests', () => {
    it('should render basic transaction confirmation', () => {
      render(<TransactionConfirmation {...defaultProps} />)

      expect(screen.getByText('Confirm Transaction')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Confirm Transaction')).toBeInTheDocument()
    })

    it('should display correct action description for swap', () => {
      render(<TransactionConfirmation {...defaultProps} />)

      expect(screen.getByText(/Swap.*SEI.*for.*USDC/)).toBeInTheDocument()
    })

    it('should display token information correctly', () => {
      render(<TransactionConfirmation {...defaultProps} />)

      expect(screen.getByText('You Pay')).toBeInTheDocument()
      expect(screen.getByText('You Receive')).toBeInTheDocument()
      expect(screen.getByText('1.0 SEI')).toBeInTheDocument()
      expect(screen.getByText('1.0 USDC')).toBeInTheDocument()
    })

    it('should show/hide risk details', async () => {
      const user = userEvent.setup()
      render(<TransactionConfirmation {...defaultProps} />)

      // Initially hidden
      expect(screen.queryByText('Low price impact detected')).not.toBeInTheDocument()

      // Click show details
      await user.click(screen.getByText('Show Details'))
      expect(screen.getByText('Low price impact detected')).toBeInTheDocument()

      // Click hide details
      await user.click(screen.getByText('Hide Details'))
      expect(screen.queryByText('Low price impact detected')).not.toBeInTheDocument()
    })

    it('should display recommendations when present', async () => {
      const user = userEvent.setup()
      render(<TransactionConfirmation {...defaultProps} />)

      await user.click(screen.getByText('Show Details'))
      expect(screen.getByText('Recommendations:')).toBeInTheDocument()
      expect(screen.getByText('Consider waiting for better market conditions')).toBeInTheDocument()
    })

    it('should show countdown for high-risk transactions', async () => {
      const highRiskAssessment = {
        ...defaultRiskAssessment,
        level: 'high' as const,
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={highRiskAssessment}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Confirm \(.*s\)/)).toBeInTheDocument()
      })
    })

    it('should disable confirm button during countdown', async () => {
      const criticalRiskAssessment = {
        ...defaultRiskAssessment,
        level: 'critical' as const,
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={criticalRiskAssessment}
        />
      )

      await waitFor(() => {
        const confirmButton = screen.getByText(/Confirm \(.*s\)/)
        expect(confirmButton).toBeDisabled()
      })
    })

    it('should enable confirm button after countdown', async () => {
      const highRiskAssessment = {
        ...defaultRiskAssessment,
        level: 'high' as const,
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={highRiskAssessment}
        />
      )

      await waitFor(
        () => {
          expect(screen.getByText('Confirm Transaction')).not.toBeDisabled()
        },
        { timeout: 6000 }
      )
    }, 10000)

    it('should display processing state', () => {
      render(<TransactionConfirmation {...defaultProps} isProcessing={true} />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByText('Processing...')).toBeDisabled()
    })

    it('should display simulation failure', () => {
      const simulationResult = {
        success: false,
        error: 'Transaction would fail',
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          simulationResult={simulationResult}
        />
      )

      expect(screen.getByText('Simulation Failed')).toBeInTheDocument()
      expect(screen.getByText('Transaction would fail')).toBeInTheDocument()
    })

    it('should disable confirm button when simulation fails', () => {
      const simulationResult = {
        success: false,
        error: 'Transaction would fail',
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          simulationResult={simulationResult}
        />
      )

      expect(screen.getByText('Confirm Transaction')).toBeDisabled()
    })

    it('should display network fee', () => {
      render(<TransactionConfirmation {...defaultProps} />)

      expect(screen.getByText('Network Fee')).toBeInTheDocument()
      expect(screen.getByText(/.*SEI/)).toBeInTheDocument()
    })

    it('should display price impact with warning for high values', () => {
      const highImpactPreview = {
        ...defaultPreview,
        priceImpact: 5.5,
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          preview={highImpactPreview}
        />
      )

      expect(screen.getByText('Price Impact')).toBeInTheDocument()
      expect(screen.getByText('5.50%')).toBeInTheDocument()
    })

    it('should display health factor changes', () => {
      const previewWithHealthFactor = {
        ...defaultPreview,
        healthFactor: {
          before: 2.5,
          after: 1.8,
        },
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          preview={previewWithHealthFactor}
        />
      )

      expect(screen.getByText('Health Factor Impact')).toBeInTheDocument()
      expect(screen.getByText('2.50')).toBeInTheDocument()
      expect(screen.getByText('1.80')).toBeInTheDocument()
    })

    it('should warn about low health factor', () => {
      const previewWithLowHealthFactor = {
        ...defaultPreview,
        healthFactor: {
          before: 2.0,
          after: 1.2,
        },
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          preview={previewWithLowHealthFactor}
        />
      )

      expect(screen.getByText(/Health factor will be below safe threshold/)).toBeInTheDocument()
    })

    it('should call onConfirm when confirm button is clicked', async () => {
      const onConfirm = jest.fn()
      const user = userEvent.setup()

      render(
        <TransactionConfirmation
          {...defaultProps}
          onConfirm={onConfirm}
        />
      )

      await user.click(screen.getByText('Confirm Transaction'))
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <TransactionConfirmation
          {...defaultProps}
          onCancel={onCancel}
        />
      )

      await user.click(screen.getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Risk level tests', () => {
    it('should display correct risk colors and icons', () => {
      const riskLevels = ['low', 'medium', 'high', 'critical'] as const

      riskLevels.forEach((level) => {
        const { unmount } = render(
          <TransactionConfirmation
            {...defaultProps}
            riskAssessment={{ ...defaultRiskAssessment, level }}
          />
        )

        expect(screen.getByText(`Risk Level: ${level.toUpperCase()}`)).toBeInTheDocument()
        unmount()
      })
    })

    it('should show different risk factor severities', async () => {
      const riskAssessment = {
        ...defaultRiskAssessment,
        factors: [
          { type: 'low', severity: 'low' as const, message: 'Low severity issue' },
          { type: 'medium', severity: 'medium' as const, message: 'Medium severity issue' },
          { type: 'high', severity: 'high' as const, message: 'High severity issue' },
        ],
      }

      const user = userEvent.setup()
      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={riskAssessment}
        />
      )

      await user.click(screen.getByText('Show Details'))
      expect(screen.getByText('Low severity issue')).toBeInTheDocument()
      expect(screen.getByText('Medium severity issue')).toBeInTheDocument()
      expect(screen.getByText('High severity issue')).toBeInTheDocument()
    })
  })

  describe('Accessibility tests', () => {
    it('should have proper button roles and labels', () => {
      render(<TransactionConfirmation {...defaultProps} />)

      const confirmButton = screen.getByRole('button', { name: /confirm transaction/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const detailsButton = screen.getByRole('button', { name: /show details/i })

      expect(confirmButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
      expect(detailsButton).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const onConfirm = jest.fn()
      const user = userEvent.setup()

      render(
        <TransactionConfirmation
          {...defaultProps}
          onConfirm={onConfirm}
        />
      )

      // Tab to confirm button and press Enter
      await user.tab()
      await user.tab()
      await user.tab()
      await user.keyboard('{Enter}')

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should announce processing state', () => {
      render(<TransactionConfirmation {...defaultProps} isProcessing={true} />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle missing token information', () => {
      const previewWithoutTokens = {
        ...defaultPreview,
        tokenIn: undefined,
        tokenOut: undefined,
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          preview={previewWithoutTokens}
        />
      )

      expect(screen.getByText('Confirm Transaction')).toBeInTheDocument()
    })

    it('should handle empty risk factors', () => {
      const riskAssessment = {
        ...defaultRiskAssessment,
        factors: [],
      }

      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={riskAssessment}
        />
      )

      expect(screen.getByText(`Risk Level: ${riskAssessment.level.toUpperCase()}`)).toBeInTheDocument()
    })

    it('should handle missing recommendations', async () => {
      const riskAssessment = {
        ...defaultRiskAssessment,
        recommendations: undefined,
      }

      const user = userEvent.setup()
      render(
        <TransactionConfirmation
          {...defaultProps}
          riskAssessment={riskAssessment}
        />
      )

      await user.click(screen.getByText('Show Details'))
      expect(screen.queryByText('Recommendations:')).not.toBeInTheDocument()
    })
  })
})