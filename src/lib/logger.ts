import { NextRequest } from 'next/server';

// Tipos para logs estruturados
export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  service: string;
  version: string;
  environment: string;
}

// Configuração do logger
const LOG_CONFIG = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: process.env.LOG_FORMAT || 'json',
  service: 'projeto-orquestrador',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  enableConsole: process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true',
  enableFile: process.env.LOG_FILE_PATH ? true : false,
  filePath: process.env.LOG_FILE_PATH,
};

// Níveis de log com prioridades
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Classe principal do logger
export class Logger {
  private static instance: Logger;
  private requestIdCounter = 0;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Gerar ID único para requisição
  public generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  // Extrair contexto da requisição
  public extractRequestContext(request: NextRequest, requestId?: string): LogContext {
    return {
      requestId: requestId || this.generateRequestId(),
      ip: this.getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      method: request.method,
      url: request.url,
    };
  }

  private getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwardedFor?.split(',')[0] || realIp || request.ip || 'unknown';
  }

  // Verificar se deve logar baseado no nível
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_CONFIG.level];
  }

  // Formatar log entry
  private formatLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: LOG_CONFIG.service,
      version: LOG_CONFIG.version,
      environment: LOG_CONFIG.environment,
    };
  }

  // Serializar erro
  private serializeError(error: Error): Record<string, any> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  // Método principal de log
  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Serializar erro se presente
    if (context.error && context.error instanceof Error) {
      context.error = this.serializeError(context.error);
    }

    const logEntry = this.formatLogEntry(level, message, context);

    // Output para console
    if (LOG_CONFIG.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Output para arquivo (se configurado)
    if (LOG_CONFIG.enableFile && LOG_CONFIG.filePath) {
      this.outputToFile(logEntry);
    }

    // Enviar para serviços externos (Sentry, etc.)
    this.sendToExternalServices(logEntry);
  }

  private outputToConsole(logEntry: LogEntry): void {
    const output = LOG_CONFIG.format === 'json' 
      ? JSON.stringify(logEntry)
      : this.formatHumanReadable(logEntry);

    switch (logEntry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  private formatHumanReadable(logEntry: LogEntry): string {
    const { timestamp, level, message, context } = logEntry;
    const contextStr = Object.keys(context).length > 0 ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private outputToFile(logEntry: LogEntry): void {
    // Implementação para escrita em arquivo
    // Em produção, usar bibliotecas como winston ou pino
    try {
      const fs = require('fs');
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(LOG_CONFIG.filePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private sendToExternalServices(logEntry: LogEntry): void {
    // Enviar para Sentry em caso de erro
    if ((logEntry.level === 'error' || logEntry.level === 'fatal') && process.env.SENTRY_DSN) {
      this.sendToSentry(logEntry);
    }

    // Enviar métricas para outros serviços
    this.sendMetrics(logEntry);
  }

  private sendToSentry(logEntry: LogEntry): void {
    try {
      // Implementação básica - em produção usar @sentry/nextjs
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(new Error(logEntry.message), {
          tags: {
            level: logEntry.level,
            service: logEntry.service,
          },
          extra: logEntry.context,
        });
      }
    } catch (error) {
      console.error('Failed to send to Sentry:', error);
    }
  }

  private sendMetrics(logEntry: LogEntry): void {
    // Implementar envio de métricas para serviços como DataDog, New Relic, etc.
    // Por enquanto, apenas contar logs por nível
    if (typeof window !== 'undefined') {
      const metricsKey = `log_${logEntry.level}_count`;
      const currentCount = parseInt(localStorage.getItem(metricsKey) || '0');
      localStorage.setItem(metricsKey, (currentCount + 1).toString());
    }
  }

  // Métodos públicos para diferentes níveis de log
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  public fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  // Métodos utilitários para casos específicos
  public logRequest(request: NextRequest, context?: LogContext): string {
    const requestId = this.generateRequestId();
    const requestContext = this.extractRequestContext(request, requestId);
    
    this.info('Request received', {
      ...requestContext,
      ...context,
    });
    
    return requestId;
  }

  public logResponse(requestId: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info('Request completed', {
      requestId,
      statusCode,
      duration,
      ...context,
    });
  }

  public logError(error: Error, context?: LogContext): void {
    this.error('Application error', {
      error,
      ...context,
    });
  }

  public logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      securityEvent: true,
      ...context,
    });
  }

  public logPerformance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      performance: true,
      ...context,
    });
  }
}

// Instância singleton
export const logger = Logger.getInstance();

// Helper para medir performance
export function measurePerformance<T>(operation: string, fn: () => T, context?: LogContext): T {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    logger.logPerformance(operation, duration, context);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Performance measurement failed for ${operation}`, {
      operation,
      duration,
      error: error as Error,
      ...context,
    });
    throw error;
  }
}

// Helper para medir performance assíncrona
export async function measurePerformanceAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.logPerformance(operation, duration, context);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Async performance measurement failed for ${operation}`, {
      operation,
      duration,
      error: error as Error,
      ...context,
    });
    throw error;
  }
}

export default logger;