// Sistema de compressão de assets para otimização de performance

import { gzip, deflate, brotliCompress } from 'zlib';
import { promisify } from 'util';
import { readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, dirname, extname, basename } from 'path';
import { existsSync } from 'fs';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);
const brotliAsync = promisify(brotliCompress);

export interface CompressionConfig {
  level: number; // 1-9 para gzip/deflate, 1-11 para brotli
  threshold: number; // Tamanho mínimo em bytes para comprimir
  extensions: string[]; // Extensões de arquivo para comprimir
  outputDir: string; // Diretório de saída
  algorithms: CompressionAlgorithm[];
}

export type CompressionAlgorithm = 'gzip' | 'deflate' | 'brotli';

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: CompressionAlgorithm;
  outputPath: string;
  processingTime: number;
}

export interface CompressionStats {
  totalFiles: number;
  compressedFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  processingTime: number;
  errors: string[];
}

// Classe principal para compressão de assets
export class AssetCompressor {
  private config: CompressionConfig;
  private stats: CompressionStats;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
      extensions: ['.js', '.css', '.html', '.json', '.svg', '.txt', '.xml'],
      outputDir: process.env.COMPRESSION_OUTPUT_DIR || './compressed',
      algorithms: ['gzip', 'brotli'],
      ...config,
    };

    this.stats = {
      totalFiles: 0,
      compressedFiles: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      processingTime: 0,
      errors: [],
    };
  }

  // Comprimir um único arquivo
  async compressFile(
    inputPath: string,
    algorithm: CompressionAlgorithm = 'gzip'
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      // Verificar se o arquivo existe
      const fileStats = await stat(inputPath);
      
      // Verificar se atende ao threshold
      if (fileStats.size < this.config.threshold) {
        throw new Error(`File size ${fileStats.size} bytes is below threshold ${this.config.threshold}`);
      }

      // Verificar extensão
      const ext = extname(inputPath).toLowerCase();
      if (!this.config.extensions.includes(ext)) {
        throw new Error(`Extension ${ext} is not in allowed extensions`);
      }

      // Ler arquivo
      const data = await readFile(inputPath);
      
      // Comprimir
      const compressed = await this.compress(data, algorithm);
      
      // Gerar caminho de saída
      const outputPath = this.generateOutputPath(inputPath, algorithm);
      
      // Criar diretório se não existir
      await this.ensureDirectory(dirname(outputPath));
      
      // Salvar arquivo comprimido
      await writeFile(outputPath, compressed);
      
      const processingTime = Date.now() - startTime;
      const compressionRatio = compressed.length / data.length;
      
      return {
        originalSize: data.length,
        compressedSize: compressed.length,
        compressionRatio,
        algorithm,
        outputPath,
        processingTime,
      };
    } catch (error) {
      throw new Error(`Failed to compress ${inputPath}: ${error.message}`);
    }
  }

  // Comprimir múltiplos arquivos
  async compressFiles(inputPaths: string[]): Promise<CompressionStats> {
    const startTime = Date.now();
    this.resetStats();
    
    this.stats.totalFiles = inputPaths.length;
    
    for (const inputPath of inputPaths) {
      try {
        for (const algorithm of this.config.algorithms) {
          const result = await this.compressFile(inputPath, algorithm);
          
          this.stats.compressedFiles++;
          this.stats.totalOriginalSize += result.originalSize;
          this.stats.totalCompressedSize += result.compressedSize;
        }
      } catch (error) {
        this.stats.errors.push(`${inputPath}: ${error.message}`);
      }
    }
    
    this.stats.processingTime = Date.now() - startTime;
    this.stats.averageCompressionRatio = this.stats.totalOriginalSize > 0 
      ? this.stats.totalCompressedSize / this.stats.totalOriginalSize 
      : 0;
    
    return this.stats;
  }

  // Comprimir diretório recursivamente
  async compressDirectory(inputDir: string): Promise<CompressionStats> {
    const files = await this.findCompressibleFiles(inputDir);
    return this.compressFiles(files);
  }

  // Encontrar arquivos compressíveis em um diretório
  private async findCompressibleFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const { readdir } = await import('fs/promises');
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursão para subdiretórios
          const subFiles = await this.findCompressibleFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (this.config.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.stats.errors.push(`Error reading directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  // Comprimir dados usando algoritmo específico
  private async compress(
    data: Buffer,
    algorithm: CompressionAlgorithm
  ): Promise<Buffer> {
    const options = { level: this.config.level };
    
    switch (algorithm) {
      case 'gzip':
        return gzipAsync(data, options);
      case 'deflate':
        return deflateAsync(data, options);
      case 'brotli':
        return brotliAsync(data, {
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: this.config.level,
          },
        });
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
  }

  // Gerar caminho de saída
  private generateOutputPath(
    inputPath: string,
    algorithm: CompressionAlgorithm
  ): string {
    const ext = this.getCompressionExtension(algorithm);
    const fileName = basename(inputPath);
    return join(this.config.outputDir, `${fileName}${ext}`);
  }

  // Obter extensão para algoritmo de compressão
  private getCompressionExtension(algorithm: CompressionAlgorithm): string {
    switch (algorithm) {
      case 'gzip':
        return '.gz';
      case 'deflate':
        return '.deflate';
      case 'brotli':
        return '.br';
      default:
        return '.compressed';
    }
  }

  // Garantir que o diretório existe
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  // Resetar estatísticas
  private resetStats(): void {
    this.stats = {
      totalFiles: 0,
      compressedFiles: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      processingTime: 0,
      errors: [],
    };
  }

  // Obter estatísticas
  getStats(): CompressionStats {
    return { ...this.stats };
  }

  // Verificar se um arquivo deve ser comprimido
  shouldCompress(filePath: string, fileSize: number): boolean {
    const ext = extname(filePath).toLowerCase();
    return this.config.extensions.includes(ext) && fileSize >= this.config.threshold;
  }
}

// Middleware para compressão automática de respostas
export class ResponseCompressor {
  private static supportedEncodings = ['gzip', 'deflate', 'br'];
  
  static getAcceptedEncoding(acceptEncoding: string): CompressionAlgorithm | null {
    if (!acceptEncoding) return null;
    
    const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());
    
    // Priorizar brotli, depois gzip, depois deflate
    if (encodings.includes('br')) return 'brotli';
    if (encodings.includes('gzip')) return 'gzip';
    if (encodings.includes('deflate')) return 'deflate';
    
    return null;
  }
  
  static async compressResponse(
    data: string | Buffer,
    encoding: CompressionAlgorithm
  ): Promise<Buffer> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    const compressor = new AssetCompressor();
    return compressor.compress(buffer, encoding);
  }
  
  static getContentEncoding(algorithm: CompressionAlgorithm): string {
    switch (algorithm) {
      case 'gzip':
        return 'gzip';
      case 'deflate':
        return 'deflate';
      case 'brotli':
        return 'br';
      default:
        return 'identity';
    }
  }
}

// Utilitários para otimização de assets
export class AssetOptimizer {
  private compressor: AssetCompressor;
  
  constructor(config?: Partial<CompressionConfig>) {
    this.compressor = new AssetCompressor(config);
  }
  
  // Otimizar assets do Next.js
  async optimizeNextAssets(buildDir: string = '.next'): Promise<CompressionStats> {
    const staticDir = join(buildDir, 'static');
    return this.compressor.compressDirectory(staticDir);
  }
  
  // Otimizar assets públicos
  async optimizePublicAssets(publicDir: string = 'public'): Promise<CompressionStats> {
    return this.compressor.compressDirectory(publicDir);
  }
  
  // Gerar relatório de otimização
  generateOptimizationReport(stats: CompressionStats): string {
    const savings = stats.totalOriginalSize - stats.totalCompressedSize;
    const savingsPercent = ((savings / stats.totalOriginalSize) * 100).toFixed(2);
    
    return `
=== Asset Optimization Report ===
Total Files: ${stats.totalFiles}
Compressed Files: ${stats.compressedFiles}
Original Size: ${this.formatBytes(stats.totalOriginalSize)}
Compressed Size: ${this.formatBytes(stats.totalCompressedSize)}
Space Saved: ${this.formatBytes(savings)} (${savingsPercent}%)
Average Compression Ratio: ${(stats.averageCompressionRatio * 100).toFixed(2)}%
Processing Time: ${stats.processingTime}ms
Errors: ${stats.errors.length}
${stats.errors.length > 0 ? '\nErrors:\n' + stats.errors.join('\n') : ''}
`;
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Instâncias padrão
export const assetCompressor = new AssetCompressor();
export const assetOptimizer = new AssetOptimizer();

export default AssetCompressor;