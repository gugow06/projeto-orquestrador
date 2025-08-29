/**
 * Gerador automático de esquemas JSON baseado na análise dos dados
 * Cria estruturas padronizadas e validações para diferentes domínios
 */

import { DataType } from './data-type-inference';
import { DomainType, DomainAnalysisResult } from './domain-analyzer';
import { ValidationResult } from './data-validator';
import { FieldMapping } from '../components/adaptive-interface';

export interface JSONSchema {
  $schema: string;
  type: string;
  title: string;
  description: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: boolean;
  metadata: SchemaMetadata;
}

export interface SchemaProperty {
  type: string | string[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  description: string;
  examples?: any[];
  validation?: ValidationRule[];
  transformation?: TransformationHint;
}

export interface ValidationRule {
  type: 'format' | 'range' | 'pattern' | 'custom';
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface TransformationHint {
  operation: string;
  parameters: Record<string, any>;
  description: string;
}

export interface SchemaMetadata {
  version: string;
  createdAt: string;
  domain: DomainType;
  confidence: number;
  sourceFields: string[];
  generatedBy: string;
  statistics: SchemaStatistics;
}

export interface SchemaStatistics {
  totalFields: number;
  requiredFields: number;
  optionalFields: number;
  validationRules: number;
  transformations: number;
}

export interface SchemaGenerationConfig {
  strictMode: boolean;
  includeExamples: boolean;
  includeValidation: boolean;
  includeTransformations: boolean;
  maxExamples: number;
  customTemplates: Record<DomainType, Partial<JSONSchema>>;
}

export interface SchemaTemplate {
  domain: DomainType;
  baseSchema: Partial<JSONSchema>;
  fieldMappings: Record<string, SchemaProperty>;
  businessRules: BusinessRule[];
}

export interface BusinessRule {
  name: string;
  description: string;
  condition: string;
  action: string;
  severity: 'error' | 'warning';
}

const DOMAIN_TEMPLATES: Record<DomainType, SchemaTemplate> = {
  financeiro: {
    domain: 'financeiro',
    baseSchema: {
      title: 'Esquema de Dados Financeiros',
      description: 'Estrutura padronizada para dados financeiros e transacionais'
    },
    fieldMappings: {
      cpf: {
        type: 'string',
        pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
        description: 'CPF no formato 123.456.789-00',
        examples: ['123.456.789-00'],
        validation: [{
          type: 'custom',
          rule: 'validateCPF',
          message: 'CPF deve ser válido',
          severity: 'error'
        }]
      },
      cnpj: {
        type: 'string',
        pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$',
        description: 'CNPJ no formato 12.345.678/0001-00',
        examples: ['12.345.678/0001-00']
      },
      valor: {
        type: 'number',
        minimum: -999999999.99,
        maximum: 999999999.99,
        description: 'Valor monetário em reais',
        examples: [1234.56, -500.00]
      },
      data_transacao: {
        type: 'string',
        format: 'date-time',
        description: 'Data e hora da transação',
        examples: ['2025-01-28T10:30:00Z']
      },
      tipo_transacao: {
        type: 'string',
        enum: ['PIX', 'TED', 'DOC', 'DEPOSITO', 'SAQUE', 'TRANSFERENCIA'],
        description: 'Tipo da transação bancária'
      },
      id_transacao: {
        type: 'string',
        pattern: '^TX-\\d{8}-\\d{4}$',
        description: 'Identificador único da transação',
        examples: ['TX-20250128-1234']
      }
    },
    businessRules: [
      {
        name: 'valor_positivo_deposito',
        description: 'Depósitos devem ter valor positivo',
        condition: 'tipo_transacao === "DEPOSITO"',
        action: 'valor > 0',
        severity: 'error'
      },
      {
        name: 'cpf_ou_cnpj_obrigatorio',
        description: 'CPF ou CNPJ deve estar presente',
        condition: 'true',
        action: 'cpf || cnpj',
        severity: 'error'
      }
    ]
  },
  cadastral: {
    domain: 'cadastral',
    baseSchema: {
      title: 'Esquema de Dados Cadastrais',
      description: 'Estrutura padronizada para informações pessoais e de contato'
    },
    fieldMappings: {
      nome_completo: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Nome completo da pessoa',
        examples: ['João Silva Santos']
      },
      cpf: {
        type: 'string',
        pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
        description: 'CPF no formato 123.456.789-00'
      },
      rg: {
        type: 'string',
        pattern: '^\\d{1,2}\\.\\d{3}\\.\\d{3}-[\\dX]$',
        description: 'RG no formato 12.345.678-9'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Endereço de email válido',
        examples: ['usuario@exemplo.com']
      },
      telefone: {
        type: 'string',
        pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
        description: 'Telefone no formato (11) 99999-9999'
      },
      data_nascimento: {
        type: 'string',
        format: 'date',
        description: 'Data de nascimento',
        examples: ['1990-01-15']
      },
      endereco: {
        type: 'object',
        properties: {
          logradouro: { type: 'string', description: 'Rua, avenida, etc.' },
          numero: { type: 'string', description: 'Número do imóvel' },
          complemento: { type: 'string', description: 'Apartamento, sala, etc.' },
          bairro: { type: 'string', description: 'Bairro' },
          cidade: { type: 'string', description: 'Cidade' },
          estado: { type: 'string', description: 'Estado (UF)' },
          cep: { type: 'string', pattern: '^\\d{5}-\\d{3}$', description: 'CEP' }
        },
        description: 'Endereço completo'
      }
    },
    businessRules: [
      {
        name: 'idade_minima',
        description: 'Pessoa deve ter pelo menos 18 anos',
        condition: 'data_nascimento',
        action: 'age >= 18',
        severity: 'warning'
      }
    ]
  },
  transacional: {
    domain: 'transacional',
    baseSchema: {
      title: 'Esquema de Dados Transacionais',
      description: 'Estrutura para histórico de operações e movimentações'
    },
    fieldMappings: {
      id_transacao: {
        type: 'string',
        description: 'Identificador único da transação'
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Data e hora da operação'
      },
      valor: {
        type: 'number',
        description: 'Valor da operação'
      },
      status: {
        type: 'string',
        enum: ['PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'CANCELADA', 'ERRO'],
        description: 'Status da transação'
      },
      origem: {
        type: 'string',
        description: 'Sistema ou canal de origem'
      },
      destino: {
        type: 'string',
        description: 'Sistema ou conta de destino'
      }
    },
    businessRules: []
  },
  ecommerce: {
    domain: 'ecommerce',
    baseSchema: {
      title: 'Esquema de Dados de E-commerce',
      description: 'Estrutura para produtos, vendas e informações comerciais'
    },
    fieldMappings: {
      produto_id: {
        type: 'string',
        description: 'Identificador único do produto'
      },
      nome_produto: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Nome do produto'
      },
      preco: {
        type: 'number',
        minimum: 0,
        description: 'Preço do produto em reais'
      },
      categoria: {
        type: 'string',
        description: 'Categoria do produto'
      },
      estoque: {
        type: 'integer',
        minimum: 0,
        description: 'Quantidade em estoque'
      },
      ativo: {
        type: 'boolean',
        description: 'Se o produto está ativo para venda'
      }
    },
    businessRules: [
      {
        name: 'preco_positivo',
        description: 'Preço deve ser positivo',
        condition: 'true',
        action: 'preco > 0',
        severity: 'error'
      }
    ]
  },
  generico: {
    domain: 'generico',
    baseSchema: {
      title: 'Esquema de Dados Genéricos',
      description: 'Estrutura flexível para dados diversos'
    },
    fieldMappings: {
      id: {
        type: 'string',
        description: 'Identificador único'
      },
      nome: {
        type: 'string',
        description: 'Nome ou descrição'
      },
      valor: {
        type: 'number',
        description: 'Valor numérico'
      },
      data: {
        type: 'string',
        format: 'date',
        description: 'Data relevante'
      },
      ativo: {
        type: 'boolean',
        description: 'Status ativo/inativo'
      }
    },
    businessRules: []
  }
};

export class SchemaGenerator {
  private config: SchemaGenerationConfig;

