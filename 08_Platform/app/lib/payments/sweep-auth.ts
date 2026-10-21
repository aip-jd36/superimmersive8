/**
 * CAA-SECURITY-3B — authenticate the scheduled payment-fulfillment sweep.
 * PURE (node:crypto only). Constant-time comparison over SHA-256 digests so
 * neither length nor content leaks through timing.
 */
import { createHash, timingSafeEqual } from 'crypto'

export const MIN_SWEEP_SECRET_LENGTH = 32

export type SweepAuthResult = 'ok' | 'unauthorized' | 'not_configured'

export function verifySweepAuthorization(authorizationHeader: string | null, configuredSecret: string | undefined): SweepAuthResult {
  if (!configuredSecret || configuredSecret.length < MIN_SWEEP_SECRET_LENGTH) return 'not_configured'
  const match = /^Bearer (.+)$/.exec(authorizationHeader ?? '')
  if (!match) return 'unauthorized'
  const a = createHash('sha256').update(match[1], 'utf8').digest()
  const b = createHash('sha256').update(configuredSecret, 'utf8').digest()
  return timingSafeEqual(a, b) ? 'ok' : 'unauthorized'
}
