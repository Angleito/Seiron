import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Health check endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    // Check Redis connectivity
    let redisStatus = 'unknown';
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      
      await redis.ping();
      redisStatus = 'healthy';
    } catch (error) {
      redisStatus = 'unhealthy';
      console.error('Redis health check failed:', error);
    }

    // Check environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    const status = redisStatus === 'healthy' && missingEnvVars.length === 0 ? 'healthy' : 'degraded';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisStatus,
        environment: missingEnvVars.length === 0 ? 'configured' : 'missing variables',
      },
      version: process.env.npm_package_version || '1.0.0',
      ...(process.env.NODE_ENV === 'development' && missingEnvVars.length > 0 && {
        missingEnvVars,
      }),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}