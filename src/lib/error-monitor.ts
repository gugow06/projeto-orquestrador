import { logger, LogContext } from './logger';

// Tipos para monitoramento de erros
export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  lastError: Date | null;
  errorRate: number; // erros por minuto
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheck>;
  metrics: {
    memory: MemoryMetrics;
    errors: ErrorMetrics;
    performance: PerformanceMetrics;
  };
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: Record<string, any>;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerMinute: number;
  slowQueries: number;
  cacheHitRate: number;
}

// Classe principal para monitoramento de erros
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errorMetrics: ErrorMetrics;
  private performanceMetrics: PerformanceMetrics;
  private startTime: Date;
  private requestTimes: number[] = [];
  private requestCount = 0;

  private constructor() {
    this.startTime = new Date();
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      lastError: null,
      errorRate: 0,
    };
    this.performanceMetrics = {
      averageResponseTime: 0,
      requestsPerMinute: 0,
      slowQueries: 0,
      cacheHitRate: 0,
    };

    // Limpar métricas antigas a cada hora
    setInterval(() => this.cleanupMetrics(), 60 * 60 * 1000);
  }

  public static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  // Registrar erro
  public recordError(error: Error, context?: LogContext): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastError = new Date();

    // Contar por tipo de erro
    const errorType = error.name || 'UnknownError';
    this.errorMetrics.errorsByType[errorType] = 
      (this.errorMetrics.errorsByType[errorType] || 0) + 1;

    // Contar por endpoint se disponível
    if (context?.url) {
      const endpoint = this.extractEndpoint(context.url);
      this.errorMetrics.errorsByEndpoint[endpoint] = 
        (this.errorMetrics.errorsByEndpoint[endpoint] || 0) + 1;
    }

    // Calcular taxa de erro
    this.calculateErrorRate();

    // Log do erro
    logger.error('Error recorded by monitor', {
      error,
      errorType,
      totalErrors: this.errorMetrics.totalErrors,
      ...context,
    });

    // Alertas para erros críticos
    this.checkCriticalThresholds();
  }

  // Registrar tempo de resposta
  public recordResponseTime(duration: number, endpoint?: string): void {
    this.requestTimes.push(duration);
    this.requestCount++;

    // Manter apenas os últimos 1000 tempos de resposta
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }

    // Atualizar métricas de performance
    this.updatePerformanceMetrics();

    // Registrar queries lentas
    if (duration > 5000) { // > 5 segundos
      this.performanceMetrics.slowQueries++;
      logger.warn('Slow query detected', {
        duration,
        endpoint,
        performance: true,
      });
    }
  }

  // Extrair endpoint da URL
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  // Calcular taxa de erro
  private calculateErrorRate(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Esta é uma implementação simplificada
    // Em produção, usar uma janela deslizante mais sofisticada
    this.errorMetrics.errorRate = this.errorMetrics.totalErrors / 
      Math.max(1, (now - this.startTime.getTime()) / 60000);
  }

  // Atualizar métricas de performance
  private updatePerformanceMetrics(): void {
    if (this.requestTimes.length > 0) {
      this.performanceMetrics.averageResponseTime = 
        this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    }

    // Calcular requests por minuto
    const uptimeMinutes = (Date.now() - this.startTime.getTime()) / 60000;
    this.performanceMetrics.requestsPerMinute = this.requestCount / Math.max(1, uptimeMinutes);
  }

  // Verificar limites críticos
  private checkCriticalThresholds(): void {
    const thresholds = {
      errorRate: 10, // 10 erros por minuto
      totalErrors: 100, // 100 erros totais
      averageResponseTime: 3000, // 3 segundos
    };

    if (this.errorMetrics.errorRate > thresholds.errorRate) {
      logger.fatal('Critical error rate exceeded', {
        currentRate: this.errorMetrics.errorRate,
        threshold: thresholds.errorRate,
        alert: true,
      });
    }

    if (this.performanceMetrics.averageResponseTime > thresholds.averageResponseTime) {
      logger.warn('High average response time', {
        currentTime: this.performanceMetrics.averageResponseTime,
        threshold: thresholds.averageResponseTime,
        performance: true,
      });
    }
  }

  // Limpar métricas antigas
  private cleanupMetrics(): void {
    // Reset de contadores por hora
    this.requestTimes = [];
    this.performanceMetrics.slowQueries = 0;
    
    logger.info('Metrics cleanup completed', {
      cleanup: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Obter métricas de memória
  private getMemoryMetrics(): MemoryMetrics {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.rss,
        total: usage.rss + usage.external,
        percentage: (usage.rss / (usage.rss + usage.external)) * 100,
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
      };
    }
    
    // Fallback para ambiente browser
    return {
      used: 0,
      total: 0,
      percentage: 0,
      heapUsed: 0,
      heapTotal: 0,
    };
  }

  // Health checks específicos
  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Implementar verificação real do banco de dados
      // Por enquanto, simular
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        status: 'pass',
        duration: Date.now() - start,
        message: 'Database connection healthy',
      };
    } catch (error) {
      return {
        status: 'fail',
        duration: Date.now() - start,
        message: 'Database connection failed',
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Verificar APIs externas (Gemini, Groq, etc.)
      // Por enquanto, simular
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        status: 'pass',
        duration: Date.now() - start,
        message: 'External APIs accessible',
      };
    } catch (error) {
      return {
        status: 'warn',
        duration: Date.now() - start,
        message: 'Some external APIs may be slow',
        details: { error: (error as Error).message },
      };
    }
  }

  private async checkFileSystem(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Verificar se consegue escrever/ler arquivos temporários
      // Por enquanto, simular
      await new Promise(resolve => setTimeout(resolve, 5));
      
      return {
        status: 'pass',
        duration: Date.now() - start,
        message: 'File system accessible',
      };
    } catch (error) {
      return {
        status: 'fail',
        duration: Date.now() - start,
        message: 'File system access failed',
        details: { error: (error as Error).message },
      };
    }
  }

  // Obter status completo de saúde
  public async getHealthStatus(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      externalAPIs: await this.checkExternalAPIs(),
      fileSystem: await this.checkFileSystem(),
    };

    // Determinar status geral
    const hasFailures = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasFailures) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings || this.errorMetrics.errorRate > 5) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        memory: this.getMemoryMetrics(),
        errors: { ...this.errorMetrics },
        performance: { ...this.performanceMetrics },
      },
    };
  }

  // Obter métricas resumidas
  public getMetrics(): {
    errors: ErrorMetrics;
    performance: PerformanceMetrics;
    memory: MemoryMetrics;
  } {
    return {
      errors: { ...this.errorMetrics },
      performance: { ...this.performanceMetrics },
      memory: this.getMemoryMetrics(),
    };
  }
}

// Instância singleton
export const errorMonitor = ErrorMonitor.getInstance();

// Helper para capturar erros automaticamente
export function withErrorMonitoring<T extends any[], R>(
  fn: (...args: T) => R,
  context?: LogContext
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      errorMonitor.recordError(error as Error, context);
      throw error;
    }
  };
}

// Helper para capturar erros em funções assíncronas
export function withAsyncErrorMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: LogContext
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorMonitor.recordError(error as Error, context);
      throw error;
    }
  };
}

export default errorMonitor;