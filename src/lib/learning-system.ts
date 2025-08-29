/**
 * Sistema de aprendizado para mapeamentos recorrentes e padrões de transformação
 * Memoriza padrões, sugere mapeamentos e melhora com o tempo
 */

import { DataType } from './data-type-inference';
import { DomainType } from './domain-analyzer';
import { ValidationResult } from './data-validator';

export interface LearningPattern {
  id: string;
  sourcePattern: SourcePattern;
  targetMapping: TargetMapping;
  confidence: number;
  usageCount: number;
  successRate: number;
  lastUsed: Date;
  domain: DomainType;
  metadata: PatternMetadata;
}

export interface SourcePattern {
  columnNames: string[];
  dataTypes: DataType[];
  sampleValues: string[][];
  structure: StructureSignature;
  domain: DomainType;
}

export interface TargetMapping {
  fieldMappings: FieldMapping[];
  transformations: TransformationRule[];
  validationRules: ValidationRule[];
  outputSchema: any;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  confidence: number;
  reasoning: string;
}

export interface TransformationRule {
  sourceField: string;
  targetField: string;
  operation: TransformationOperation;
  parameters: Record<string, any>;
  description: string;
}

export interface TransformationOperation {
  type: 'format' | 'normalize' | 'split' | 'combine' | 'calculate' | 'lookup' | 'validate';
  function: string;
  params: any[];
}

export interface ValidationRule {
  field: string;
  type: DataType;
  required: boolean;
  constraints: Record<string, any>;
}

export interface StructureSignature {
  columnCount: number;
  hasHeaders: boolean;
  delimiter: string;
  encoding: string;
  rowCount: number;
  fingerprint: string;
}

export interface PatternMetadata {
  createdAt: Date;
  updatedAt: Date;
  source: 'user' | 'auto' | 'ai';
  tags: string[];
  description: string;
  examples: string[];
}

export interface LearningConfig {
  maxPatterns: number;
  minConfidence: number;
  decayFactor: number;
  autoLearn: boolean;
  suggestThreshold: number;
}

export interface SuggestionResult {
  suggestions: MappingSuggestion[];
  confidence: number;
  reasoning: string;
  alternatives: AlternativeSuggestion[];
}

export interface MappingSuggestion {
  sourceField: string;
  targetField: string;
  transformation?: TransformationRule;
  confidence: number;
  reasoning: string;
  examples: string[];
}

export interface AlternativeSuggestion {
  mapping: FieldMapping;
  confidence: number;
  reasoning: string;
}

export class LearningSystem {
  private patterns: Map<string, LearningPattern> = new Map();
  private config: LearningConfig;
  private storageKey = 'orquestrador_learning_patterns';

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = {
      maxPatterns: 1000,
      minConfidence: 0.3,
      decayFactor: 0.95,
      autoLearn: true,
      suggestThreshold: 0.5,
      ...config
    };
    
