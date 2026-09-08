/**
 * CA-RLK-2g-D2 §5 — missing publication table fail-closed regression.
 *
 * If assessment_publications does not exist yet (new app deployed before the
 * migration is applied — the Order-A hazard, and the transient state during a
 * failed/rolled-back migration), the publication reads must fail CLOSED:
 *
 *   - listPublicationEpisodes → []  (never throws into page rendering)
 *   - findActivePublication   → null
 *   - findAssessmentForVerification → null (NOT_PUBLIC) even for a DELIVERED
 *     assessment — it must NOT fall back to "DELIVERED ⇒ public", which would
 *     silently restore the pre-CA-RLK-2g implicit-publication behavior.
 *
 * PostgREST returns a real error object (code PGRST205, "Could not find the
 * table 'public.assessment_publications' in the schema cache") — verified
 * against production 2026-09-08.
 *
 * Run: npx jest __tests__/assessments/publication-missing-table.test.ts
 */

// The jest moduleNameMapper redirects @/lib/supabase/admin to this shared
// stub; repository.ts and this test receive the SAME object, so mutating its
// methods here changes what repository.ts calls.
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  listPublicationEpisodes,
  findActivePublication,
  findAssessmentForVerification,
} from '../../lib/assessments/repository'

const PGRST205 = {
  code: 'PGRST205',
  message: "Could not find the table 'public.assessment_publications' in the schema cache",
  details: null,
  hint: "Perhaps you meant the table 'public.assessments'",
}

const DELIVERED_ASSESSMENT_ROW = {
  id: 'assess-uuid-1',
  assessment_number: 'ASSESS-005-2026-07-12',
  institutional_status: 'ACTIVE',
  status_reason: null,
  outcome: 'EVIDENCE_SUPPORTS',
  assessment_date: '2026-07-12',
  methodology_version: 'v0.1',
  reviewer_organization: 'SuperImmersive 8',
  numbers_asset_id: null,
  processing_status: 'DELIVERED',
  is_system_test: true,
  asset_title: 'Cloud World',
  asset_media_type: 'Video',
  asset_runtime: 12,
  scope_domain_codes: ['A', 'H'],
}

const fromCalls: string[] = []

/**
 * A chainable + awaitable Supabase query-builder double. `assessments`
 * resolves to the delivered row; `assessment_publications` resolves to the
 * PGRST205 missing-relation error.
 */
function makeBuilder(table: string) {
  fromCalls.push(table)
  const result = () =>
    table === 'assessments'
      ? { data: DELIVERED_ASSESSMENT_ROW, error: null }
      : { data: null, error: PGRST205 }
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    insert: () => builder,
    update: () => builder,
    then: (onFulfilled: (v: any) => any) => Promise.resolve(result()).then(onFulfilled),
    single: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
  }
  return builder
}

beforeEach(() => {
  fromCalls.length = 0
  ;(supabaseAdmin as any).from = jest.fn((t: string) => makeBuilder(t))
})

describe('publication reads when assessment_publications is absent', () => {
  it('listPublicationEpisodes returns [] and does not throw', async () => {
    await expect(listPublicationEpisodes('assess-uuid-1')).resolves.toEqual([])
  })

  it('findActivePublication returns null and does not throw', async () => {
    await expect(findActivePublication('assess-uuid-1')).resolves.toBeNull()
  })

  it('findAssessmentForVerification returns null for a DELIVERED assessment (fail closed, no DELIVERED fallback)', async () => {
    const result = await findAssessmentForVerification('ASSESS-005-2026-07-12')
    expect(result).toBeNull()
  })

  it('the null is the publication gate, not a missing assessment — both tables were queried', async () => {
    await findAssessmentForVerification('ASSESS-005-2026-07-12')
    expect(fromCalls).toContain('assessments')
    expect(fromCalls).toContain('assessment_publications')
  })
})
