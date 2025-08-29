#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  outputDir: '.next/analyze',
  reportFile: 'bundle-analysis.json',
  thresholds: {
    maxBundleSize: 500 * 1024, // 500KB
    maxChunkSize: 250 * 1024,  // 250KB
    maxAssetSize: 100 * 1024,  // 100KB
  },
};

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  log('🔍 Iniciando análise do bundle...', 'blue');
  
  try {
    // Verificar se o build existe
    if (!fs.existsSync('.next')) {
      log('❌ Build não encontrado. Execute "npm run build" primeiro.', 'red');
      process.exit(1);
    }

    // Criar diretório de análise
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Executar análise com webpack-bundle-analyzer
    log('📊 Gerando relatório de bundle...', 'cyan');
    
    try {
      execSync('npx webpack-bundle-analyzer .next/static/chunks/*.js -m static -r .next/analyze/bundle-report.html -O', {
        stdio: 'inherit'
      });
      log('✅ Relatório HTML gerado em .next/analyze/bundle-report.html', 'green');
    } catch (error) {
      log('⚠️  webpack-bundle-analyzer não disponível. Instalando...', 'yellow');
      execSync('npm install --save-dev webpack-bundle-analyzer', { stdio: 'inherit' });
      
      try {
        execSync('npx webpack-bundle-analyzer .next/static/chunks/*.js -m static -r .next/analyze/bundle-report.html -O', {
          stdio: 'inherit'
        });
        log('✅ Relatório HTML gerado em .next/analyze/bundle-report.html', 'green');
      } catch (retryError) {
        log('❌ Falha ao gerar relatório HTML', 'red');
      }
    }

    // Analisar arquivos do build
    const buildStats = analyzeBuildFiles();
    
    // Gerar relatório JSON
    const report = {
      timestamp: new Date().toISOString(),
      buildStats,
      recommendations: generateRecommendations(buildStats),
      thresholds: CONFIG.thresholds,
    };

    fs.writeFileSync(
      path.join(CONFIG.outputDir, CONFIG.reportFile),
      JSON.stringify(report, null, 2)
    );

    // Exibir resumo
    displaySummary(buildStats);
    
    log('\n📋 Relatório completo salvo em:', 'blue');
    log(`   - HTML: .next/analyze/bundle-report.html`, 'cyan');
    log(`   - JSON: .next/analyze/${CONFIG.reportFile}`, 'cyan');
    
  } catch (error) {
    log(`❌ Erro durante análise: ${error.message}`, 'red');
    process.exit(1);
  }
}

function analyzeBuildFiles() {
  const buildDir = '.next';
  const stats = {
    totalSize: 0,
    chunks: [],
    pages: [],
    static: [],
    largestFiles: [],
  };

  // Analisar chunks
  const chunksDir = path.join(buildDir, 'static', 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunkFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.js'));
    
    chunkFiles.forEach(file => {
      const filePath = path.join(chunksDir, file);
      const fileStats = fs.statSync(filePath);
      
      stats.chunks.push({
        name: file,
        size: fileStats.size,
        path: filePath,
      });
      
      stats.totalSize += fileStats.size;
    });
  }

  // Analisar páginas
  const pagesDir = path.join(buildDir, 'static', 'chunks', 'pages');
  if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir, { recursive: true })
      .filter(file => typeof file === 'string' && file.endsWith('.js'));
    
    pageFiles.forEach(file => {
      const filePath = path.join(pagesDir, file);
      const fileStats = fs.statSync(filePath);
      
      stats.pages.push({
        name: file,
        size: fileStats.size,
        path: filePath,
      });
    });
  }

  // Analisar assets estáticos
  const staticDir = path.join(buildDir, 'static');
  if (fs.existsSync(staticDir)) {
    const staticFiles = fs.readdirSync(staticDir, { recursive: true })
      .filter(file => typeof file === 'string' && !file.includes('chunks'));
    
    staticFiles.forEach(file => {
      const filePath = path.join(staticDir, file);
      if (fs.statSync(filePath).isFile()) {
        const fileStats = fs.statSync(filePath);
        
        stats.static.push({
          name: file,
          size: fileStats.size,
          path: filePath,
        });
      }
    });
  }

  // Encontrar maiores arquivos
  const allFiles = [...stats.chunks, ...stats.pages, ...stats.static];
  stats.largestFiles = allFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return stats;
}

