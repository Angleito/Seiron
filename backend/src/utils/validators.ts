import { body, query, param } from 'express-validator';

/**
 * Common validation rules for the API
 */

// Wallet address validation
export const walletAddressValidation = (field: string = 'walletAddress') => [
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .custom((value) => {
      // Ethereum address format
      if (value.startsWith('0x')) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          throw new Error(`Invalid Ethereum address format for ${field}`);
        }
      }
      // Sei address format
      else if (value.startsWith('sei1')) {
        if (!/^sei1[a-z0-9]{39}$/.test(value)) {
          throw new Error(`Invalid Sei address format for ${field}`);
        }
      }
      // General cosmos address format
      else if (/^[a-z]+1[a-z0-9]{38,59}$/.test(value)) {
        // Valid cosmos address format
      } else {
        throw new Error(`Invalid wallet address format for ${field}`);
      }
      return true;
    })
];

// Query parameter wallet validation
export const walletAddressQueryValidation = (field: string = 'walletAddress') => [
  query(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .custom((value) => {
      if (value.startsWith('0x')) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          throw new Error(`Invalid Ethereum address format for ${field}`);
        }
      } else if (value.startsWith('sei1')) {
        if (!/^sei1[a-z0-9]{39}$/.test(value)) {
          throw new Error(`Invalid Sei address format for ${field}`);
        }
      } else if (!/^[a-z]+1[a-z0-9]{38,59}$/.test(value)) {
        throw new Error(`Invalid wallet address format for ${field}`);
      }
      return true;
    })
];

// Message validation for chat
export const messageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
];

// Portfolio analysis validation
export const portfolioAnalysisValidation = [
  body('timeframe')
    .optional()
    .isIn(['1h', '24h', '7d', '30d', '90d', '1y']) // TODO: REMOVE_MOCK - Hard-coded array literals
    .withMessage('Invalid timeframe. Must be one of: 1h, 24h, 7d, 30d, 90d, 1y'),
  body('includeRecommendations')
    .optional()
    .isBoolean()
    .withMessage('includeRecommendations must be a boolean'),
  body('riskTolerance')
    .optional()
    .isIn(['conservative', 'moderate', 'aggressive']) // TODO: REMOVE_MOCK - Hard-coded array literals
    .withMessage('Invalid risk tolerance. Must be one of: conservative, moderate, aggressive')
];

// Pagination validation
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Token address validation
export const tokenAddressValidation = [
  body('tokenAddress')
    .trim()
    .notEmpty()
    .withMessage('Token address is required')
    .matches(/^(0x[a-fA-F0-9]{40}|[a-z]+1[a-z0-9]{38,59})$/)
    .withMessage('Invalid token address format')
];

// Transaction hash validation
export const transactionHashValidation = [
  param('txHash')
    .trim()
    .notEmpty()
    .withMessage('Transaction hash is required')
    .matches(/^(0x[a-fA-F0-9]{64}|[A-Z0-9]{64})$/)
    .withMessage('Invalid transaction hash format')
];

// Amount validation (for trading)
export const amountValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number')
];

// Price range validation
export const priceRangeValidation = [
  body('minPrice')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Minimum price must be a positive number'),
  body('maxPrice')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (req.body.minPrice && value <= req.body.minPrice) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    })
];

// Date range validation
export const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .custom((value, { req }) => {
      if (req.query?.startDate && value <= req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// AI model parameters validation
export const aiParametersValidation = [
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('maxTokens')
    .optional()
    .isInt({ min: 1, max: 8000 })
    .withMessage('Max tokens must be between 1 and 8000'),
  body('model')
    .optional()
    .isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']) // TODO: REMOVE_MOCK - Hard-coded array literals
    .withMessage('Invalid AI model specified')
];

// File upload validation
export const fileUploadValidation = [
  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('File name must be between 1 and 255 characters'),
  body('fileType')
    .optional()
    .isIn(['csv', 'json', 'xlsx']) // TODO: REMOVE_MOCK - Hard-coded array literals
    .withMessage('File type must be csv, json, or xlsx')
];

// Rate limiting bypass validation (for premium users)
export const rateLimitBypassValidation = [
  body('isPremium')
    .optional()
    .isBoolean()
    .withMessage('isPremium must be a boolean'),
  body('apiKey')
    .if(body('isPremium').equals('true'))
    .notEmpty()
    .withMessage('API key is required for premium access')
];

// Notification preferences validation
export const notificationValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('webhook')
    .optional()
    .isURL()
    .withMessage('Invalid webhook URL'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('notifications.priceAlerts')
    .optional()
    .isBoolean()
    .withMessage('Price alerts setting must be a boolean'),
  body('notifications.portfolioUpdates')
    .optional()
    .isBoolean()
    .withMessage('Portfolio updates setting must be a boolean')
];