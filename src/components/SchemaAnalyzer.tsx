'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Settings, CheckCircle, AlertCircle, Zap, ArrowRight } from 'lucide-react'
import { CSVData, SchemaAnalysis, AIProvider } from '@/types'
import { AIService } from '@/lib/ai-service'
import { cn } from '@/lib/utils'

interface SchemaAnalyzerProps {
  inputData: CSVData
  onComplete: (analysis: SchemaAnalysis) => void
}

export function SchemaAnalyzer({ inputData, onComplete }: SchemaAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<AIProvider>({
    name: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash'
  })
  const [showConfig, setShowConfig] = useState(true)

  const handleAnalyze = async () => {
    if (!aiProvider.apiKey.trim()) {
      setError('Por favor, configure a chave da API')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const aiService = new AIService(aiProvider.name, aiProvider.apiKey)
      const result = await aiService.analyzeSchema(inputData)
      setAnalysis(result)
      setShowConfig(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na análise')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfirm = () => {
    if (analysis) {
      onComplete(analysis)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (confidence >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Análise com IA Generativa
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Configure a IA para analisar e sugerir mapeamentos de dados
            </p>
          </div>
        </div>

        {/* Configuração da IA */}
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="h-5 w-5 text-gray-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Configuração da IA
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provedor de IA
                </label>
                <select
                  value={aiProvider.name}
                  onChange={(e) => setAiProvider(prev => ({ ...prev, name: e.target.value as 'gemini' | 'groq' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chave da API
                </label>
                <input
                  type="password"
                  value={aiProvider.apiKey}
                  onChange={(e) => setAiProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={`Chave da API do ${aiProvider.name === 'gemini' ? 'Google AI Studio' : 'Groq'}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Dica:</strong> {aiProvider.name === 'gemini' 
                  ? 'Obtenha sua chave gratuita em ai.google.dev'
                  : 'Obtenha sua chave em console.groq.com'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* Informações do arquivo */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Dados de Entrada
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Arquivo:</span>
              <p className="font-medium text-gray-900 dark:text-white">{inputData.fileName}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Campos:</span>
              <p className="font-medium text-gray-900 dark:text-white">{inputData.headers.length}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Registros:</span>
              <p className="font-medium text-gray-900 dark:text-white">{inputData.rows.length}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <p className="font-medium text-green-600">Pronto para análise</p>
            </div>
          </div>
        </div>

        {/* Botão de análise */}
        {!analysis && (
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !aiProvider.apiKey.trim()}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                isAnalyzing || !aiProvider.apiKey.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
              )}
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Analisando com IA...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <span>Iniciar Análise com IA</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Resultados da análise */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Resultados da Análise
            </h3>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              getConfidenceBg(analysis.confidence)
            )}>
              <span className={getConfidenceColor(analysis.confidence)}>
                Confiança: {analysis.confidence}%
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Raciocínio da IA
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              {analysis.reasoning}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Mapeamentos Sugeridos ({analysis.suggestedMappings.length})
            </h4>
            
            <div className="space-y-3">
              {analysis.suggestedMappings.map((mapping, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mapping.sourceField}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {mapping.sourceType}
                      </p>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mapping.targetField}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {mapping.targetType}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {mapping.transformation && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Transformação:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {mapping.transformation}
                        </p>
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      getConfidenceBg(mapping.confidence)
                    )}>
                      <span className={getConfidenceColor(mapping.confidence)}>
                        {mapping.confidence}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleConfirm}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Aprovar e Continuar</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}