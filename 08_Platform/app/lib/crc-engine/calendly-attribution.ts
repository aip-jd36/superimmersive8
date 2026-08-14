/**
 * Shared Calendly attribution URL builder (CRC Identity + Abuse Prevention +
 * Analytics milestone, design report §9). Extracted out of
 * CommercialAssuranceBridge.tsx (2026-08-14, Results Gate milestone) so the
 * server-side results-email template can build the identical CTA link
 * without importing a 'use client' component module. Framework-agnostic,
 * no React dependency -- safe to import from either a client component or
 * server-only email-rendering code.
 */

export const COMMERCIAL_ASSURANCE_CALENDLY_URL = 'https://calendly.com/aipenguins/superimmersive8'

export function buildCalendlyUrl(attributionToken?: string | null, email?: string | null): string {
  const params = new URLSearchParams()
  if (attributionToken) {
    params.set('utm_source', 'crc')
    params.set('utm_content', attributionToken)
  }
  if (email) {
    params.set('email', email)
  }
  const query = params.toString()
  return query ? `${COMMERCIAL_ASSURANCE_CALENDLY_URL}?${query}` : COMMERCIAL_ASSURANCE_CALENDLY_URL
}
