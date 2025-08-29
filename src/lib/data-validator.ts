/**
 * Sistema de validação automática de dados
 * Valida CPF, CNPJ, datas, valores monetários e outros tipos específicos
 */

import { DataType } from './data-type-inference';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  normalizedValue?: string;
  confidence: number;
}

export interface ValidationError {
  field: string;
  type: 'format' | 'range' | 'required' | 'pattern' | 'checksum' | 'business_rule';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  originalValue: string;
  expectedFormat?: string;
}

export interface ValidationWarning {
  field: string;
  type: 'format_suggestion' | 'data_quality' | 'inconsistency';
  message: string;
  suggestion: string;
}

export interface ValidationConfig {
  strictMode: boolean;
  autoCorrect: boolean;
  customRules: CustomValidationRule[];
  businessRules: BusinessRule[];
}

export interface CustomValidationRule {
  field: string;
  validator: (value: string) => boolean;
  message: string;
}

export interface BusinessRule {
  name: string;
  condition: (data: Record<string, any>) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

export class DataValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      strictMode: false,
      autoCorrect: true,
      customRules: [],
      businessRules: [],
      ...config
    };
  }

  /**
   * Valida um valor baseado no tipo inferido
   */
  validateValue(value: string, type: DataType, field?: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      confidence: 1.0
    };

    if (!value || value.trim() === '') {
      return this.handleEmptyValue(field || 'unknown', result);
    }

    const trimmedValue = value.trim();

    try {
      switch (type) {
        case 'cpf':
          return this.validateCPF(trimmedValue, field, result);
        case 'cnpj':
          return this.validateCNPJ(trimmedValue, field, result);
        case 'rg':
          return this.validateRG(trimmedValue, field, result);
        case 'cep':
          return this.validateCEP(trimmedValue, field, result);
        case 'telefone':
        case 'celular':
          return this.validatePhone(trimmedValue, field, result, type);
        case 'email':
          return this.validateEmail(trimmedValue, field, result);
        case 'data_brasileira':
          return this.validateBrazilianDate(trimmedValue, field, result);
        case 'data_iso':
          return this.validateISODate(trimmedValue, field, result);
        case 'datetime':
          return this.validateDateTime(trimmedValue, field, result);
        case 'moeda_real':
          return this.validateCurrency(trimmedValue, field, result);
        case 'numero_decimal':
          return this.validateDecimal(trimmedValue, field, result);
        case 'numero_inteiro':
          return this.validateInteger(trimmedValue, field, result);
        case 'percentual':
          return this.validatePercentage(trimmedValue, field, result);
        case 'placa_veiculo':
          return this.validateLicensePlate(trimmedValue, field, result);
        case 'pix_key':
          return this.validatePixKey(trimmedValue, field, result);
        case 'transaction_id':
          return this.validateTransactionId(trimmedValue, field, result);
        case 'uuid':
          return this.validateUUID(trimmedValue, field, result);
        case 'boolean_ptbr':
        case 'boolean_en':
          return this.validateBoolean(trimmedValue, field, result, type);
        default:
          return this.validateGeneric(trimmedValue, field, result);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        field: field || 'unknown',
        type: 'format',
        message: `Erro na validação: ${error}`,
        severity: 'high',
        originalValue: value
      });
      result.confidence = 0;
      return result;
    }
  }

  /**
   * Valida CPF
   */
  private validateCPF(value: string, field: string = 'cpf', result: ValidationResult): ValidationResult {
    const numbers = value.replace(/\D/g, '');
    
    // Verifica formato
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CPF deve estar no formato 123.456.789-00 ou 12345678900',
        severity: 'high',
        originalValue: value,
        expectedFormat: '123.456.789-00'
      });
    }
    
    // Verifica comprimento
    if (numbers.length !== 11) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CPF deve ter exatamente 11 dígitos',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(numbers)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'pattern',
        message: 'CPF não pode ter todos os dígitos iguais',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    // Valida dígitos verificadores
    if (!this.validateCPFChecksum(numbers)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'checksum',
        message: 'CPF possui dígitos verificadores inválidos',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    // Normaliza o valor
    result.normalizedValue = this.formatCPF(numbers);
    
    // Adiciona sugestões
    if (value !== result.normalizedValue) {
      result.suggestions.push(`Formato normalizado: ${result.normalizedValue}`);
    }
    
    return result;
  }

  /**
   * Valida CNPJ
   */
  private validateCNPJ(value: string, field: string = 'cnpj', result: ValidationResult): ValidationResult {
    const numbers = value.replace(/\D/g, '');
    
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CNPJ deve estar no formato 12.345.678/0001-00 ou 12345678000100',
        severity: 'high',
        originalValue: value,
        expectedFormat: '12.345.678/0001-00'
      });
    }
    
    if (numbers.length !== 14) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CNPJ deve ter exatamente 14 dígitos',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    if (/^(\d)\1{13}$/.test(numbers)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'pattern',
        message: 'CNPJ não pode ter todos os dígitos iguais',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    if (!this.validateCNPJChecksum(numbers)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'checksum',
        message: 'CNPJ possui dígitos verificadores inválidos',
        severity: 'critical',
        originalValue: value
      });
      return result;
    }
    
    result.normalizedValue = this.formatCNPJ(numbers);
    
    if (value !== result.normalizedValue) {
      result.suggestions.push(`Formato normalizado: ${result.normalizedValue}`);
    }
    
    return result;
  }

  /**
   * Valida CEP
   */
  private validateCEP(value: string, field: string = 'cep', result: ValidationResult): ValidationResult {
    const numbers = value.replace(/\D/g, '');
    
    if (!/^\d{5}-?\d{3}$/.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CEP deve estar no formato 12345-678 ou 12345678',
        severity: 'medium',
        originalValue: value,
        expectedFormat: '12345-678'
      });
    }
    
    if (numbers.length !== 8) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'CEP deve ter exatamente 8 dígitos',
        severity: 'high',
        originalValue: value
      });
      return result;
    }
    
    result.normalizedValue = `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    
    if (value !== result.normalizedValue) {
      result.suggestions.push(`Formato normalizado: ${result.normalizedValue}`);
    }
    
    return result;
  }

  /**
   * Valida telefone/celular
   */
  private validatePhone(value: string, field: string = 'telefone', result: ValidationResult, type: DataType): ValidationResult {
    const numbers = value.replace(/\D/g, '');
    
    // Verifica comprimento
    if (numbers.length < 10 || numbers.length > 11) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Telefone deve ter 10 ou 11 dígitos',
        severity: 'medium',
        originalValue: value
      });
      return result;
    }
    
    // Verifica DDD
    const ddd = numbers.slice(0, 2);
    const validDDDs = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
    
    if (!validDDDs.includes(ddd)) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: `DDD ${ddd} pode não ser válido`,
        suggestion: 'Verifique se o DDD está correto'
      });
    }
    
    // Verifica se é celular (9º dígito)
    if (type === 'celular' && numbers.length === 11 && numbers[2] !== '9') {
      result.warnings.push({
        field,
        type: 'format_suggestion',
        message: 'Celular deve começar com 9 após o DDD',
        suggestion: 'Formato esperado: (11) 91234-5678'
      });
    }
    
    // Normaliza formato
    if (numbers.length === 10) {
      result.normalizedValue = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      result.normalizedValue = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    
    if (value !== result.normalizedValue) {
      result.suggestions.push(`Formato normalizado: ${result.normalizedValue}`);
    }
    
    return result;
  }

  /**
   * Valida email
   */
  private validateEmail(value: string, field: string = 'email', result: ValidationResult): ValidationResult {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Email deve ter formato válido (usuario@dominio.com)',
        severity: 'medium',
        originalValue: value,
        expectedFormat: 'usuario@dominio.com'
      });
      return result;
    }
    
    // Verifica domínios comuns brasileiros
    const commonDomains = ['gmail.com', 'hotmail.com', 'yahoo.com.br', 'outlook.com', 'uol.com.br', 'terra.com.br'];
    const domain = value.split('@')[1]?.toLowerCase();
    
    if (domain && !commonDomains.includes(domain)) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: `Domínio ${domain} é menos comum`,
        suggestion: 'Verifique se o email está correto'
      });
    }
    
    result.normalizedValue = value.toLowerCase();
    
    return result;
  }

  /**
   * Valida data brasileira
   */
  private validateBrazilianDate(value: string, field: string = 'data', result: ValidationResult): ValidationResult {
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = value.match(dateRegex);
    
    if (!match) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Data deve estar no formato DD/MM/AAAA ou DD-MM-AAAA',
        severity: 'medium',
        originalValue: value,
        expectedFormat: 'DD/MM/AAAA'
      });
      return result;
    }
    
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (date.getDate() !== parseInt(day) || 
        date.getMonth() !== parseInt(month) - 1 || 
        date.getFullYear() !== parseInt(year)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'range',
        message: 'Data inválida',
        severity: 'high',
        originalValue: value
      });
      return result;
    }
    
    // Verifica se a data não é muito antiga ou futura
    const currentYear = new Date().getFullYear();
    if (parseInt(year) < 1900 || parseInt(year) > currentYear + 10) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: `Ano ${year} parece incomum`,
        suggestion: 'Verifique se o ano está correto'
      });
    }
    
    // Normaliza para formato ISO
    result.normalizedValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    result.suggestions.push(`Formato ISO: ${result.normalizedValue}`);
    
    return result;
  }

  /**
   * Valida valor monetário
   */
  private validateCurrency(value: string, field: string = 'valor', result: ValidationResult): ValidationResult {
    // Remove símbolos de moeda e espaços
    let cleanValue = value.replace(/[R$\s]/g, '');
    
    // Verifica formato brasileiro (1.234,56) ou internacional (1234.56)
    const brazilianFormat = /^-?\d{1,3}(\.\d{3})*(,\d{2})?$/;
    const internationalFormat = /^-?\d+(\.\d{2})?$/;
    
    if (brazilianFormat.test(cleanValue)) {
      // Converte formato brasileiro para internacional
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
      result.normalizedValue = parseFloat(cleanValue).toFixed(2);
    } else if (internationalFormat.test(cleanValue)) {
      result.normalizedValue = parseFloat(cleanValue).toFixed(2);
    } else {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Valor monetário deve estar no formato 1.234,56 ou 1234.56',
        severity: 'medium',
        originalValue: value,
        expectedFormat: '1.234,56'
      });
      return result;
    }
    
    const numericValue = parseFloat(result.normalizedValue);
    
    // Verifica valores extremos
    if (numericValue > 1000000) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: 'Valor muito alto detectado',
        suggestion: 'Verifique se o valor está correto'
      });
    }
    
    if (numericValue < 0) {
      result.suggestions.push('Valor negativo detectado (débito/saída)');
    }
    
    return result;
  }

  /**
   * Valida placa de veículo
   */
  private validateLicensePlate(value: string, field: string = 'placa', result: ValidationResult): ValidationResult {
    const cleanValue = value.replace(/[\s-]/g, '').toUpperCase();
    
    // Formato antigo: ABC1234
    const oldFormat = /^[A-Z]{3}\d{4}$/;
    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    
    if (!oldFormat.test(cleanValue) && !mercosulFormat.test(cleanValue)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Placa deve estar no formato ABC-1234 ou ABC1D23 (Mercosul)',
        severity: 'medium',
        originalValue: value,
        expectedFormat: 'ABC-1234'
      });
      return result;
    }
    
    if (mercosulFormat.test(cleanValue)) {
      result.normalizedValue = `${cleanValue.slice(0, 3)}${cleanValue.slice(3, 4)}${cleanValue.slice(4, 5)}${cleanValue.slice(5)}`;
      result.suggestions.push('Placa no formato Mercosul detectada');
    } else {
      result.normalizedValue = `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
    }
    
    return result;
  }

  /**
   * Valida chave PIX
   */
  private validatePixKey(value: string, field: string = 'pix', result: ValidationResult): ValidationResult {
    const cleanValue = value.trim();
    
    // CPF
    if (/^\d{11}$/.test(cleanValue.replace(/\D/g, ''))) {
      return this.validateCPF(cleanValue, field, result);
    }
    
    // CNPJ
    if (/^\d{14}$/.test(cleanValue.replace(/\D/g, ''))) {
      return this.validateCNPJ(cleanValue, field, result);
    }
    
    // Email
    if (cleanValue.includes('@')) {
      return this.validateEmail(cleanValue, field, result);
    }
    
    // Telefone
    if (/^\+55\d{10,11}$/.test(cleanValue.replace(/\D/g, ''))) {
      return this.validatePhone(cleanValue, field, result, 'celular');
    }
    
    // Chave aleatória (UUID)
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanValue)) {
      result.normalizedValue = cleanValue.toLowerCase();
      result.suggestions.push('Chave PIX aleatória detectada');
      return result;
    }
    
    result.isValid = false;
    result.errors.push({
      field,
      type: 'format',
      message: 'Chave PIX deve ser CPF, CNPJ, email, telefone ou chave aleatória',
      severity: 'medium',
      originalValue: value
    });
    
    return result;
  }

  /**
   * Trata valores vazios
   */
  private handleEmptyValue(field: string, result: ValidationResult): ValidationResult {
    if (this.config.strictMode) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'required',
        message: 'Campo obrigatório não pode estar vazio',
        severity: 'critical',
        originalValue: ''
      });
    } else {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: 'Campo vazio detectado',
        suggestion: 'Considere preencher este campo'
      });
    }
    
    result.confidence = 0.5;
    return result;
  }

  /**
   * Validação genérica para texto livre
   */
  private validateGeneric(value: string, field: string = 'campo', result: ValidationResult): ValidationResult {
    // Verifica comprimento mínimo
    if (value.length < 2) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: 'Valor muito curto',
        suggestion: 'Considere valores mais descritivos'
      });
    }
    
    // Verifica caracteres especiais suspeitos
    if (/[<>"'&]/.test(value)) {
      result.warnings.push({
        field,
        type: 'data_quality',
        message: 'Caracteres especiais detectados',
        suggestion: 'Verifique se os caracteres são necessários'
      });
    }
    
    result.normalizedValue = value.trim();
    return result;
  }

  // Métodos auxiliares para validação de checksum
  private validateCPFChecksum(cpf: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
  }

  private validateCNPJChecksum(cnpj: string): boolean {
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i];
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i];
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(cnpj[12]) === digit1 && parseInt(cnpj[13]) === digit2;
  }

  private formatCPF(cpf: string): string {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }

  private formatCNPJ(cnpj: string): string {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  }

  // Implementações adicionais para outros tipos...
  private validateRG(value: string, field: string, result: ValidationResult): ValidationResult {
    // Implementação simplificada para RG
    const numbers = value.replace(/\D/g, '');
    if (numbers.length < 7 || numbers.length > 9) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'RG deve ter entre 7 e 9 dígitos',
        severity: 'medium',
        originalValue: value
      });
    }
    return result;
  }

  private validateISODate(value: string, field: string, result: ValidationResult): ValidationResult {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Data deve estar no formato AAAA-MM-DD',
        severity: 'medium',
        originalValue: value
      });
    }
    return result;
  }

  private validateDateTime(value: string, field: string, result: ValidationResult): ValidationResult {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Data/hora inválida',
        severity: 'medium',
        originalValue: value
      });
    }
    return result;
  }

  private validateDecimal(value: string, field: string, result: ValidationResult): ValidationResult {
    const cleanValue = value.replace(',', '.');
    if (isNaN(parseFloat(cleanValue))) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Valor deve ser um número decimal válido',
        severity: 'medium',
        originalValue: value
      });
    } else {
      result.normalizedValue = parseFloat(cleanValue).toString();
    }
    return result;
  }

  private validateInteger(value: string, field: string, result: ValidationResult): ValidationResult {
    if (!/^-?\d+$/.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'Valor deve ser um número inteiro',
        severity: 'medium',
        originalValue: value
      });
    }
    return result;
  }

  private validatePercentage(value: string, field: string, result: ValidationResult): ValidationResult {
    const cleanValue = value.replace('%', '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'range',
        message: 'Percentual deve estar entre 0% e 100%',
        severity: 'medium',
        originalValue: value
      });
    }
    return result;
  }

  private validateTransactionId(value: string, field: string, result: ValidationResult): ValidationResult {
    if (!/^[A-Z]{2,4}-\d+$|^TX-\d{8}-\d{4}$/.test(value)) {
      result.warnings.push({
        field,
        type: 'format_suggestion',
        message: 'Formato de ID de transação não reconhecido',
        suggestion: 'Formato comum: TX-20250101-1234'
      });
    }
    return result;
  }

  private validateUUID(value: string, field: string, result: ValidationResult): ValidationResult {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: 'UUID deve estar no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        severity: 'medium',
        originalValue: value
      });
    } else {
      result.normalizedValue = value.toLowerCase();
    }
    return result;
  }

  private validateBoolean(value: string, field: string, result: ValidationResult, type: DataType): ValidationResult {
    const lowerValue = value.toLowerCase();
    const ptbrValues = ['sim', 'não', 's', 'n', 'verdadeiro', 'falso', 'ativo', 'inativo'];
    const enValues = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'];
    
    const validValues = type === 'boolean_ptbr' ? ptbrValues : enValues;
    
    if (!validValues.includes(lowerValue)) {
      result.isValid = false;
      result.errors.push({
        field,
        type: 'format',
        message: `Valor booleano deve ser um dos: ${validValues.join(', ')}`,
        severity: 'medium',
        originalValue: value
      });
    } else {
      // Normaliza para true/false
      const trueValues = type === 'boolean_ptbr' ? ['sim', 's', 'verdadeiro', 'ativo'] : ['true', 'yes', 'y', '1'];
      result.normalizedValue = trueValues.includes(lowerValue) ? 'true' : 'false';
    }
    
    return result;
  }
}