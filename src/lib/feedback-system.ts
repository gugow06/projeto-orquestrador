/**
 * Sistema de feedback para melhorar a precisão das detecções futuras
 * Coleta feedback dos usuários e ajusta os algoritmos de reconhecimento
 */

import { DataType } from './data-type-inference';
import { DomainType, DomainAnalysisResult } from './domain-analyzer';
import { ValidationResult } from './data-validator';
import { JSONSchema } from './schema-generator';
import { FieldMapping } from '../components/adaptive-interface';

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  feedbackType: FeedbackType;
  originalPrediction: any;
  userCorrection: any;
  confidence: number;
  context: FeedbackContext;
  impact: FeedbackImpact;
  status: 'pending' | 'processed' | 'applied';
}

export type FeedbackType = 
  | 'domain_detection'
  | 'field_type_inference'
  | 'field_mapping'
  | 'validation_rule'
  | 'schema_generation'
  | 'data_transformation'
  | 'pattern_recognition';

export interface FeedbackContext {
  fileName: string;
  fileSize: number;
  recordCount: number;
  fieldCount: number;
  detectedDomain: DomainType;
  detectedFields: string[];
  processingTime: number;
  userAgent?: string;
}

export interface FeedbackImpact {
  affectedComponents: string[];
  improvementPotential: number; // 0-1
  similarCasesCount: number;
  confidenceBoost: number;
}

export interface DomainFeedback {
  originalDomain: DomainType;
  correctedDomain: DomainType;
  confidence: number;
  reasoning: string;
  fieldEvidence: string[];
}

export interface FieldTypeFeedback {
  fieldName: string;
  originalType: DataType;
  correctedType: DataType;
  sampleValues: any[];
  reasoning: string;
}

export interface FieldMappingFeedback {
  sourceField: string;
  originalMapping: string;
  correctedMapping: string;
  transformationSuggestion?: string;
}

export interface ValidationFeedback {
  fieldName: string;
  validationRule: string;
  isCorrect: boolean;
  suggestedRule?: string;
  falsePositives: any[];
  falseNegatives: any[];
}

export interface SchemaFeedback {
  fieldName: string;
  originalSchema: any;
  correctedSchema: any;
  reasoning: string;
}

export interface LearningMetrics {
  totalFeedback: number;
  accuracyImprovement: number;
  domainDetectionAccuracy: number;
  fieldTypeAccuracy: number;
  validationAccuracy: number;
  userSatisfaction: number;
  processingTimeImprovement: number;
}

export interface FeedbackAnalytics {
  period: string;
  metrics: LearningMetrics;
  topIssues: FeedbackIssue[];
  improvements: FeedbackImprovement[];
  recommendations: string[];
}

export interface FeedbackIssue {
  type: FeedbackType;
  description: string;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  suggestedFix: string;
}

export interface FeedbackImprovement {
  component: string;
  description: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  implementedAt: string;
}

export interface LearningPattern {
  id: string;
  type: 'domain' | 'field_type' | 'validation' | 'mapping';
  pattern: any;
  confidence: number;
  usageCount: number;
  successRate: number;
  lastUsed: string;
  createdFrom: string[]; // IDs dos feedbacks que criaram este padrão
}

export interface AdaptiveRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  confidence: number;
  createdAt: string;
  lastUpdated: string;
  usageStats: {
    applied: number;
    successful: number;
    failed: number;
  };
}

