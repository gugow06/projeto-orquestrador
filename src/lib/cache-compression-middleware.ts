// Middleware para aplicar cache e compressão automaticamente

import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from './cache-manager';
import { ResponseCompressor, CompressionAlgorithm } from './compression';
import { logger } from './logger';

export interface CacheCompressionConfig {
  enableCache: boolean;
  enableCompression: boolean;
  cacheType: 'dataType' | 'validation' | 'api' | 'general';
  cacheTTL: number;
  compressionThreshold: number;
  compressibleTypes: string[];
  excludePaths: string[];
  cacheHeaders: boolean;
}

export interface ResponseMetadata {
  cached: boolean;
  compressed: boolean;
  compressionAlgorithm?: CompressionAlgorithm;
  cacheHit: boolean;
  originalSize?: number;
  compressedSize?: number;
  processingTime: number;
}

// Middleware principal
export class CacheCompressionMiddleware {
  private config: CacheCompressionConfig;

  constructor(config: Partial<CacheCompressionConfig> = {}) {
    this.config = {
      enableCache: process.env.ENABLE_CACHE === 'true',
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
      cacheType: 'api',
      cacheTTL: parseInt(process.env.API_CACHE_TTL || '300'), // 5 minutos
      compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
      compressibleTypes: [
        'application/json',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'text/plain',
        'application/xml',
        'text/xml',
        'image/svg+xml'
      ],
      excludePaths: ['/api/health-check', '/api/metrics'],
      cacheHeaders: true,
      ...config,
    };
  }

  // Aplicar middleware a uma função handler
  wrap<T extends (...args: any[]) => Promise<Response | NextResponse>>(
    handler: T,
    options: Partial<CacheCompressionConfig> = {}
  ): T {
    const config = { ...this.config, ...options };

    return (async (...args: any[]) => {
      const startTime = Date.now();
      const request = args[0] as NextRequest;
      const metadata: ResponseMetadata = {
        cached: false,
        compressed: false,
        cacheHit: false,
        processingTime: 0,
      };

      try {
        // Verificar se o path deve ser excluído
        if (this.shouldExclude(request.url, config.excludePaths)) {
          const response = await handler(...args);
          metadata.processingTime = Date.now() - startTime;
          return this.addMetadataHeaders(response, metadata);
        }

        // Gerar chave de cache
        const cacheKey = this.generateCacheKey(request);

        // Tentar obter do cache
        let response: Response | NextResponse | null = null;
        if (config.enableCache) {
          response = await this.getFromCache(cacheKey, config.cacheType);
          if (response) {
            metadata.cached = true;
            metadata.cacheHit = true;
            metadata.processingTime = Date.now() - startTime;
            
            logger.debug('Cache hit', {
              path: request.url,
              cacheKey,
              processingTime: metadata.processingTime,
            });
            
            return this.addMetadataHeaders(response, metadata);
          }
        }

        // Executar handler original
        response = await handler(...args);
        
        // Aplicar compressão se necessário
        if (config.enableCompression && this.shouldCompress(request, response, config)) {
          response = await this.compressResponse(request, response, metadata);
        }

        // Salvar no cache
        if (config.enableCache && this.shouldCache(response)) {
          await this.saveToCache(cacheKey, response, config.cacheType, config.cacheTTL);
          metadata.cached = true;
        }

        metadata.processingTime = Date.now() - startTime;
        
        logger.info('Request processed', {
          path: request.url,
          method: request.method,
          cached: metadata.cached,
          compressed: metadata.compressed,
          processingTime: metadata.processingTime,
        });

        return this.addMetadataHeaders(response, metadata);
      } catch (error) {
        metadata.processingTime = Date.now() - startTime;
        
        logger.error('Middleware error', {
          path: request.url,
          error: error.message,
          processingTime: metadata.processingTime,
        });
        
        // Em caso de erro, executar handler sem middleware
        const response = await handler(...args);
        return this.addMetadataHeaders(response, metadata);
      }
    }) as T;
  }

  // Gerar chave de cache baseada na requisição
  private generateCacheKey(request: NextRequest): string {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    const searchParams = url.searchParams.toString();
    
    // Incluir headers relevantes para cache
    const relevantHeaders = [
      'accept',
      'accept-language',
      'authorization',
    ];
    
    const headerString = relevantHeaders
      .map(header => `${header}:${request.headers.get(header) || ''}`)
      .join('|');
    
    return `${method}:${pathname}:${searchParams}:${this.hashString(headerString)}`;
  }

  // Hash simples para strings
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Obter resposta do cache
  private async getFromCache(
    key: string,
    cacheType: 'dataType' | 'validation' | 'api' | 'general'
  ): Promise<NextResponse | null> {
    try {
      const cache = cacheManager.getCache(cacheType);
      const cached = cache.get(key);
      
      if (!cached) return null;
      
      // Reconstruir NextResponse do cache
      const { body, headers, status } = cached;
      const response = new NextResponse(body, { status, headers });
      
      return response;
    } catch (error) {
      logger.warn('Cache retrieval error', { key, error: error.message });
      return null;
    }
  }

