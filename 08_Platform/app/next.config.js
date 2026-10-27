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
  // CR-V2-WORK-UAT-HARNESS-2: the temporary public UAT harness is never indexed.
  // Scoped to /uat paths only; every other route is unchanged.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
    return [
      { source: '/uat/:path*', headers: noindex },
      { source: '/api/uat/:path*', headers: noindex },
    ]
  },
}

module.exports = nextConfig
