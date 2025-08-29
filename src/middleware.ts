import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, uploadRateLimiter, authRateLimiter } from './lib/rate-limiter';
import { InputValidator } from './lib/input-validator';

// Configurações de segurança
const SECURITY_CONFIG = {
  allowedOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  allowedContentTypes: ['application/json', 'multipart/form-data', 'text/csv'],
  maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '50000000'), // 50MB
  sensitiveRoutes: ['/api/upload', '/api/database', '/api/auth'],
  publicRoutes: ['/api/health', '/api/health-check'],
};

// Função para determinar qual rate limiter usar
function getRateLimiter(pathname: string) {
  if (pathname.includes('/upload')) {
    return uploadRateLimiter;
  }
  if (pathname.includes('/auth') || pathname.includes('/login')) {
    return authRateLimiter;
  }
  return apiRateLimiter;
}

// Função para validar headers de segurança
function validateSecurityHeaders(request: NextRequest): string[] {
  const errors: string[] = [];
  const pathname = request.nextUrl.pathname;

  // Validar Content-Length para rotas sensíveis
  if (SECURITY_CONFIG.sensitiveRoutes.some(route => pathname.startsWith(route))) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && !InputValidator.validateRequestSize(parseInt(contentLength))) {
      errors.push('Request size exceeds maximum allowed');
    }

    // Validar Content-Type
    const contentType = request.headers.get('content-type');
    if (request.method !== 'GET' && !InputValidator.validateContentType(contentType, SECURITY_CONFIG.allowedContentTypes)) {
      errors.push('Invalid content type');
    }
  }

  // Validar Origin para requests não-GET
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!InputValidator.validateOrigin(origin, SECURITY_CONFIG.allowedOrigins)) {
      errors.push('Invalid origin');
    }
  }

  return errors;
}

// Função para detectar possíveis ataques
function detectSuspiciousActivity(request: NextRequest): string[] {
  const warnings: string[] = [];
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // Detectar user agents suspeitos
  const suspiciousUserAgents = ['curl', 'wget', 'python-requests', 'bot', 'crawler'];
  if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    warnings.push('Suspicious user agent detected');
  }

  // Detectar tentativas de path traversal
  if (pathname.includes('../') || pathname.includes('..\\')) {
    warnings.push('Path traversal attempt detected');
  }

  // Detectar tentativas de SQL injection nos parâmetros
  const searchParams = request.nextUrl.searchParams;
  for (const [key, value] of searchParams.entries()) {
    if (/('|(\-\-)|(;)|(\||\|)|(\*|\*))/i.test(value)) {
      warnings.push(`Potential SQL injection in parameter: ${key}`);
    }
  }

  return warnings;
}

// Middleware principal
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Pular middleware para rotas públicas e assets estáticos
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    SECURITY_CONFIG.publicRoutes.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Aplicar rate limiting para rotas de API
  if (pathname.startsWith('/api/')) {
    const rateLimiter = getRateLimiter(pathname);
    const rateLimitResult = rateLimiter.check(request);
    const rateLimitResponse = rateLimiter.createResponse(rateLimitResult);
    
    if (rateLimitResponse) {
      console.warn(`Rate limit exceeded for ${request.ip} on ${pathname}`);
      return rateLimitResponse;
    }
  }

  // Validar headers de segurança
  const securityErrors = validateSecurityHeaders(request);
  if (securityErrors.length > 0) {
    console.warn(`Security validation failed for ${request.ip} on ${pathname}:`, securityErrors);
    return NextResponse.json(
      {
        error: 'Security validation failed',
        message: 'Request does not meet security requirements',
        details: securityErrors
      },
      { status: 400 }
    );
  }

  // Detectar atividade suspeita
  const suspiciousActivity = detectSuspiciousActivity(request);
  if (suspiciousActivity.length > 0) {
    console.warn(`Suspicious activity detected for ${request.ip} on ${pathname}:`, suspiciousActivity);
    
    // Para atividades muito suspeitas, bloquear a requisição
    if (suspiciousActivity.some(warning => warning.includes('SQL injection') || warning.includes('Path traversal'))) {
      return NextResponse.json(
        {
          error: 'Suspicious activity detected',
          message: 'Request blocked for security reasons'
        },
        { status: 403 }
      );
    }
  }

  // Adicionar headers de segurança na resposta
  const response = NextResponse.next();
  
  // Headers de segurança padrão
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP para rotas de API
  if (pathname.startsWith('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'none'; object-src 'none';"
    );
  }

  // CORS headers
  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Origin', SECURITY_CONFIG.allowedOrigins[0]);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

// Configuração do matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};