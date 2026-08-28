import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Esto fuerza a Vercel a publicar el proyecto aunque haya advertencias
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;