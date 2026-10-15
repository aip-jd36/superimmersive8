/**
 * CAA-SECURITY-3A — POST /api/submissions/create
 *
 * Proves:
 *   - unauthenticated → 401, nothing inserted;
 *   - identity comes from the session; body `user_id` / `userId` are ignored;
 *   - status / payment_status are always server-set;
 *   - reviewer / payment / report / admin / unknown fields are discarded;
 *   - malformed bodies → 400, nothing inserted;
 *   - DB error details are never returned;
 *   - the real RecordForm and CertForm payload shapes still insert intact.
 */

const getUser = jest.fn()
const single = jest.fn()
const select = jest.fn(() => ({ single }))
const insert = jest.fn((_row: Record<string, unknown>) => ({ select }))
const from = jest.fn((_table: string) => ({ insert }))

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser } }) }))
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (t: string) => from(t) } }))

import { POST } from '@/app/api/submissions/create/route'
import { SUBMISSION_INTAKE_FIELDS } from '@/lib/submissions/build-intake-insert'

const SESSION_USER = 'user-session-1'

function req(body: unknown, opts: { badJson?: boolean } = {}) {
  return {
    json: async () => {
      if (opts.badJson) throw new SyntaxError('bad json')
      return body
    },
  } as any
}

const inserted = () => insert.mock.calls[0][0] as Record<string, unknown>

// Payload shapes copied from app/record/page.tsx and app/certify/page.tsx.
const recordFormPayload = {
  user_id: SESSION_USER,
  filmmaker_name: 'Test Creator',
  filmmaker_location: null,
  filmmaker_contact: 'creator@example.com',
  filmmaker_portfolio_links: null,
  title: 'Test Film',
  runtime: 90,
  genre: null,
  logline: null,
  intended_use: JSON.stringify({ primary_use: null, suitable_categories: [], excluded_categories: [] }),
  tools_used: JSON.stringify([{ tool_name: 'Runway Gen-3', plan_type: 'Pro', receipt_path: `${SESSION_USER}/r.pdf`, is_primary: true }]),
  authorship_statement: 'I directed it.',
  likeness_confirmation: JSON.stringify({ all_confirmed: true }),
  ip_confirmation: JSON.stringify({ all_confirmed: true }),
  audio_disclosure: JSON.stringify({ source_type: 'original' }),
  modification_authorized: false,
  modification_scope: null,
  territory_preferences: 'Global',
  supporting_materials: JSON.stringify([]),
  tier: 'creator_record',
  submission_mode: 'creator',
  status: 'pending',
  payment_status: 'unpaid',
  custodian_declaration: true,
  indemnification_confirmed: true,
  video_url: 'https://youtu.be/x',
}

const certFormPayload = {
  user_id: SESSION_USER,
  filmmaker_name: 'Agency Co',
  filmmaker_contact: 'agency@example.com',
  title: 'Campaign Spot',
  runtime: 30,
  genre: null,
  logline: null,
  intended_use: '{}',
  tools_used: '[]',
  authorship_statement: 'Agency team.',
  likeness_confirmation: '{}',
  likeness_release_path: null,
  ip_confirmation: '{}',
  ip_license_path: null,
  fair_use_argument: null,
  fair_use_doc_path: null,
  audio_disclosure: '{}',
  territory_preferences: 'United States',
  modification_authorized: false,
  modification_scope: null,
  supporting_materials: '[]',
  tier: 'si8_certified',
  submission_mode: 'agency',
  status: 'pending',
  payment_status: 'unpaid',
  campaign_context: '{}',
  third_party_assets: '{}',
  post_gen_editing: '{}',
  scene_attribution: '{}',
  ai_percentage: 80,
  production_evidence_paths: '{}',
  client_name: 'Brand X',
  content_integrity_accepted: true,
  scope_acknowledged: true,
  custodian_declaration: true,
  indemnification_confirmed: true,
  video_url: 'https://vimeo.com/1',
}

beforeEach(() => {
  jest.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: SESSION_USER } }, error: null })
  single.mockResolvedValue({ data: { id: 'sub-new' }, error: null })
})

describe('authentication', () => {
  test('no session → 401, nothing inserted', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req({ submissionData: recordFormPayload, userId: SESSION_USER }))
    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  test('auth error → 401, nothing inserted', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } })
    const res = await POST(req({ submissionData: recordFormPayload }))
    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('identity spoofing', () => {
  test('body user_id and userId are ignored; user_id is the session user', async () => {
    const res = await POST(req({ submissionData: { ...recordFormPayload, user_id: 'victim-2' }, userId: 'victim-2' }))
    expect(res.status).toBe(200)
    expect(inserted().user_id).toBe(SESSION_USER)
  })
})

