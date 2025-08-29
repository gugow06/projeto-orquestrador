# 🧪 Guia de Teste - Orquestrador de Dados

## 🚀 Ambiente de Teste Configurado

✅ **Status:** Aplicação rodando em http://localhost:3000  
✅ **Node.js:** v22.19.0 (compatível)  
✅ **Next.js:** v14.2.32 (atualizado e seguro)  
✅ **Dependências:** Todas instaladas  

## 📋 Roteiro de Testes

### 1. 🔑 Configurar Chaves de API

**Antes de testar, configure uma chave de IA:**

1. Copie o arquivo de exemplo:
   ```bash
   copy .env.example .env.local
   ```

2. **Para Google Gemini:**
   - Acesse: https://ai.google.dev/
   - Crie uma conta e gere uma API key
   - Adicione no `.env.local`: `NEXT_PUBLIC_GEMINI_API_KEY=sua_chave`

3. **Para Groq:**
   - Acesse: https://console.groq.com/
   - Crie uma conta e gere uma API key
   - Adicione no `.env.local`: `NEXT_PUBLIC_GROQ_API_KEY=sua_chave`

### 2. 📁 Teste de Upload de CSV

**Arquivo de Teste Incluído:** `exemplo_dados_legados.csv`

**Passos:**
1. Acesse http://localhost:3000
2. Na seção "Upload de Dados", clique ou arraste o arquivo CSV
3. Use o arquivo `exemplo_dados_legados.csv` fornecido
4. Verifique se o preview mostra:
   - ✅ Cabeçalhos: COD_CLI, NOME_COMPLETO, DT_NASC, etc.
   - ✅ 10 registros de clientes
   - ✅ Validação de formato CSV

**Resultado Esperado:** Preview dos dados com botão "Confirmar e Continuar"

### 3. 🤖 Teste de Análise com IA

**Pré-requisito:** Chave de API configurada

**Passos:**
1. Após upload bem-sucedido, configure a IA:
   - Selecione "Gemini" ou "Groq"
   - Cole sua chave de API
2. Clique em "Analisar Esquema"
3. Aguarde a análise (15-30 segundos)

**Resultado Esperado:**
- ✅ Raciocínio da IA sobre os dados
- ✅ Mapeamentos sugeridos (ex: COD_CLI → customer_id)
- ✅ Níveis de confiança para cada mapeamento
- ✅ Sugestões de transformações

### 4. 🔄 Teste de Transformação

**Passos:**
1. Revise os mapeamentos sugeridos pela IA
2. Clique em "Aplicar Transformações"
3. Aguarde o processamento
4. Analise o preview dos dados transformados

**Resultado Esperado:**
- ✅ Dados no formato JSON moderno
- ✅ Campos renomeados (ex: NOME_COMPLETO → full_name)
- ✅ Tipos convertidos (ex: datas em formato ISO)
- ✅ Estrutura hierárquica (personal_info, contact_info, etc.)
- ✅ Opção de download CSV transformado

### 5. 📤 Teste de Publicação

**Passos:**
1. Escolha um destino:
   - **API REST:** Configure URL de teste
   - **Banco de Dados:** Simule conexão
   - **Arquivo:** Download direto
2. Configure parâmetros específicos
3. Visualize preview no formato escolhido
4. Execute a publicação

**Resultado Esperado:**
- ✅ Preview em múltiplos formatos (JSON, CSV, XML)
- ✅ Simulação de envio bem-sucedida
- ✅ Feedback detalhado da operação

## 🎯 Cenários de Teste Específicos

### Teste 1: Fluxo Completo com Gemini
```
Upload CSV → Gemini Analysis → Transform → API REST
```

### Teste 2: Fluxo Completo com Groq
```
Upload CSV → Groq Analysis → Transform → Download File
```

### Teste 3: Validação de Erros
```
Upload arquivo inválido → Verificar mensagens de erro
Chave API inválida → Verificar tratamento de erro
```

## 📊 Dados de Exemplo

**Arquivo:** `exemplo_dados_legados.csv`
- 10 registros de clientes
- Campos legados: COD_CLI, NOME_COMPLETO, DT_NASC, etc.
- Formatos antigos: datas DD/MM/YYYY, status S/N

**Transformação Esperada:**
- Estrutura moderna JSON
- Datas ISO 8601
- Booleanos true/false
- Campos aninhados

## 🔍 Pontos de Verificação

### Interface
- ✅ Design responsivo e moderno
- ✅ Animações suaves (Framer Motion)
- ✅ Indicadores de progresso
- ✅ Mensagens de erro claras

### Funcionalidade
- ✅ Upload drag & drop
- ✅ Validação de CSV
- ✅ Integração com IA
- ✅ Transformação de dados
- ✅ Preview em tempo real
- ✅ Download de resultados

### Performance
- ✅ Carregamento rápido
- ✅ Processamento eficiente
- ✅ Feedback visual durante operações

## 🐛 Solução de Problemas

### Erro de Chave API
```
Verifique se a chave está correta no .env.local
Reinicie o servidor: Ctrl+C e npm run dev
```

### Erro de Upload
```
Verifique se o arquivo é CSV válido
Tamanho máximo: 10MB
Codificação: UTF-8
```

### Erro de Transformação
```
Verifique se a análise da IA foi bem-sucedida
Tente com um arquivo CSV mais simples
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique o terminal do servidor
3. Consulte os logs de erro
4. Teste com dados mais simples

---

**🎉 Parabéns!** Você tem um MVP completo de orquestração de dados funcionando!