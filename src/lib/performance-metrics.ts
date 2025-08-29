// Sistema avançado de métricas de performance

import { logger } from './logger';
import { cacheManager } from './cache-manager';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    perSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  uploads: {
    total: number;
    averageSize: number;
    processingTime: number;
  };
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface MetricsConfig {
  collectInterval: number; // ms
  retentionPeriod: number; // ms
  alertThresholds: Record<string, number>;
  enableAlerts: boolean;
  enableExport: boolean;
  exportInterval: number; // ms
}

// Coletor de métricas de performance
export class PerformanceCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private config: MetricsConfig;
  private intervals: NodeJS.Timeout[] = [];
  private requestStats = {
    total: 0,
    errors: 0,
    responseTimes: [] as number[],
    lastReset: Date.now(),
  };

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL || '30000'), // 30s
      retentionPeriod: parseInt(process.env.METRICS_RETENTION || '86400000'), // 24h
      alertThresholds: {
        'cpu.usage': 80,
        'memory.percentage': 85,
        'disk.percentage': 90,
        'response.time': 5000,
        'error.rate': 5,
        'cache.hit_rate': 70,
      },
      enableAlerts: process.env.ENABLE_PERFORMANCE_ALERTS === 'true',
      enableExport: process.env.ENABLE_METRICS_EXPORT === 'true',
      exportInterval: parseInt(process.env.METRICS_EXPORT_INTERVAL || '300000'), // 5min
      ...config,
    };

    this.startCollection();
  }

  // Iniciar coleta automática
  private startCollection(): void {
    // Coletar métricas do sistema
    const systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectInterval);

    // Coletar métricas da aplicação
    const appInterval = setInterval(() => {
      this.collectApplicationMetrics();
    }, this.config.collectInterval);

    // Limpeza de métricas antigas
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.config.collectInterval * 2);

    // Exportar métricas (se habilitado)
    if (this.config.enableExport) {
      const exportInterval = setInterval(() => {
        this.exportMetrics();
      }, this.config.exportInterval);
      this.intervals.push(exportInterval);
    }

    this.intervals.push(systemInterval, appInterval, cleanupInterval);
  }

  // Coletar métricas do sistema
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      
      // CPU
      this.addMetric('cpu.usage', metrics.cpu.usage, '%');
      this.addMetric('cpu.load_average_1m', metrics.cpu.loadAverage[0], 'load');
      
      // Memória
      this.addMetric('memory.used', metrics.memory.used, 'bytes');
      this.addMetric('memory.percentage', metrics.memory.percentage, '%');
      this.addMetric('memory.heap_used', metrics.memory.heapUsed, 'bytes');
      
      // Disco
      this.addMetric('disk.used', metrics.disk.used, 'bytes');
      this.addMetric('disk.percentage', metrics.disk.percentage, '%');
      
      // Verificar alertas
      if (this.config.enableAlerts) {
        this.checkAlerts({
          'cpu.usage': metrics.cpu.usage,
          'memory.percentage': metrics.memory.percentage,
          'disk.percentage': metrics.disk.percentage,
        });
      }
    } catch (error) {
      logger.error('Failed to collect system metrics', { error: error.message });
    }
  }

  // Coletar métricas da aplicação
  private collectApplicationMetrics(): void {
    try {
      const now = Date.now();
      const timeSinceReset = now - this.requestStats.lastReset;
      const requestsPerSecond = this.requestStats.total / (timeSinceReset / 1000);
      const errorRate = this.requestStats.total > 0 
        ? (this.requestStats.errors / this.requestStats.total) * 100 
        : 0;
      const avgResponseTime = this.requestStats.responseTimes.length > 0
        ? this.requestStats.responseTimes.reduce((a, b) => a + b, 0) / this.requestStats.responseTimes.length
        : 0;

      // Requests
      this.addMetric('requests.total', this.requestStats.total, 'count');
      this.addMetric('requests.per_second', requestsPerSecond, 'req/s');
      this.addMetric('requests.error_rate', errorRate, '%');
      this.addMetric('requests.avg_response_time', avgResponseTime, 'ms');

      // Cache
      const cacheStats = cacheManager.getAllStats();
      Object.entries(cacheStats).forEach(([cacheType, stats]) => {
        this.addMetric(`cache.${cacheType}.hit_rate`, stats.hitRate * 100, '%', { cache_type: cacheType });
        this.addMetric(`cache.${cacheType}.size`, stats.size, 'count', { cache_type: cacheType });
        this.addMetric(`cache.${cacheType}.evictions`, stats.evictions, 'count', { cache_type: cacheType });
      });

      // Verificar alertas
      if (this.config.enableAlerts) {
        this.checkAlerts({
          'response.time': avgResponseTime,
          'error.rate': errorRate,
          'cache.hit_rate': cacheStats.api?.hitRate * 100 || 0,
        });
      }

      // Reset stats periodicamente
      if (timeSinceReset > 60000) { // 1 minuto
        this.resetRequestStats();
      }
    } catch (error) {
      logger.error('Failed to collect application metrics', { error: error.message });
    }
  }

  // Obter métricas do sistema
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    
    // Simular métricas do sistema (em produção, usar bibliotecas como 'systeminformation')
    return {
      cpu: {
        usage: Math.random() * 100, // Placeholder
        loadAverage: [1.2, 1.5, 1.8], // Placeholder
      },
      memory: {
        used: memUsage.rss,
        free: memUsage.external,
        total: memUsage.rss + memUsage.external,
        percentage: (memUsage.rss / (memUsage.rss + memUsage.external)) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      },
      disk: {
        used: 0, // Placeholder
        free: 0, // Placeholder
        total: 0, // Placeholder
        percentage: 0, // Placeholder
      },
      network: {
        bytesIn: 0, // Placeholder
        bytesOut: 0, // Placeholder
        connectionsActive: 0, // Placeholder
      },
    };
  }

  // Adicionar métrica
  addMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
  }

  // Registrar requisição
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestStats.total++;
    this.requestStats.responseTimes.push(responseTime);
    
    if (isError) {
      this.requestStats.errors++;
    }

    // Manter apenas os últimos 1000 tempos de resposta
    if (this.requestStats.responseTimes.length > 1000) {
      this.requestStats.responseTimes = this.requestStats.responseTimes.slice(-1000);
    }
  }

  // Reset estatísticas de requisição
  private resetRequestStats(): void {
    this.requestStats = {
      total: 0,
      errors: 0,
      responseTimes: [],
      lastReset: Date.now(),
    };
  }

  // Verificar alertas
  private checkAlerts(currentValues: Record<string, number>): void {
    Object.entries(currentValues).forEach(([metric, value]) => {
      const threshold = this.config.alertThresholds[metric];
      if (!threshold) return;

      const alertId = `alert_${metric}_${Date.now()}`;
      const existingAlert = Array.from(this.alerts.values())
        .find(alert => alert.metric === metric && !alert.resolved);

      if (value > threshold && !existingAlert) {
        // Criar novo alerta
        const alert: PerformanceAlert = {
          id: alertId,
          metric,
          threshold,
          currentValue: value,
          severity: this.getSeverity(metric, value, threshold),
          message: `${metric} is ${value.toFixed(2)} (threshold: ${threshold})`,
          timestamp: Date.now(),
          resolved: false,
        };

        this.alerts.set(alertId, alert);
        this.triggerAlert(alert);
      } else if (value <= threshold && existingAlert) {
        // Resolver alerta existente
        existingAlert.resolved = true;
        this.resolveAlert(existingAlert);
      }
    });
  }

  // Determinar severidade do alerta
  private getSeverity(metric: string, value: number, threshold: number): PerformanceAlert['severity'] {
    const ratio = value / threshold;
    
    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  // Disparar alerta
  private triggerAlert(alert: PerformanceAlert): void {
    logger.warn('Performance alert triggered', {
      alertId: alert.id,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      severity: alert.severity,
    });

    // Aqui você pode integrar com sistemas de notificação
    // como Slack, email, PagerDuty, etc.
  }

  // Resolver alerta
  private resolveAlert(alert: PerformanceAlert): void {
    logger.info('Performance alert resolved', {
      alertId: alert.id,
      metric: alert.metric,
    });
  }

  // Limpar métricas antigas
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    this.metrics.forEach((metricList, name) => {
      const filtered = metricList.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    });

    // Limpar alertas resolvidos antigos
    const alertsToDelete: string[] = [];
    this.alerts.forEach((alert, id) => {
      if (alert.resolved && alert.timestamp < cutoff) {
        alertsToDelete.push(id);
      }
    });
    
    alertsToDelete.forEach(id => this.alerts.delete(id));
  }

  // Exportar métricas
  private async exportMetrics(): Promise<void> {
    try {
      const allMetrics = this.getAllMetrics();
      const alerts = this.getActiveAlerts();
      
      const exportData = {
        timestamp: Date.now(),
        metrics: allMetrics,
        alerts,
        summary: this.getMetricsSummary(),
      };

      // Aqui você pode enviar para sistemas de monitoramento
      // como Prometheus, DataDog, New Relic, etc.
      logger.info('Metrics exported', {
        metricsCount: Object.keys(allMetrics).length,
        alertsCount: alerts.length,
      });
    } catch (error) {
      logger.error('Failed to export metrics', { error: error.message });
    }
  }

  // Obter todas as métricas
  getAllMetrics(): Record<string, PerformanceMetric[]> {
    const result: Record<string, PerformanceMetric[]> = {};
    this.metrics.forEach((metrics, name) => {
      result[name] = [...metrics];
    });
    return result;
  }

  // Obter métricas por nome
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  // Obter alertas ativos
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Obter todos os alertas
  getAllAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  // Obter resumo das métricas
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    this.metrics.forEach((metrics, name) => {
      if (metrics.length === 0) return;
      
      const values = metrics.map(m => m.value);
      const latest = metrics[metrics.length - 1];
      
      summary[name] = {
        current: latest.value,
        unit: latest.unit,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
        lastUpdated: latest.timestamp,
      };
    });
    
    return summary;
  }

  // Parar coleta
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

// Middleware para medir performance de requisições
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  collector: PerformanceCollector
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let isError = false;
    
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      collector.recordRequest(responseTime, isError);
    }
  }) as T;
}

// Instância singleton
export const performanceCollector = new PerformanceCollector();

export default PerformanceCollector;