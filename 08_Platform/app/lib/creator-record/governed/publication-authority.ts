/**
 * CR-V2-MVP-M4B — which publication authority a running build may use.
 *
 * Every approval a customer-facing Creator Record v2 reads (questions, observation map, wording, Source
 * Text Approval, ledger, PDF templates and their approval) comes from ONE authority bundle. There are two,
 * kept structurally apart:
 *
 *   - the GOVERNANCE bundle (`./sources`): the only bundle that can ever reach Production. It is used
 *     unless the environment explicitly and verifiably asks for synthetic testing.
 *   - the SYNTHETIC TEST bundle (`./synthetic-test-authority`): placeholder approvals for an isolated
 *     end-to-end test. It is selected only when ALL of these hold at runtime:
 *       1. SI8_CR_PUBLICATION_AUTHORITY is exactly 'synthetic-isolated-test';
 *       2. VERCEL_ENV is not 'production' (absent, 'preview' or 'development' only);
 *       3. the Supabase project the server actually connects to (NEXT_PUBLIC_SUPABASE_URL) is not the
 *          Production project, and equals SI8_CR_SYNTHETIC_SUPABASE_REF (an explicit binding to the
 *          isolated database);
 *       4. the Stripe secret key is a TEST key.
 *     If the variable asks for synthetic testing and any check fails, or the variable has any other
 *     value, NO bundle is selected and every customer path fails closed (nothing prepared, sold or issued).
 *
 * The bundle's `authority_class` is a structural field, not a display name, and each mode accepts only
 * its own class: governance mode refuses a bundle classed 'synthetic_test', synthetic mode refuses one
 * classed 'governance'. So a synthetic approval is never Production authority on any branch or deploy
 * route, and relabelling an approver changes nothing. A synthetic test also cannot be run by writing
 * look-alike approvals into the governance bundle: synthetic mode never reads it.
 *
 * This is separate from, and in addition to, Source Text Approval and the publication eligibility rules
 * (`../customer-record/*`), which apply unchanged to whichever bundle is selected. The issuance and
 * submissions stops apply to both modes unchanged.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { RegistryInput } from '../contract/question-registry'
import type { CreatorRecordSources } from '../prototype/build-draft'
import type { SourceTextApproval } from '../customer-record/source-text'
import type { PdfTemplateApproval } from '../customer-pdf/templates'

export type PublicationAuthorityClass = 'governance' | 'synthetic_test'

export interface PublicationAuthorityBundle {
  readonly authority_class: PublicationAuthorityClass
  readonly registry_input: RegistryInput
  readonly publication_ledger: readonly PublicationLedgerEntry[]
  readonly dependency_labels: Readonly<Record<string, string>>
  readonly presentation: CreatorRecordSources['presentation']
  readonly acknowledgements: Readonly<Record<string, string>>
  readonly caveats: Readonly<Record<string, string>>
  readonly versions: Readonly<{ registry: string; ledger: string }>
  readonly max_tools: number
  readonly source_text_approval: SourceTextApproval | null
  readonly pdf_templates: unknown
  readonly pdf_template_approval: PdfTemplateApproval | null
}

/** The Production Supabase project (public identifier; see DEPLOYMENT.md). Synthetic authority never runs against it. */
export const PRODUCTION_SUPABASE_PROJECT_REF = 'lehqgcgnenwdmuzudbrs'

export const AUTHORITY_MODE_ENV = 'SI8_CR_PUBLICATION_AUTHORITY'
export const SYNTHETIC_MODE_VALUE = 'synthetic-isolated-test'
export const SYNTHETIC_SUPABASE_REF_ENV = 'SI8_CR_SYNTHETIC_SUPABASE_REF'

export type AuthorityRefusal =
  | 'mode_malformed'
  | 'production_environment'
  | 'environment_ambiguous'
  | 'database_unidentified'
  | 'production_database'
  | 'database_not_bound'
  | 'payments_not_test_mode'

export type AuthorityResolution =
  | { ok: true; mode: 'governance' }
  | { ok: true; mode: 'synthetic_isolated_test'; database_ref: string }
  | { ok: false; refusal: AuthorityRefusal }

type Env = Readonly<Record<string, string | undefined>>

/** The Supabase project ref from a project URL; 'local' for a local Supabase; null when unrecognisable. */
export function supabaseProjectRef(url: string | undefined): string | null {
  if (typeof url !== 'string' || url.trim() === '') return null
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const m = /^([a-z0-9]{20})\.supabase\.co$/.exec(u.hostname)
  if (m && u.protocol === 'https:') return m[1]
  if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && u.protocol === 'http:') return 'local'
  return null
}

export function resolvePublicationAuthority(env: Env): AuthorityResolution {
  const raw = env[AUTHORITY_MODE_ENV]
  if (raw === undefined || raw === 'governance') return { ok: true, mode: 'governance' }
  if (raw !== SYNTHETIC_MODE_VALUE) return { ok: false, refusal: 'mode_malformed' }

  const vercel = env.VERCEL_ENV
  if (vercel === 'production') return { ok: false, refusal: 'production_environment' }
  if (vercel !== undefined && vercel !== 'preview' && vercel !== 'development') return { ok: false, refusal: 'environment_ambiguous' }

  const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)
  if (ref === null) return { ok: false, refusal: 'database_unidentified' }
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) return { ok: false, refusal: 'production_database' }
  if (env[SYNTHETIC_SUPABASE_REF_ENV] !== ref) return { ok: false, refusal: 'database_not_bound' }

  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? '')) return { ok: false, refusal: 'payments_not_test_mode' }

  return { ok: true, mode: 'synthetic_isolated_test', database_ref: ref }
}

/** Approver-facing text that only a synthetic or fixture approval would carry (a second, non-structural check). */
const SYNTHETIC_TEXT = /synthetic|fixture/i

function approvalTexts(b: PublicationAuthorityBundle): string[] {
  const out: (string | null | undefined)[] = []
  for (const q of b.registry_input.questions ?? []) out.push(q.approval?.approver, q.approval?.review_ref)
  for (const o of b.registry_input.observation_map ?? []) out.push(o.approval?.approver, o.approval?.review_ref)
  for (const m of b.registry_input.semantic_mappings ?? []) out.push(m.review_ref)
  for (const e of b.publication_ledger) out.push(e.entry_id, e.approver)
  out.push(b.versions.registry, b.versions.ledger)
  out.push(b.source_text_approval?.authority, b.source_text_approval?.review_ref)
  out.push(b.pdf_template_approval?.authority, b.pdf_template_approval?.review_ref)
  return out.filter((x): x is string => typeof x === 'string')
}

/**
 * The bundle this build may publish from, or null (fail closed). The class must match the mode exactly;
 * in governance mode a bundle whose approval text looks synthetic is refused as well.
 */
export function selectAuthorityBundle(
  resolution: AuthorityResolution,
  bundles: { governance: PublicationAuthorityBundle; synthetic_test: PublicationAuthorityBundle | null },
): PublicationAuthorityBundle | null {
  if (!resolution.ok) return null
  if (resolution.mode === 'governance') {
    const b = bundles.governance
    if (b.authority_class !== 'governance') return null
    if (approvalTexts(b).some((t) => SYNTHETIC_TEXT.test(t))) return null
    return b
  }
  const b = bundles.synthetic_test
  if (!b || b.authority_class !== 'synthetic_test') return null
  return b
}
