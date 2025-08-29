/**
 * Interface adaptativa que se ajusta ao tipo de dados detectado
 * Oferece visualizações e controles específicos para cada domínio
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  Database, 
  FileText, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Settings,
  Eye,
  Download
} from 'lucide-react';

import { DataType } from '@/lib/data-type-inference';
import { DomainType, DomainAnalysisResult } from '@/lib/domain-analyzer';
import { ValidationResult } from '@/lib/data-validator';
import { SuggestionResult } from '@/lib/learning-system';

export interface AdaptiveInterfaceProps {
  data: any[];
  domainAnalysis: DomainAnalysisResult;
  validationResults: ValidationResult[];
  suggestions: SuggestionResult;
  onMappingChange: (mapping: FieldMapping[]) => void;
  onTransformationApply: (transformations: TransformationConfig[]) => void;
  onValidationFeedback: (feedback: ValidationFeedback[]) => void;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: DataType;
  confidence: number;
  transformation?: string;
}

export interface TransformationConfig {
  field: string;
  operation: string;
  parameters: Record<string, any>;
}

export interface ValidationFeedback {
  field: string;
  accepted: boolean;
  correction?: string;
}

interface DomainConfig {
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  description: string;
  features: string[];
  visualizations: VisualizationType[];
  suggestedFields: SuggestedField[];
}

interface SuggestedField {
  name: string;
  type: DataType;
  required: boolean;
  description: string;
}

type VisualizationType = 'table' | 'chart' | 'summary' | 'validation' | 'mapping';

const DOMAIN_CONFIGS: Record<DomainType, DomainConfig> = {
  financeiro: {
    icon: CreditCard,
    color: 'bg-green-500',
    title: 'Dados Financeiros',
    description: 'Transações, valores monetários e informações bancárias',
    features: ['Validação de CPF/CNPJ', 'Formatação de valores', 'Análise de transações'],
    visualizations: ['table', 'chart', 'summary', 'validation'],
    suggestedFields: [
      { name: 'cpf', type: 'cpf', required: true, description: 'CPF do cliente' },
      { name: 'valor', type: 'moeda_real', required: true, description: 'Valor da transação' },
      { name: 'data_transacao', type: 'datetime', required: true, description: 'Data e hora da transação' },
      { name: 'tipo_transacao', type: 'texto', required: true, description: 'Tipo da operação' }
    ]
  },
  cadastral: {
    icon: Users,
    color: 'bg-blue-500',
    title: 'Dados Cadastrais',
    description: 'Informações pessoais e de contato',
    features: ['Validação de documentos', 'Formatação de endereços', 'Normalização de nomes'],
    visualizations: ['table', 'summary', 'validation', 'mapping'],
    suggestedFields: [
      { name: 'nome_completo', type: 'texto', required: true, description: 'Nome completo da pessoa' },
      { name: 'cpf', type: 'cpf', required: true, description: 'CPF' },
      { name: 'email', type: 'email', required: false, description: 'Email de contato' },
      { name: 'telefone', type: 'telefone', required: false, description: 'Telefone de contato' }
    ]
  },
  transacional: {
    icon: TrendingUp,
    color: 'bg-purple-500',
    title: 'Dados Transacionais',
    description: 'Histórico de operações e movimentações',
    features: ['Análise temporal', 'Agrupamento por tipo', 'Detecção de padrões'],
    visualizations: ['table', 'chart', 'summary', 'validation'],
    suggestedFields: [
      { name: 'id_transacao', type: 'transaction_id', required: true, description: 'Identificador único' },
      { name: 'timestamp', type: 'datetime', required: true, description: 'Data e hora' },
      { name: 'valor', type: 'numero_decimal', required: true, description: 'Valor da operação' },
      { name: 'status', type: 'texto', required: true, description: 'Status da transação' }
    ]
  },
  ecommerce: {
    icon: ShoppingCart,
    color: 'bg-orange-500',
    title: 'Dados de E-commerce',
    description: 'Produtos, vendas e informações comerciais',
    features: ['Análise de produtos', 'Métricas de vendas', 'Gestão de estoque'],
    visualizations: ['table', 'chart', 'summary', 'mapping'],
    suggestedFields: [
      { name: 'produto_id', type: 'texto', required: true, description: 'ID do produto' },
      { name: 'preco', type: 'moeda_real', required: true, description: 'Preço do produto' },
      { name: 'categoria', type: 'texto', required: true, description: 'Categoria do produto' },
      { name: 'estoque', type: 'numero_inteiro', required: false, description: 'Quantidade em estoque' }
    ]
  },
  generico: {
    icon: Database,
    color: 'bg-gray-500',
    title: 'Dados Genéricos',
    description: 'Dados diversos sem domínio específico identificado',
    features: ['Análise exploratória', 'Detecção de padrões', 'Validação básica'],
    visualizations: ['table', 'summary', 'validation', 'mapping'],
    suggestedFields: [
      { name: 'id', type: 'texto', required: true, description: 'Identificador' },
      { name: 'nome', type: 'texto', required: true, description: 'Nome ou descrição' },
      { name: 'valor', type: 'numero_decimal', required: false, description: 'Valor numérico' },
      { name: 'data', type: 'data_brasileira', required: false, description: 'Data relevante' }
    ]
  }
};

export function AdaptiveInterface({
  data,
  domainAnalysis,
  validationResults,
  suggestions,
  onMappingChange,
  onTransformationApply,
  onValidationFeedback
}: AdaptiveInterfaceProps) {
  const [activeTab, setActiveTab] = useState<VisualizationType>('summary');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const domainConfig = DOMAIN_CONFIGS[domainAnalysis.domain] || DOMAIN_CONFIGS.generico;
  const Icon = domainConfig.icon;

  // Inicializa mapeamentos baseado nas sugestões
  useEffect(() => {
    if (suggestions.suggestions.length > 0) {
      const mappings = suggestions.suggestions.map(suggestion => ({
        sourceField: suggestion.sourceField,
        targetField: suggestion.targetField,
        dataType: getFieldDataType(suggestion.sourceField),
        confidence: suggestion.confidence,
        transformation: suggestion.transformation?.operation.type
      }));
      setFieldMappings(mappings);
    }
  }, [suggestions]);

  const getFieldDataType = (fieldName: string): DataType => {
    const analysis = domainAnalysis.fieldAnalysis.find(f => f.fieldName === fieldName);
    return analysis?.inferredType || 'texto';
  };

  const validationSummary = useMemo(() => {
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.isValid).length;
    const warnings = validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
    const errors = validationResults.reduce((sum, r) => sum + r.errors.length, 0);
    
    return { total, valid, warnings, errors, validPercentage: (valid / total) * 100 };
  }, [validationResults]);

  const handleMappingChange = (index: number, field: keyof FieldMapping, value: any) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFieldMappings(newMappings);
    onMappingChange(newMappings);
  };

  const renderSummaryView = () => (
    <div className="space-y-6">
      {/* Cabeçalho do domínio */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${domainConfig.color} text-white`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{domainConfig.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{domainConfig.description}</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              Confiança: {Math.round(domainAnalysis.confidence * 100)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.length}</div>
              <div className="text-sm text-muted-foreground">Registros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Object.keys(data[0] || {}).length}</div>
              <div className="text-sm text-muted-foreground">Campos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(validationSummary.validPercentage)}%</div>
              <div className="text-sm text-muted-foreground">Dados Válidos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status de validação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Status de Validação</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Dados Válidos</span>
                <span>{validationSummary.valid}/{validationSummary.total}</span>
              </div>
              <Progress value={validationSummary.validPercentage} className="h-2" />
            </div>
            
            {validationSummary.errors > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validationSummary.errors} erro(s) encontrado(s) que precisam de atenção.
                </AlertDescription>
              </Alert>
            )}
            
            {validationSummary.warnings > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {validationSummary.warnings} aviso(s) de qualidade de dados detectado(s).
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sugestões de mapeamento */}
      {suggestions.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Sugestões Inteligentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{suggestions.reasoning}</p>
              {suggestions.suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{suggestion.sourceField} → {suggestion.targetField}</div>
                    <div className="text-sm text-muted-foreground">{suggestion.reasoning}</div>
                  </div>
                  <Badge variant="secondary">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recursos do domínio */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {domainConfig.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTableView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Visualização dos Dados</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(data[0] || {}).map((header) => (
                  <TableHead key={header} className="min-w-[120px]">
                    <div className="space-y-1">
                      <div>{header}</div>
                      <Badge variant="outline" className="text-xs">
                        {getFieldDataType(header)}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  {Object.entries(row).map(([key, value], cellIndex) => {
                    const validation = validationResults.find(v => 
                      v.errors.some(e => e.field === key) || 
                      v.warnings.some(w => w.field === key)
                    );
                    
                    return (
                      <TableCell key={cellIndex} className="relative">
                        <div className="flex items-center space-x-2">
                          <span className={validation ? 'text-orange-600' : ''}>
                            {String(value)}
                          </span>
                          {validation && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length > 10 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Mostrando 10 de {data.length} registros
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderValidationView = () => (
    <div className="space-y-4">
      {validationResults.map((result, index) => {
        if (result.errors.length === 0 && result.warnings.length === 0) return null;
        
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {result.errors.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <Info className="h-5 w-5 text-orange-500" />
                )}
                <span>Problemas de Validação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.errors.map((error, errorIndex) => (
                  <Alert key={errorIndex} variant="destructive">
                    <AlertDescription>
                      <strong>{error.field}:</strong> {error.message}
                      {error.expectedFormat && (
                        <div className="mt-1 text-sm">
                          Formato esperado: {error.expectedFormat}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
                
                {result.warnings.map((warning, warningIndex) => (
                  <Alert key={warningIndex}>
                    <AlertDescription>
                      <strong>{warning.field}:</strong> {warning.message}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Sugestão: {warning.suggestion}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {result.suggestions.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-2">Sugestões:</div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {result.suggestions.map((suggestion, suggestionIndex) => (
                        <li key={suggestionIndex}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderMappingView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mapeamento de Campos</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Ocultar' : 'Avançado'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.keys(data[0] || {}).map((sourceField, index) => {
            const mapping = fieldMappings.find(m => m.sourceField === sourceField);
            const suggestedField = domainConfig.suggestedFields.find(sf => 
              sf.name.toLowerCase().includes(sourceField.toLowerCase()) ||
              sourceField.toLowerCase().includes(sf.name.toLowerCase())
            );
            
            return (
              <div key={sourceField} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Campo Origem</Label>
                  <div className="mt-1">
                    <div className="font-medium">{sourceField}</div>
                    <Badge variant="outline" className="mt-1">
                      {getFieldDataType(sourceField)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`target-${index}`} className="text-sm font-medium">
                    Campo Destino
                  </Label>
                  <Input
                    id={`target-${index}`}
                    value={mapping?.targetField || suggestedField?.name || ''}
                    onChange={(e) => {
                      const mappingIndex = fieldMappings.findIndex(m => m.sourceField === sourceField);
                      if (mappingIndex >= 0) {
                        handleMappingChange(mappingIndex, 'targetField', e.target.value);
                      } else {
                        const newMapping: FieldMapping = {
                          sourceField,
                          targetField: e.target.value,
                          dataType: getFieldDataType(sourceField),
                          confidence: 0.8
                        };
                        setFieldMappings([...fieldMappings, newMapping]);
                      }
                    }}
                    placeholder="Nome do campo no destino"
                    className="mt-1"
                  />
                  {suggestedField && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {suggestedField.description}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Confiança</Label>
                  <div className="mt-1">
                    <Progress 
                      value={(mapping?.confidence || 0) * 100} 
                      className="h-2" 
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round((mapping?.confidence || 0) * 100)}%
                    </div>
                  </div>
                </div>
                
                {showAdvanced && (
                  <div className="md:col-span-3 mt-4 p-3 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Transformação</Label>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {mapping?.transformation || 'Nenhuma transformação aplicada'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VisualizationType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Dados</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Validação</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Mapeamento</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">{renderSummaryView()}</TabsContent>
        <TabsContent value="table">{renderTableView()}</TabsContent>
        <TabsContent value="validation">{renderValidationView()}</TabsContent>
        <TabsContent value="mapping">{renderMappingView()}</TabsContent>
      </Tabs>
    </div>
  );
}