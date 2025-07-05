import { Request, Response, NextFunction } from 'express'

/**
 * Wrapper for async route handlers to catch errors and pass them to express error handler
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}