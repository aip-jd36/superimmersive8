/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@myriaddreamin/typst-ts-node-compiler'],
    // CR-V2-PDF-7B: the customer PDF's fallback font is read at render time, so tracing cannot see it. Every route that can issue needs it.
    outputFileTracingIncludes: Object.fromEntries([
      '/api/webhooks/stripe',
      '/api/internal/payment-fulfillments/sweep',
      '/api/admin/payments/[sessionId]/reconcile',
      '/api/admin/submissions/[id]/generate-creator-record',
    ].map((route) => [route, ['./lib/creator-record/customer-pdf/fonts/**']])),
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
