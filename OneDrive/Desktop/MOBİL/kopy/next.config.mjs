import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export as static HTML for Render Static Site hosting
  output: 'export',
  // Disable server-side features for static export
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // PWA disabled for static export
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      urlPattern: /^https?:\/\/(costikfinans\.site|localhost:3000)\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'costikfinans-pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/(?:odemeler|kartlarim|budgets|notifications)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'app-pages',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline/',
  },
})(nextConfig)
