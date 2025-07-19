import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Simple test endpoint to verify Vercel Functions work
  res.status(200).json({
    success: true,
    message: 'Voice test endpoint working',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}