/**
 * Analisador de padrões para identificar domínios específicos
 * Detecta automaticamente se os dados são financeiros, cadastrais, transacionais, etc.
 */

import { ColumnInfo } from './csv-detector';
import { DataType } from './data-type-inference';

export interface DomainAnalysisResult {
  domain: DataDomain;
  confidence: number;
  subDomain?: string;
  characteristics: DomainCharacteristic[];
  suggestedSchema: SchemaTemplate;
  transformationRules: TransformationRule[];
  validationRules: DomainValidationRule[];
}

export type DataDomain = 
  | 'financeiro'
  | 'cadastral'
  | 'transacional'
  | 'ecommerce'
  | 'logistico'
  | 'rh_pessoal'
  | 'marketing'
  | 'saude'
  | 'educacional'
  | 'imobiliario'
  | 'automotivo'
  | 'governo'
  | 'generico';

export interface DomainCharacteristic {
  type: 'required_field' | 'optional_field' | 'calculated_field' | 'reference_field';
  field: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface SchemaTemplate {
  name: string;
  description: string;
  fields: SchemaField[];
  relationships?: SchemaRelationship[];
  indexes?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: any;
  transformation?: string;
}

export interface SchemaRelationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  target: string;
  field: string;
}

export interface TransformationRule {
  field: string;
  operation: 'normalize' | 'format' | 'calculate' | 'lookup' | 'validate';
  parameters: Record<string, any>;
  description: string;
}

export interface DomainValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export class DomainAnalyzer {
  private static readonly DOMAIN_PATTERNS: Record<DataDomain, DomainPattern> = {
    financeiro: {
      keywords: ['valor', 'saldo', 'credito', 'debito', 'juros', 'taxa', 'moeda', 'banco', 'conta', 'agencia'],
      requiredTypes: ['moeda_real', 'numero_decimal'],
      optionalTypes: ['data_brasileira', 'codigo_banco', 'agencia', 'conta_corrente'],
      patterns: [/transac[aã]o/i, /financ/i, /banc[ao]/i, /pagamento/i, /recebimento/i],
      minConfidence: 0.6
    },
    
    transacional: {
      keywords: ['transacao', 'tx', 'operacao', 'movimento', 'historico', 'log', 'evento'],
      requiredTypes: ['transaction_id', 'datetime'],
      optionalTypes: ['moeda_real', 'enum', 'texto_livre'],
      patterns: [/^tx[_-]/i, /transac[aã]o/i, /operac[aã]o/i, /movimento/i],
      minConfidence: 0.7
    },
    
    cadastral: {
      keywords: ['nome', 'cpf', 'cnpj', 'endereco', 'telefone', 'email', 'nascimento', 'cliente'],
      requiredTypes: ['cpf', 'texto_livre'],
      optionalTypes: ['cnpj', 'email', 'telefone', 'cep', 'data_brasileira'],
      patterns: [/cliente/i, /pessoa/i, /cadastro/i, /usuario/i],
      minConfidence: 0.5
    },
    
    ecommerce: {
      keywords: ['produto', 'preco', 'categoria', 'estoque', 'pedido', 'venda', 'compra', 'carrinho'],
      requiredTypes: ['codigo_produto', 'moeda_real'],
      optionalTypes: ['numero_inteiro', 'enum', 'data_iso'],
      patterns: [/produto/i, /pedido/i, /venda/i, /estoque/i, /categoria/i],
      minConfidence: 0.6
    },
    
    logistico: {
      keywords: ['entrega', 'frete', 'transportadora', 'rastreamento', 'endereco', 'cep', 'peso'],
      requiredTypes: ['cep', 'texto_livre'],
      optionalTypes: ['data_iso', 'numero_decimal', 'enum'],
      patterns: [/entrega/i, /frete/i, /transport/i, /rastreamento/i],
      minConfidence: 0.6
    },
    
    rh_pessoal: {
      keywords: ['funcionario', 'salario', 'cargo', 'departamento', 'admissao', 'demissao', 'cpf'],
      requiredTypes: ['cpf', 'texto_livre'],
      optionalTypes: ['moeda_real', 'data_brasileira', 'enum'],
      patterns: [/funcionario/i, /colaborador/i, /salario/i, /cargo/i],
      minConfidence: 0.6
    },
    
    marketing: {
      keywords: ['campanha', 'lead', 'conversao', 'clique', 'impressao', 'email', 'segmento'],
      requiredTypes: ['email', 'numero_inteiro'],
      optionalTypes: ['percentual', 'data_iso', 'enum'],
      patterns: [/campanha/i, /marketing/i, /lead/i, /conversao/i],
      minConfidence: 0.6
    },
    
    saude: {
      keywords: ['paciente', 'medico', 'consulta', 'exame', 'diagnostico', 'medicamento', 'crm'],
      requiredTypes: ['cpf', 'data_brasileira'],
      optionalTypes: ['texto_livre', 'numero_inteiro'],
      patterns: [/paciente/i, /medico/i, /consulta/i, /saude/i],
      minConfidence: 0.7
    },
    
    educacional: {
      keywords: ['aluno', 'professor', 'curso', 'disciplina', 'nota', 'frequencia', 'matricula'],
      requiredTypes: ['texto_livre', 'numero_decimal'],
      optionalTypes: ['cpf', 'data_brasileira', 'enum'],
      patterns: [/aluno/i, /estudante/i, /curso/i, /escola/i, /universidade/i],
      minConfidence: 0.6
    },
    
    imobiliario: {
      keywords: ['imovel', 'endereco', 'valor', 'area', 'quarto', 'banheiro', 'garagem', 'cep'],
      requiredTypes: ['cep', 'moeda_real'],
      optionalTypes: ['numero_decimal', 'numero_inteiro', 'texto_livre'],
      patterns: [/imovel/i, /casa/i, /apartamento/i, /terreno/i],
      minConfidence: 0.6
    },
    
    automotivo: {
      keywords: ['veiculo', 'placa', 'modelo', 'marca', 'ano', 'cor', 'chassi', 'renavam'],
      requiredTypes: ['placa_veiculo', 'texto_livre'],
      optionalTypes: ['numero_inteiro', 'enum'],
      patterns: [/veiculo/i, /carro/i, /moto/i, /placa/i],
      minConfidence: 0.7
    },
    
    governo: {
      keywords: ['cidadao', 'documento', 'processo', 'protocolo', 'orgao', 'servico', 'cpf'],
      requiredTypes: ['cpf', 'texto_livre'],
      optionalTypes: ['data_brasileira', 'enum'],
      patterns: [/governo/i, /publico/i, /cidadao/i, /processo/i],
      minConfidence: 0.6
    },
    
    generico: {
      keywords: [],
      requiredTypes: [],
      optionalTypes: [],
      patterns: [],
      minConfidence: 0.1
    }
  };

