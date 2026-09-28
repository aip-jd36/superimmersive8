import type { Metadata } from 'next'

/**
 * Route-level metadata for /crc only. app/crc/page.tsx is a client
 * component and cannot export `metadata` itself, so without this layout
 * the route inherited the portal-wide root title ("SI8 Creator Portal -
 * Rights Verified"). Every other portal route keeps the root metadata.
 */
export const metadata: Metadata = {
  title: 'Commercial Readiness Check | SuperImmersive 8',
  description:
    'A short, educational conversation about how your AI video was made. Not legal advice, and not an SI8 Commercial Assurance Assessment.',
}

export default function CrcLayout({ children }: { children: React.ReactNode }) {
  return children
}
