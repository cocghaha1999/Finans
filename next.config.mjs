/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove standalone output for better compatibility
  // output: 'standalone',
  swcMinify: true,
  webpack: (config, { dev, isServer }) => {
    // Disable cache in development to avoid issues
    if (dev) {
      config.cache = false
    }
    
    // Add fallbacks for Node.js modules in client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    
    return config
  },
}

export default nextConfig
