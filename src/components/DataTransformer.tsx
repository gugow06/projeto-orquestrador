'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cog, Play, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { CSVData, SchemaAnalysis, TransformedData, TransformationRule, ValidationError } from '@/types'
import { cn } from '@/lib/utils'

interface DataTransformerProps {
  inputData: CSVData
  analysisResult: SchemaAnalysis
  onComplete: (transformedData: TransformedData) => void
}

export function DataTransformer({ inputData, analysisResult, onComplete }: DataTransformerProps) {
  const [isTransforming, setIsTransforming] = useState(false)
  const [transformedData, setTransformedData] = useState<TransformedData | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([])

  const handleTransform = async () => {
    setIsTransforming(true)
    
    try {
      // Simular transformação dos dados
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const transformationRules: TransformationRule[] = analysisResult.suggestedMappings.map(mapping => ({
        field: mapping.sourceField,
        operation: mapping.transformation?.includes('rename') ? 'rename' : 
                  mapping.sourceType !== mapping.targetType ? 'convert' : 'validate',
        parameters: {
          targetField: mapping.targetField,
          sourceType: mapping.sourceType,
          targetType: mapping.targetType,
          transformation: mapping.transformation
        }
      }))

      const transformedRows = inputData.rows.map((row, rowIndex) => {
        const transformedRow: Record<string, any> = {}
        const errors: ValidationError[] = []

        analysisResult.suggestedMappings.forEach((mapping, mappingIndex) => {
          const sourceIndex = inputData.headers.indexOf(mapping.sourceField)
          const sourceValue = row[sourceIndex]
          
          try {
            let transformedValue = sourceValue
            
            // Aplicar transformações baseadas no tipo
            if (mapping.targetType === 'number' && mapping.sourceType === 'string') {
              transformedValue = (parseFloat(sourceValue) || 0).toString()
            } else if (mapping.targetType === 'boolean') {
              transformedValue = ['true', 'yes', '1', 'sim'].includes(sourceValue?.toLowerCase()).toString()
            } else if (mapping.targetType === 'date') {
              transformedValue = new Date(sourceValue).toISOString().split('T')[0]
            }
            
            // Normalizar nome do campo
            const normalizedFieldName = mapping.targetField.toLowerCase().replace(/[^a-z0-9]/g, '_')
            transformedRow[normalizedFieldName] = transformedValue
            
          } catch (error) {
            errors.push({
              row: rowIndex,
              field: mapping.sourceField,
              value: sourceValue,
              error: `Erro na transformação: ${error}`
            })
          }
        })
        
        setValidationErrors(prev => [...prev, ...errors])
        return transformedRow
      })

      const targetSchema = analysisResult.suggestedMappings.map(mapping => ({
        name: mapping.targetField.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        type: mapping.targetType,
        nullable: true,
        description: `Transformado de ${mapping.sourceField}`,
        examples: []
      }))

      const result: TransformedData = {
        data: transformedRows,
        schema: targetSchema,
        transformationRules,
        validationErrors
      }

      setTransformedData(result)
      setPreviewData(transformedRows.slice(0, 10))
      
    } catch (error) {
      console.error('Erro na transformação:', error)
    } finally {
      setIsTransforming(false)
    }
  }

  const handleConfirm = () => {
    if (transformedData) {
      onComplete(transformedData)
    }
  }

  const downloadTransformedData = () => {
    if (!transformedData) return
    
    const csv = [
      transformedData.schema.map(field => field.name).join(','),
      ...transformedData.data.map(row => 
        transformedData.schema.map(field => row[field.name] || '').join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dados_transformados.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Cog className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transformação de Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Aplicar as transformações sugeridas pela IA
            </p>
          </div>
        </div>

        {/* Resumo das transformações */}
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-3">
            Transformações a serem aplicadas:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisResult.suggestedMappings.map((mapping, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded border">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {mapping.sourceField} → {mapping.targetField}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {mapping.sourceType} → {mapping.targetType}
                  </p>
                </div>
                {mapping.transformation && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                    {mapping.transformation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {inputData.rows.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Registros</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analysisResult.suggestedMappings.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Campos</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {analysisResult.suggestedMappings.filter(m => m.sourceType !== m.targetType).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Conversões</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {Math.round(analysisResult.confidence)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Confiança</p>
          </div>
        </div>

        {/* Botão de transformação */}
        {!transformedData && (
          <div className="flex justify-center">
            <button
              onClick={handleTransform}
              disabled={isTransforming}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                isTransforming
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105"
              )}
            >
              {isTransforming ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Transformando dados...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Iniciar Transformação</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Resultados da transformação */}
      {transformedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Dados Transformados
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadTransformedData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* Alertas de validação */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Avisos de Validação ({validationErrors.length})
                </h4>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {validationErrors.slice(0, 5).map((error, index) => (
                  <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    Linha {error.row + 1}, Campo {error.field}: {error.error}
                  </p>
                ))}
                {validationErrors.length > 5 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ... e mais {validationErrors.length - 5} avisos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview dos dados transformados */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Preview dos Dados Transformados
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {transformedData.schema.map((field, index) => (
                        <th
                          key={index}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {field.name}
                          <span className="ml-1 text-xs text-gray-400">({field.type})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {transformedData.schema.map((field, fieldIndex) => (
                          <td
                            key={fieldIndex}
                            className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                          >
                            {String(row[field.name] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Mostrando {Math.min(10, transformedData.data.length)} de {transformedData.data.length} registros transformados
              </div>
            </div>
          </div>

          {/* Estatísticas da transformação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                {transformedData.data.length}
              </p>
              <p className="text-xs text-green-600">Registros processados</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-lg font-bold text-blue-600">
                {transformedData.schema.length}
              </p>
              <p className="text-xs text-blue-600">Campos mapeados</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-lg font-bold text-purple-600">
                {transformedData.transformationRules.length}
              </p>
              <p className="text-xs text-purple-600">Regras aplicadas</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">
                {validationErrors.length}
              </p>
              <p className="text-xs text-yellow-600">Avisos</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleConfirm}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Confirmar e Publicar</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}