describe('protected-field injection', () => {
  test('status and payment_status are always server-set', async () => {
    await POST(req({ submissionData: { ...recordFormPayload, status: 'approved', payment_status: 'paid' } }))
    expect(inserted().status).toBe('pending')
    expect(inserted().payment_status).toBe('unpaid')
  })

  test('reviewer, payment, report, assessment, admin and unknown fields are discarded', async () => {
    const injected = {
      amount_paid: 49900,
      stripe_payment_intent_id: 'pi_x',
      stripe_checkout_session_id: 'cs_x',
      review_notes: 'x',
      reviewed_by: 'admin-1',
      reviewed_at: '2026-01-01',
      reviewer_checklist: '{}',
      risk_rating: 'Low',
      risk_notes: 'x',
      workbook_data: '{}',
      workbook_revision: 99,
      assess_id: 'ASSESS-001',
      report_pdf_url: 'x',
      report_hash: 'x',
      report_pdf_assessment_id: 'a-1',
      signed_video_url: 'x',
      numbers_asset_id: 'x',
      provenance_status: 'signed',
      delivered_at: '2026-01-01',
      document_url: 'x',
      is_system_test: true,
      is_admin: true,
      id: 'chosen-id',
      created_at: '2020-01-01',
      not_a_column: 'x',
    }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await POST(req({ submissionData: { ...recordFormPayload, ...injected } }))
    expect(res.status).toBe(200)
    for (const k of Object.keys(injected)) expect(inserted()).not.toHaveProperty(k)
    // Names are logged, values never are.
    const logged = JSON.stringify(warn.mock.calls)
    expect(logged).toContain('workbook_data')
    expect(logged).not.toContain('pi_x')
    warn.mockRestore()
  })

  test('the inserted row contains only intake fields plus the three server-set fields', async () => {
    await POST(req({ submissionData: { ...certFormPayload, workbook_data: '{}' } }))
    const allowed = new Set<string>([...SUBMISSION_INTAKE_FIELDS, 'user_id', 'status', 'payment_status'])
    for (const k of Object.keys(inserted())) expect(allowed.has(k)).toBe(true)
  })

  test.each([['premium'], ['approved'], [499]])('unknown tier %p → 400, nothing inserted', async (tier) => {
    const res = await POST(req({ submissionData: { ...recordFormPayload, tier } }))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  test('unknown submission_mode → 400', async () => {
    const res = await POST(req({ submissionData: { ...recordFormPayload, submission_mode: 'admin' } }))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('malformed payloads', () => {
  test.each([
    ['unparseable JSON', undefined, true],
    ['missing submissionData', {}, false],
    ['submissionData is an array', { submissionData: [] }, false],
    ['submissionData is a string', { submissionData: 'x' }, false],
    ['body is null', null, false],
    ['missing title', { submissionData: { ...recordFormPayload, title: undefined } }, false],
    ['blank title', { submissionData: { ...recordFormPayload, title: '   ' } }, false],
    ['object-valued field', { submissionData: { ...recordFormPayload, tools_used: [{ tool_name: 'x' }] } }, false],
  ])('%s → 400, nothing inserted', async (_label, body, badJson) => {
    const res = await POST(req(body, { badJson: badJson as boolean }))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('error handling', () => {
  test('DB error → 400 with a fixed message; no code, details or hint returned', async () => {
    single.mockResolvedValue({ data: null, error: { code: '23514', message: 'violates check constraint "submissions_tier_check"', details: 'Failing row contains (secret)', hint: 'h' } })
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ submissionData: recordFormPayload }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json).toEqual({ error: 'Failed to create submission' })
    err.mockRestore()
  })

  test('unexpected throw → 500 with a fixed message', async () => {
    single.mockRejectedValue(new Error('connection reset at 10.0.0.5'))
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ submissionData: recordFormPayload }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    err.mockRestore()
  })
})

describe('legitimate intake', () => {
  test.each([
    ['RecordForm', recordFormPayload],
    ['CertForm', certFormPayload],
  ])('%s payload inserts every intake field unchanged and returns the id', async (_label, payload) => {
    const res = await POST(req({ submissionData: payload, userId: SESSION_USER, catalogData: null }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ submission: { id: 'sub-new' } })
    expect(from).toHaveBeenCalledWith('submissions')
    const { user_id: _u, status: _s, payment_status: _p, ...intake } = payload
    for (const [k, v] of Object.entries(intake)) expect(inserted()[k]).toEqual(v)
    expect(select).toHaveBeenCalledWith('id')
  })

  test('the allowlist covers every key the intake forms send', () => {
    for (const k of [...Object.keys(recordFormPayload), ...Object.keys(certFormPayload)]) {
      if (['user_id', 'status', 'payment_status'].includes(k)) continue
      expect((SUBMISSION_INTAKE_FIELDS as readonly string[]).includes(k)).toBe(true)
    }
  })
})

describe('allowlist stays in sync with the real intake forms', () => {
  // Top-level keys of `const submissionData = {...}` in each form (8-space indent; nested JSON keys are deeper).
  function formKeys(rel: string): string[] {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const src: string = fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8')
    const start = src.indexOf('const submissionData')
    const end = src.slice(start).search(/\r?\n {6}\}\r?\n/)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(0)
    return [...src.slice(start, start + end).matchAll(/^ {8}([a-z_]+)[,:]/gm)].map((m) => m[1])
  }

  test.each([['app/record/page.tsx'], ['app/certify/page.tsx']])('%s sends only allowlisted or server-set keys', (rel) => {
    const keys = formKeys(rel)
    expect(keys.length).toBeGreaterThan(20)
    for (const k of keys) {
      const ok = (SUBMISSION_INTAKE_FIELDS as readonly string[]).includes(k) || ['user_id', 'status', 'payment_status'].includes(k)
      expect({ k, ok }).toEqual({ k, ok: true })
    }
  })

  test('RecordForm adds video_url when posting, and it is allowlisted', () => {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const src: string = fs.readFileSync(path.resolve(__dirname, '../..', 'app/record/page.tsx'), 'utf-8')
    expect(src).toMatch(/submissionData: \{ \.\.\.submissionData, video_url: data\.video_url \}/)
    expect((SUBMISSION_INTAKE_FIELDS as readonly string[]).includes('video_url')).toBe(true)
  })
})
