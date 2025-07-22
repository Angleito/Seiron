import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ...options,
  });
}

/**
 * Sanitize user input for general text fields
 */
export function sanitizeText(input: string): string {
  // Remove any HTML tags
  const withoutHtml = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  const trimmed = withoutHtml.trim();
  
  // Remove null bytes
  const withoutNullBytes = trimmed.replace(/\0/g, '');
  
  // Limit length to prevent DoS
  const maxLength = 10000;
  return withoutNullBytes.slice(0, maxLength);
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts
  const withoutPaths = filename.replace(/[\/\\]/g, '');
  
  // Remove special characters except dots and dashes
  const cleaned = withoutPaths.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Ensure it doesn't start with a dot (hidden file)
  const withoutHidden = cleaned.replace(/^\.+/, '');
  
  // Limit length
  const maxLength = 255;
  return withoutHidden.slice(0, maxLength) || 'unnamed';
}

/**
 * Sanitize URLs
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Prevent localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T>(
  input: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(input);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid input' };
  }
}

/**
 * Sanitize SQL-like input to prevent injection
 */
export function sanitizeSqlInput(input: string): string {
  // This is a basic sanitization - use parameterized queries for actual SQL
  return input
    .replace(/['";\\]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments
    .replace(/\*\//g, '')
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '');
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string | null {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Sanitize phone numbers
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  return phone.replace(/\D/g, '').slice(0, 15);
}

/**
 * Sanitize wallet addresses
 */
export function sanitizeWalletAddress(address: string): string | null {
  // Basic validation for Ethereum-style addresses
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  // Basic validation for Sei addresses (cosmos-style)
  const seiRegex = /^sei[a-z0-9]{39}$/;
  
  const trimmed = address.trim();
  
  if (ethRegex.test(trimmed) || seiRegex.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Create a sanitized object with only allowed keys
 */
export function sanitizeObject<T extends Record<string, any>>(
  input: any,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key of allowedKeys) {
    if (key in input) {
      result[key] = input[key];
    }
  }
  
  return result;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(arr: unknown[]): string[] {
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizeText)
    .filter(Boolean);
}

/**
 * Rate limit sanitization for preventing regex DoS
 */
const sanitizationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export function withSanitizationCache<T>(
  key: string,
  sanitizer: () => T
): T {
  const cached = sanitizationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  const result = sanitizer();
  sanitizationCache.set(key, { result, timestamp: Date.now() });
  
  // Clean old cache entries
  if (sanitizationCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of sanitizationCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        sanitizationCache.delete(k);
      }
    }
  }
  
  return result;
}