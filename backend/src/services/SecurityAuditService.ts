import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import logger from '../utils/logger';

/**
 * Security Event Types
 */
export type SecurityEventType =
  | 'authentication_success'
  | 'authentication_failure'
  | 'api_key_validation_success'
  | 'api_key_validation_failure'
  | 'rate_limit_exceeded'
  | 'unauthorized_access_attempt'
  | 'mcp_authentication_success'
  | 'mcp_authentication_failure'
  | 'api_key_rotation'
  | 'suspicious_activity'
  | 'configuration_change'
  | 'security_violation'
  | 'admin_action'
  | 'system_security_event';

/**
 * Security Severity Levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security Audit Event
 */
export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  success: boolean;
  message: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
}

/**
 * Security Alert Configuration
 */
interface SecurityAlertConfig {
  eventType: SecurityEventType;
  threshold: number;
  windowMs: number;
  severity: SecuritySeverity;
  enabled: boolean;
}

/**
 * Security Metrics
 */
interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  successfulEvents: number;
  failedEvents: number;
  uniqueIPs: Set<string>;
  recentAlerts: number;
  lastEventTimestamp?: Date;
}

/**
 * Security Audit Service
 * Provides comprehensive security event logging, monitoring, and alerting
 */
export class SecurityAuditService extends EventEmitter {
  private events: SecurityAuditEvent[] = [];
  private metrics: SecurityMetrics;
  private alertConfigs: SecurityAlertConfig[];
  private readonly maxEventStorage = 50000;
  private alertCooldowns: Map<string, number> = new Map();

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.alertConfigs = this.initializeAlertConfigs();
    this.startPeriodicTasks();
  }

  /**
   * Initialize security metrics
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      totalEvents: 0,
      eventsByType: {} as Record<SecurityEventType, number>,
      eventsBySeverity: {} as Record<SecuritySeverity, number>,
      successfulEvents: 0,
      failedEvents: 0,
      uniqueIPs: new Set(),
      recentAlerts: 0
    };
  }

  /**
   * Initialize security alert configurations
   */
  private initializeAlertConfigs(): SecurityAlertConfig[] {
    return [
      {
        eventType: 'authentication_failure',
        threshold: 5,
        windowMs: 5 * 60 * 1000, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        eventType: 'api_key_validation_failure',
        threshold: 10,
        windowMs: 10 * 60 * 1000, // 10 minutes
        severity: 'medium',
        enabled: true
      },
      {
        eventType: 'rate_limit_exceeded',
        threshold: 20,
        windowMs: 15 * 60 * 1000, // 15 minutes
        severity: 'medium',
        enabled: true
      },
      {
        eventType: 'unauthorized_access_attempt',
        threshold: 3,
        windowMs: 5 * 60 * 1000, // 5 minutes
        severity: 'critical',
        enabled: true
      },
      {
        eventType: 'suspicious_activity',
        threshold: 1,
        windowMs: 1 * 60 * 1000, // 1 minute
        severity: 'critical',
        enabled: true
      },
      {
        eventType: 'security_violation',
        threshold: 1,
        windowMs: 1 * 60 * 1000, // 1 minute
        severity: 'critical',
        enabled: true
      }
    ];
  }

  /**
   * Log a security audit event
   */
  public logEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): SecurityAuditEvent {
    const auditEvent: SecurityAuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Store event
    this.events.push(auditEvent);
    
    // Maintain storage limit
    if (this.events.length > this.maxEventStorage) {
      this.events = this.events.slice(-this.maxEventStorage);
    }

    // Update metrics
    this.updateMetrics(auditEvent);

    // Log to Winston logger based on severity
    this.logToWinston(auditEvent);

    // Check for alerts
    this.checkAlertConditions(auditEvent);

    // Emit event for real-time processing
    this.emit('securityEvent', auditEvent);

    return auditEvent;
  }

  /**
   * Log authentication event
   */
  public logAuthenticationEvent(
    success: boolean,
    userId?: string,
    ip?: string,
    userAgent?: string,
    message?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: success ? 'authentication_success' : 'authentication_failure',
      severity: success ? 'low' : 'medium',
      source: 'authentication_service',
      userId,
      ip,
      userAgent,
      success,
      message: message || (success ? 'Authentication successful' : 'Authentication failed'),
      metadata
    });
  }

  /**
   * Log API key validation event
   */
  public logApiKeyEvent(
    success: boolean,
    keyName?: string,
    ip?: string,
    userAgent?: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: success ? 'api_key_validation_success' : 'api_key_validation_failure',
      severity: success ? 'low' : 'medium',
      source: 'api_key_validation_service',
      ip,
      userAgent,
      success,
      message: success 
        ? `API key validation successful${keyName ? ` for ${keyName}` : ''}`
        : `API key validation failed: ${reason || 'Unknown reason'}`,
      metadata: {
        ...metadata,
        keyName: keyName ? this.hashSensitiveData(keyName) : undefined
      }
    });
  }

  /**
   * Log MCP authentication event
   */
  public logMcpAuthEvent(
    success: boolean,
    serverId?: string,
    ip?: string,
    userAgent?: string,
    message?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: success ? 'mcp_authentication_success' : 'mcp_authentication_failure',
      severity: success ? 'low' : 'medium',
      source: 'mcp_authentication_service',
      ip,
      userAgent,
      resource: serverId,
      success,
      message: message || (success 
        ? `MCP authentication successful for ${serverId}`
        : `MCP authentication failed for ${serverId}`
      ),
      metadata
    });
  }

  /**
   * Log rate limiting event
   */
  public logRateLimitEvent(
    ip: string,
    endpoint?: string,
    limit?: number,
    current?: number,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      source: 'rate_limiter',
      ip,
      resource: endpoint,
      success: false,
      message: `Rate limit exceeded${endpoint ? ` for ${endpoint}` : ''}${limit ? ` (${current}/${limit})` : ''}`,
      metadata
    });
  }

  /**
   * Log suspicious activity
   */
  public logSuspiciousActivity(
    description: string,
    ip?: string,
    userAgent?: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: 'suspicious_activity',
      severity: 'high',
      source: 'security_monitor',
      userId,
      ip,
      userAgent,
      success: false,
      message: `Suspicious activity detected: ${description}`,
      metadata
    });
  }

  /**
   * Log security violation
   */
  public logSecurityViolation(
    description: string,
    severity: SecuritySeverity = 'critical',
    ip?: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: 'security_violation',
      severity,
      source: 'security_monitor',
      userId,
      ip,
      success: false,
      message: `Security violation: ${description}`,
      metadata
    });
  }

  /**
   * Log admin action
   */
  public logAdminAction(
    action: string,
    userId: string,
    success: boolean,
    resource?: string,
    metadata?: Record<string, unknown>
  ): SecurityAuditEvent {
    return this.logEvent({
      eventType: 'admin_action',
      severity: 'medium',
      source: 'admin_interface',
      userId,
      action,
      resource,
      success,
      message: `Admin action: ${action}${resource ? ` on ${resource}` : ''}`,
      metadata
    });
  }

  /**
   * Get security events with filtering
   */
  public getEvents(filter: {
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    source?: string;
    userId?: string;
    ip?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): SecurityAuditEvent[] {
    let filtered = [...this.events];

    // Apply filters
    if (filter.eventType) {
      filtered = filtered.filter(e => e.eventType === filter.eventType);
    }
    if (filter.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }
    if (filter.source) {
      filtered = filtered.filter(e => e.source === filter.source);
    }
    if (filter.userId) {
      filtered = filtered.filter(e => e.userId === filter.userId);
    }
    if (filter.ip) {
      filtered = filtered.filter(e => e.ip === filter.ip);
    }
    if (filter.success !== undefined) {
      filtered = filtered.filter(e => e.success === filter.success);
    }
    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }

    // Sort by timestamp (newest first) and limit
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Get security metrics
   */
  public getMetrics(): SecurityMetrics & {
    alertConfigs: SecurityAlertConfig[];
    recentEvents: SecurityAuditEvent[];
  } {
    return {
      ...this.metrics,
      alertConfigs: this.alertConfigs,
      recentEvents: this.getEvents({ limit: 10 })
    };
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(timeframe: {
    startDate: Date;
    endDate: Date;
  }): {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      failedEvents: number;
      uniqueIPs: number;
      topEventTypes: Array<{ type: SecurityEventType; count: number }>;
      topIPs: Array<{ ip: string; count: number }>;
    };
    trends: {
      eventsByHour: Record<string, number>;
      failureRate: number;
    };
    alerts: SecurityAuditEvent[];
    recommendations: string[];
  } {
    const events = this.getEvents({
      startDate: timeframe.startDate,
      endDate: timeframe.endDate
    });

    const criticalEvents = events.filter(e => e.severity === 'critical');
    const failedEvents = events.filter(e => !e.success);
    const uniqueIPs = new Set(events.map(e => e.ip).filter(Boolean));

    // Count events by type
    const eventTypeCounts: Record<string, number> = {};
    events.forEach(e => {
      eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
    });

    // Count events by IP
    const ipCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.ip) {
        ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
      }
    });

    // Events by hour
    const eventsByHour: Record<string, number> = {};
    events.forEach(e => {
      const hour = e.timestamp.toISOString().slice(0, 13) + ':00:00';
      eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
    });

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (failedEvents.length > events.length * 0.1) {
      recommendations.push('High failure rate detected - review authentication and access controls');
    }
    
    if (criticalEvents.length > 0) {
      recommendations.push('Critical security events detected - immediate investigation required');
    }
    
    const suspiciousIPs = Object.entries(ipCounts)
      .filter(([_, count]) => count > 100)
      .map(([ip]) => ip);
    
    if (suspiciousIPs.length > 0) {
      recommendations.push(`Potential automated attacks from IPs: ${suspiciousIPs.join(', ')}`);
    }

    return {
      summary: {
        totalEvents: events.length,
        criticalEvents: criticalEvents.length,
        failedEvents: failedEvents.length,
        uniqueIPs: uniqueIPs.size,
        topEventTypes: Object.entries(eventTypeCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => ({ type: type as SecurityEventType, count })),
        topIPs: Object.entries(ipCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count }))
      },
      trends: {
        eventsByHour,
        failureRate: events.length > 0 ? failedEvents.length / events.length : 0
      },
      alerts: criticalEvents,
      recommendations
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(event: SecurityAuditEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.eventType] = (this.metrics.eventsByType[event.eventType] || 0) + 1;
    this.metrics.eventsBySeverity[event.severity] = (this.metrics.eventsBySeverity[event.severity] || 0) + 1;
    
    if (event.success) {
      this.metrics.successfulEvents++;
    } else {
      this.metrics.failedEvents++;
    }
    
    if (event.ip) {
      this.metrics.uniqueIPs.add(event.ip);
    }
    
    this.metrics.lastEventTimestamp = event.timestamp;
  }

  /**
   * Log to Winston logger
   */
  private logToWinston(event: SecurityAuditEvent): void {
    const logData = {
      securityEvent: true,
      eventId: event.id,
      eventType: event.eventType,
      severity: event.severity,
      source: event.source,
      userId: event.userId,
      ip: event.ip,
      resource: event.resource,
      action: event.action,
      success: event.success,
      metadata: event.metadata
    };

    switch (event.severity) {
      case 'critical':
        logger.error(`SECURITY: ${event.message}`, logData);
        break;
      case 'high':
        logger.warn(`SECURITY: ${event.message}`, logData);
        break;
      case 'medium':
        logger.info(`SECURITY: ${event.message}`, logData);
        break;
      case 'low':
        logger.debug(`SECURITY: ${event.message}`, logData);
        break;
    }
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(event: SecurityAuditEvent): void {
    const config = this.alertConfigs.find(c => 
      c.eventType === event.eventType && c.enabled
    );
    
    if (!config) return;

    const cooldownKey = `${event.eventType}:${event.ip || 'global'}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    
    // Check cooldown (prevent spam)
    if (now - lastAlert < config.windowMs) {
      return;
    }

    // Count recent events of this type
    const cutoff = new Date(now - config.windowMs);
    const recentEvents = this.events.filter(e =>
      e.eventType === event.eventType &&
      e.timestamp >= cutoff &&
      (!event.ip || e.ip === event.ip)
    );

    if (recentEvents.length >= config.threshold) {
      this.alertCooldowns.set(cooldownKey, now);
      this.metrics.recentAlerts++;
      
      logger.error('SECURITY ALERT', {
        eventType: event.eventType,
        threshold: config.threshold,
        actual: recentEvents.length,
        windowMs: config.windowMs,
        severity: config.severity,
        ip: event.ip
      });

      this.emit('securityAlert', {
        config,
        triggerEvent: event,
        recentEvents,
        count: recentEvents.length
      });
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Hash sensitive data for storage
   */
  private hashSensitiveData(data: string): string {
    return createHash('sha256').update(data).digest('hex').slice(0, 8);
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Cleanup old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);

    // Reset daily metrics every day
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Cleanup old events
   */
  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const initialCount = this.events.length;
    
    this.events = this.events.filter(e => e.timestamp > cutoff);
    
    const removedCount = initialCount - this.events.length;
    if (removedCount > 0) {
      logger.info('Security audit cleanup completed', {
        removedEvents: removedCount,
        remainingEvents: this.events.length
      });
    }
  }

  /**
   * Reset daily metrics
   */
  private resetDailyMetrics(): void {
    this.metrics.recentAlerts = 0;
    this.alertCooldowns.clear();
    
    logger.info('Daily security metrics reset', {
      totalEvents: this.metrics.totalEvents,
      uniqueIPs: this.metrics.uniqueIPs.size
    });
  }
}

/**
 * Singleton instance
 */
export const securityAuditService = new SecurityAuditService();