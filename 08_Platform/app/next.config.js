/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@myriaddreamin/typst-ts-node-compiler'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lehqgcgnenwdmuzudbrs.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
