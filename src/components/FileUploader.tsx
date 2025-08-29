'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, File, X, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import { CSVData } from '@/types'
import { cn, formatFileSize, validateCSV } from '@/lib/utils'

interface FileUploaderProps {
  onComplete: (data: CSVData) => void
}

export function FileUploader({ onComplete }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CSVData | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)

    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Apenas arquivos CSV são suportados')
      }

      const text = await file.text()
      
      if (!validateCSV(text)) {
        throw new Error('Arquivo CSV inválido ou malformado')
      }

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Erro ao processar CSV: ' + results.errors[0].message)
            return
          }

          const data = results.data as string[][]
          if (data.length < 2) {
            setError('O arquivo deve conter pelo menos um cabeçalho e uma linha de dados')
            return
          }

          const csvData: CSVData = {
            headers: data[0],
            rows: data.slice(1),
            fileName: file.name,
            fileSize: file.size
          }

          setPreview(csvData)
          setUploadedFile(file)
        },
        error: (error) => {
          setError('Erro ao processar arquivo: ' + error.message)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleConfirm = () => {
    if (preview) {
      onComplete(preview)
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setPreview(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Upload de Dados Legados
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Carregue um arquivo CSV do seu sistema legado para iniciar o processo de orquestração.
        </p>

        {!preview ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
              isDragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Arraste e solte seu arquivo CSV aqui
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              ou clique para selecionar
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Selecionar Arquivo
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    {uploadedFile?.name}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {formatFileSize(uploadedFile?.size || 0)} • {preview.rows.length} registros
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-1 text-green-600 hover:text-green-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Preview dos Dados
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {preview.rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 5 && (
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Mostrando 5 de {preview.rows.length} registros
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continuar para Análise
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Processando arquivo...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}