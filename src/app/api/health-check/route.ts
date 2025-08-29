import { NextRequest, NextResponse } from 'next/server';
import { errorMonitor } from '@/lib/error-monitor';
import { logger } from '@/lib/logger';

// Verificar token de autenticação para health check
function verifyHealthCheckToken(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.nextUrl.searchParams.get('token');
  
  const expectedToken = process.env.HEALTH_CHECK_TOKEN;
  
  // Se não há token configurado, permitir acesso (desenvolvimento)
  if (!expectedToken) {
    return process.env.NODE_ENV !== 'production';
  }
  
  return token === expectedToken;
}

// GET /api/health-check - Health check completo
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  
  try {
    // Verificar autenticação
    if (!verifyHealthCheckToken(request)) {
      logger.warn('Unauthorized health check attempt', {
        requestId,
        ip: request.headers.get('x-forwarded-for') || request.ip,
        userAgent: request.headers.get('user-agent'),
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obter status de saúde completo
    const healthStatus = await errorMonitor.getHealthStatus();
    const duration = Date.now() - startTime;

    // Log do health check
    logger.info('Health check completed', {
      requestId,
      duration,
      status: healthStatus.status,
      checksCount: Object.keys(healthStatus.checks).length,
    });

    // Determinar código de status HTTP
    let statusCode: number;
    switch (healthStatus.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Ainda operacional
        break;
      case 'unhealthy':
        statusCode = 503; // Service Unavailable
        break;
      default:
        statusCode = 500;
    }

    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed', {
      requestId,
      duration,
      error: error as Error,
    });

    errorMonitor.recordError(error as Error, {
      requestId,
      url: request.url,
      method: request.method,
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// HEAD /api/health-check - Health check simples (apenas status)
export async function HEAD(request: NextRequest) {
  try {
    // Verificar autenticação
    if (!verifyHealthCheckToken(request)) {
      return new NextResponse(null, { status: 401 });
    }

    // Health check básico - apenas verificar se a aplicação está respondendo
    const healthStatus = await errorMonitor.getHealthStatus();
    
    let statusCode: number;
    switch (healthStatus.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200;
        break;
      case 'unhealthy':
        statusCode = 503;
        break;
      default:
        statusCode = 500;
    }

    return new NextResponse(null, { 
      status: statusCode,
      headers: {
        'X-Health-Status': healthStatus.status,
        'X-Uptime': healthStatus.uptime.toString(),
        'X-Version': healthStatus.version,
      }
    });
    
  } catch (error) {
    logger.error('Simple health check failed', {
      error: error as Error,
      url: request.url,
    });

    return new NextResponse(null, { status: 500 });
  }
}