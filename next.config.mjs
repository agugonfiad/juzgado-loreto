/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // <--- ¡Esta es la llave maestra!
    },
  },
};

export default nextConfig;