export class FeedbackSystem {
  private feedbackStorage: Map<string, FeedbackEntry> = new Map();
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private adaptiveRules: Map<string, AdaptiveRule> = new Map();
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredData();
  }

  /**
   * Registra feedback sobre detecção de domínio
   */
  recordDomainFeedback(
    originalPrediction: DomainAnalysisResult,
    userCorrection: DomainFeedback,
    context: FeedbackContext
  ): string {
    const feedbackId = this.generateFeedbackId();
    
    const feedback: FeedbackEntry = {
      id: feedbackId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      feedbackType: 'domain_detection',
      originalPrediction,
      userCorrection,
      confidence: originalPrediction.confidence,
      context,
      impact: this.calculateImpact('domain_detection', userCorrection),
      status: 'pending'
    };
    
    this.feedbackStorage.set(feedbackId, feedback);
    this.processFeedback(feedback);
    
    return feedbackId;
  }

  /**
   * Registra feedback sobre inferência de tipos
   */
  recordFieldTypeFeedback(
    fieldName: string,
    originalType: DataType,
    correctedType: DataType,
    sampleValues: any[],
    context: FeedbackContext
  ): string {
    const feedbackId = this.generateFeedbackId();
    
    const userCorrection: FieldTypeFeedback = {
      fieldName,
      originalType,
      correctedType,
      sampleValues,
      reasoning: `Usuário corrigiu tipo de ${originalType} para ${correctedType}`
    };
    
    const feedback: FeedbackEntry = {
      id: feedbackId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      feedbackType: 'field_type_inference',
      originalPrediction: { fieldName, type: originalType },
      userCorrection,
      confidence: 0.5, // Assumindo confiança média para tipos incorretos
      context,
      impact: this.calculateImpact('field_type_inference', userCorrection),
      status: 'pending'
    };
    
    this.feedbackStorage.set(feedbackId, feedback);
    this.processFeedback(feedback);
    
    return feedbackId;
  }

  /**
   * Registra feedback sobre mapeamento de campos
   */
  recordMappingFeedback(
    mappings: FieldMapping[],
    corrections: FieldMappingFeedback[],
    context: FeedbackContext
  ): string {
    const feedbackId = this.generateFeedbackId();
    
    const feedback: FeedbackEntry = {
      id: feedbackId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      feedbackType: 'field_mapping',
      originalPrediction: mappings,
      userCorrection: corrections,
      confidence: 0.7,
      context,
      impact: this.calculateImpact('field_mapping', corrections),
      status: 'pending'
    };
    
    this.feedbackStorage.set(feedbackId, feedback);
    this.processFeedback(feedback);
    
    return feedbackId;
  }

  /**
   * Registra feedback sobre validação
   */
  recordValidationFeedback(
    validationResults: ValidationResult[],
    corrections: ValidationFeedback[],
    context: FeedbackContext
  ): string {
    const feedbackId = this.generateFeedbackId();
    
    const feedback: FeedbackEntry = {
      id: feedbackId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      feedbackType: 'validation_rule',
      originalPrediction: validationResults,
      userCorrection: corrections,
      confidence: 0.6,
      context,
      impact: this.calculateImpact('validation_rule', corrections),
      status: 'pending'
    };
    
    this.feedbackStorage.set(feedbackId, feedback);
    this.processFeedback(feedback);
    
    return feedbackId;
  }

  /**
   * Registra feedback sobre esquema gerado
   */
  recordSchemaFeedback(
    originalSchema: JSONSchema,
    corrections: SchemaFeedback[],
    context: FeedbackContext
  ): string {
    const feedbackId = this.generateFeedbackId();
    
    const feedback: FeedbackEntry = {
      id: feedbackId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      feedbackType: 'schema_generation',
      originalPrediction: originalSchema,
      userCorrection: corrections,
      confidence: originalSchema.metadata.confidence,
      context,
      impact: this.calculateImpact('schema_generation', corrections),
      status: 'pending'
    };
    
    this.feedbackStorage.set(feedbackId, feedback);
    this.processFeedback(feedback);
    
    return feedbackId;
  }

  /**
   * Obtém sugestões baseadas em aprendizado anterior
   */
  getSuggestions(
    context: Partial<FeedbackContext>,
    type: FeedbackType
  ): any[] {
    const relevantPatterns = Array.from(this.learningPatterns.values())
      .filter(pattern => pattern.type === type.split('_')[0] as any)
      .filter(pattern => pattern.confidence > 0.7)
      .sort((a, b) => b.successRate - a.successRate);
    
    return relevantPatterns.slice(0, 5).map(pattern => ({
      suggestion: pattern.pattern,
      confidence: pattern.confidence,
      usage: pattern.usageCount,
      successRate: pattern.successRate
    }));
  }

  /**
   * Obtém métricas de aprendizado
   */
  getLearningMetrics(): LearningMetrics {
    const allFeedback = Array.from(this.feedbackStorage.values());
    const totalFeedback = allFeedback.length;
    
    if (totalFeedback === 0) {
      return {
        totalFeedback: 0,
        accuracyImprovement: 0,
        domainDetectionAccuracy: 0,
        fieldTypeAccuracy: 0,
        validationAccuracy: 0,
        userSatisfaction: 0,
        processingTimeImprovement: 0
      };
    }
    
    const domainFeedback = allFeedback.filter(f => f.feedbackType === 'domain_detection');
    const fieldTypeFeedback = allFeedback.filter(f => f.feedbackType === 'field_type_inference');
    const validationFeedback = allFeedback.filter(f => f.feedbackType === 'validation_rule');
    
    return {
      totalFeedback,
      accuracyImprovement: this.calculateAccuracyImprovement(allFeedback),
      domainDetectionAccuracy: this.calculateTypeAccuracy(domainFeedback),
      fieldTypeAccuracy: this.calculateTypeAccuracy(fieldTypeFeedback),
      validationAccuracy: this.calculateTypeAccuracy(validationFeedback),
      userSatisfaction: this.calculateUserSatisfaction(allFeedback),
      processingTimeImprovement: this.calculateProcessingTimeImprovement(allFeedback)
    };
  }

  /**
   * Obtém analytics detalhados
   */
  getAnalytics(period: string = '30d'): FeedbackAnalytics {
    const metrics = this.getLearningMetrics();
    const issues = this.identifyTopIssues();
    const improvements = this.getRecentImprovements();
    const recommendations = this.generateRecommendations();
    
    return {
      period,
      metrics,
      topIssues: issues,
      improvements,
      recommendations
    };
  }

  /**
   * Exporta dados de aprendizado
   */
  exportLearningData(): {
    feedback: FeedbackEntry[];
    patterns: LearningPattern[];
    rules: AdaptiveRule[];
    metrics: LearningMetrics;
  } {
    return {
      feedback: Array.from(this.feedbackStorage.values()),
      patterns: Array.from(this.learningPatterns.values()),
      rules: Array.from(this.adaptiveRules.values()),
      metrics: this.getLearningMetrics()
    };
  }

  /**
   * Importa dados de aprendizado
   */
  importLearningData(data: {
    feedback?: FeedbackEntry[];
    patterns?: LearningPattern[];
    rules?: AdaptiveRule[];
  }): void {
    if (data.feedback) {
      data.feedback.forEach(feedback => {
        this.feedbackStorage.set(feedback.id, feedback);
      });
    }
    
    if (data.patterns) {
      data.patterns.forEach(pattern => {
        this.learningPatterns.set(pattern.id, pattern);
      });
    }
    
    if (data.rules) {
      data.rules.forEach(rule => {
        this.adaptiveRules.set(rule.id, rule);
      });
    }
    
    this.saveStoredData();
  }

  /**
   * Limpa dados antigos
   */
  cleanupOldData(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Remove feedback antigo
    Array.from(this.feedbackStorage.entries()).forEach(([id, feedback]) => {
      if (new Date(feedback.timestamp) < cutoffDate) {
        this.feedbackStorage.delete(id);
      }
    });
    
    // Remove padrões não utilizados
    Array.from(this.learningPatterns.entries()).forEach(([id, pattern]) => {
      if (new Date(pattern.lastUsed) < cutoffDate && pattern.usageCount < 5) {
        this.learningPatterns.delete(id);
      }
    });
    
    this.saveStoredData();
  }

  // Métodos privados

  private processFeedback(feedback: FeedbackEntry): void {
    // Cria ou atualiza padrões de aprendizado
    this.updateLearningPatterns(feedback);
    
    // Cria ou atualiza regras adaptativas
    this.updateAdaptiveRules(feedback);
    
    // Marca como processado
    feedback.status = 'processed';
    
    // Salva dados
    this.saveStoredData();
  }

  private updateLearningPatterns(feedback: FeedbackEntry): void {
    const patternId = this.generatePatternId(feedback);
    
    let pattern = this.learningPatterns.get(patternId);
    
    if (!pattern) {
      pattern = {
        id: patternId,
        type: feedback.feedbackType.split('_')[0] as any,
        pattern: this.extractPattern(feedback),
        confidence: 0.5,
        usageCount: 1,
        successRate: 1.0,
        lastUsed: feedback.timestamp,
        createdFrom: [feedback.id]
      };
    } else {
      pattern.usageCount++;
      pattern.lastUsed = feedback.timestamp;
      pattern.createdFrom.push(feedback.id);
      pattern.confidence = Math.min(0.95, pattern.confidence + 0.1);
    }
    
    this.learningPatterns.set(patternId, pattern);
  }

  private updateAdaptiveRules(feedback: FeedbackEntry): void {
    // Implementação simplificada - criaria regras baseadas no feedback
    const ruleId = `rule_${feedback.feedbackType}_${Date.now()}`;
    
    const rule: AdaptiveRule = {
      id: ruleId,
      name: `Regra gerada por feedback ${feedback.feedbackType}`,
      description: `Regra criada baseada no feedback do usuário`,
      condition: this.generateRuleCondition(feedback),
      action: this.generateRuleAction(feedback),
      confidence: 0.7,
      createdAt: feedback.timestamp,
      lastUpdated: feedback.timestamp,
      usageStats: {
        applied: 0,
        successful: 0,
        failed: 0
      }
    };
    
    this.adaptiveRules.set(ruleId, rule);
  }

  private calculateImpact(type: FeedbackType, correction: any): FeedbackImpact {
    // Implementação simplificada
    return {
      affectedComponents: [type],
      improvementPotential: 0.8,
      similarCasesCount: 0,
      confidenceBoost: 0.1
    };
  }

  private calculateAccuracyImprovement(feedback: FeedbackEntry[]): number {
    if (feedback.length === 0) return 0;
    
    // Implementação simplificada - calcularia melhoria real na precisão
    const recentFeedback = feedback.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return feedbackDate > thirtyDaysAgo;
    });
    
    return Math.min(0.95, recentFeedback.length * 0.02);
  }

  private calculateTypeAccuracy(feedback: FeedbackEntry[]): number {
    if (feedback.length === 0) return 0;
    
    // Implementação simplificada
    return Math.max(0.5, 1 - (feedback.length * 0.1));
  }

  private calculateUserSatisfaction(feedback: FeedbackEntry[]): number {
    // Implementação simplificada - baseada na frequência de correções
    const totalSessions = new Set(feedback.map(f => f.sessionId)).size;
    if (totalSessions === 0) return 1.0;
    
    const correctionRate = feedback.length / totalSessions;
    return Math.max(0.1, 1 - (correctionRate * 0.2));
  }

  private calculateProcessingTimeImprovement(feedback: FeedbackEntry[]): number {
    // Implementação simplificada
    return Math.min(0.3, feedback.length * 0.01);
  }

  private identifyTopIssues(): FeedbackIssue[] {
    const issueMap = new Map<string, number>();
    
    Array.from(this.feedbackStorage.values()).forEach(feedback => {
      const key = feedback.feedbackType;
      issueMap.set(key, (issueMap.get(key) || 0) + 1);
    });
    
    return Array.from(issueMap.entries())
      .map(([type, frequency]) => ({
        type: type as FeedbackType,
        description: `Problemas com ${type.replace('_', ' ')}`,
        frequency,
        impact: frequency > 10 ? 'high' : frequency > 5 ? 'medium' : 'low' as const,
        suggestedFix: `Revisar algoritmo de ${type.replace('_', ' ')}`
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  private getRecentImprovements(): FeedbackImprovement[] {
    // Implementação simplificada
    return [
      {
        component: 'Detecção de Domínio',
        description: 'Melhoria na identificação de dados financeiros',
        beforeAccuracy: 0.75,
        afterAccuracy: 0.85,
        implementedAt: new Date().toISOString()
      }
    ];
  }

  private generateRecommendations(): string[] {
    const metrics = this.getLearningMetrics();
    const recommendations: string[] = [];
    
    if (metrics.domainDetectionAccuracy < 0.8) {
      recommendations.push('Considere adicionar mais palavras-chave para detecção de domínio');
    }
    
    if (metrics.fieldTypeAccuracy < 0.8) {
      recommendations.push('Revise os padrões de inferência de tipos de dados');
    }
    
    if (metrics.userSatisfaction < 0.7) {
      recommendations.push('Implemente mais validações automáticas para reduzir correções manuais');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando bem! Continue coletando feedback para melhorias contínuas.');
    }
    
    return recommendations;
  }

  private extractPattern(feedback: FeedbackEntry): any {
    // Extrai padrões úteis do feedback para aprendizado
    switch (feedback.feedbackType) {
      case 'domain_detection':
        return {
          fieldNames: feedback.context.detectedFields,
          domain: (feedback.userCorrection as DomainFeedback).correctedDomain,
          evidence: (feedback.userCorrection as DomainFeedback).fieldEvidence
        };
      case 'field_type_inference':
        return {
          fieldName: (feedback.userCorrection as FieldTypeFeedback).fieldName,
          correctType: (feedback.userCorrection as FieldTypeFeedback).correctedType,
          sampleValues: (feedback.userCorrection as FieldTypeFeedback).sampleValues
        };
      default:
        return feedback.userCorrection;
    }
  }

  private generateRuleCondition(feedback: FeedbackEntry): string {
    // Gera condições para regras adaptativas
    switch (feedback.feedbackType) {
      case 'domain_detection':
        const domainFeedback = feedback.userCorrection as DomainFeedback;
        return `fieldNames.includes('${domainFeedback.fieldEvidence.join("') || fieldNames.includes('")})`;
      case 'field_type_inference':
        const typeFeedback = feedback.userCorrection as FieldTypeFeedback;
        return `fieldName === '${typeFeedback.fieldName}' && sampleValues.some(v => /pattern/.test(v))`;
      default:
        return 'true';
    }
  }

  private generateRuleAction(feedback: FeedbackEntry): string {
    // Gera ações para regras adaptativas
    switch (feedback.feedbackType) {
      case 'domain_detection':
        const domainFeedback = feedback.userCorrection as DomainFeedback;
        return `setDomain('${domainFeedback.correctedDomain}')`;
      case 'field_type_inference':
        const typeFeedback = feedback.userCorrection as FieldTypeFeedback;
        return `setFieldType('${typeFeedback.fieldName}', '${typeFeedback.correctedType}')`;
      default:
        return 'applyCorrection()';
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternId(feedback: FeedbackEntry): string {
    return `pattern_${feedback.feedbackType}_${this.hashObject(feedback.userCorrection)}`;
  }

  private hashObject(obj: any): string {
    return btoa(JSON.stringify(obj)).substr(0, 8);
  }

  private loadStoredData(): void {
    try {
      // Em um ambiente real, carregaria do localStorage ou banco de dados
      const stored = localStorage.getItem('orquestrador_feedback_data');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.feedback) {
          data.feedback.forEach((f: FeedbackEntry) => {
            this.feedbackStorage.set(f.id, f);
          });
        }
        if (data.patterns) {
          data.patterns.forEach((p: LearningPattern) => {
            this.learningPatterns.set(p.id, p);
          });
        }
        if (data.rules) {
          data.rules.forEach((r: AdaptiveRule) => {
            this.adaptiveRules.set(r.id, r);
          });
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de feedback:', error);
    }
  }

  private saveStoredData(): void {
    try {
      const data = {
        feedback: Array.from(this.feedbackStorage.values()),
        patterns: Array.from(this.learningPatterns.values()),
        rules: Array.from(this.adaptiveRules.values())
      };
      localStorage.setItem('orquestrador_feedback_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar dados de feedback:', error);
    }
  }
}

// Instância singleton para uso global
export const feedbackSystem = new FeedbackSystem();