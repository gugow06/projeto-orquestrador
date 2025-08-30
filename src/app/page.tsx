'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Database, Zap, Target, ArrowRight } from 'lucide-react'
import { FileUploader } from '@/components/FileUploader'
import { SchemaAnalyzer } from '@/components/SchemaAnalyzer'
import { DataTransformer } from '@/components/DataTransformer'
import { OutputPublisher } from '@/components/OutputPublisher'
import { AdaptiveInterface } from '@/components/adaptive-interface'

type Step = 'upload' | 'analyze' | 'transform' | 'publish'

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedData, setUploadedData] = useState<any>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [transformedData, setTransformedData] = useState<any>(null)
  const [useAdaptiveInterface, setUseAdaptiveInterface] = useState<boolean>(false)

  const steps = [
    { id: 'upload', title: 'Upload de Dados', icon: Upload, description: 'Carregue arquivos do sistema legado' },
    { id: 'analyze', title: 'Análise com IA', icon: Zap, description: 'IA analisa e sugere mapeamentos' },
    { id: 'transform', title: 'Transformação', icon: Database, description: 'Aplique as transformações sugeridas' },
    { id: 'publish', title: 'Publicação', icon: Target, description: 'Envie para o sistema contemporâneo' },
  ]

  const handleStepComplete = (step: Step, data: any) => {
    switch (step) {
      case 'upload':
        setUploadedData(data)
        setCurrentStep('analyze')
        break
      case 'analyze':
        setAnalysisResult(data)
        setCurrentStep('transform')
        break
      case 'transform':
        setTransformedData(data)
        setCurrentStep('publish')
        break
      case 'publish':
        console.log('Processo concluído!')
        break
    }
  }

  const renderStepContent = () => {
    // Se a interface adaptativa estiver habilitada e tivermos dados, use ela
    if (useAdaptiveInterface && uploadedData && currentStep === 'analyze') {
      return (
        <AdaptiveInterface 
          data={uploadedData}
          domainAnalysis={{ domain: 'generico', confidence: 0.8, characteristics: [], suggestedSchema: { name: '', description: '', fields: [] }, transformationRules: [], validationRules: [] }}
          validationResults={[]}
          suggestions={{ suggestions: [], confidence: 0, reasoning: '', alternatives: [] }}
          onMappingChange={(mapping) => console.log('Mapping changed:', mapping)}
          onTransformationApply={(transformations) => console.log('Transformations applied:', transformations)}
          onValidationFeedback={(feedback) => console.log('Validation feedback:', feedback)}
        />
      )
    }
    
    switch (currentStep) {
      case 'upload':
        return <FileUploader onComplete={(data) => handleStepComplete('upload', data)} />
      case 'analyze':
        return (
          <SchemaAnalyzer 
            inputData={uploadedData} 
            onComplete={(data) => handleStepComplete('analyze', data)} 
          />
        )
      case 'transform':
        return (
          <DataTransformer 
            inputData={uploadedData}
            analysisResult={analysisResult}
            onComplete={(data) => handleStepComplete('transform', data)} 
          />
        )
      case 'publish':
        return (
          <OutputPublisher 
            transformedData={transformedData}
            onComplete={(data) => handleStepComplete('publish', data)} 
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Orquestrador de Dados
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Conecte sistemas legados a contemporâneos usando IA generativa para análise e transformação de dados
        </p>
        <div className="mt-6 flex justify-center">
          <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={useAdaptiveInterface}
              onChange={(e) => setUseAdaptiveInterface(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Usar Interface Adaptativa (Reconhecimento Automático)</span>
          </label>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-blue-600 text-white scale-110' : 
                      isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    <Icon size={20} />
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400 max-w-24">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className={`mx-4 ${
                    isCompleted ? 'text-green-600' : 'text-gray-300'
                  }`} size={20} />
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        {renderStepContent()}
      </motion.div>
    </div>
  )
}