/**
 * Detector automático de estrutura CSV
 * Identifica delimitadores, encoding, headers e características dos dados
 */

export interface CSVStructure {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
  lineCount: number;
  columnCount: number;
  headers: string[];
  sampleData: string[][];
  confidence: number;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'cpf' | 'cnpj' | 'email' | 'phone' | 'currency' | 'id';
  pattern?: string;
  nullable: boolean;
  unique: boolean;
  samples: string[];
  confidence: number;
}

export class CSVDetector {
  private static readonly COMMON_DELIMITERS = [',', ';', '\t', '|', ':'];
  private static readonly ENCODING_PATTERNS = {
    'UTF-8': /[\u00C0-\u017F]/,
    'ISO-8859-1': /[\xC0-\xFF]/,
    'ASCII': /^[\x00-\x7F]*$/
  };

  /**
   * Detecta automaticamente a estrutura do CSV
   */
  static async detectStructure(content: string): Promise<CSVStructure> {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
    }

    // Detecta delimitador
    const delimiter = this.detectDelimiter(lines);
    
    // Detecta se tem header
    const hasHeader = this.detectHeader(lines, delimiter);
    
    // Detecta encoding
    const encoding = this.detectEncoding(content);
    
    // Parse das linhas
    const parsedLines = lines.map(line => this.parseLine(line, delimiter));
    const headers = hasHeader ? parsedLines[0] : this.generateHeaders(parsedLines[0].length);
    const dataRows = hasHeader ? parsedLines.slice(1) : parsedLines;
    
    // Calcula confiança
    const confidence = this.calculateConfidence(parsedLines, delimiter);

    return {
      delimiter,
      hasHeader,
      encoding,
      lineCount: lines.length,
      columnCount: headers.length,
      headers,
      sampleData: dataRows.slice(0, 10), // Primeiras 10 linhas como amostra
      confidence
    };
  }

  /**
   * Detecta o delimitador mais provável
   */
  private static detectDelimiter(lines: string[]): string {
    const scores: Record<string, number> = {};
    
    for (const delimiter of this.COMMON_DELIMITERS) {
      let totalColumns = 0;
      let consistentLines = 0;
      let firstLineColumns = 0;
      
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const columns = this.parseLine(lines[i], delimiter).length;
        
        if (i === 0) {
          firstLineColumns = columns;
        }
        
        if (columns === firstLineColumns && columns > 1) {
          consistentLines++;
        }
        
        totalColumns += columns;
      }
      
      // Score baseado na consistência e número de colunas
      scores[delimiter] = (consistentLines / Math.min(lines.length, 10)) * 
                         Math.min(firstLineColumns, 10) / 10;
    }
    
    return Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
  }

  /**
   * Detecta se a primeira linha é um header
   */
  private static detectHeader(lines: string[], delimiter: string): boolean {
    if (lines.length < 2) return true;
    
    const firstRow = this.parseLine(lines[0], delimiter);
    const secondRow = this.parseLine(lines[1], delimiter);
    
    if (firstRow.length !== secondRow.length) return false;
    
    let headerScore = 0;
    
    for (let i = 0; i < firstRow.length; i++) {
      const firstValue = firstRow[i].trim();
      const secondValue = secondRow[i].trim();
      
      // Headers geralmente são strings sem números
      if (isNaN(Number(firstValue)) && !isNaN(Number(secondValue))) {
        headerScore++;
      }
      
      // Headers não têm caracteres especiais de dados
      if (!firstValue.includes('.') && !firstValue.includes('-') && 
          (secondValue.includes('.') || secondValue.includes('-'))) {
        headerScore++;
      }
      
      // Headers são mais descritivos
      if (firstValue.length > 3 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(firstValue)) {
        headerScore++;
      }
    }
    
    return headerScore >= firstRow.length * 0.6;
  }

  /**
   * Detecta o encoding do arquivo
   */
  private static detectEncoding(content: string): string {
    for (const [encoding, pattern] of Object.entries(this.ENCODING_PATTERNS)) {
      if (pattern.test(content)) {
        return encoding;
      }
    }
    return 'UTF-8';
  }

  /**
   * Faz parse de uma linha CSV
   */
  private static parseLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Gera headers automáticos quando não detectados
   */
  private static generateHeaders(columnCount: number): string[] {
    return Array.from({ length: columnCount }, (_, i) => `column_${i + 1}`);
  }

  /**
   * Calcula a confiança da detecção
   */
  private static calculateConfidence(parsedLines: string[][], delimiter: string): number {
    if (parsedLines.length === 0) return 0;
    
    const expectedColumns = parsedLines[0].length;
    let consistentRows = 0;
    
    for (const row of parsedLines) {
      if (row.length === expectedColumns) {
        consistentRows++;
      }
    }
    
    return consistentRows / parsedLines.length;
  }

  /**
   * Analisa os tipos de dados das colunas
   */
  static analyzeColumns(structure: CSVStructure): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    
    for (let colIndex = 0; colIndex < structure.columnCount; colIndex++) {
      const columnName = structure.headers[colIndex];
      const values = structure.sampleData.map(row => row[colIndex]).filter(v => v && v.trim());
      
      const columnInfo: ColumnInfo = {
        name: columnName,
        type: this.inferColumnType(values, columnName),
        nullable: values.length < structure.sampleData.length,
        unique: new Set(values).size === values.length,
        samples: values.slice(0, 5),
        confidence: 0
      };
      
      columnInfo.confidence = this.calculateTypeConfidence(values, columnInfo.type);
      columns.push(columnInfo);
    }
    
    return columns;
  }

  /**
   * Infere o tipo de dados de uma coluna
   */
  private static inferColumnType(values: string[], columnName: string): ColumnInfo['type'] {
    if (values.length === 0) return 'string';
    
    const name = columnName.toLowerCase();
    
    // Detecta por nome da coluna
    if (name.includes('cpf')) return 'cpf';
    if (name.includes('cnpj')) return 'cnpj';
    if (name.includes('email')) return 'email';
    if (name.includes('telefone') || name.includes('phone')) return 'phone';
    if (name.includes('data') || name.includes('date')) return 'date';
    if (name.includes('valor') || name.includes('preco') || name.includes('price')) return 'currency';
    if (name.includes('id') || name.includes('codigo')) return 'id';
    
    // Detecta por padrão dos dados
    const patterns = {
      cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
      date: /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/,
      currency: /^-?\d+[.,]\d{2}$/,
      number: /^-?\d+([.,]\d+)?$/,
      boolean: /^(true|false|sim|não|s|n|0|1)$/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = values.filter(v => pattern.test(v.trim())).length;
      if (matches / values.length > 0.8) {
        return type as ColumnInfo['type'];
      }
    }
    
    return 'string';
  }

  /**
   * Calcula a confiança do tipo inferido
   */
  private static calculateTypeConfidence(values: string[], type: ColumnInfo['type']): number {
    if (values.length === 0) return 0;
    
    const patterns = {
      cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
      date: /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/,
      currency: /^-?\d+[.,]\d{2}$/,
      number: /^-?\d+([.,]\d+)?$/,
      boolean: /^(true|false|sim|não|s|n|0|1)$/i,
      id: /^[A-Z]{2}-\d+|\d+$/,
      string: /.*/
    };
    
    const pattern = patterns[type];
    if (!pattern) return 0.5;
    
    const matches = values.filter(v => pattern.test(v.trim())).length;
    return matches / values.length;
  }
}