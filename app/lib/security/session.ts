import { Redis } from '@upstash/redis';
import { getSession, clearSession, SessionPayload } from './jwt';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SESSION_PREFIX = 'session:';
const BLACKLIST_PREFIX = 'blacklist:';
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

export interface SessionData extends SessionPayload {
  ipAddress?: string;
  userAgent?: string;
  lastActivity: number;
  privyUserId?: string;
}

/**
 * Store session data in Redis
 */
export async function storeSession(
  userId: string,
  data: Omit<SessionData, 'userId' | 'lastActivity'>
): Promise<void> {
  const sessionData: SessionData = {
    ...data,
    userId,
    lastActivity: Date.now(),
  };
  
  const key = `${SESSION_PREFIX}${userId}`;
  await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
}

/**
 * Get session data from Redis
 */
export async function getSessionData(userId: string): Promise<SessionData | null> {
  const key = `${SESSION_PREFIX}${userId}`;
  const data = await redis.get(key);
  
  if (!data) {
    return null;
  }
  
  return JSON.parse(data as string) as SessionData;
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(userId: string): Promise<void> {
  const sessionData = await getSessionData(userId);
  
  if (sessionData) {
    sessionData.lastActivity = Date.now();
    const key = `${SESSION_PREFIX}${userId}`;
    await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
  }
}

/**
 * Invalidate a session
 */
export async function invalidateSession(userId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${userId}`;
  await redis.del(key);
  
  // Also add to blacklist to prevent token reuse
  const session = await getSession();
  if (session) {
    await blacklistToken(session);
  }
  
  await clearSession();
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(session: SessionPayload): Promise<boolean> {
  const key = `${BLACKLIST_PREFIX}${session.userId}:${session.expiresAt}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Add a token to the blacklist
 */
export async function blacklistToken(session: SessionPayload): Promise<void> {
  const key = `${BLACKLIST_PREFIX}${session.userId}:${session.expiresAt}`;
  const ttl = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  
  if (ttl > 0) {
    await redis.setex(key, ttl, '1');
  }
}

/**
 * Validate session with additional security checks
 */
export async function validateSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ valid: boolean; reason?: string }> {
  const sessionData = await getSessionData(userId);
  
  if (!sessionData) {
    return { valid: false, reason: 'Session not found' };
  }
  
  // Check if session is expired based on inactivity
  const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
  if (Date.now() - sessionData.lastActivity > inactivityTimeout) {
    await invalidateSession(userId);
    return { valid: false, reason: 'Session expired due to inactivity' };
  }
  
  // Optional: Check for suspicious activity (IP or User-Agent change)
  if (ipAddress && sessionData.ipAddress && sessionData.ipAddress !== ipAddress) {
    // Log suspicious activity but don't immediately invalidate
    await logSecurityEvent({
      type: 'session_ip_mismatch',
      userId,
      oldIp: sessionData.ipAddress,
      newIp: ipAddress,
      timestamp: new Date().toISOString(),
    });
  }
  
  if (userAgent && sessionData.userAgent && sessionData.userAgent !== userAgent) {
    // Log suspicious activity
    await logSecurityEvent({
      type: 'session_useragent_mismatch',
      userId,
      oldUserAgent: sessionData.userAgent,
      newUserAgent: userAgent,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Update activity timestamp
  await updateSessionActivity(userId);
  
  return { valid: true };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  // This would require a more complex Redis setup with indexes
  // For now, return current session if exists
  const session = await getSessionData(userId);
  return session ? [session] : [];
}

/**
 * Clear all sessions for a user
 */
export async function clearAllUserSessions(userId: string): Promise<void> {
  // This would clear all sessions across devices
  await invalidateSession(userId);
}

/**
 * Log security events related to sessions
 */
async function logSecurityEvent(event: {
  type: string;
  userId: string;
  [key: string]: any;
}): Promise<void> {
  try {
    const key = `security:session:${event.type}:${event.timestamp}`;
    await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(event));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}