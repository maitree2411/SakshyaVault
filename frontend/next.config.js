const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_e) {
  // Next.js automatically loads .env and .env.local
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  optimizeFonts: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Expose selected envs (loaded from root .env) to the browser at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_AES_SECRET_KEY: process.env.AES_SECRET_KEY,
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      net: false, 
      tls: false,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
      '@x402/evm/upto/client': false,
      '@x402/evm/exact/client': false,
      '@x402/core/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false,
      '@x402/core': false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/evm/upto/client': false,
      '@x402/evm/exact/client': false,
      '@x402/core/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false,
      '@x402/core': false,
    };
    config.externals.push('pino-pretty', 'encoding');
    
    // Ignore MetaMask SDK warnings
    config.ignoreWarnings = [
      /Module not found: Can't resolve '@react-native-async-storage\/async-storage'/,
      /WalletConnect Core is already initialized/,
      /Multiple versions of Lit loaded/
    ];
    
    return config;
  },
};

module.exports = nextConfig;


