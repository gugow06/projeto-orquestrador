/**
 * Sistema avançado de inferência de tipos de dados
 * Especializado em padrões brasileiros (CPF, CNPJ, etc.)
 */

export interface TypeInferenceResult {
  type: DataType;
  confidence: number;
  pattern?: string;
  format?: string;
  validation?: ValidationRule;
  suggestions?: string[];
}

export type DataType = 
  | 'cpf'
  | 'cnpj' 
  | 'rg'
  | 'cep'
  | 'telefone'
  | 'celular'
  | 'email'
  | 'url'
  | 'data_brasileira'
  | 'data_iso'
  | 'datetime'
  | 'hora'
  | 'moeda_real'
  | 'numero_decimal'
  | 'numero_inteiro'
  | 'percentual'
  | 'codigo_banco'
  | 'agencia'
  | 'conta_corrente'
  | 'pix_key'
  | 'transaction_id'
  | 'uuid'
  | 'boolean_ptbr'
  | 'boolean_en'
  | 'enum'
  | 'texto_livre'
  | 'codigo_produto'
  | 'placa_veiculo';

export interface ValidationRule {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
  errorMessage?: string;
}

export class DataTypeInference {
  private static readonly TYPE_PATTERNS: Record<DataType, RegExp> = {
    // Documentos brasileiros
    cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
    cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/,
    rg: /^\d{1,2}\.\d{3}\.\d{3}-[\dX]$|^\d{7,9}$/,
    cep: /^\d{5}-\d{3}$|^\d{8}$/,
    
    // Contatos
    telefone: /^\(?\d{2}\)?\s?\d{4}-?\d{4}$/,
    celular: /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    
    // Datas e horários
    data_brasileira: /^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{1,2}-\d{1,2}-\d{4}$/,
    data_iso: /^\d{4}-\d{2}-\d{2}$/,
    datetime: /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}(:\d{2})?$/,
    hora: /^\d{1,2}:\d{2}(:\d{2})?$/,
    
    // Valores monetários e numéricos
    moeda_real: /^R?\$?\s?-?\d{1,3}(\.\d{3})*(,\d{2})?$|^-?\d+[.,]\d{2}$/,
    numero_decimal: /^-?\d+[.,]\d+$/,
    numero_inteiro: /^-?\d+$/,
    percentual: /^\d+([.,]\d+)?%$/,
    
    // Dados bancários
    codigo_banco: /^\d{3}$/,
    agencia: /^\d{4}-?\d?$/,
    conta_corrente: /^\d{5,}-?\d$/,
    pix_key: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^\d{11}$|^\d{14}$|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    
    // IDs e códigos
    transaction_id: /^TX-\d{8}-\d{4}$|^[A-Z]{2,4}-\d+$/,
    uuid: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    codigo_produto: /^[A-Z0-9]{3,}-?[A-Z0-9]*$/,
    
    // Booleanos
    boolean_ptbr: /^(sim|não|s|n|verdadeiro|falso|ativo|inativo)$/i,
    boolean_en: /^(true|false|yes|no|y|n|1|0)$/i,
    