function generateRecommendations(buildStats) {
  const recommendations = [];

  // Verificar tamanho total do bundle
  if (buildStats.totalSize > CONFIG.thresholds.maxBundleSize) {
    recommendations.push({
      type: 'warning',
      category: 'bundle-size',
      message: `Bundle total (${formatBytes(buildStats.totalSize)}) excede o limite recomendado (${formatBytes(CONFIG.thresholds.maxBundleSize)})`,
      suggestions: [
        'Implementar code splitting mais agressivo',
        'Remover dependências não utilizadas',
        'Usar dynamic imports para componentes pesados',
        'Otimizar imagens e assets'
      ]
    });
  }

  // Verificar chunks grandes
  const largeChunks = buildStats.chunks.filter(chunk => chunk.size > CONFIG.thresholds.maxChunkSize);
  if (largeChunks.length > 0) {
    recommendations.push({
      type: 'warning',
      category: 'chunk-size',
      message: `${largeChunks.length} chunk(s) excedem o tamanho recomendado`,
      files: largeChunks.map(chunk => `${chunk.name}: ${formatBytes(chunk.size)}`),
      suggestions: [
        'Dividir chunks grandes em menores',
        'Usar lazy loading para componentes',
        'Verificar dependências duplicadas'
      ]
    });
  }

  // Verificar se há muitos chunks pequenos
  const smallChunks = buildStats.chunks.filter(chunk => chunk.size < 1024); // < 1KB
  if (smallChunks.length > 5) {
    recommendations.push({
      type: 'info',
      category: 'chunk-optimization',
      message: `${smallChunks.length} chunks muito pequenos detectados`,
      suggestions: [
        'Considerar combinar chunks pequenos',
        'Ajustar configuração de splitChunks no webpack'
      ]
    });
  }

  // Verificar duplicação de dependências
  const chunkNames = buildStats.chunks.map(chunk => chunk.name);
  const possibleDuplicates = chunkNames.filter(name => 
    name.includes('vendor') || name.includes('common')
  );
  
  if (possibleDuplicates.length > 2) {
    recommendations.push({
      type: 'info',
      category: 'dependencies',
      message: 'Possível duplicação de dependências detectada',
      suggestions: [
        'Verificar configuração de cacheGroups',
        'Usar webpack-bundle-analyzer para identificar duplicatas',
        'Otimizar imports de bibliotecas'
      ]
    });
  }

  return recommendations;
}

function displaySummary(buildStats) {
  log('\n📊 RESUMO DA ANÁLISE', 'magenta');
  log('═'.repeat(50), 'magenta');
  
  log(`\n📦 Tamanho total do bundle: ${formatBytes(buildStats.totalSize)}`, 'cyan');
  
  if (buildStats.totalSize > CONFIG.thresholds.maxBundleSize) {
    log('   ⚠️  Excede o limite recomendado!', 'yellow');
  } else {
    log('   ✅ Dentro do limite recomendado', 'green');
  }
  
  log(`\n🧩 Chunks: ${buildStats.chunks.length}`, 'cyan');
  log(`📄 Páginas: ${buildStats.pages.length}`, 'cyan');
  log(`🖼️  Assets estáticos: ${buildStats.static.length}`, 'cyan');
  
  log('\n🏆 MAIORES ARQUIVOS:', 'yellow');
  buildStats.largestFiles.slice(0, 5).forEach((file, index) => {
    const icon = file.size > CONFIG.thresholds.maxChunkSize ? '🔴' : '🟡';
    log(`   ${index + 1}. ${icon} ${file.name}: ${formatBytes(file.size)}`);
  });
  
  // Estatísticas de performance
  const avgChunkSize = buildStats.chunks.length > 0 
    ? buildStats.chunks.reduce((sum, chunk) => sum + chunk.size, 0) / buildStats.chunks.length
    : 0;
    
  log(`\n📈 ESTATÍSTICAS:`, 'blue');
  log(`   Tamanho médio de chunk: ${formatBytes(avgChunkSize)}`);
  log(`   Maior chunk: ${formatBytes(Math.max(...buildStats.chunks.map(c => c.size)))}`);
  log(`   Menor chunk: ${formatBytes(Math.min(...buildStats.chunks.map(c => c.size)))}`);
}

// Executar análise se chamado diretamente
if (require.main === module) {
  analyzeBundle();
}

module.exports = {
  analyzeBundle,
  analyzeBuildFiles,
  generateRecommendations,
  formatBytes,
};