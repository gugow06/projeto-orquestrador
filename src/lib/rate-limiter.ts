import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Limpar entradas expiradas a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getClientId(request: NextRequest): string {
    // Priorizar IP real do cabeçalho X-Forwarded-For
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || request.ip || 'unknown';
    
    // Incluir User-Agent para melhor identificação
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent.slice(0, 50)}`;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  public check(request: NextRequest): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const clientId = this.getClientId(request);
    const now = Date.now();
    
    // Inicializar ou resetar se a janela expirou
    if (!this.store[clientId] || this.store[clientId].resetTime < now) {
      this.store[clientId] = {
        count: 0,
        resetTime: now + this.windowMs
      };
    }

    const client = this.store[clientId];
    client.count++;

    const remaining = Math.max(0, this.maxRequests - client.count);
    const allowed = client.count <= this.maxRequests;
    const retryAfter = allowed ? undefined : Math.ceil((client.resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime: client.resetTime,
      retryAfter
    };
  }

  public createResponse(result: ReturnType<typeof this.check>): NextResponse | null {
    if (result.allowed) {
      return null; // Permitir a requisição
    }

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': this.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': result.retryAfter?.toString() || '60'
        }
      }
    );
  }
}

// Instâncias para diferentes tipos de endpoints
export const apiRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_MAX || '100'),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') // 15 minutos
);

export const uploadRateLimiter = new RateLimiter(10, 60 * 1000); // 10 uploads por minuto
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 tentativas de auth por 15 min

// Middleware helper
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: RateLimiter = apiRateLimiter
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = limiter.check(req);
    const limitResponse = limiter.createResponse(result);
    
    if (limitResponse) {
      return limitResponse;
    }

    const response = await handler(req);
    
    // Adicionar headers de rate limit na resposta
    response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    return response;
  };
}

export default RateLimiter;