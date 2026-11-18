/**
 * CR-PUBLIC-2A-FINAL — the one check for post-authentication redirect targets (`?next=` / `?redirectedFrom=`), used by
 * `/auth/callback` (server) and `/auth/login` (client). Client-safe: no imports.
 *
 * Accepts only an application-relative path on this origin: it must start with a single "/", contain no backslash or control
 * character (raw or percent-encoded), not be protocol-relative ("//host"), and resolve to the same origin. Anything else,
 * including malformed encoding and absolute URLs, yields the fallback. The returned value is the normalised path, query and
 * hash, never a scheme or host.
 */
const PROBE_ORIGIN = 'https://si8-redirect-check.invalid'
const MAX_LENGTH = 2048
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u001f\u007f\\]/

export function safeRedirectPath(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return fallback
  if (raw[0] !== '/' || raw[1] === '/' || UNSAFE.test(raw)) return fallback

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return fallback // malformed percent-encoding
  }
  if (decoded[0] !== '/' || decoded[1] === '/' || UNSAFE.test(decoded)) return fallback

  let url: URL
  try {
    url = new URL(raw, PROBE_ORIGIN)
  } catch {
    return fallback
  }
  if (url.origin !== PROBE_ORIGIN) return fallback
  // Dot segments can normalise to a protocol-relative path ("/.//host" → "//host"): check the result, not only the input.
  const out = `${url.pathname}${url.search}${url.hash}`
  if (out[0] !== '/' || out[1] === '/' || UNSAFE.test(out)) return fallback
  return out
}
