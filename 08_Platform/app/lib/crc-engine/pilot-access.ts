/**
 * Shared pilot-access constants (CRC Limited Pilot, Part 6). One shared
 * code, no accounts, no user identities, no authentication system -- per
 * the approved pilot plan. Both the validation route
 * (app/api/crc/pilot-access/route.ts) and middleware.ts import this same
 * module so the cookie name/value stay in sync by construction, not by
 * convention.
 *
 * The cookie value is a fixed marker, not derived from
 * CRC_PILOT_ACCESS_CODE itself -- the browser must never be able to
 * reconstruct the raw code from anything it's given. A fixed marker is a
 * deliberate simplicity choice appropriate to a soft gate meant to keep a
 * small pilot's URL from being casually stumbled into, not a hardened
 * security boundary -- consistent with "no authentication system" in the
 * approved plan. It is never read by client JS (httpOnly).
 */
export const PILOT_ACCESS_COOKIE_NAME = 'crc_pilot_access'
export const PILOT_ACCESS_COOKIE_VALUE = 'granted'
export const PILOT_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days
