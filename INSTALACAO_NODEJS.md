# 📦 Instalação do Node.js

Para executar este projeto, você precisa ter o Node.js instalado em seu sistema.

## 🚀 Opções de Instalação

### Opção 1: Download Oficial (Recomendado)

1. Acesse [nodejs.org](https://nodejs.org/)
2. Baixe a versão LTS (Long Term Support) mais recente
3. Execute o instalador e siga as instruções
4. Reinicie o terminal/PowerShell

### Opção 2: Via Chocolatey (Windows)

```powershell
# Instalar Chocolatey (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar Node.js
choco install nodejs
```

### Opção 3: Via Winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS
```

## ✅ Verificação da Instalação

Após a instalação, abra um novo terminal e execute:

```bash
node --version
npm --version
```

Você deve ver as versões instaladas.

## 🔧 Executando o Projeto

Após instalar o Node.js:

1. **Instale as dependências:**
```bash
npm install
```

2. **Execute o projeto em modo desenvolvimento:**
```bash
npm run dev
```

3. **Acesse no navegador:**
```
http://localhost:3000
```

## 📋 Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Executa build de produção
- `npm run lint` - Executa verificação de código

## 🔑 Configuração de Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Chave da API do Google Gemini
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_aqui

# Chave da API do Groq
NEXT_PUBLIC_GROQ_API_KEY=sua_chave_aqui
```

## 🆘 Problemas Comuns

### Erro: 'node' não é reconhecido
- Reinicie o terminal após a instalação
- Verifique se o Node.js foi adicionado ao PATH
- Tente abrir um novo PowerShell como administrador

### Erro de permissão no npm
```bash
npm config set registry https://registry.npmjs.org/
npm cache clean --force
```

### Versão muito antiga do Node.js
- Desinstale a versão antiga
- Instale a versão LTS mais recente
- Limpe o cache do npm: `npm cache clean --force`

## 📞 Suporte

Se encontrar problemas:
1. Verifique a [documentação oficial do Node.js](https://nodejs.org/docs/)
2. Consulte o [guia de solução de problemas do npm](https://docs.npmjs.com/troubleshooting)
3. Abra uma issue no repositório do projeto