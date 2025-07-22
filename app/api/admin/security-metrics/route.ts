import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/app/lib/security/middleware';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const GET = createApiHandler(
  async (req, { session }) => {
    try {
      // Check if user is admin (you can customize this check)
      if (!session?.isAdmin && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch metrics from Redis
      const [
        todayMetrics,
        yesterdayMetrics,
        todayErrors,
        yesterdayErrors,
        recentEvents
      ] = await Promise.all([
        redis.hgetall(`api:metrics:${today}`),
        redis.hgetall(`api:metrics:${yesterday}`),
        redis.hgetall(`api:metrics:errors:${today}`),
        redis.hgetall(`api:metrics:errors:${yesterday}`),
        fetchRecentSecurityEvents(),
      ]);

      // Combine metrics
      const allMetrics = {
        ...yesterdayMetrics,
        ...todayMetrics,
      };

      const allErrors = {
        ...yesterdayErrors,
        ...todayErrors,
      };

      // Calculate totals
      const totalRequests = Object.values(allMetrics).reduce((sum: number, count: any) => sum + parseInt(count || '0'), 0);
      const apiErrors = Object.values(allErrors).reduce((sum: number, count: any) => sum + parseInt(count || '0'), 0);

      // Get status code distribution
      const statusMetrics = await redis.hgetall(`api:metrics:status:${today}`) || {};
      const statusCodes: Record<string, number> = {};
      
      Object.entries(statusMetrics).forEach(([code, count]: [string, any]) => {
        statusCodes[code] = parseInt(count || '0');
      });

      // Count security violations
      let rateLimitViolations = 0;
      let authFailures = 0;
      let csrfViolations = 0;

      recentEvents.forEach(event => {
        switch (event.type) {
          case 'rate_limit_exceeded':
            rateLimitViolations++;
            break;
          case 'unauthorized_access_attempt':
            authFailures++;
            break;
          case 'csrf_validation_failed':
            csrfViolations++;
            break;
        }
      });

      return NextResponse.json({
        totalRequests,
        rateLimitViolations,
        authFailures,
        csrfViolations,
        apiErrors,
        statusCodes,
        recentEvents: recentEvents.slice(0, 10), // Return only the 10 most recent events
      });
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: 'api',
  }
);

async function fetchRecentSecurityEvents() {
  try {
    const events: any[] = [];
    const patterns = [
      'security:rate_limit_exceeded:*',
      'security:unauthorized_access_attempt:*',
      'security:csrf_validation_failed:*',
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      for (const key of keys.slice(0, 20)) { // Limit to 20 events per type
        const eventData = await redis.get(key);
        if (eventData) {
          events.push(JSON.parse(eventData as string));
        }
      }
    }

    // Sort by timestamp descending
    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Failed to fetch security events:', error);
    return [];
  }
}