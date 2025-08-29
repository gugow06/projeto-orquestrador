import { z } from 'zod';

// Schemas de validação para diferentes tipos de entrada
export const fileUploadSchema = z.object({
  file: z.object({
    name: z.string().min(1).max(255).regex(/^[^<>:"/\\|?*]+$/),
    size: z.number().min(1).max(parseInt(process.env.MAX_FILE_SIZE || '10485760')),
    type: z.string().refine(
      (type) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'text/csv').split(',');
        return allowedTypes.includes(type);
      },
      { message: 'Tipo de arquivo não permitido' }
    )
  }),
  options: z.object({
    delimiter: z.string().max(1).optional(),
    encoding: z.enum(['utf-8', 'latin1', 'ascii']).default('utf-8'),
    hasHeader: z.boolean().default(true)
  }).optional()
});

export const databaseConnectionSchema = z.object({
  connectionString: z.string()
    .min(10)
    .max(1000)
    .regex(/^(postgresql|mysql|sqlite|sqlserver):\/\//i, 'String de conexão inválida'),
  tableName: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Nome de tabela deve começar com letra e conter apenas letras, números e underscore')
});

export const apiKeySchema = z.object({
  key: z.string().min(10).max(500),
  provider: z.enum(['gemini', 'groq', 'openai'])
});

export const csvDataSchema = z.object({
  headers: z.array(z.string().min(1).max(100)).min(1).max(100),
  rows: z.array(z.array(z.string().max(10000))).min(1).max(10000),
  metadata: z.object({
    totalRows: z.number().min(0).max(1000000),
    totalColumns: z.number().min(1).max(100),
    fileSize: z.number().min(0)
  })
});

export const feedbackSchema = z.object({
  fieldName: z.string().min(1).max(100),
  suggestedType: z.enum(['texto_livre', 'numero', 'data', 'email', 'telefone', 'cpf', 'cnpj', 'cep', 'url', 'enum']),
  isCorrect: z.boolean(),
  correctType: z.enum(['texto_livre', 'numero', 'data', 'email', 'telefone', 'cpf', 'cnpj', 'cep', 'url', 'enum']).optional(),
  confidence: z.number().min(0).max(1)
});

// Funções de sanitização
export class InputSanitizer {
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input deve ser uma string');
    }
    
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>"'&]/g, (char) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      });
  }

  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 255);
  }

  static sanitizeTableName(tableName: string): string {
    return tableName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9_]+/, '')
      .replace(/_{2,}/g, '_')
      .slice(0, 64);
  }

  static sanitizeConnectionString(connectionString: string): string {
    // Remove espaços e caracteres de controle
    return connectionString
      .trim()
      .replace(/[\r\n\t]/g, '')
      .slice(0, 1000);
  }

  static validateAndSanitizeCSVData(data: any): any {
    if (!Array.isArray(data)) {
      throw new Error('Dados CSV devem ser um array');
    }

    return data.map((row, rowIndex) => {
      if (!Array.isArray(row)) {
        throw new Error(`Linha ${rowIndex} deve ser um array`);
      }
      
      return row.map((cell, cellIndex) => {
        if (typeof cell !== 'string' && typeof cell !== 'number') {
          return String(cell || '');
        }
        
        const cellStr = String(cell);
        if (cellStr.length > 10000) {
          throw new Error(`Célula [${rowIndex}][${cellIndex}] excede o tamanho máximo`);
        }
        
        return this.sanitizeString(cellStr, 10000);
      });
    });
  }
}

// Validador principal
export class InputValidator {
  static async validateFileUpload(data: any) {
    try {
      const result = fileUploadSchema.parse(data);
      return { success: true, data: result, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      throw error;
    }
  }

  static async validateDatabaseConnection(data: any) {
    try {
      // Sanitizar antes de validar
      if (data.connectionString) {
        data.connectionString = InputSanitizer.sanitizeConnectionString(data.connectionString);
      }
      if (data.tableName) {
        data.tableName = InputSanitizer.sanitizeTableName(data.tableName);
      }

      const result = databaseConnectionSchema.parse(data);
      return { success: true, data: result, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      throw error;
    }
  }

  static async validateCSVData(data: any) {
    try {
      // Sanitizar dados CSV
      if (data.rows) {
        data.rows = InputSanitizer.validateAndSanitizeCSVData(data.rows);
      }
      if (data.headers) {
        data.headers = data.headers.map((header: any) => 
          InputSanitizer.sanitizeString(String(header), 100)
        );
      }

      const result = csvDataSchema.parse(data);
      return { success: true, data: result, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      throw error;
    }
  }

  static async validateFeedback(data: any) {
    try {
      const result = feedbackSchema.parse(data);
      return { success: true, data: result, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      throw error;
    }
  }

  // Validação de segurança adicional
  static validateRequestSize(contentLength: number): boolean {
    const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || '50000000'); // 50MB
    return contentLength <= maxSize;
  }

  static validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
    if (!origin) return false;
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  static validateContentType(contentType: string | null, allowedTypes: string[]): boolean {
    if (!contentType) return false;
    return allowedTypes.some(type => contentType.includes(type));
  }
}

export default InputValidator;