    this.loadPatterns();
  }

  /**
   * Aprende um novo padrão de mapeamento
   */
  learnPattern(
    sourceData: any[],
    sourceStructure: StructureSignature,
    targetMapping: TargetMapping,
    domain: DomainType,
    metadata: Partial<PatternMetadata> = {}
  ): string {
    const sourcePattern = this.extractSourcePattern(sourceData, sourceStructure, domain);
    const patternId = this.generatePatternId(sourcePattern);
    
    const existingPattern = this.patterns.get(patternId);
    
    if (existingPattern) {
      // Atualiza padrão existente
      existingPattern.usageCount++;
      existingPattern.lastUsed = new Date();
      existingPattern.confidence = Math.min(1.0, existingPattern.confidence + 0.1);
      existingPattern.metadata.updatedAt = new Date();
      
      // Melhora o mapeamento baseado no feedback
      this.improveMappingFromFeedback(existingPattern, targetMapping);
    } else {
      // Cria novo padrão
      const newPattern: LearningPattern = {
        id: patternId,
        sourcePattern,
        targetMapping,
        confidence: 0.7,
        usageCount: 1,
        successRate: 1.0,
        lastUsed: new Date(),
        domain,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'user',
          tags: [],
          description: '',
          examples: [],
          ...metadata
        }
      };
      
      this.patterns.set(patternId, newPattern);
    }
    
    this.savePatterns();
    this.cleanupOldPatterns();
    
    return patternId;
  }

  /**
   * Sugere mapeamentos baseados em padrões aprendidos
   */
  suggestMappings(
    sourceData: any[],
    sourceStructure: StructureSignature,
    domain?: DomainType
  ): SuggestionResult {
    const sourcePattern = this.extractSourcePattern(sourceData, sourceStructure, domain);
    const matchingPatterns = this.findMatchingPatterns(sourcePattern);
    
    if (matchingPatterns.length === 0) {
      return {
        suggestions: [],
        confidence: 0,
        reasoning: 'Nenhum padrão similar encontrado no histórico',
        alternatives: []
      };
    }
    
    // Ordena por relevância e confiança
    const sortedPatterns = matchingPatterns.sort((a, b) => {
      const scoreA = this.calculatePatternScore(a.pattern, sourcePattern);
      const scoreB = this.calculatePatternScore(b.pattern, sourcePattern);
      return scoreB - scoreA;
    });
    
    const bestPattern = sortedPatterns[0];
    const suggestions = this.generateSuggestions(bestPattern.pattern, sourcePattern);
    const alternatives = this.generateAlternatives(sortedPatterns.slice(1, 4), sourcePattern);
    
    return {
      suggestions,
      confidence: bestPattern.similarity,
      reasoning: this.generateReasoning(bestPattern.pattern, sourcePattern),
      alternatives
    };
  }

  /**
   * Registra feedback sobre a qualidade de uma sugestão
   */
  recordFeedback(
    patternId: string,
    fieldMapping: FieldMapping,
    success: boolean,
    userCorrection?: FieldMapping
  ): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;
    
    // Atualiza taxa de sucesso
    const totalAttempts = pattern.usageCount;
    const currentSuccesses = pattern.successRate * (totalAttempts - 1);
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    pattern.successRate = newSuccesses / totalAttempts;
    
    // Ajusta confiança baseado no feedback
    if (success) {
      pattern.confidence = Math.min(1.0, pattern.confidence + 0.05);
    } else {
      pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
      
      // Aprende com a correção do usuário
      if (userCorrection) {
        this.learnFromCorrection(pattern, fieldMapping, userCorrection);
      }
    }
    
    pattern.metadata.updatedAt = new Date();
    this.savePatterns();
  }

  /**
   * Obtém estatísticas do sistema de aprendizado
   */
  getStatistics(): LearningStatistics {
    const patterns = Array.from(this.patterns.values());
    
    return {
      totalPatterns: patterns.length,
      averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      averageSuccessRate: patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length,
      domainDistribution: this.getDomainDistribution(patterns),
      mostUsedPatterns: patterns
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(p => ({ id: p.id, usageCount: p.usageCount, confidence: p.confidence })),
      recentActivity: patterns
        .filter(p => p.lastUsed > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length
    };
  }

  /**
   * Exporta padrões aprendidos
   */
  exportPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Importa padrões de aprendizado
   */
  importPatterns(patterns: LearningPattern[]): void {
    patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    this.savePatterns();
  }

  /**
   * Limpa padrões com baixa performance
   */
  cleanupPatterns(): void {
    const patterns = Array.from(this.patterns.values());
    const toRemove = patterns.filter(p => 
      p.confidence < this.config.minConfidence || 
      p.successRate < 0.3 ||
      p.lastUsed < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 dias
    );
    
    toRemove.forEach(pattern => {
      this.patterns.delete(pattern.id);
    });
    
    this.savePatterns();
  }

  // Métodos privados

  private extractSourcePattern(
    sourceData: any[],
    structure: StructureSignature,
    domain?: DomainType
  ): SourcePattern {
    const headers = sourceData[0] ? Object.keys(sourceData[0]) : [];
    const sampleValues = sourceData.slice(0, 5).map(row => 
      headers.map(header => String(row[header] || ''))
    );
    
    // Inferir tipos de dados para cada coluna
    const dataTypes: DataType[] = headers.map(header => {
      const values = sourceData.slice(0, 10).map(row => String(row[header] || ''));
      return this.inferColumnType(values);
    });
    
    return {
      columnNames: headers,
      dataTypes,
      sampleValues,
      structure,
      domain: domain || 'generico'
    };
  }

  private inferColumnType(values: string[]): DataType {
    // Implementação simplificada - na prática, usaria o DataTypeInference
    const nonEmptyValues = values.filter(v => v.trim() !== '');
    
    if (nonEmptyValues.every(v => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v))) return 'cpf';
    if (nonEmptyValues.every(v => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v))) return 'cnpj';
    if (nonEmptyValues.every(v => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))) return 'data_brasileira';
    if (nonEmptyValues.every(v => /^[\d.,]+$/.test(v))) return 'numero_decimal';
    if (nonEmptyValues.every(v => /^\d+$/.test(v))) return 'numero_inteiro';
    if (nonEmptyValues.every(v => /@/.test(v))) return 'email';
    
    return 'texto';
  }

  private generatePatternId(sourcePattern: SourcePattern): string {
    const signature = [
      sourcePattern.columnNames.join('|'),
      sourcePattern.dataTypes.join('|'),
      sourcePattern.structure.columnCount,
      sourcePattern.domain
    ].join('::');
    
    return this.hashString(signature);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private findMatchingPatterns(sourcePattern: SourcePattern): Array<{pattern: LearningPattern, similarity: number}> {
    const matches: Array<{pattern: LearningPattern, similarity: number}> = [];
    
    for (const pattern of this.patterns.values()) {
      const similarity = this.calculateSimilarity(pattern.sourcePattern, sourcePattern);
      
      if (similarity >= this.config.suggestThreshold) {
        matches.push({ pattern, similarity });
      }
    }
    
    return matches;
  }

  private calculateSimilarity(pattern1: SourcePattern, pattern2: SourcePattern): number {
    let score = 0;
    let maxScore = 0;
    
    // Similaridade de nomes de colunas (peso 40%)
    const columnSimilarity = this.calculateColumnSimilarity(pattern1.columnNames, pattern2.columnNames);
    score += columnSimilarity * 0.4;
    maxScore += 0.4;
    
    // Similaridade de tipos de dados (peso 30%)
    const typeSimilarity = this.calculateTypeSimilarity(pattern1.dataTypes, pattern2.dataTypes);
    score += typeSimilarity * 0.3;
    maxScore += 0.3;
    
    // Similaridade de domínio (peso 20%)
    const domainSimilarity = pattern1.domain === pattern2.domain ? 1 : 0;
    score += domainSimilarity * 0.2;
    maxScore += 0.2;
    
    // Similaridade de estrutura (peso 10%)
    const structureSimilarity = this.calculateStructureSimilarity(pattern1.structure, pattern2.structure);
    score += structureSimilarity * 0.1;
    maxScore += 0.1;
    
    return score / maxScore;
  }

  private calculateColumnSimilarity(columns1: string[], columns2: string[]): number {
    const set1 = new Set(columns1.map(c => c.toLowerCase()));
    const set2 = new Set(columns2.map(c => c.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculateTypeSimilarity(types1: DataType[], types2: DataType[]): number {
    const minLength = Math.min(types1.length, types2.length);
    let matches = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (types1[i] === types2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(types1.length, types2.length);
  }

  private calculateStructureSimilarity(struct1: StructureSignature, struct2: StructureSignature): number {
    let score = 0;
    let maxScore = 0;
    
    // Número de colunas
    score += struct1.columnCount === struct2.columnCount ? 1 : 0;
    maxScore += 1;
    
    // Presença de cabeçalhos
    score += struct1.hasHeaders === struct2.hasHeaders ? 1 : 0;
    maxScore += 1;
    
    // Delimitador
    score += struct1.delimiter === struct2.delimiter ? 1 : 0;
    maxScore += 1;
    
    return score / maxScore;
  }

  private calculatePatternScore(pattern: LearningPattern, sourcePattern: SourcePattern): number {
    const similarity = this.calculateSimilarity(pattern.sourcePattern, sourcePattern);
    const confidence = pattern.confidence;
    const successRate = pattern.successRate;
    const usageBonus = Math.min(pattern.usageCount / 10, 1); // Bonus por uso frequente
    
    return (similarity * 0.4) + (confidence * 0.3) + (successRate * 0.2) + (usageBonus * 0.1);
  }

  private generateSuggestions(bestPattern: LearningPattern, sourcePattern: SourcePattern): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];
    
    for (const mapping of bestPattern.targetMapping.fieldMappings) {
      // Verifica se o campo fonte existe no padrão atual
      const sourceFieldIndex = sourcePattern.columnNames.findIndex(col => 
        col.toLowerCase() === mapping.sourceField.toLowerCase()
      );
      
      if (sourceFieldIndex >= 0) {
        suggestions.push({
          sourceField: sourcePattern.columnNames[sourceFieldIndex],
          targetField: mapping.targetField,
          transformation: bestPattern.targetMapping.transformations.find(t => 
            t.sourceField === mapping.sourceField
          ),
          confidence: mapping.confidence * bestPattern.confidence,
          reasoning: mapping.reasoning,
          examples: this.generateExamples(sourcePattern, sourceFieldIndex)
        });
      }
    }
    
    return suggestions;
  }

  private generateAlternatives(
    patterns: Array<{pattern: LearningPattern, similarity: number}>,
    sourcePattern: SourcePattern
  ): AlternativeSuggestion[] {
    const alternatives: AlternativeSuggestion[] = [];
    
    patterns.forEach(({ pattern, similarity }) => {
      pattern.targetMapping.fieldMappings.forEach(mapping => {
        if (sourcePattern.columnNames.includes(mapping.sourceField)) {
          alternatives.push({
            mapping,
            confidence: similarity * pattern.confidence,
            reasoning: `Baseado em padrão similar (${Math.round(similarity * 100)}% de similaridade)`
          });
        }
      });
    });
    
    return alternatives.slice(0, 5); // Limita a 5 alternativas
  }

  private generateReasoning(bestPattern: LearningPattern, sourcePattern: SourcePattern): string {
    const similarity = this.calculateSimilarity(bestPattern.sourcePattern, sourcePattern);
    const usageCount = bestPattern.usageCount;
    const successRate = bestPattern.successRate;
    
    return `Sugestão baseada em padrão similar (${Math.round(similarity * 100)}% de similaridade) ` +
           `usado ${usageCount} vezes com ${Math.round(successRate * 100)}% de sucesso. ` +
           `Domínio: ${bestPattern.domain}.`;
  }

  private generateExamples(sourcePattern: SourcePattern, fieldIndex: number): string[] {
    return sourcePattern.sampleValues
      .map(row => row[fieldIndex])
      .filter(value => value && value.trim() !== '')
      .slice(0, 3);
  }

  private improveMappingFromFeedback(pattern: LearningPattern, newMapping: TargetMapping): void {
    // Melhora o mapeamento baseado no feedback do usuário
    newMapping.fieldMappings.forEach(newFieldMapping => {
      const existingMapping = pattern.targetMapping.fieldMappings.find(m => 
        m.sourceField === newFieldMapping.sourceField
      );
      
      if (existingMapping) {
        // Atualiza mapeamento existente
        existingMapping.confidence = Math.min(1.0, existingMapping.confidence + 0.1);
        if (newFieldMapping.targetField !== existingMapping.targetField) {
          existingMapping.targetField = newFieldMapping.targetField;
          existingMapping.reasoning = 'Atualizado baseado em feedback do usuário';
        }
      } else {
        // Adiciona novo mapeamento
        pattern.targetMapping.fieldMappings.push(newFieldMapping);
      }
    });
  }

  private learnFromCorrection(
    pattern: LearningPattern,
    originalMapping: FieldMapping,
    correction: FieldMapping
  ): void {
    // Encontra e atualiza o mapeamento corrigido
    const mappingIndex = pattern.targetMapping.fieldMappings.findIndex(m => 
      m.sourceField === originalMapping.sourceField
    );
    
    if (mappingIndex >= 0) {
      pattern.targetMapping.fieldMappings[mappingIndex] = {
        ...correction,
        confidence: Math.max(0.5, correction.confidence),
        reasoning: 'Corrigido pelo usuário'
      };
    }
  }

  private getDomainDistribution(patterns: LearningPattern[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    patterns.forEach(pattern => {
      distribution[pattern.domain] = (distribution[pattern.domain] || 0) + 1;
    });
    
    return distribution;
  }

  private cleanupOldPatterns(): void {
    if (this.patterns.size <= this.config.maxPatterns) return;
    
    const patterns = Array.from(this.patterns.values())
      .sort((a, b) => {
        // Ordena por score combinado (confiança + taxa de sucesso + uso recente)
        const scoreA = a.confidence * 0.4 + a.successRate * 0.4 + 
                      (a.lastUsed.getTime() / Date.now()) * 0.2;
        const scoreB = b.confidence * 0.4 + b.successRate * 0.4 + 
                      (b.lastUsed.getTime() / Date.now()) * 0.2;
        return scoreA - scoreB;
      });
    
    // Remove os padrões com menor score
    const toRemove = patterns.slice(0, patterns.length - this.config.maxPatterns);
    toRemove.forEach(pattern => {
      this.patterns.delete(pattern.id);
    });
  }

  private savePatterns(): void {
    try {
      const data = JSON.stringify(Array.from(this.patterns.entries()));
      localStorage.setItem(this.storageKey, data);
    } catch (error) {
      console.warn('Erro ao salvar padrões de aprendizado:', error);
    }
  }

  private loadPatterns(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const entries = JSON.parse(data);
        this.patterns = new Map(entries.map(([id, pattern]: [string, any]) => [
          id,
          {
            ...pattern,
            lastUsed: new Date(pattern.lastUsed),
            metadata: {
              ...pattern.metadata,
              createdAt: new Date(pattern.metadata.createdAt),
              updatedAt: new Date(pattern.metadata.updatedAt)
            }
          }
        ]));
      }
    } catch (error) {
      console.warn('Erro ao carregar padrões de aprendizado:', error);
      this.patterns = new Map();
    }
  }
}

export interface LearningStatistics {
  totalPatterns: number;
  averageConfidence: number;
  averageSuccessRate: number;
  domainDistribution: Record<string, number>;
  mostUsedPatterns: Array<{id: string, usageCount: number, confidence: number}>;
  recentActivity: number;
}