  constructor(config: Partial<SchemaGenerationConfig> = {}) {
    this.config = {
      strictMode: false,
      includeExamples: true,
      includeValidation: true,
      includeTransformations: true,
      maxExamples: 3,
      customTemplates: {},
      ...config
    };
  }

  /**
   * Gera esquema JSON baseado na análise dos dados
   */
  generateSchema(
    data: any[],
    domainAnalysis: DomainAnalysisResult,
    fieldMappings: FieldMapping[],
    validationResults: ValidationResult[]
  ): JSONSchema {
    const template = this.getTemplate(domainAnalysis.domain);
    const properties = this.generateProperties(data, domainAnalysis, fieldMappings, template);
    const required = this.determineRequiredFields(data, fieldMappings, template);
    
    const schema: JSONSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      title: template.baseSchema.title || 'Esquema de Dados',
      description: template.baseSchema.description || 'Esquema gerado automaticamente',
      properties,
      required,
      additionalProperties: !this.config.strictMode,
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        domain: domainAnalysis.domain,
        confidence: domainAnalysis.confidence,
        sourceFields: Object.keys(data[0] || {}),
        generatedBy: 'Orquestrador de Dados v1.0',
        statistics: this.calculateStatistics(properties, required)
      }
    };

    return this.applyBusinessRules(schema, template.businessRules);
  }

  /**
   * Gera esquema simplificado para preview
   */
  generatePreviewSchema(
    data: any[],
    domainAnalysis: DomainAnalysisResult
  ): Partial<JSONSchema> {
    const template = this.getTemplate(domainAnalysis.domain);
    const sampleData = data.slice(0, 5);
    
    const properties: Record<string, SchemaProperty> = {};
    
    Object.keys(sampleData[0] || {}).forEach(field => {
      const fieldAnalysis = domainAnalysis.fieldAnalysis.find(f => f.fieldName === field);
      const templateProperty = template.fieldMappings[field];
      
      properties[field] = {
        type: this.mapDataTypeToJsonType(fieldAnalysis?.inferredType || 'texto'),
        description: templateProperty?.description || `Campo ${field}`,
        examples: this.extractExamples(sampleData, field)
      };
    });
    
    return {
      type: 'object',
      title: `Preview - ${template.baseSchema.title}`,
      properties,
      metadata: {
        domain: domainAnalysis.domain,
        confidence: domainAnalysis.confidence,
        sourceFields: Object.keys(data[0] || {})
      } as SchemaMetadata
    };
  }

  /**
   * Valida dados contra um esquema
   */
  validateAgainstSchema(data: any[], schema: JSONSchema): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];
    const warnings: SchemaValidationWarning[] = [];
    
    data.forEach((item, index) => {
      // Valida campos obrigatórios
      schema.required.forEach(requiredField => {
        if (!(requiredField in item) || item[requiredField] === null || item[requiredField] === undefined) {
          errors.push({
            row: index,
            field: requiredField,
            type: 'required',
            message: `Campo obrigatório '${requiredField}' está ausente`,
            value: item[requiredField]
          });
        }
      });
      
      // Valida propriedades
      Object.entries(item).forEach(([field, value]) => {
        const property = schema.properties[field];
        if (!property) {
          if (!schema.additionalProperties) {
            warnings.push({
              row: index,
              field,
              type: 'additional_property',
              message: `Campo '${field}' não está definido no esquema`,
              suggestion: 'Considere remover ou adicionar ao esquema'
            });
          }
          return;
        }
        
        const fieldErrors = this.validateFieldValue(value, property, field, index);
        errors.push(...fieldErrors);
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalRows: data.length,
        validRows: data.length - errors.filter(e => e.type === 'required').length,
        errorCount: errors.length,
        warningCount: warnings.length
      }
    };
  }

  /**
   * Exporta esquema em diferentes formatos
   */
  exportSchema(schema: JSONSchema, format: 'json' | 'typescript' | 'documentation'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(schema, null, 2);
      case 'typescript':
        return this.generateTypeScriptInterface(schema);
      case 'documentation':
        return this.generateDocumentation(schema);
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  }

  // Métodos privados

  private getTemplate(domain: DomainType): SchemaTemplate {
    return this.config.customTemplates[domain] ? 
      { ...DOMAIN_TEMPLATES[domain], baseSchema: { ...DOMAIN_TEMPLATES[domain].baseSchema, ...this.config.customTemplates[domain] } } :
      DOMAIN_TEMPLATES[domain] || DOMAIN_TEMPLATES.generico;
  }

  private generateProperties(
    data: any[],
    domainAnalysis: DomainAnalysisResult,
    fieldMappings: FieldMapping[],
    template: SchemaTemplate
  ): Record<string, SchemaProperty> {
    const properties: Record<string, SchemaProperty> = {};
    
    Object.keys(data[0] || {}).forEach(sourceField => {
      const mapping = fieldMappings.find(m => m.sourceField === sourceField);
      const targetField = mapping?.targetField || sourceField;
      const fieldAnalysis = domainAnalysis.fieldAnalysis.find(f => f.fieldName === sourceField);
      const templateProperty = template.fieldMappings[targetField] || template.fieldMappings[sourceField];
      
      const property: SchemaProperty = {
        type: this.mapDataTypeToJsonType(fieldAnalysis?.inferredType || 'texto'),
        description: templateProperty?.description || `Campo ${targetField}`,
        ...(templateProperty || {})
      };
      
      // Adiciona exemplos se configurado
      if (this.config.includeExamples) {
        property.examples = this.extractExamples(data, sourceField);
      }
      
      // Adiciona validações se configurado
      if (this.config.includeValidation && templateProperty?.validation) {
        property.validation = templateProperty.validation;
      }
      
      // Adiciona transformações se configurado
      if (this.config.includeTransformations && mapping?.transformation) {
        property.transformation = {
          operation: mapping.transformation,
          parameters: {},
          description: `Transformação: ${mapping.transformation}`
        };
      }
      
      // Infere constraints baseado nos dados
      this.inferConstraints(property, data, sourceField);
      
      properties[targetField] = property;
    });
    
    return properties;
  }

  private mapDataTypeToJsonType(dataType: DataType): string {
    const typeMap: Record<DataType, string> = {
      'texto': 'string',
      'numero_inteiro': 'integer',
      'numero_decimal': 'number',
      'moeda_real': 'number',
      'percentual': 'number',
      'boolean_ptbr': 'boolean',
      'boolean_en': 'boolean',
      'data_brasileira': 'string',
      'data_iso': 'string',
      'datetime': 'string',
      'cpf': 'string',
      'cnpj': 'string',
      'rg': 'string',
      'cep': 'string',
      'telefone': 'string',
      'celular': 'string',
      'email': 'string',
      'url': 'string',
      'uuid': 'string',
      'transaction_id': 'string',
      'pix_key': 'string',
      'placa_veiculo': 'string'
    };
    
    return typeMap[dataType] || 'string';
  }

  private extractExamples(data: any[], field: string): any[] {
    const values = data
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined && value !== '')
      .slice(0, this.config.maxExamples);
    
    return [...new Set(values)]; // Remove duplicatas
  }

  private inferConstraints(property: SchemaProperty, data: any[], field: string): void {
    const values = data
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined);
    
    if (values.length === 0) return;
    
    // Para strings
    if (property.type === 'string') {
      const lengths = values.map(v => String(v).length);
      property.minLength = Math.min(...lengths);
      property.maxLength = Math.max(...lengths);
    }
    
    // Para números
    if (property.type === 'number' || property.type === 'integer') {
      const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        property.minimum = Math.min(...numbers);
        property.maximum = Math.max(...numbers);
      }
    }
    
    // Para enums (se todos os valores são de um conjunto pequeno)
    const uniqueValues = [...new Set(values)];
    if (uniqueValues.length <= 10 && uniqueValues.length < values.length * 0.5) {
      property.enum = uniqueValues;
    }
  }

  private determineRequiredFields(
    data: any[],
    fieldMappings: FieldMapping[],
    template: SchemaTemplate
  ): string[] {
    const required: string[] = [];
    
    Object.keys(data[0] || {}).forEach(sourceField => {
      const mapping = fieldMappings.find(m => m.sourceField === sourceField);
      const targetField = mapping?.targetField || sourceField;
      
      // Verifica se o campo está presente na maioria dos registros
      const presentCount = data.filter(item => 
        item[sourceField] !== null && 
        item[sourceField] !== undefined && 
        item[sourceField] !== ''
      ).length;
      
      const presenceRate = presentCount / data.length;
      
      // Campo é obrigatório se está presente em mais de 80% dos registros
      // ou se é definido como obrigatório no template
      if (presenceRate > 0.8 || this.isRequiredInTemplate(targetField, template)) {
        required.push(targetField);
      }
    });
    
    return required;
  }

  private isRequiredInTemplate(field: string, template: SchemaTemplate): boolean {
    // Lógica para determinar se um campo é obrigatório baseado no template
    const requiredFields = ['id', 'cpf', 'cnpj', 'nome', 'valor', 'data_transacao'];
    return requiredFields.some(rf => field.toLowerCase().includes(rf));
  }

  private calculateStatistics(
    properties: Record<string, SchemaProperty>,
    required: string[]
  ): SchemaStatistics {
    const totalFields = Object.keys(properties).length;
    const requiredFields = required.length;
    const validationRules = Object.values(properties)
      .reduce((sum, prop) => sum + (prop.validation?.length || 0), 0);
    const transformations = Object.values(properties)
      .filter(prop => prop.transformation).length;
    
    return {
      totalFields,
      requiredFields,
      optionalFields: totalFields - requiredFields,
      validationRules,
      transformations
    };
  }

  private applyBusinessRules(schema: JSONSchema, businessRules: BusinessRule[]): JSONSchema {
    // Adiciona regras de negócio como validações customizadas
    businessRules.forEach(rule => {
      // Implementação simplificada - na prática, seria mais complexa
      if (!schema.metadata) schema.metadata = {} as SchemaMetadata;
      
      // Adiciona as regras aos metadados para referência
      (schema.metadata as any).businessRules = businessRules;
    });
    
    return schema;
  }

  private validateFieldValue(
    value: any,
    property: SchemaProperty,
    field: string,
    row: number
  ): SchemaValidationError[] {
    const errors: SchemaValidationError[] = [];
    
    // Validação de tipo
    if (!this.isValidType(value, property.type)) {
      errors.push({
        row,
        field,
        type: 'type',
        message: `Valor '${value}' não é do tipo ${property.type}`,
        value
      });
    }
    
    // Validação de padrão
    if (property.pattern && typeof value === 'string') {
      const regex = new RegExp(property.pattern);
      if (!regex.test(value)) {
        errors.push({
          row,
          field,
          type: 'pattern',
          message: `Valor '${value}' não atende ao padrão ${property.pattern}`,
          value
        });
      }
    }
    
    // Validação de range
    if (typeof value === 'number') {
      if (property.minimum !== undefined && value < property.minimum) {
        errors.push({
          row,
          field,
          type: 'range',
          message: `Valor ${value} é menor que o mínimo ${property.minimum}`,
          value
        });
      }
      if (property.maximum !== undefined && value > property.maximum) {
        errors.push({
          row,
          field,
          type: 'range',
          message: `Valor ${value} é maior que o máximo ${property.maximum}`,
          value
        });
      }
    }
    
    return errors;
  }

  private isValidType(value: any, type: string | string[]): boolean {
    const types = Array.isArray(type) ? type : [type];
    
    return types.some(t => {
      switch (t) {
        case 'string': return typeof value === 'string';
        case 'number': return typeof value === 'number' && !isNaN(value);
        case 'integer': return Number.isInteger(value);
        case 'boolean': return typeof value === 'boolean';
        case 'array': return Array.isArray(value);
        case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'null': return value === null;
        default: return false;
      }
    });
  }

  private generateTypeScriptInterface(schema: JSONSchema): string {
    let typescript = `// Gerado automaticamente pelo Orquestrador de Dados\n`;
    typescript += `// ${schema.description}\n\n`;
    
    typescript += `export interface ${this.toPascalCase(schema.title)} {\n`;
    
    Object.entries(schema.properties).forEach(([field, property]) => {
      const optional = !schema.required.includes(field) ? '?' : '';
      const tsType = this.jsonTypeToTypeScript(property.type);
      typescript += `  /** ${property.description} */\n`;
      typescript += `  ${field}${optional}: ${tsType};\n\n`;
    });
    
    typescript += `}\n`;
    
    return typescript;
  }

  private generateDocumentation(schema: JSONSchema): string {
    let doc = `# ${schema.title}\n\n`;
    doc += `${schema.description}\n\n`;
    doc += `**Domínio:** ${schema.metadata.domain}\n`;
    doc += `**Confiança:** ${Math.round(schema.metadata.confidence * 100)}%\n\n`;
    
    doc += `## Campos\n\n`;
    
    Object.entries(schema.properties).forEach(([field, property]) => {
      const required = schema.required.includes(field) ? '**Obrigatório**' : 'Opcional';
      doc += `### ${field}\n\n`;
      doc += `- **Tipo:** ${property.type}\n`;
      doc += `- **Status:** ${required}\n`;
      doc += `- **Descrição:** ${property.description}\n`;
      
      if (property.examples && property.examples.length > 0) {
        doc += `- **Exemplos:** ${property.examples.join(', ')}\n`;
      }
      
      doc += `\n`;
    });
    
    return doc;
  }

  private toPascalCase(str: string): string {
    return str.replace(/\w+/g, (word) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).replace(/\s+/g, '');
  }

  private jsonTypeToTypeScript(type: string | string[]): string {
    if (Array.isArray(type)) {
      return type.map(t => this.jsonTypeToTypeScript(t)).join(' | ');
    }
    
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'array': 'any[]',
      'object': 'Record<string, any>',
      'null': 'null'
    };
    
    return typeMap[type] || 'any';
  }
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  statistics: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface SchemaValidationError {
  row: number;
  field: string;
  type: 'required' | 'type' | 'pattern' | 'range' | 'custom';
  message: string;
  value: any;
}

export interface SchemaValidationWarning {
  row: number;
  field: string;
  type: 'additional_property' | 'format_suggestion' | 'data_quality';
  message: string;
  suggestion: string;
}