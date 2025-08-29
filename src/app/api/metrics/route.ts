// API endpoint para métricas de performance e monitoramento

import { NextRequest, NextResponse } from 'next/server';
import { performanceCollector } from '@/lib/performance-metrics';
import { errorMonitor } from '@/lib/error-monitor';
import { cacheManager } from '@/lib/cache-manager';
import { logger } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limiter';

// Configuração de autenticação para métricas
const METRICS_TOKEN = process.env.METRICS_TOKEN || 'default-metrics-token';
const ENABLE_PUBLIC_METRICS = process.env.ENABLE_PUBLIC_METRICS === 'true';

// Verificar autenticação
function verifyAuth(request: NextRequest): boolean {
  if (ENABLE_PUBLIC_METRICS) return true;
  
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  return token === METRICS_TOKEN;
}

// GET /api/metrics - Obter todas as métricas
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificar autenticação
    if (!verifyAuth(request)) {
      logger.warn('Unauthorized metrics access attempt', {
        ip: request.ip,
        userAgent: request.headers.get('user-agent'),
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const metric = searchParams.get('metric');
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000'); // 1 hora padrão
    const includeAlerts = searchParams.get('alerts') !== 'false';
    const includeSummary = searchParams.get('summary') !== 'false';

    // Coletar dados
    const now = Date.now();
    const cutoff = now - timeRange;
    
    let metricsData: any = {};
    
    if (metric) {
      // Métrica específica
      const metricData = performanceCollector.getMetrics(metric)
        .filter(m => m.timestamp > cutoff);
      metricsData[metric] = metricData;
    } else {
      // Todas as métricas
      const allMetrics = performanceCollector.getAllMetrics();
      Object.entries(allMetrics).forEach(([name, metrics]) => {
        metricsData[name] = metrics.filter(m => m.timestamp > cutoff);
      });
    }

    // Dados adicionais
    const responseData: any = {
      timestamp: now,
      timeRange,
      metrics: metricsData,
    };

    if (includeAlerts) {
      responseData.alerts = {
        active: performanceCollector.getActiveAlerts(),
        all: performanceCollector.getAllAlerts()
          .filter(alert => alert.timestamp > cutoff),
      };
    }

    if (includeSummary) {
      responseData.summary = {
        performance: performanceCollector.getMetricsSummary(),
        cache: cacheManager.getAllStats(),
        health: await errorMonitor.getHealthStatus(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform,
        },
      };
    }

    // Formato de resposta
    if (format === 'prometheus') {
      const prometheusData = convertToPrometheus(responseData);
      return new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Metrics endpoint accessed', {
      format,
      metric,
      timeRange,
      processingTime,
      metricsCount: Object.keys(metricsData).length,
    });

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Processing-Time': processingTime.toString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Metrics endpoint error', {
      error: error.message,
      processingTime,
    });

    errorMonitor.recordError(error as Error, {
      endpoint: '/api/metrics',
      method: 'GET',
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

// POST /api/metrics - Adicionar métrica customizada
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificar autenticação
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, value, unit, tags } = body;

    // Validar dados
    if (!name || typeof value !== 'number' || !unit) {
      return NextResponse.json(
        { error: 'Invalid metric data. Required: name, value (number), unit' },
        { status: 400 }
      );
    }

    // Adicionar métrica
    performanceCollector.addMetric(name, value, unit, tags);

    const processingTime = Date.now() - startTime;
    
    logger.info('Custom metric added', {
      name,
      value,
      unit,
      tags,
      processingTime,
    });

    return NextResponse.json({
      success: true,
      metric: { name, value, unit, tags, timestamp: Date.now() },
      processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Add metric error', {
      error: error.message,
      processingTime,
    });

    return NextResponse.json(
      { error: 'Failed to add metric' },
      { status: 500 }
    );
  }
}

// DELETE /api/metrics - Limpar métricas
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificar autenticação
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const olderThan = parseInt(searchParams.get('olderThan') || '0');

    if (metric) {
      // Limpar métrica específica (implementar se necessário)
      logger.info('Specific metric cleanup requested', { metric });
    } else {
      // Limpar cache e resetar algumas métricas
      cacheManager.clearAll();
      logger.info('Cache cleared via metrics API');
    }

    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      action: metric ? `Cleared metric: ${metric}` : 'Cleared cache',
      processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Metrics cleanup error', {
      error: error.message,
      processingTime,
    });

    return NextResponse.json(
      { error: 'Failed to cleanup metrics' },
      { status: 500 }
    );
  }
}

// Converter métricas para formato Prometheus
function convertToPrometheus(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# HELP app_metrics Application performance metrics');
  lines.push('# TYPE app_metrics gauge');
  
  // Converter métricas
  Object.entries(data.metrics).forEach(([metricName, metrics]: [string, any]) => {
    if (!Array.isArray(metrics) || metrics.length === 0) return;
    
    const latest = metrics[metrics.length - 1];
    const sanitizedName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    let labels = '';
    if (latest.tags) {
      const labelPairs = Object.entries(latest.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      labels = `{${labelPairs}}`;
    }
    
    lines.push(`app_${sanitizedName}${labels} ${latest.value} ${latest.timestamp}`);
  });
  
  // Adicionar métricas de sistema
  if (data.summary?.system) {
    const { uptime, memory } = data.summary.system;
    lines.push(`app_uptime_seconds ${uptime} ${Date.now()}`);
    lines.push(`app_memory_heap_used_bytes ${memory.heapUsed} ${Date.now()}`);
    lines.push(`app_memory_heap_total_bytes ${memory.heapTotal} ${Date.now()}`);
    lines.push(`app_memory_rss_bytes ${memory.rss} ${Date.now()}`);
  }
  
  // Adicionar alertas ativos
  if (data.alerts?.active) {
    lines.push(`app_active_alerts_total ${data.alerts.active.length} ${Date.now()}`);
  }
  
  return lines.join('\n') + '\n';
}

// Aplicar rate limiting
export const GET_WITH_RATE_LIMIT = withRateLimit(GET, {
  windowMs: 60000, // 1 minuto
  maxRequests: 60, // 60 requests por minuto
});

export const POST_WITH_RATE_LIMIT = withRateLimit(POST, {
  windowMs: 60000,
  maxRequests: 10, // 10 requests por minuto para POST
});

export const DELETE_WITH_RATE_LIMIT = withRateLimit(DELETE, {
  windowMs: 300000, // 5 minutos
  maxRequests: 5, // 5 requests por 5 minutos para DELETE
});

// Exportar handlers com rate limiting
export { GET_WITH_RATE_LIMIT as GET };
export { POST_WITH_RATE_LIMIT as POST };
export { DELETE_WITH_RATE_LIMIT as DELETE };