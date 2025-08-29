import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { CSVData, SchemaAnalysis, FieldSchema, FieldMapping } from '@/types'
import { inferDataType } from './utils'

export class AIService {
  private geminiClient?: GoogleGenerativeAI
  private groqClient?: Groq
  private provider: 'gemini' | 'groq'

  constructor(provider: 'gemini' | 'groq', apiKey: string) {
    this.provider = provider
    
    if (provider === 'gemini') {
      this.geminiClient = new GoogleGenerativeAI(apiKey)
    } else {
      this.groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true })
    }
  }

  async analyzeSchema(csvData: CSVData, targetSchema?: FieldSchema[]): Promise<SchemaAnalysis> {
    try {
      const sourceSchema = this.inferSourceSchema(csvData)
      const prompt = this.buildAnalysisPrompt(sourceSchema, targetSchema, csvData)
      
      let response: string
      
      if (this.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent(prompt)
        response = result.response.text()
      } else if (this.provider === 'groq' && this.groqClient) {
        const completion = await this.groqClient.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'mixtral-8x7b-32768',
          temperature: 0.1,
        })
        response = completion.choices[0]?.message?.content || ''
      } else {
        throw new Error('Cliente de IA não configurado')
      }

      return this.parseAnalysisResponse(response, sourceSchema)
    } catch (error) {
      console.error('Erro na análise de schema:', error)
      throw new Error('Falha na análise do schema com IA')
    }
  }

  private inferSourceSchema(csvData: CSVData): FieldSchema[] {
    return csvData.headers.map(header => {
      const columnIndex = csvData.headers.indexOf(header)
      const sampleValues = csvData.rows
        .slice(0, 10)
        .map(row => row[columnIndex])
        .filter(val => val && val.trim() !== '')
      
      const types = sampleValues.map(val => inferDataType(val))
      const mostCommonType = this.getMostCommonType(types)
      
      return {
        name: header,
        type: mostCommonType,
        nullable: sampleValues.length < csvData.rows.slice(0, 10).length,
        examples: sampleValues.slice(0, 3)
      }
    })
  }

  private getMostCommonType(types: string[]): any {
    const counts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0]
  }

  private buildAnalysisPrompt(sourceSchema: FieldSchema[], targetSchema?: FieldSchema[], csvData?: CSVData): string {
    const sourceSchemaText = sourceSchema.map(field => 
      `${field.name}: ${field.type} (exemplos: ${field.examples.join(', ')})`
    ).join('\n')

    const targetSchemaText = targetSchema ? 
      targetSchema.map(field => 
        `${field.name}: ${field.type}${field.description ? ` - ${field.description}` : ''}`
      ).join('\n') : 
      'Schema de destino não fornecido - sugira um schema moderno e padronizado'

    return `
Você é um especialista em transformação de dados entre sistemas legados e contemporâneos.

Analise o schema de origem e sugira mapeamentos para o schema de destino:

**SCHEMA DE ORIGEM (Sistema Legado):**
${sourceSchemaText}

**SCHEMA DE DESTINO (Sistema Contemporâneo):**
${targetSchemaText}

**INSTRUÇÕES:**
1. Analise cada campo do schema de origem
2. Sugira mapeamentos para campos do schema de destino
3. Identifique transformações necessárias (renomeação, conversão de tipo, normalização)
4. Calcule um nível de confiança para cada mapeamento (0-100)
5. Forneça uma explicação clara do raciocínio

**RESPONDA EM FORMATO JSON:**
{
  "suggestedMappings": [
    {
      "sourceField": "nome_do_campo_origem",
      "targetField": "nome_do_campo_destino",
      "sourceType": "tipo_origem",
      "targetType": "tipo_destino",
      "transformation": "descrição_da_transformação",
      "confidence": 95
    }
  ],
  "confidence": 85,
  "reasoning": "Explicação detalhada da análise e sugestões"
}

Seja preciso e considere boas práticas de nomenclatura e tipos de dados modernos.
`
  }

  private parseAnalysisResponse(response: string, sourceSchema: FieldSchema[]): SchemaAnalysis {
    try {
      // Extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      const mappings: FieldMapping[] = parsed.suggestedMappings?.map((mapping: any) => ({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        sourceType: mapping.sourceType,
        targetType: mapping.targetType,
        transformation: mapping.transformation,
        confidence: mapping.confidence || 50
      })) || []

      return {
        sourceSchema,
        suggestedMappings: mappings,
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || 'Análise automática realizada'
      }
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error)
      
      // Fallback: criar mapeamentos básicos
      const fallbackMappings: FieldMapping[] = sourceSchema.map(field => ({
        sourceField: field.name,
        targetField: field.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        sourceType: field.type,
        targetType: field.type,
        transformation: 'Normalização de nome',
        confidence: 30
      }))

      return {
        sourceSchema,
        suggestedMappings: fallbackMappings,
        confidence: 30,
        reasoning: 'Mapeamento automático básico (falha na análise de IA)'
      }
    }
  }

  async generateTargetSchema(sourceSchema: FieldSchema[]): Promise<FieldSchema[]> {
    const prompt = `
Com base no schema de origem abaixo, gere um schema de destino moderno e padronizado:

${sourceSchema.map(field => `${field.name}: ${field.type}`).join('\n')}

Retorne um JSON com o schema sugerido:
{
  "fields": [
    {
      "name": "nome_campo",
      "type": "tipo",
      "nullable": true/false,
      "description": "descrição"
    }
  ]
}

Use convenções modernas: snake_case, tipos padronizados, nomes descritivos.
`

    try {
      let response: string
      
      if (this.provider === 'gemini' && this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent(prompt)
        response = result.response.text()
      } else if (this.provider === 'groq' && this.groqClient) {
        const completion = await this.groqClient.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'mixtral-8x7b-32768',
          temperature: 0.1,
        })
        response = completion.choices[0]?.message?.content || ''
      } else {
        throw new Error('Cliente de IA não configurado')
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.fields || []
      }
    } catch (error) {
      console.error('Erro ao gerar schema de destino:', error)
    }

    // Fallback: schema básico
    return sourceSchema.map(field => ({
      ...field,
      name: field.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      description: `Campo migrado de ${field.name}`
    }))
  }
}