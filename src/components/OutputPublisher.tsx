'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Send, CheckCircle, ExternalLink, Copy, Database, Globe, FileText, TestTube, AlertCircle } from 'lucide-react'
import { TransformedData, OutputTarget } from '@/types'
import { cn } from '@/lib/utils'
import { createDatabaseService, DatabaseService } from '@/lib/database-service'

interface OutputPublisherProps {
  transformedData: TransformedData
  onComplete: (result: any) => void
}

export function OutputPublisher({ transformedData, onComplete }: OutputPublisherProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<any>(null)
  const [selectedTarget, setSelectedTarget] = useState<OutputTarget>({
    type: 'rest-api',
    endpoint: '',
    format: 'json'
  })
  const [showPreview, setShowPreview] = useState(false)
  const [connectionString, setConnectionString] = useState('')
  const [tableName, setTableName] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null)

  const targetTypes = [
    {
      id: 'rest-api',
      name: 'API REST',
      icon: Globe,
      description: 'Enviar dados via HTTP POST para uma API REST',
      formats: ['json']
    },
    {
      id: 'database',
      name: 'Banco de Dados',
      icon: Database,
      description: 'Inserir dados diretamente em um banco de dados',
      formats: ['json']
    },
    {
      id: 'file',
      name: 'Arquivo',
      icon: FileText,
      description: 'Salvar dados como arquivo para download',
      formats: ['json', 'csv', 'xml']
    }
  ]

  const handlePublish = async () => {
    setIsPublishing(true)
    
    try {
      // Simular publicação
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      let result: any = {
        success: true,
        timestamp: new Date().toISOString(),
        recordsProcessed: transformedData.data.length,
        target: selectedTarget
      }

      switch (selectedTarget.type) {
        case 'rest-api':
          result = {
            ...result,
            endpoint: selectedTarget.endpoint,
            statusCode: 201,
            response: {
              message: 'Dados enviados com sucesso',
              id: 'batch_' + Date.now(),
              records: transformedData.data.length
            }
          }
          break
          
        case 'database':
          if (!connectionString.trim()) {
            throw new Error('String de conexão é obrigatória para publicação no banco de dados')
          }
          
          const dbService = createDatabaseService(connectionString, tableName || undefined)
          const dbResult = await dbService.publishData(transformedData)
          
          if (!dbResult.success) {
            throw new Error(dbResult.error || 'Erro ao publicar no banco de dados')
          }
          
          result = {
            ...result,
            database: connectionString.split('@')[1]?.split('/')[0] || 'database',
            table: dbResult.tableName,
            insertedRows: dbResult.insertedRows,
            executedQueries: dbResult.executedQueries
          }
          break
          
        case 'file':
          const fileName = `dados_transformados_${Date.now()}.${selectedTarget.format}`
          result = {
            ...result,
            fileName,
            fileSize: JSON.stringify(transformedData.data).length,
            downloadUrl: `/downloads/${fileName}`
          }
          break
      }
      
      setPublishResult(result)
      onComplete(result)
      
    } catch (error) {
      setPublishResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const generatePreviewData = () => {
    switch (selectedTarget.format) {
      case 'json':
        return JSON.stringify(transformedData.data.slice(0, 3), null, 2)
      case 'csv':
        const headers = transformedData.schema.map(field => field.name).join(',')
        const rows = transformedData.data.slice(0, 3).map(row => 
          transformedData.schema.map(field => row[field.name] || '').join(',')
        ).join('\n')
        return `${headers}\n${rows}`
      case 'xml':
        return `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${transformedData.data.slice(0, 3).map(row => 
          `  <record>\n${transformedData.schema.map(field => 
            `    <${field.name}>${row[field.name] || ''}</${field.name}>`
          ).join('\n')}\n  </record>`
        ).join('\n')}\n</data>`
      default:
        return ''
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const testDatabaseConnection = async () => {
    if (!connectionString.trim()) {
      setConnectionTestResult({
        success: false,
        message: 'Por favor, insira uma string de conexão'
      })
      return
    }

    setIsTestingConnection(true)
    setConnectionTestResult(null)

    try {
      const dbService = createDatabaseService(connectionString)
      const result = await dbService.testConnection()
      setConnectionTestResult(result)
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao testar conexão'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Target className="h-8 w-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Publicação de Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Envie os dados transformados para o sistema contemporâneo
            </p>
          </div>
        </div>

        {/* Resumo dos dados */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="font-medium text-green-900 dark:text-green-100 mb-3">
            Dados prontos para publicação:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transformedData.data.length}
              </p>
              <p className="text-sm text-green-600">Registros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transformedData.schema.length}
              </p>
              <p className="text-sm text-green-600">Campos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transformedData.transformationRules.length}
              </p>
              <p className="text-sm text-green-600">Transformações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transformedData.validationErrors.length}
              </p>
              <p className="text-sm text-green-600">Avisos</p>
            </div>
          </div>
        </div>

        {/* Seleção do destino */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            Selecione o destino dos dados:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {targetTypes.map((target) => {
              const Icon = target.icon
              const isSelected = selectedTarget.type === target.id
              
              return (
                <button
                  key={target.id}
                  onClick={() => setSelectedTarget(prev => ({ ...prev, type: target.id as any }))}
                  className={cn(
                    "p-4 border-2 rounded-lg text-left transition-all duration-200",
                    isSelected
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className={cn(
                      "h-6 w-6",
                      isSelected ? "text-green-600" : "text-gray-500"
                    )} />
                    <h4 className={cn(
                      "font-medium",
                      isSelected ? "text-green-900 dark:text-green-100" : "text-gray-900 dark:text-white"
                    )}>
                      {target.name}
                    </h4>
                  </div>
                  <p className={cn(
                    "text-sm",
                    isSelected ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400"
                  )}>
                    {target.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Configurações específicas do destino */}
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Configurações do destino
          </h4>
          
          <div className="space-y-4">
            {selectedTarget.type === 'rest-api' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL da API
                </label>
                <input
                  type="url"
                  value={selectedTarget.endpoint || ''}
                  onChange={(e) => setSelectedTarget(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="https://api.exemplo.com/data"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            
            {selectedTarget.type === 'database' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    String de Conexão *
                  </label>
                  <input
                    type="text"
                    value={connectionString}
                    onChange={(e) => {
                      setConnectionString(e.target.value)
                      setConnectionTestResult(null) // Limpar resultado do teste anterior
                    }}
                    placeholder="postgresql://user:password@localhost:5432/database"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formatos suportados: postgresql://, mysql://, sqlite:///, sqlserver://
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome da Tabela (opcional)
                  </label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Se vazio, será gerado automaticamente"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Botão de teste de conexão */}
                <div>
                  <button
                    onClick={testDatabaseConnection}
                    disabled={isTestingConnection || !connectionString.trim()}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isTestingConnection || !connectionString.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {isTestingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Testando...</span>
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4" />
                        <span>Testar Conexão</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Resultado do teste de conexão */}
                {connectionTestResult && (
                  <div className={cn(
                    "p-3 rounded-md text-sm",
                    connectionTestResult.success
                      ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                  )}>
                    <div className="flex items-center space-x-2">
                      {connectionTestResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {connectionTestResult.success ? 'Conexão bem-sucedida!' : 'Erro na conexão'}
                      </span>
                    </div>
                    <p className="mt-1">{connectionTestResult.message}</p>
                    {connectionTestResult.details && (
                      <div className="mt-2 text-xs">
                        <p><strong>Tipo:</strong> {connectionTestResult.details.type}</p>
                        <p><strong>Host:</strong> {connectionTestResult.details.host}:{connectionTestResult.details.port}</p>
                        <p><strong>Database:</strong> {connectionTestResult.details.database}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Formato de saída
              </label>
              <select
                value={selectedTarget.format}
                onChange={(e) => setSelectedTarget(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                {targetTypes.find(t => t.id === selectedTarget.type)?.formats.map(format => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview dos dados */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Preview dos dados de saída
            </h4>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showPreview ? 'Ocultar' : 'Mostrar'} preview
            </button>
          </div>
          
          {showPreview && (
            <div className="relative">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto max-h-64 overflow-y-auto">
                <code>{generatePreviewData()}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(generatePreviewData())}
                className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copiar para área de transferência"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Botão de publicação */}
        {!publishResult && (
          <div className="flex justify-center">
            <button
              onClick={handlePublish}
              disabled={isPublishing || 
                       (selectedTarget.type === 'rest-api' && !selectedTarget.endpoint) ||
                       (selectedTarget.type === 'database' && !connectionString.trim())}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                isPublishing || 
                (selectedTarget.type === 'rest-api' && !selectedTarget.endpoint) ||
                (selectedTarget.type === 'database' && !connectionString.trim())
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 hover:scale-105"
              )}
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Publicando dados...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Publicar Dados</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Resultado da publicação */}
      {publishResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {publishResult.success ? 'Publicação Concluída!' : 'Erro na Publicação'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {publishResult.success 
                  ? 'Os dados foram enviados com sucesso para o sistema contemporâneo'
                  : 'Ocorreu um erro durante a publicação dos dados'
                }
              </p>
            </div>
          </div>

          {publishResult.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {publishResult.recordsProcessed}
                  </p>
                  <p className="text-xs text-green-600">Registros enviados</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    {selectedTarget.format.toUpperCase()}
                  </p>
                  <p className="text-xs text-blue-600">Formato</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">
                    {selectedTarget.type === 'rest-api' ? 'API' : 
                     selectedTarget.type === 'database' ? 'DB' : 'FILE'}
                  </p>
                  <p className="text-xs text-purple-600">Destino</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
                    {new Date(publishResult.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Horário</p>
                </div>
              </div>

              {/* Detalhes específicos do resultado */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Detalhes da publicação:
                </h4>
                <div className="space-y-2 text-sm">
                  {publishResult.endpoint && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Endpoint:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{publishResult.endpoint}</span>
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                  {publishResult.statusCode && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className="text-green-600 font-medium">{publishResult.statusCode}</span>
                    </div>
                  )}
                  {publishResult.fileName && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Arquivo:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{publishResult.fileName}</span>
                    </div>
                  )}
                  {publishResult.table && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Tabela:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{publishResult.table}</span>
                    </div>
                  )}
                  {publishResult.database && selectedTarget.type === 'database' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Banco:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{publishResult.database}</span>
                    </div>
                  )}
                  {publishResult.executedQueries && publishResult.executedQueries.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Queries executadas:</span>
                      <div className="mt-1 space-y-1">
                        {publishResult.executedQueries.slice(0, 2).map((query: string, index: number) => (
                          <div key={index} className="bg-gray-100 dark:bg-gray-600 p-2 rounded text-xs font-mono">
                            {query.length > 100 ? query.substring(0, 100) + '...' : query}
                          </div>
                        ))}
                        {publishResult.executedQueries.length > 2 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ... e mais {publishResult.executedQueries.length - 2} queries
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-medium text-green-600">
                  ✅ Orquestração concluída com sucesso!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Os dados do sistema legado foram transformados e enviados para o sistema contemporâneo.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">
                {publishResult.error}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}