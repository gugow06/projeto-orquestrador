import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function validateCSV(content: string): boolean {
  try {
    const lines = content.split('\n')
    if (lines.length < 2) return false
    
    const headerCols = lines[0].split(',').length
    return lines.slice(1).every(line => {
      const cols = line.split(',').length
      return cols === headerCols || line.trim() === ''
    })
  } catch {
    return false
  }
}

export function inferDataType(value: string): 'string' | 'number' | 'boolean' | 'date' {
  if (!value || value.trim() === '') return 'string'
  
  // Check boolean
  if (['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
    return 'boolean'
  }
  
  // Check number
  if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
    return 'number'
  }
  
  // Check date
  const dateRegex = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/
  if (dateRegex.test(value)) {
    return 'date'
  }
  
  return 'string'
}