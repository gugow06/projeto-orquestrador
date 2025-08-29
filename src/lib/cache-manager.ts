// Sistema de cache para otimização de performance

export interface CacheConfig {
  ttl: number; // Time to live em segundos
  maxSize: number; // Tamanho máximo do cache
  strategy: 'lru' | 'fifo' | 'lfu'; // Estratégia de eviction
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

// Cache em memória com diferentes estratégias
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    evictions: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hora
      maxSize: 1000,
      strategy: 'lru',
      ...config,
    };

    // Limpeza periódica de entradas expiradas
    setInterval(() => this.cleanup(), 60000); // A cada minuto
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.ttl;
    
    // Verificar se precisa fazer eviction
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: entryTtl * 1000, // Converter para ms
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    
    // Verificar se expirou
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateStats();
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0,
    };
  }

  // Estratégias de eviction
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;
    
    switch (this.config.strategy) {
      case 'lru': // Least Recently Used
        keyToEvict = this.findLRU();
        break;
      case 'lfu': // Least Frequently Used
        keyToEvict = this.findLFU();
        break;
      case 'fifo': // First In, First Out
      default:
        keyToEvict = this.findFIFO();
        break;
    }

    this.cache.delete(keyToEvict);
    this.stats.evictions++;
  }

  private findLRU(): string {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  private findLFU(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }

  private findFIFO(): string {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Método para cache com função de fallback
  async getOrSet<R>(
    key: string,
    fallbackFn: () => Promise<R> | R,
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as R;
    }

    const value = await fallbackFn();
    this.set(key, value as T, ttl);
    return value;
  }
}

// Cache específico para diferentes tipos de dados
export class DataTypeCache extends MemoryCache<any> {
  constructor() {
    super({
      ttl: 1800, // 30 minutos
      maxSize: 500,
      strategy: 'lru',
    });
  }

  cacheInferenceResult(data: string, result: any): void {
    const key = `inference:${this.hashData(data)}`;
    this.set(key, result);
  }

  getInferenceResult(data: string): any | null {
    const key = `inference:${this.hashData(data)}`;
    return this.get(key);
  }

  private hashData(data: string): string {
    // Hash simples para criar chave única
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Cache para validação de dados
export class ValidationCache extends MemoryCache<any> {
  constructor() {
    super({
      ttl: 900, // 15 minutos
      maxSize: 200,
      strategy: 'lfu',
    });
  }

  cacheValidationResult(schema: string, data: string, result: any): void {
    const key = `validation:${schema}:${this.hashString(data)}`;
    this.set(key, result);
  }

  getValidationResult(schema: string, data: string): any | null {
    const key = `validation:${schema}:${this.hashString(data)}`;
    return this.get(key);
  }

  private hashString(str: string): string {
    return str.length.toString(36) + str.slice(0, 10);
  }
}

// Cache para resultados de API
export class APICache extends MemoryCache<any> {
  constructor() {
    super({
      ttl: 3600, // 1 hora
      maxSize: 100,
      strategy: 'lru',
    });
  }

  cacheAPIResponse(endpoint: string, params: any, response: any): void {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    this.set(key, response);
  }

  getAPIResponse(endpoint: string, params: any): any | null {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.get(key);
  }
}

// Gerenciador central de cache
export class CacheManager {
  private static instance: CacheManager;
  
  public dataTypeCache: DataTypeCache;
  public validationCache: ValidationCache;
  public apiCache: APICache;
  public generalCache: MemoryCache;

  private constructor() {
    this.dataTypeCache = new DataTypeCache();
    this.validationCache = new ValidationCache();
    this.apiCache = new APICache();
    this.generalCache = new MemoryCache();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Obter estatísticas de todos os caches
  getAllStats(): Record<string, CacheStats> {
    return {
      dataType: this.dataTypeCache.getStats(),
      validation: this.validationCache.getStats(),
      api: this.apiCache.getStats(),
      general: this.generalCache.getStats(),
    };
  }

  // Limpar todos os caches
  clearAll(): void {
    this.dataTypeCache.clear();
    this.validationCache.clear();
    this.apiCache.clear();
    this.generalCache.clear();
  }

  // Obter cache por tipo
  getCache(type: 'dataType' | 'validation' | 'api' | 'general'): MemoryCache {
    switch (type) {
      case 'dataType':
        return this.dataTypeCache;
      case 'validation':
        return this.validationCache;
      case 'api':
        return this.apiCache;
      case 'general':
      default:
        return this.generalCache;
    }
  }
}

// Instância singleton
export const cacheManager = CacheManager.getInstance();

// Decorador para cache automático
export function cached(
  cacheType: 'dataType' | 'validation' | 'api' | 'general' = 'general',
  ttl?: number,
  keyGenerator?: (...args: any[]) => string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = cacheManager.getCache(cacheType);
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

export default cacheManager;