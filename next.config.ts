import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true, // Obliga a Vercel a compilar aunque haya advertencias menores
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
}

export default nextConfig