  // Salvar resposta no cache
  private async saveToCache(
    key: string,
    response: Response | NextResponse,
    cacheType: 'dataType' | 'validation' | 'api' | 'general',
    ttl: number
  ): Promise<void> {
    try {
      const cache = cacheManager.getCache(cacheType);
      
      // Clonar resposta para cache
      const body = await response.clone().text();
      const headers = Object.fromEntries(response.headers.entries());
      const status = response.status;
      
      const cacheData = { body, headers, status };
      cache.set(key, cacheData, ttl);
      
      logger.debug('Response cached', { key, size: body.length });
    } catch (error) {
      logger.warn('Cache save error', { key, error: error.message });
    }
  }

  // Verificar se deve comprimir
  private shouldCompress(
    request: NextRequest,
    response: Response | NextResponse,
    config: CacheCompressionConfig
  ): boolean {
    // Verificar Accept-Encoding
    const acceptEncoding = request.headers.get('accept-encoding');
    if (!acceptEncoding) return false;
    
    // Verificar Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !config.compressibleTypes.some(type => contentType.includes(type))) {
      return false;
    }
    
    // Verificar se já está comprimido
    if (response.headers.get('content-encoding')) {
      return false;
    }
    
    return true;
  }

  // Comprimir resposta
  private async compressResponse(
    request: NextRequest,
    response: Response | NextResponse,
    metadata: ResponseMetadata
  ): Promise<NextResponse> {
    try {
      const acceptEncoding = request.headers.get('accept-encoding') || '';
      const algorithm = ResponseCompressor.getAcceptedEncoding(acceptEncoding);
      
      if (!algorithm) return response as NextResponse;
      
      const originalBody = await response.clone().text();
      metadata.originalSize = originalBody.length;
      
      // Verificar threshold
      if (originalBody.length < this.config.compressionThreshold) {
        return response as NextResponse;
      }
      
      const compressedBody = await ResponseCompressor.compressResponse(originalBody, algorithm);
      metadata.compressedSize = compressedBody.length;
      metadata.compressed = true;
      metadata.compressionAlgorithm = algorithm;
      
      // Criar nova resposta com corpo comprimido
      const newHeaders = new Headers(response.headers);
      newHeaders.set('content-encoding', ResponseCompressor.getContentEncoding(algorithm));
      newHeaders.set('content-length', compressedBody.length.toString());
      newHeaders.set('vary', 'Accept-Encoding');
      
      logger.debug('Response compressed', {
        algorithm,
        originalSize: metadata.originalSize,
        compressedSize: metadata.compressedSize,
        ratio: (metadata.compressedSize / metadata.originalSize * 100).toFixed(2) + '%',
      });
      
      return new NextResponse(compressedBody, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      logger.warn('Compression error', { error: error.message });
      return response as NextResponse;
    }
  }

  // Verificar se deve cachear
  private shouldCache(response: Response | NextResponse): boolean {
    // Não cachear erros
    if (response.status >= 400) return false;
    
    // Não cachear se já tem cache-control no-cache
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl && cacheControl.includes('no-cache')) return false;
    
    return true;
  }

  // Verificar se path deve ser excluído
  private shouldExclude(url: string, excludePaths: string[]): boolean {
    const pathname = new URL(url).pathname;
    return excludePaths.some(path => pathname.startsWith(path));
  }

  // Adicionar headers de metadata
  private addMetadataHeaders(
    response: Response | NextResponse,
    metadata: ResponseMetadata
  ): NextResponse {
    if (!this.config.cacheHeaders) return response as NextResponse;
    
    const newHeaders = new Headers(response.headers);
    
    newHeaders.set('x-cache', metadata.cacheHit ? 'HIT' : 'MISS');
    newHeaders.set('x-compressed', metadata.compressed ? 'true' : 'false');
    newHeaders.set('x-processing-time', metadata.processingTime.toString());
    
    if (metadata.compressed && metadata.compressionAlgorithm) {
      newHeaders.set('x-compression-algorithm', metadata.compressionAlgorithm);
    }
    
    if (metadata.originalSize && metadata.compressedSize) {
      const ratio = ((1 - metadata.compressedSize / metadata.originalSize) * 100).toFixed(2);
      newHeaders.set('x-compression-ratio', ratio + '%');
    }
    
    return new NextResponse(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }
}

// Instância padrão
export const cacheCompressionMiddleware = new CacheCompressionMiddleware();

// Helper para aplicar middleware facilmente
export function withCacheCompression<T extends (...args: any[]) => Promise<Response | NextResponse>>(
  handler: T,
  options?: Partial<CacheCompressionConfig>
): T {
  return cacheCompressionMiddleware.wrap(handler, options);
}

// Decorador para aplicar middleware automaticamente
export function CacheCompress(options?: Partial<CacheCompressionConfig>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = withCacheCompression(originalMethod, options);
    return descriptor;
  };
}

export default cacheCompressionMiddleware;