/**
 * CR-V2-MVP-M4C — staging preflight. Read-only; makes no network call; prints no secret.
 *
 * Checks that an environment (normally a `vercel env pull` of the staging Preview scope) would run the
 * Creator Record v2 journey as an ISOLATED SYNTHETIC TEST, and never against Production:
 *   - the publication authority resolves to 'synthetic_isolated_test' (the M4B runtime safeguard);
 *   - the Supabase URL, anon key and service-role key all belong to the same non-Production project
 *     (legacy JWT keys carry their project ref; other key formats are reported as unverifiable);
 *   - Stripe keys are test-mode; a webhook secret is present;
 *   - the site URL is not a Production host;
 *   - and it reports the two stops as compiled into this checkout.
 *
 * Usage (from 08_Platform/app):
 *   npx tsx --env-file=.env.staging.local scripts/staging/cr-v2-staging-preflight.ts
 * Exit 0 only when every check passes.
 */

import { PRODUCTION_SUPABASE_PROJECT_REF, resolvePublicationAuthority, supabaseProjectRef } from '../../lib/creator-record/governed/publication-authority'
import { CREATOR_RECORD_V2_ISSUANCE } from '../../lib/creator-record-artifacts/config'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '../../lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '../../lib/creator-record/governed/synthetic-test-authority'

const PRODUCTION_HOSTS = ['app.superimmersive8.com', 'www.superimmersive8.com', 'superimmersive8.com']

type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []
const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })

/** The `ref` claim of a legacy Supabase JWT key, without verifying or printing the key. */
function jwtRef(key: string | undefined): string | null | 'unverifiable' {
  if (!key) return null
  const parts = key.split('.')
  if (parts.length !== 3) return 'unverifiable'
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { ref?: unknown }
    return typeof payload.ref === 'string' ? payload.ref : 'unverifiable'
  } catch {
    return 'unverifiable'
  }
}
const keyMode = (k: string | undefined) => (k ? (/^(sk|rk|pk)_(test|live)_/.exec(k)?.[0] ?? 'unrecognised format') : 'missing')

const env = process.env
const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)

const resolution = resolvePublicationAuthority(env)
check('publication authority', resolution.ok && resolution.mode === 'synthetic_isolated_test', resolution.ok ? `mode ${resolution.mode}` : `refused: ${resolution.refusal}`)
check('synthetic bundle present', CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY?.authority_class === 'synthetic_test', String(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY?.authority_class ?? 'none'))
check('Supabase project', ref !== null && ref !== 'local' && ref !== PRODUCTION_SUPABASE_PROJECT_REF, `ref ${ref ?? 'unidentified'}${ref === PRODUCTION_SUPABASE_PROJECT_REF ? ' (PRODUCTION)' : ''}`)
check('database binding', env.SI8_CR_SYNTHETIC_SUPABASE_REF === ref, `SI8_CR_SYNTHETIC_SUPABASE_REF ${env.SI8_CR_SYNTHETIC_SUPABASE_REF ?? 'unset'}`)
for (const [name, value] of [['anon key', env.NEXT_PUBLIC_SUPABASE_ANON_KEY], ['service-role key', env.SUPABASE_SERVICE_ROLE_KEY]] as const) {
  const r = jwtRef(value)
  if (r === null) check(name, false, 'missing')
  else if (r === 'unverifiable') check(name, true, 'present; project not verifiable from this key format: confirm in the Supabase dashboard')
  else check(name, r === ref && r !== PRODUCTION_SUPABASE_PROJECT_REF, `belongs to ${r}${r === PRODUCTION_SUPABASE_PROJECT_REF ? ' (PRODUCTION)' : ''}`)
}
check('Stripe secret key', /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY ?? ''), keyMode(env.STRIPE_SECRET_KEY))
check('Stripe publishable key', /^pk_test_/.test(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''), keyMode(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY))
check('Stripe webhook secret', /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET ?? ''), env.STRIPE_WEBHOOK_SECRET ? 'present' : 'missing')
let siteHost = ''
try {
  siteHost = new URL(env.NEXT_PUBLIC_SITE_URL ?? '').hostname
} catch {
  siteHost = ''
}
check('site URL', siteHost !== '' && !PRODUCTION_HOSTS.includes(siteHost), siteHost || 'missing or malformed')
check('Turnstile', !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'set: preview sign-up has failed with Turnstile before; leave unset and keep CAPTCHA off in the staging project' : 'unset')
for (const k of ['RESEND_API_KEY', 'ADMIN_EMAIL', 'PAYMENT_SWEEP_SECRET']) check(k, !!env[k], env[k] ? 'present' : 'missing')

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(24)} ${c.detail}`)
console.log(`INFO  submissions stop         ${CREATOR_RECORD_V2_SUBMISSIONS}`)
console.log(`INFO  issuance stop            ${CREATOR_RECORD_V2_ISSUANCE}`)
const failed = checks.filter((c) => !c.ok).length
console.log(failed === 0 ? 'PREFLIGHT PASS' : `PREFLIGHT FAIL (${failed})`)
process.exit(failed === 0 ? 0 : 1)