  private static readonly SCHEMA_TEMPLATES: Record<DataDomain, SchemaTemplate> = {
    financeiro: {
      name: 'Transações Financeiras',
      description: 'Schema para dados de transações bancárias e financeiras',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'Identificador único da transação' },
        { name: 'cpf', type: 'string', required: true, description: 'CPF do titular', validation: { pattern: 'cpf' } },
        { name: 'valor', type: 'number', required: true, description: 'Valor da transação' },
        { name: 'tipo', type: 'string', required: true, description: 'Tipo da transação' },
        { name: 'data', type: 'string', required: true, description: 'Data e hora da transação', validation: { format: 'date-time' } },
        { name: 'descricao', type: 'string', required: false, description: 'Descrição da transação' }
      ],
      indexes: ['cpf', 'data', 'tipo']
    },
    
    cadastral: {
      name: 'Cadastro de Pessoas',
      description: 'Schema para dados cadastrais de pessoas físicas e jurídicas',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'Identificador único' },
        { name: 'nome', type: 'string', required: true, description: 'Nome completo' },
        { name: 'cpf', type: 'string', required: false, description: 'CPF (pessoa física)', validation: { pattern: 'cpf' } },
        { name: 'cnpj', type: 'string', required: false, description: 'CNPJ (pessoa jurídica)', validation: { pattern: 'cnpj' } },
        { name: 'email', type: 'string', required: false, description: 'Email de contato', validation: { format: 'email' } },
        { name: 'telefone', type: 'string', required: false, description: 'Telefone de contato' },
        { name: 'endereco', type: 'object', required: false, description: 'Endereço completo' },
        { name: 'ativo', type: 'boolean', required: true, description: 'Status ativo/inativo' }
      ],
      indexes: ['cpf', 'cnpj', 'email']
    },
    
    ecommerce: {
      name: 'E-commerce',
      description: 'Schema para dados de produtos e vendas online',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'ID do produto' },
        { name: 'nome', type: 'string', required: true, description: 'Nome do produto' },
        { name: 'categoria', type: 'string', required: true, description: 'Categoria do produto' },
        { name: 'preco', type: 'number', required: true, description: 'Preço unitário' },
        { name: 'estoque', type: 'integer', required: true, description: 'Quantidade em estoque' },
        { name: 'ativo', type: 'boolean', required: true, description: 'Produto ativo para venda' }
      ],
      indexes: ['categoria', 'ativo']
    },
    
    transacional: {
      name: 'Log de Transações',
      description: 'Schema para logs e histórico de operações',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'ID da transação' },
        { name: 'timestamp', type: 'string', required: true, description: 'Data e hora', validation: { format: 'date-time' } },
        { name: 'tipo', type: 'string', required: true, description: 'Tipo da operação' },
        { name: 'usuario', type: 'string', required: false, description: 'Usuário responsável' },
        { name: 'detalhes', type: 'object', required: false, description: 'Detalhes da operação' },
        { name: 'status', type: 'string', required: true, description: 'Status da operação' }
      ],
      indexes: ['timestamp', 'tipo', 'status']
    }
  } as Record<DataDomain, SchemaTemplate>;

  /**
   * Analisa o domínio dos dados baseado nas colunas
   */
  static analyzeDomain(columns: ColumnInfo[], sampleData?: string[][]): DomainAnalysisResult {
    const domainScores = this.calculateDomainScores(columns);
    const bestDomain = this.selectBestDomain(domainScores);
    
    const characteristics = this.identifyCharacteristics(bestDomain.domain, columns);
    const suggestedSchema = this.generateSchema(bestDomain.domain, columns);
    const transformationRules = this.generateTransformationRules(bestDomain.domain, columns);
    const validationRules = this.generateValidationRules(bestDomain.domain, columns);
    
    return {
      domain: bestDomain.domain,
      confidence: bestDomain.confidence,
      subDomain: this.identifySubDomain(bestDomain.domain, columns),
      characteristics,
      suggestedSchema,
      transformationRules,
      validationRules
    };
  }

  /**
   * Calcula scores para cada domínio
   */
  private static calculateDomainScores(columns: ColumnInfo[]): Array<{domain: DataDomain, confidence: number}> {
    const scores: Array<{domain: DataDomain, confidence: number}> = [];
    
    for (const [domain, pattern] of Object.entries(this.DOMAIN_PATTERNS)) {
      let score = 0;
      let maxScore = 0;
      
      // Score por palavras-chave
      for (const column of columns) {
        const columnName = column.name.toLowerCase();
        for (const keyword of pattern.keywords) {
          maxScore += 1;
          if (columnName.includes(keyword)) {
            score += 1;
          }
        }
      }
      
      // Score por tipos de dados
      for (const requiredType of pattern.requiredTypes) {
        maxScore += 2;
        if (columns.some(col => col.type === requiredType)) {
          score += 2;
        }
      }
      
      for (const optionalType of pattern.optionalTypes) {
        maxScore += 0.5;
        if (columns.some(col => col.type === optionalType)) {
          score += 0.5;
        }
      }
      
      // Score por padrões regex
      for (const regex of pattern.patterns) {
        for (const column of columns) {
          maxScore += 1;
          if (regex.test(column.name)) {
            score += 1;
          }
        }
      }
      
      const confidence = maxScore > 0 ? score / maxScore : 0;
      
      if (confidence >= pattern.minConfidence) {
        scores.push({ domain: domain as DataDomain, confidence });
      }
    }
    
    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Seleciona o melhor domínio
   */
  private static selectBestDomain(scores: Array<{domain: DataDomain, confidence: number}>): {domain: DataDomain, confidence: number} {
    if (scores.length === 0) {
      return { domain: 'generico', confidence: 0.1 };
    }
    
    return scores[0];
  }

  /**
   * Identifica características específicas do domínio
   */
  private static identifyCharacteristics(domain: DataDomain, columns: ColumnInfo[]): DomainCharacteristic[] {
    const characteristics: DomainCharacteristic[] = [];
    
    const domainRules: Record<DataDomain, DomainCharacteristic[]> = {
      financeiro: [
        { type: 'required_field', field: 'valor', description: 'Valor monetário da transação', importance: 'critical' },
        { type: 'required_field', field: 'data', description: 'Data da transação', importance: 'critical' },
        { type: 'optional_field', field: 'cpf', description: 'Identificação do titular', importance: 'high' },
        { type: 'calculated_field', field: 'saldo', description: 'Saldo calculado', importance: 'medium' }
      ],
      cadastral: [
        { type: 'required_field', field: 'nome', description: 'Nome da pessoa/empresa', importance: 'critical' },
        { type: 'required_field', field: 'documento', description: 'CPF ou CNPJ', importance: 'critical' },
        { type: 'optional_field', field: 'contato', description: 'Email ou telefone', importance: 'high' }
      ],
      transacional: [
        { type: 'required_field', field: 'id', description: 'Identificador único', importance: 'critical' },
        { type: 'required_field', field: 'timestamp', description: 'Data e hora da operação', importance: 'critical' },
        { type: 'required_field', field: 'tipo', description: 'Tipo da operação', importance: 'high' }
      ]
    } as Record<DataDomain, DomainCharacteristic[]>;
    
    return domainRules[domain] || [];
  }

  /**
   * Gera schema sugerido baseado no domínio
   */
  private static generateSchema(domain: DataDomain, columns: ColumnInfo[]): SchemaTemplate {
    const baseTemplate = this.SCHEMA_TEMPLATES[domain] || this.SCHEMA_TEMPLATES.generico;
    
    // Adapta o template baseado nas colunas reais
    const adaptedFields = columns.map(col => ({
      name: col.name,
      type: this.mapTypeToJsonSchema(col.type),
      required: !col.nullable,
      description: `Campo ${col.name} (${col.type})`,
      validation: col.type !== 'texto_livre' ? { pattern: col.type } : undefined
    }));
    
    return {
      ...baseTemplate,
      fields: adaptedFields
    };
  }

  /**
   * Gera regras de transformação
   */
  private static generateTransformationRules(domain: DataDomain, columns: ColumnInfo[]): TransformationRule[] {
    const rules: TransformationRule[] = [];
    
    for (const column of columns) {
      switch (column.type) {
        case 'cpf':
          rules.push({
            field: column.name,
            operation: 'normalize',
            parameters: { format: 'numbers_only', validate: true },
            description: 'Remove formatação e valida CPF'
          });
          break;
        case 'moeda_real':
          rules.push({
            field: column.name,
            operation: 'normalize',
            parameters: { type: 'currency', currency: 'BRL' },
            description: 'Converte para valor numérico'
          });
          break;
        case 'data_brasileira':
          rules.push({
            field: column.name,
            operation: 'format',
            parameters: { from: 'DD/MM/YYYY', to: 'YYYY-MM-DD' },
            description: 'Converte data para formato ISO'
          });
          break;
      }
    }
    
    return rules;
  }

  /**
   * Gera regras de validação específicas do domínio
   */
  private static generateValidationRules(domain: DataDomain, columns: ColumnInfo[]): DomainValidationRule[] {
    const rules: DomainValidationRule[] = [];
    
    // Regras específicas por domínio
    if (domain === 'financeiro') {
      const valorField = columns.find(col => col.name.toLowerCase().includes('valor'));
      if (valorField) {
        rules.push({
          field: valorField.name,
          rule: 'not_zero',
          message: 'Valor da transação não pode ser zero',
          severity: 'error'
        });
      }
    }
    
    if (domain === 'cadastral') {
      const cpfField = columns.find(col => col.type === 'cpf');
      if (cpfField) {
        rules.push({
          field: cpfField.name,
          rule: 'valid_cpf',
          message: 'CPF deve ser válido',
          severity: 'error'
        });
      }
    }
    
    return rules;
  }

  /**
   * Identifica subdomínio específico
   */
  private static identifySubDomain(domain: DataDomain, columns: ColumnInfo[]): string | undefined {
    const columnNames = columns.map(col => col.name.toLowerCase()).join(' ');
    
    const subDomains: Record<DataDomain, Record<string, string[]>> = {
      financeiro: {
        'Transações Bancárias': ['pix', 'ted', 'doc', 'transferencia'],
        'Cartão de Crédito': ['cartao', 'credito', 'fatura'],
        'Investimentos': ['investimento', 'aplicacao', 'rendimento']
      },
      ecommerce: {
        'Produtos': ['produto', 'categoria', 'estoque'],
        'Pedidos': ['pedido', 'venda', 'compra'],
        'Clientes': ['cliente', 'usuario', 'comprador']
      }
    } as Record<DataDomain, Record<string, string[]>>;
    
    const domainSubs = subDomains[domain];
    if (!domainSubs) return undefined;
    
    for (const [subDomain, keywords] of Object.entries(domainSubs)) {
      if (keywords.some(keyword => columnNames.includes(keyword))) {
        return subDomain;
      }
    }
    
    return undefined;
  }

  /**
   * Mapeia tipos internos para JSON Schema
   */
  private static mapTypeToJsonSchema(type: DataType): string {
    const mapping: Record<DataType, string> = {
      cpf: 'string',
      cnpj: 'string',
      email: 'string',
      telefone: 'string',
      data_brasileira: 'string',
      data_iso: 'string',
      datetime: 'string',
      moeda_real: 'number',
      numero_decimal: 'number',
      numero_inteiro: 'integer',
      boolean_ptbr: 'boolean',
      boolean_en: 'boolean',
      texto_livre: 'string'
    } as Record<DataType, string>;
    
    return mapping[type] || 'string';
  }
}

interface DomainPattern {
  keywords: string[];
  requiredTypes: DataType[];
  optionalTypes: DataType[];
  patterns: RegExp[];
  minConfidence: number;
}