export interface CSVData {
  headers: string[]
  rows: string[][]
  fileName: string
  fileSize: number
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  sourceType: DataType
  targetType: DataType
  transformation?: string
  confidence: number
}

export interface SchemaAnalysis {
  sourceSchema: FieldSchema[]
  suggestedMappings: FieldMapping[]
  targetSchema?: FieldSchema[]
  confidence: number
  reasoning: string
}

export interface FieldSchema {
  name: string
  type: DataType
  nullable: boolean
  description?: string
  examples: string[]
}

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'id'

export interface TransformationRule {
  field: string
  operation: 'rename' | 'convert' | 'split' | 'merge' | 'validate' | 'normalize'
  parameters: Record<string, any>
}

export interface TransformedData {
  data: Record<string, any>[]
  schema: FieldSchema[]
  transformationRules: TransformationRule[]
  validationErrors: ValidationError[]
}

export interface ValidationError {
  row: number
  field: string
  value: any
  error: string
}

export interface AIProvider {
  name: 'gemini' | 'groq'
  apiKey: string
  model: string
}

export interface OutputTarget {
  type: 'rest-api' | 'database' | 'file'
  endpoint?: string
  credentials?: Record<string, string>
  format: 'json' | 'csv' | 'xml'
}

export interface ProcessingStatus {
  step: 'upload' | 'analyze' | 'transform' | 'publish'
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  message?: string
  error?: string
}