    // Outros
    placa_veiculo: /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/,
    enum: /^[A-Z_]+$/,
    texto_livre: /.*/
  };

  private static readonly TYPE_KEYWORDS: Record<string, DataType[]> = {
    'cpf': ['cpf'],
    'cnpj': ['cnpj'],
    'rg': ['rg', 'identidade'],
    'cep': ['cep', 'codigo_postal'],
    'telefone': ['telefone', 'fone', 'phone'],
    'celular': ['celular', 'mobile', 'cell'],
    'email': ['email', 'e-mail', 'mail'],
    'data': ['data', 'date', 'dt'],
    'hora': ['hora', 'time', 'hr'],
    'valor': ['valor', 'preco', 'price', 'vlr'],
    'moeda': ['moeda', 'currency', 'real', 'dinheiro'],
    'banco': ['banco', 'bank'],
    'agencia': ['agencia', 'agency'],
    'conta': ['conta', 'account'],
    'transacao': ['transacao', 'transaction', 'tx'],
    'id': ['id', 'codigo', 'code'],
    'status': ['status', 'situacao'],
    'tipo': ['tipo', 'type', 'categoria'],
    'descricao': ['descricao', 'description', 'desc'],
    'nome': ['nome', 'name'],
    'endereco': ['endereco', 'address'],
    'placa': ['placa', 'plate']
  };

  /**
   * Infere o tipo de dados baseado em amostras
   */
  static inferType(samples: string[], columnName?: string): TypeInferenceResult {
    if (!samples || samples.length === 0) {
      return {
        type: 'texto_livre',
        confidence: 0,
        suggestions: ['Adicione dados para análise automática']
      };
    }

    const cleanSamples = samples.filter(s => s && s.trim()).map(s => s.trim());
    if (cleanSamples.length === 0) {
      return {
        type: 'texto_livre',
        confidence: 0,
        suggestions: ['Coluna contém apenas valores vazios']
      };
    }

    // Análise por nome da coluna
    const nameBasedType = this.inferByColumnName(columnName);
    
    // Análise por padrão dos dados
    const patternBasedTypes = this.inferByPattern(cleanSamples);
    
    // Combina resultados
    const finalResult = this.combineInferences(nameBasedType, patternBasedTypes, cleanSamples);
    
    // Adiciona validação e formatação
    finalResult.validation = this.createValidationRule(finalResult.type);
    finalResult.format = this.getFormatExample(finalResult.type);
    finalResult.suggestions = this.generateSuggestions(finalResult.type, cleanSamples);
    
    return finalResult;
  }

  /**
   * Infere tipo baseado no nome da coluna
   */
  private static inferByColumnName(columnName?: string): DataType[] {
    if (!columnName) return [];
    
    const name = columnName.toLowerCase().replace(/[_-]/g, '');
    const possibleTypes: DataType[] = [];
    
    for (const [keyword, types] of Object.entries(this.TYPE_KEYWORDS)) {
      if (name.includes(keyword)) {
        possibleTypes.push(...types);
      }
    }
    
    return possibleTypes;
  }

  /**
   * Infere tipo baseado nos padrões dos dados
   */
  private static inferByPattern(samples: string[]): Array<{type: DataType, confidence: number}> {
    const results: Array<{type: DataType, confidence: number}> = [];
    
    for (const [type, pattern] of Object.entries(this.TYPE_PATTERNS)) {
      const matches = samples.filter(sample => pattern.test(sample)).length;
      const confidence = matches / samples.length;
      
      if (confidence > 0.1) { // Pelo menos 10% de match
        results.push({ type: type as DataType, confidence });
      }
    }
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Combina inferências de nome e padrão
   */
  private static combineInferences(
    nameTypes: DataType[], 
    patternTypes: Array<{type: DataType, confidence: number}>,
    samples: string[]
  ): TypeInferenceResult {
    
    // Se há match perfeito entre nome e padrão
    for (const nameType of nameTypes) {
      const patternMatch = patternTypes.find(p => p.type === nameType);
      if (patternMatch && patternMatch.confidence > 0.8) {
        return {
          type: nameType,
          confidence: Math.min(0.95, patternMatch.confidence + 0.1),
          pattern: this.TYPE_PATTERNS[nameType].source
        };
      }
    }
    
    // Se há padrão com alta confiança
    if (patternTypes.length > 0 && patternTypes[0].confidence > 0.7) {
      return {
        type: patternTypes[0].type,
        confidence: patternTypes[0].confidence,
        pattern: this.TYPE_PATTERNS[patternTypes[0].type].source
      };
    }
    
    // Análise especial para enums
    const uniqueValues = new Set(samples);
    if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
      const allUpperCase = Array.from(uniqueValues).every(v => v === v.toUpperCase());
      if (allUpperCase) {
        return {
          type: 'enum',
          confidence: 0.8,
          suggestions: [`Valores possíveis: ${Array.from(uniqueValues).join(', ')}`]
        };
      }
    }
    
    // Fallback para texto livre
    return {
      type: 'texto_livre',
      confidence: 0.5,
      suggestions: ['Tipo não identificado automaticamente']
    };
  }

  /**
   * Cria regra de validação para o tipo
   */
  private static createValidationRule(type: DataType): ValidationRule {
    const rules: Record<DataType, ValidationRule> = {
      cpf: {
        required: true,
        pattern: this.TYPE_PATTERNS.cpf,
        customValidator: this.validateCPF,
        errorMessage: 'CPF inválido'
      },
      cnpj: {
        required: true,
        pattern: this.TYPE_PATTERNS.cnpj,
        customValidator: this.validateCNPJ,
        errorMessage: 'CNPJ inválido'
      },
      email: {
        required: true,
        pattern: this.TYPE_PATTERNS.email,
        errorMessage: 'Email inválido'
      },
      cep: {
        required: true,
        pattern: this.TYPE_PATTERNS.cep,
        errorMessage: 'CEP inválido'
      },
      telefone: {
        required: false,
        pattern: this.TYPE_PATTERNS.telefone,
        errorMessage: 'Telefone inválido'
      },
      moeda_real: {
        required: false,
        pattern: this.TYPE_PATTERNS.moeda_real,
        errorMessage: 'Valor monetário inválido'
      },
      data_brasileira: {
        required: false,
        pattern: this.TYPE_PATTERNS.data_brasileira,
        errorMessage: 'Data inválida (use DD/MM/AAAA)'
      },
      data_iso: {
        required: false,
        pattern: this.TYPE_PATTERNS.data_iso,
        errorMessage: 'Data inválida (use AAAA-MM-DD)'
      }
    } as Record<DataType, ValidationRule>;
    
    return rules[type] || { required: false };
  }

  /**
   * Retorna exemplo de formato para o tipo
   */
  private static getFormatExample(type: DataType): string {
    const examples: Record<DataType, string> = {
      cpf: '123.456.789-00',
      cnpj: '12.345.678/0001-00',
      rg: '12.345.678-9',
      cep: '12345-678',
      telefone: '(11) 1234-5678',
      celular: '(11) 91234-5678',
      email: 'usuario@exemplo.com',
      data_brasileira: 'DD/MM/AAAA',
      data_iso: 'AAAA-MM-DD',
      datetime: 'AAAA-MM-DD HH:MM:SS',
      hora: 'HH:MM:SS',
      moeda_real: 'R$ 1.234,56',
      numero_decimal: '123,45',
      numero_inteiro: '123',
      percentual: '12,5%',
      transaction_id: 'TX-20250101-1234',
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      boolean_ptbr: 'Sim/Não',
      boolean_en: 'true/false',
      placa_veiculo: 'ABC-1234'
    } as Record<DataType, string>;
    
    return examples[type] || 'Texto livre';
  }

  /**
   * Gera sugestões baseadas no tipo identificado
   */
  private static generateSuggestions(type: DataType, samples: string[]): string[] {
    const suggestions: string[] = [];
    
    switch (type) {
      case 'cpf':
        suggestions.push('Validação automática de CPF ativada');
        suggestions.push('Formato aceito: 123.456.789-00 ou 12345678900');
        break;
      case 'cnpj':
        suggestions.push('Validação automática de CNPJ ativada');
        suggestions.push('Formato aceito: 12.345.678/0001-00 ou 12345678000100');
        break;
      case 'moeda_real':
        suggestions.push('Conversão automática para formato numérico');
        suggestions.push('Aceita: R$ 1.234,56 ou 1234.56');
        break;
      case 'data_brasileira':
        suggestions.push('Conversão automática para formato ISO');
        suggestions.push('Aceita: DD/MM/AAAA ou DD-MM-AAAA');
        break;
      case 'enum':
        const uniqueValues = Array.from(new Set(samples));
        suggestions.push(`Valores detectados: ${uniqueValues.join(', ')}`);
        suggestions.push('Validação automática de valores permitidos');
        break;
      default:
        suggestions.push('Processamento como texto livre');
    }
    
    return suggestions;
  }

  /**
   * Valida CPF usando algoritmo oficial
   */
  private static validateCPF(cpf: string): boolean {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    // Calcula primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    // Calcula segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2;
  }

  /**
   * Valida CNPJ usando algoritmo oficial
   */
  private static validateCNPJ(cnpj: string): boolean {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(numbers)) return false;
    
    // Calcula primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * weights1[i];
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    // Calcula segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers[i]) * weights2[i];
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
  }
}