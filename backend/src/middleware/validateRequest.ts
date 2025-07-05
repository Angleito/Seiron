import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

interface ValidationSchemas {
  body?: ZodSchema<any>
  query?: ZodSchema<any>
  params?: ZodSchema<any>
}

/**
 * Middleware to validate request data using Zod schemas
 */
export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const validatedBody = schemas.body.parse(req.body)
        req.body = validatedBody
      }

      // Validate query parameters
      if (schemas.query) {
        const validatedQuery = schemas.query.parse(req.query)
        req.query = validatedQuery
      }

      // Validate route parameters
      if (schemas.params) {
        const validatedParams = schemas.params.parse(req.params)
        req.params = validatedParams
      }

      next()
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          details: error
        })
      }

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data'
      })
    }
  }
}