/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações básicas para desenvolvimento
  experimental: {
    // Configurações experimentais removidas para simplicidade
  },

  // Configurações simples de imagens
  images: {
    domains: ['localhost'],
    dangerouslyAllowSVG: true,
  },

  // Compressão desabilitada para desenvolvimento
  compress: false,
  
  // Headers do Next.js habilitados
  poweredByHeader: true,
  
  // TypeScript em modo desenvolvimento
  typescript: {
    ignoreBuildErrors: true, // Permite builds mesmo com erros de tipo durante desenvolvimento
  },

  // ESLint em modo desenvolvimento
  eslint: {
    ignoreDuringBuilds: true, // Ignora erros de ESLint durante builds de desenvolvimento
  },
};

module.exports = nextConfig;