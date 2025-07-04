/**
 * @fileoverview Time utilities for Seiron platform
 * Provides time manipulation, formatting, and scheduling utilities
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

/**
 * Time period definitions
 */
export type TimePeriod = '1h' | '4h' | '1d' | '7d' | '30d' | '90d' | '1y';

/**
 * Time range structure
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Trading session information
 */
export interface TradingSession {
  name: string;
  timezone: string;
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  weekdays: number[]; // 0-6, Sunday = 0
}

/**
 * Time-based error
 */
export interface TimeError {
  type: 'time_error';
  message: string;
}

/**
 * Parse time period to milliseconds
 */
export const parsePeriodToMs = (period: string): E.Either<TimeError, number> => {
  const match = period.match(/^(\d+)([hmdy])$/);
  
  if (!match) {
    return E.left({
      type: 'time_error',
      message: `Invalid period format: ${period}. Expected format: 1h, 4h, 1d, 7d, etc.`,
    });
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  if (isNaN(value) || value <= 0) {
    return E.left({
      type: 'time_error',
      message: `Invalid period value: ${value}. Must be a positive number.`,
    });
  }

  const multipliers = {
    m: 60 * 1000,           // minutes
    h: 60 * 60 * 1000,      // hours
    d: 24 * 60 * 60 * 1000, // days
    y: 365 * 24 * 60 * 60 * 1000, // years
  };

  const multiplier = multipliers[unit as keyof typeof multipliers];
  
  if (!multiplier) {
    return E.left({
      type: 'time_error',
      message: `Invalid period unit: ${unit}. Supported units: m, h, d, y`,
    });
  }

  return E.right(value * multiplier);
};

/**
 * Get time range for a given period ending now
 */
export const getTimeRangeForPeriod = (period: TimePeriod): E.Either<TimeError, TimeRange> => {
  return pipe(
    parsePeriodToMs(period),
    E.map(ms => ({
      start: Date.now() - ms,
      end: Date.now(),
    }))
  );
};

/**
 * Get time range for a given period ending at a specific time
 */
export const getTimeRangeForPeriodAt = (
  period: TimePeriod,
  endTime: number
): E.Either<TimeError, TimeRange> => {
  return pipe(
    parsePeriodToMs(period),
    E.map(ms => ({
      start: endTime - ms,
      end: endTime,
    }))
  );
};

/**
 * Format timestamp to human-readable string
 */
export const formatTimestamp = (
  timestamp: number,
  options: {
    includeTime?: boolean;
    includeSeconds?: boolean;
    timezone?: string;
    format?: 'short' | 'medium' | 'long';
  } = {}
): string => {
  const {
    includeTime = true,
    includeSeconds = false,
    timezone = 'UTC',
    format = 'medium',
  } = options;

  const date = new Date(timestamp);
  
  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: format === 'short' ? '2-digit' : 'numeric',
    month: format === 'short' ? 'numeric' : format === 'medium' ? 'short' : 'long',
    day: 'numeric',
  };

  if (includeTime) {
    dateFormatOptions.hour = '2-digit';
    dateFormatOptions.minute = '2-digit';
    if (includeSeconds) {
      dateFormatOptions.second = '2-digit';
    }
  }

  return date.toLocaleString('en-US', dateFormatOptions);
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (timestamp: number, baseTime: number = Date.now()): string => {
  const diff = timestamp - baseTime;
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const units = [
    { name: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { name: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { name: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { name: 'day', ms: 24 * 60 * 60 * 1000 },
    { name: 'hour', ms: 60 * 60 * 1000 },
    { name: 'minute', ms: 60 * 1000 },
    { name: 'second', ms: 1000 },
  ];

  for (const unit of units) {
    const value = Math.floor(absDiff / unit.ms);
    if (value >= 1) {
      const plural = value !== 1 ? 's' : '';
      return isPast
        ? `${value} ${unit.name}${plural} ago`
        : `in ${value} ${unit.name}${plural}`;
    }
  }

  return 'just now';
};

/**
 * Check if timestamp is within business hours
 */
export const isBusinessHours = (
  timestamp: number,
  session: TradingSession = {
    name: 'US Eastern',
    timezone: 'America/New_York',
    openTime: '09:30',
    closeTime: '16:00',
    weekdays: [1, 2, 3, 4, 5], // Monday to Friday
  }
): boolean => {
  const date = new Date(timestamp);
  const utcDay = date.getUTCDay();
  
  // Check if it's a weekday
  if (!session.weekdays.includes(utcDay)) {
    return false;
  }

  // Convert to session timezone
  const timeInTimezone = new Intl.DateTimeFormat('en-US', {
    timeZone: session.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  const [openHour, openMinute] = session.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = session.closeTime.split(':').map(Number);
  const [currentHour, currentMinute] = timeInTimezone.split(':').map(Number);

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const currentMinutes = currentHour * 60 + currentMinute;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

/**
 * Get next business day
 */
export const getNextBusinessDay = (
  timestamp: number = Date.now(),
  session: TradingSession = {
    name: 'US Eastern',
    timezone: 'America/New_York',
    openTime: '09:30',
    closeTime: '16:00',
    weekdays: [1, 2, 3, 4, 5],
  }
): number => {
  let nextDay = timestamp + (24 * 60 * 60 * 1000); // Add one day
  let attempts = 0;
  const maxAttempts = 14; // Prevent infinite loop

  while (attempts < maxAttempts) {
    const date = new Date(nextDay);
    const dayOfWeek = date.getUTCDay();
    
    if (session.weekdays.includes(dayOfWeek)) {
      return nextDay;
    }
    
    nextDay += (24 * 60 * 60 * 1000); // Add another day
    attempts++;
  }

  // Fallback: return original timestamp + 1 day
  return timestamp + (24 * 60 * 60 * 1000);
};

/**
 * Round timestamp to nearest interval
 */
export const roundToInterval = (
  timestamp: number,
  intervalMs: number,
  direction: 'floor' | 'ceil' | 'round' = 'round'
): number => {
  const roundingFunction = {
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
  }[direction];

  return roundingFunction(timestamp / intervalMs) * intervalMs;
};

/**
 * Generate time series with regular intervals
 */
export const generateTimeSeries = (
  start: number,
  end: number,
  intervalMs: number,
  includeEnd: boolean = true
): number[] => {
  const series: number[] = [];
  let current = start;

  while (current < end) {
    series.push(current);
    current += intervalMs;
  }

  if (includeEnd && series[series.length - 1] !== end) {
    series.push(end);
  }

  return series;
};

/**
 * Calculate time until next interval
 */
export const timeUntilNextInterval = (
  intervalMs: number,
  baseTime: number = Date.now()
): number => {
  const nextInterval = roundToInterval(baseTime, intervalMs, 'ceil');
  return nextInterval - baseTime;
};

/**
 * Check if two timestamps are on the same day
 */
export const isSameDay = (
  timestamp1: number,
  timestamp2: number,
  timezone: string = 'UTC'
): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  const dateString1 = date1.toLocaleDateString('en-CA', { timeZone: timezone });
  const dateString2 = date2.toLocaleDateString('en-CA', { timeZone: timezone });

  return dateString1 === dateString2;
};

/**
 * Get start of day timestamp
 */
export const getStartOfDay = (
  timestamp: number,
  timezone: string = 'UTC'
): number => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create date in specified timezone
  const startOfDay = new Date();
  startOfDay.setFullYear(year, month, day);
  startOfDay.setHours(0, 0, 0, 0);

  // Adjust for timezone if not UTC
  if (timezone !== 'UTC') {
    const utcTime = startOfDay.getTime() + (startOfDay.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime);
    return targetTime.getTime();
  }

  return startOfDay.getTime();
};

/**
 * Get end of day timestamp
 */
export const getEndOfDay = (
  timestamp: number,
  timezone: string = 'UTC'
): number => {
  return getStartOfDay(timestamp, timezone) + (24 * 60 * 60 * 1000) - 1;
};

/**
 * Delay execution for specified milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a timeout that can be cancelled
 */
export const createTimeout = (
  callback: () => void,
  ms: number
): { clear: () => void } => {
  const timeoutId = setTimeout(callback, ms);
  
  return {
    clear: () => clearTimeout(timeoutId),
  };
};

/**
 * Create an interval that can be cancelled
 */
export const createInterval = (
  callback: () => void,
  ms: number
): { clear: () => void } => {
  const intervalId = setInterval(callback, ms);
  
  return {
    clear: () => clearInterval(intervalId),
  };
};

/**
 * Rate limiter based on time windows
 */
export class TimeBasedRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart);

    // Check if under limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get time until next request is allowed
   */
  timeUntilNextRequest(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = Math.min(...this.requests);
    const timeUntilWindowReset = (oldestRequest + this.windowMs) - Date.now();
    
    return Math.max(0, timeUntilWindowReset);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * Timezone utilities
 */
export const timezones = {
  UTC: 'UTC',
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  JST: 'Asia/Tokyo',
  CET: 'Europe/Berlin',
  SGT: 'Asia/Singapore',
} as const;

/**
 * Convert timestamp between timezones
 */
export const convertTimezone = (
  timestamp: number,
  fromTimezone: string,
  toTimezone: string
): number => {
  // Since timestamp is already in UTC, we just need to display it correctly
  // This function is more for formatting purposes
  return timestamp;
};

/**
 * Common time intervals in milliseconds
 */
export const intervals = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;