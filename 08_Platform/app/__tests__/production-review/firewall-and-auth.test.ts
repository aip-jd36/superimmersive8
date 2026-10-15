/**
 * CAA-PRODUCT-A-2 — isolation firewall + admin authorization.
 *
 * 10. Product A is structurally incapable of modifying Product B (Commercial
 *     Assurance) or CRC state — scanned against the actual source files.
 * 11. The preview loader authorizes BEFORE any data access and denies
 *     non-admins.
 */
import * as fs from 'fs'
import * as path from 'path'

jest.mock('@/lib/auth/admin', () => ({ requireAdmin: jest.fn() }))

import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  loadProductionReviewPreview,
  PRODUCTION_REVIEW_SUBMISSION_COLUMNS,
} from '@/app/admin/submissions/[id]/production-review/load-production-review'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importsOf = (rel: string) =>
  (read(rel).match(/^\s*import[\s\S]*?from\s+['"]([^'"]+)['"]/gm) ?? []).map((l) => l.match(/from\s+['"]([^'"]+)['"]/)![1])

const LIB_FILES = fs
  .readdirSync(path.join(APP_ROOT, 'lib/production-review'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `lib/production-review/${f}`)
const ROUTE_DIR = 'app/admin/submissions/[id]/production-review'
const LOADER = `${ROUTE_DIR}/load-production-review.ts`
const PAGE = `${ROUTE_DIR}/page.tsx`
const ALL = [...LIB_FILES, LOADER, PAGE]

const FORBIDDEN_IMPORTS = [
  /^@\/lib\/assessments/,
  /^@\/lib\/crc-engine/,
  /^@\/lib\/crc-assurance-handoff/,
  /^@\/lib\/crc-sales/,
  /^@\/lib\/projection-layer/,
  /^@\/lib\/hrr-audit/,
  /^@\/lib\/reviewer-context/,
  /^@\/lib\/emails/,
  /^@\/lib\/stripe/,
  /^@anthropic-ai\//,
  /anthropic/,
  /review\/(WorkbookClient|Section\d|workbook-schema)/,
]

describe('Product A firewall', () => {
  test('lib/production-review contains the four planned modules only', () => {
    expect(LIB_FILES.sort()).toEqual([
      'lib/production-review/build-production-facts.ts',
      'lib/production-review/project-production-review.ts',
      'lib/production-review/run-production-review.ts',
      'lib/production-review/types.ts',
    ])
  })

  test.each(ALL)('%s imports nothing from Product B, CRC conversation, audit, email, payment or model code', (rel) => {
    for (const spec of importsOf(rel)) {
      for (const bad of FORBIDDEN_IMPORTS) expect(spec).not.toMatch(bad)
    }
  })

  test.each(ALL)('%s performs no database or storage writes and no network calls', (rel) => {
    const src = codeOnly(rel)
    expect(src).not.toMatch(/\.(insert|update|upsert|delete|rpc)\s*\(/)
    expect(src).not.toMatch(/\.storage\b/)
    expect(src).not.toMatch(/\bfetch\s*\(/)
  })

  test('lib/production-review is pure: no Supabase, auth, or Next.js imports', () => {
    for (const rel of LIB_FILES) {
      for (const spec of importsOf(rel)) expect(spec).not.toMatch(/supabase|lib\/auth|^next\//)
    }
  })

  test('the page reads data only through the authorizing loader', () => {
    const specs = importsOf(PAGE)
    expect(specs).toContain('./load-production-review')
    expect(specs.some((s) => /supabase/.test(s))).toBe(false)
    expect(codeOnly(PAGE)).toMatch(/INTERNAL|preview\.banner/)
  })

  test('the loader calls requireAdmin before touching the database', () => {
    const src = codeOnly(LOADER)
    const auth = src.indexOf('await requireAdmin()')
    const firstRead = src.indexOf('.from(')
    expect(auth).toBeGreaterThan(-1)
    expect(firstRead).toBeGreaterThan(auth)
  })

  test('no existing customer-facing route links to the preview', () => {
    const candidates = ['app/certify/page.tsx', 'app/dashboard/page.tsx', 'app/dashboard/submissions/[id]/page.tsx', 'app/page.tsx']
    for (const rel of candidates) expect(read(rel)).not.toMatch(/production-review/)
  })
})

describe('Product A preview authorization', () => {
  const mockedRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
  const db = supabaseAdmin as unknown as Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('11. a non-admin is stopped before any data access', async () => {
    mockedRequireAdmin.mockImplementation(async () => {
      throw new Error('NEXT_REDIRECT')
    })
    await expect(loadProductionReviewPreview('sub-1')).rejects.toThrow('NEXT_REDIRECT')
    expect(db.from).not.toHaveBeenCalled()
  })

  test('an admin gets a read-only projection of the selected columns only', async () => {
    mockedRequireAdmin.mockResolvedValue({ id: 'admin-1' } as any)
    db.single.mockResolvedValueOnce({
      data: {
        id: 'sub-1',
        title: 'OW-HYP',
        tier: 'si8_certified',
        tools_used: JSON.stringify([{ tool_name: 'Kling AI', plan_type: 'Pro' }]),
        territory_preferences: 'Global',
        third_party_assets: null,
        audio_disclosure: null,
      },
      error: null,
    })
    const data = await loadProductionReviewPreview('sub-1')
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1)
    expect(db.from).toHaveBeenCalledWith('submissions')
    expect(db.select).toHaveBeenCalledWith(PRODUCTION_REVIEW_SUBMISSION_COLUMNS)
    expect(db.eq).toHaveBeenCalledWith('id', 'sub-1')
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
    expect(db.rpc).not.toHaveBeenCalled()
    expect(data!.preview.banner).toBe('INTERNAL PRODUCT A PREVIEW — NOT CUSTOMER-FACING')
    expect(data!.preview.conditions.map((c) => c.claim_id)).toContain('CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1')
  })

  test('selected columns exclude workbook, assessment, payment and reviewer data', () => {
    expect(PRODUCTION_REVIEW_SUBMISSION_COLUMNS).not.toMatch(/workbook|report|signoff|payment|stripe|review_notes|risk/)
  })

  test('a missing submission yields null (page renders notFound)', async () => {
    mockedRequireAdmin.mockResolvedValue({ id: 'admin-1' } as any)
    db.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    await expect(loadProductionReviewPreview('missing')).resolves.toBeNull()
  })
})
