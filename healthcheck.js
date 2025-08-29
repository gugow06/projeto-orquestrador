#!/usr/bin/env node

// Health check script para Docker
const http = require('http');
const https = require('https');

// Configurações
const config = {
  protocol: process.env.HEALTH_CHECK_PROTOCOL || 'http',
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: process.env.PORT || 3000,
  path: process.env.HEALTH_CHECK_PATH || '/api/health-check',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
  token: process.env.HEALTH_CHECK_TOKEN,
};

// Função principal de health check
function healthCheck() {
  return new Promise((resolve, reject) => {
    const client = config.protocol === 'https' ? https : http;
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: config.path,
      method: 'HEAD', // Usar HEAD para reduzir overhead
      timeout: config.timeout,
      headers: {
        'User-Agent': 'Docker-HealthCheck/1.0',
      },
    };

    // Adicionar token de autenticação se configurado
    if (config.token) {
      options.headers['Authorization'] = `Bearer ${config.token}`;
    }

    const req = client.request(options, (res) => {
      const { statusCode } = res;
      
      // Consumir dados da resposta para liberar memória
      res.resume();
      
      if (statusCode >= 200 && statusCode < 300) {
        resolve({
          status: 'healthy',
          statusCode,
          timestamp: new Date().toISOString(),
        });
      } else {
        reject(new Error(`Health check failed with status ${statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`Health check request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${config.timeout}ms`));
    });

    req.setTimeout(config.timeout);
    req.end();
  });
}

// Função para verificar dependências críticas
function checkDependencies() {
  const checks = [];
  
  // Verificar se o processo Node.js está respondendo
  checks.push(checkNodeProcess());
  
  // Verificar memória disponível
  checks.push(checkMemoryUsage());
  
  return Promise.all(checks);
}

// Verificar processo Node.js
function checkNodeProcess() {
  return new Promise((resolve, reject) => {
    try {
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      
      if (uptime > 0 && memUsage.rss > 0) {
        resolve({
          check: 'node_process',
          status: 'ok',
          uptime,
          memory: memUsage,
        });
      } else {
        reject(new Error('Node.js process check failed'));
      }
    } catch (error) {
      reject(new Error(`Node.js process check error: ${error.message}`));
    }
  });
}

// Verificar uso de memória
function checkMemoryUsage() {
  return new Promise((resolve, reject) => {
    try {
      const memUsage = process.memoryUsage();
      const maxHeapSize = 1024 * 1024 * 1024; // 1GB limite padrão
      const memoryUsagePercent = (memUsage.heapUsed / maxHeapSize) * 100;
      
      if (memoryUsagePercent < 90) { // Menos de 90% de uso
        resolve({
          check: 'memory_usage',
          status: 'ok',
          usagePercent: memoryUsagePercent.toFixed(2),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
        });
      } else {
        reject(new Error(`High memory usage: ${memoryUsagePercent.toFixed(2)}%`));
      }
    } catch (error) {
      reject(new Error(`Memory usage check error: ${error.message}`));
    }
  });
}

// Função principal
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('Starting health check...');
    
    // Verificar dependências básicas
    const dependencyChecks = await checkDependencies();
    console.log('Dependency checks passed:', dependencyChecks.length);
    
    // Verificar endpoint de health
    const healthResult = await healthCheck();
    console.log('Health check passed:', healthResult.status);
    
    const duration = Date.now() - startTime;
    console.log(`Health check completed successfully in ${duration}ms`);
    
    // Saída com código 0 (sucesso)
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Health check failed after ${duration}ms:`, error.message);
    
    // Log adicional para debugging
    console.error('Health check configuration:', {
      protocol: config.protocol,
      host: config.host,
      port: config.port,
      path: config.path,
      timeout: config.timeout,
    });
    
    // Saída com código 1 (falha)
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

// Exportar para testes
module.exports = {
  healthCheck,
  checkDependencies,
  checkNodeProcess,
  checkMemoryUsage,
};