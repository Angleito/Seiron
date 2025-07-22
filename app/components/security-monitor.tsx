'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, AlertTriangle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecurityMetrics {
  totalRequests: number;
  rateLimitViolations: number;
  authFailures: number;
  csrfViolations: number;
  apiErrors: number;
  statusCodes: Record<string, number>;
  recentEvents: SecurityEvent[];
}

interface SecurityEvent {
  type: string;
  timestamp: string;
  ip: string;
  path: string;
  method?: string;
  details?: any;
}

export function SecurityMonitor() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/security-metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Failed to load security metrics
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'rate_limit_exceeded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unauthorized_access_attempt':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'csrf_validation_failed':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventBadgeVariant = (type: string) => {
    switch (type) {
      case 'rate_limit_exceeded':
        return 'warning';
      case 'unauthorized_access_attempt':
      case 'csrf_validation_failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security Monitor
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rateLimitViolations}</div>
            <p className="text-xs text-muted-foreground">Blocked requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auth Failures</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.authFailures}</div>
            <p className="text-xs text-muted-foreground">Unauthorized attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiErrors}</div>
            <p className="text-xs text-muted-foreground">5xx responses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Response Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.statusCodes).map(([code, count]) => (
                <div key={code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        code.startsWith('2') ? 'success' :
                        code.startsWith('4') ? 'warning' :
                        code.startsWith('5') ? 'destructive' :
                        'default'
                      }
                    >
                      {code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {code === '200' ? 'OK' :
                       code === '201' ? 'Created' :
                       code === '400' ? 'Bad Request' :
                       code === '401' ? 'Unauthorized' :
                       code === '403' ? 'Forbidden' :
                       code === '404' ? 'Not Found' :
                       code === '429' ? 'Rate Limited' :
                       code === '500' ? 'Server Error' :
                       'Other'}
                    </span>
                  </div>
                  <span className="font-medium">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Security Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent security events
                </p>
              ) : (
                metrics.recentEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    {getEventIcon(event.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getEventBadgeVariant(event.type) as any}>
                          {event.type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.path} • {event.ip}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}