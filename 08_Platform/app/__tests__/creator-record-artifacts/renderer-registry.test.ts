/**
 * CR-OPTION-C-OC2A — the Creator Record renderer registry and its wiring into
 * issuance. Behaviour-preserving: every stored Creator Record resolves to the
 * existing v1 renderer (`legacy-creator-record-pdf-v3`); an unsupported family
 * fails closed on every path, before any lookup, render or write.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const calls = {
  render: [] as { sub: unknown; recordId: string; issuedAt: unknown }[],
  artifactStatus: 0,
  legacyHasPdf: 0,
  gate: 0,
  find: 0,
  insert: [] as Record<string, unknown>[],
  takeOver: [] as Record<string, unknown>[],
  get: 0,
  put: 0,
  markIssued: 0,
}
const db = {
  status: null as 'pending' | 'issued' | null,
  legacyPdf: false,
  gate: 'allowlisted' as 'allowlisted' | 'not_allowlisted' | 'unknown',
  row: null as Record<string, any> | null,
  objects: new Map<string, Uint8Array>(),
}

jest.mock('@/lib/creator-record-artifacts/render', () => ({
  renderCreatorRecordPdf: async (sub: unknown, recordId: string, issuedAt: unknown) => {
    calls.render.push({ sub, recordId, issuedAt })
    return new TextEncoder().encode(`%PDF v1 ${recordId}`)
  },
}))
jest.mock('@/lib/creator-record-artifacts/store', () => ({
  artifactStatus: async () => ((calls.artifactStatus++), db.status),
  artifactGateDecision: async () => ((calls.gate++), db.gate),
  newAttemptId: () => '00000000-0000-4000-8000-000000000001',
  artifactTable: {
    find: async () => ((calls.find++), db.row),
    insertPending: async (row: Record<string, unknown>) => {
      calls.insert.push(row)
      db.row = { id: 'a1', status: 'pending', issued_at: null, ...row }
      return { result: 'inserted', row: db.row }
    },
    takeOver: async (_id: string, _expected: string, next: Record<string, unknown>) => {
      calls.takeOver.push(next)
      db.row = { ...db.row, ...next }
      return true
    },
    markIssued: async () => {
      calls.markIssued++
      db.row = { ...db.row, status: 'issued', issued_at: '2026-10-31T00:00:00Z' }
      return true
    },
  },
  privateObjectStore: {
    get: async (p: string) => ((calls.get++), db.objects.get(p) ?? null),
    put: async (p: string, bytes: Uint8Array) => ((calls.put++), db.objects.set(p, bytes), 'stored'),
  },
}))
jest.mock('@/lib/payments/repository', () => ({
  hasCreatorRecordPdf: async () => ((calls.legacyHasPdf++), db.legacyPdf),
  loadFulfillmentSubmission: async () => null,
}))

import { ARTIFACT_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/config'
import { ArtifactFamilyMismatchError, issueCreatorRecordArtifact } from '@/lib/creator-record-artifacts/issue'
import { issueCreatorRecord, issueDepsFor, legacyGenerateFor } from '@/lib/creator-record-artifacts/production'
import {
  CREATOR_RECORD_V1_FAMILY, productFamilyFor, rendererForFamily, selectCreatorRecordRenderer, UnsupportedProductFamilyError,
  type CreatorRecordRenderer,
} from '@/lib/creator-record-artifacts/renderers'
import type { FulfillmentSubmission } from '@/lib/payments/repository'

const SUB_ID = '3f2a9c10-1111-4222-8333-444455556666'
const sub = (over: Partial<FulfillmentSubmission> & Record<string, unknown> = {}): FulfillmentSubmission =>
  ({ id: SUB_ID, user_id: 'u1', tier: 'creator_record', status: 'approved', title: 'T', filmmaker_name: 'F', tools_used: [], authorship_statement: null, likeness_confirmation: {}, ip_confirmation: {}, territory_preferences: null, ...over }) as FulfillmentSubmission

function reset() {
  calls.render = []
  calls.insert = []
  calls.takeOver = []
  calls.artifactStatus = calls.legacyHasPdf = calls.gate = calls.find = calls.get = calls.put = calls.markIssued = 0
  db.status = null
  db.legacyPdf = false
  db.gate = 'allowlisted'
  db.row = null
  db.objects = new Map()
}
beforeEach(reset)

const noTouch = () => {
  expect(calls.render).toHaveLength(0)
  expect(calls.insert).toHaveLength(0)
  expect(calls.takeOver).toHaveLength(0)
  expect(calls.put).toBe(0)
  expect(calls.markIssued).toBe(0)
}

describe('selection', () => {
  test('a stored Creator Record resolves to the v1 renderer and its existing generator version', () => {
    const r = selectCreatorRecordRenderer(sub())
    expect(r.family).toBe(CREATOR_RECORD_V1_FAMILY)
    expect(r.generator_version).toBe('legacy-creator-record-pdf-v3')
    expect(r.generator_version).toBe(ARTIFACT_GENERATOR_VERSION)
    expect(r.legacy_path_permitted).toBe(true)
    expect(Object.isFrozen(r)).toBe(true)
  })

  test('the v1 family owns every version it has recorded, and nothing else', () => {
    const r = rendererForFamily(CREATOR_RECORD_V1_FAMILY)
    for (const v of ['legacy-creator-record-pdf-v1', 'legacy-creator-record-pdf-v2', 'legacy-creator-record-pdf-v3']) expect(r.ownsGeneratorVersion(v)).toBe(true)
    for (const v of ['si8-internal-draft/creator-record-v2-pdf@0', 'creator-record-v2-pdf-v1', 'legacy-creator-record-pdf-v0', 'legacy-creator-record-pdf-v3 ', 'legacy-creator-record-pdf-', ''])
      expect(r.ownsGeneratorVersion(v)).toBe(false)
  })

  test('unsupported or unknown families fail closed; there is no default', () => {
    for (const f of ['creator_record_v2', 'creator_record', 'v1', '', '__proto__', 'constructor', 'toString', 'hasOwnProperty', null]) {
      expect(() => rendererForFamily(f)).toThrow(UnsupportedProductFamilyError)
    }
  })

  test('only Creator Records have a family', () => {
    for (const tier of ['si8_certified', 'certified', '', null, 'CREATOR_RECORD']) expect(productFamilyFor({ tier })).toBeNull()
    expect(() => selectCreatorRecordRenderer(sub({ tier: 'si8_certified' }))).toThrow(UnsupportedProductFamilyError)
  })

  test('no other value on the submission can choose the renderer', () => {
    const r = selectCreatorRecordRenderer(sub({ renderer: 'v2', family: 'creator_record_v2', product_family: 'creator_record_v2', record_product_version: 'v2', generator_version: 'x' }))
    expect(r).toBe(rendererForFamily(CREATOR_RECORD_V1_FAMILY))
  })
})

describe('issue deps', () => {
  test('bind the v1 renderer: the existing v1 render function, with the submission, record id and an issue time', async () => {
    const s = sub()
    const deps = issueDepsFor(s)
    expect(deps.renderer.family).toBe(CREATOR_RECORD_V1_FAMILY)
    expect(deps.renderer.generator_version).toBe('legacy-creator-record-pdf-v3')
    const bytes = await deps.renderer.render('CR-2026-3F2A9C10')
    expect(new TextDecoder().decode(bytes)).toBe('%PDF v1 CR-2026-3F2A9C10')
    expect(calls.render).toHaveLength(1)
    expect(calls.render[0].sub).toBe(s)
    expect(calls.render[0].recordId).toBe('CR-2026-3F2A9C10')
    expect(calls.render[0].issuedAt).toBeInstanceOf(Date)
  })

  test('an unsupported submission has no issue deps', () => {
    expect(() => issueDepsFor(sub({ tier: 'si8_certified' }))).toThrow(UnsupportedProductFamilyError)
  })
})

describe('issuance through the registry', () => {
  test('a new artifact records the v1 generator version', async () => {
    const result = await issueCreatorRecordArtifact(SUB_ID, issueDepsFor(sub()))
    expect(result.outcome).toBe('issued')
    expect(calls.insert).toHaveLength(1)
    expect(calls.insert[0]).toEqual(expect.objectContaining({ generator_version: 'legacy-creator-record-pdf-v3', record_id: 'CR-2026-3F2A9C10' }))
  })

  test('a pending v1 row whose object is missing is taken over by the v1 family and records the current v1 version', async () => {
    db.row = { id: 'a1', submission_id: SUB_ID, record_id: 'CR-2026-3F2A9C10', attempt_id: 'old', storage_path: `${SUB_ID}/old.pdf`, sha256: 'a'.repeat(64), byte_size: 1, generator_version: 'legacy-creator-record-pdf-v2', status: 'pending', uat: false, issued_at: null }
    const result = await issueCreatorRecordArtifact(SUB_ID, issueDepsFor(sub()))
    expect(result.outcome).toBe('issued')
    expect(calls.render).toHaveLength(1)
    expect(calls.render[0].recordId).toBe('CR-2026-3F2A9C10')
    expect(calls.takeOver).toEqual([expect.objectContaining({ generator_version: 'legacy-creator-record-pdf-v3' })])
  })

  test('a pending row recorded by another family is refused before any read, render or write', async () => {
    db.row = { id: 'a1', submission_id: SUB_ID, record_id: 'CR-2026-3F2A9C10', attempt_id: 'old', storage_path: `${SUB_ID}/old.pdf`, sha256: 'a'.repeat(64), byte_size: 1, generator_version: 'creator-record-v2-pdf-v1', status: 'pending', uat: false, issued_at: null }
    await expect(issueCreatorRecordArtifact(SUB_ID, issueDepsFor(sub()))).rejects.toThrow(ArtifactFamilyMismatchError)
    expect(calls.get).toBe(0)
    noTouch()
    expect(db.row!.status).toBe('pending')
  })

  test('an issued artifact is returned unchanged, whatever version it records', async () => {
    db.row = { id: 'a1', submission_id: SUB_ID, record_id: 'CR-2026-3F2A9C10', attempt_id: 'old', storage_path: `${SUB_ID}/old.pdf`, sha256: 'a'.repeat(64), byte_size: 1, generator_version: 'legacy-creator-record-pdf-v1', status: 'issued', uat: false, issued_at: '2026-10-29T00:00:00Z' }
    const result = await issueCreatorRecordArtifact(SUB_ID, issueDepsFor(sub()))
    expect(result.outcome).toBe('already_issued')
    expect(calls.get).toBe(0)
    noTouch()
  })
})

describe('fulfilment generate step (issueCreatorRecord)', () => {
  const legacy = () => {
    const l = { calls: 0, fn: async () => void l.calls++ }
    return l
  }

  test('an unsupported family throws before any lookup; nothing is issued on either path', async () => {
    const l = legacy()
    await expect(issueCreatorRecord(sub({ tier: 'si8_certified' }), l.fn)).rejects.toThrow(UnsupportedProductFamilyError)
    expect(l.calls).toBe(0)
    expect(calls.artifactStatus + calls.legacyHasPdf + calls.gate + calls.find + calls.get).toBe(0)
    noTouch()
  })

  test('rollout gate open: a private v1 artifact is issued', async () => {
    const l = legacy()
    await issueCreatorRecord(sub(), l.fn)
    expect(l.calls).toBe(0)
    expect(calls.insert).toEqual([expect.objectContaining({ generator_version: 'legacy-creator-record-pdf-v3' })])
    expect(db.row!.status).toBe('issued')
  })

  test('not allowlisted (rollout off): the existing legacy generator is used, unchanged', async () => {
    db.gate = 'not_allowlisted'
    const l = legacy()
    await issueCreatorRecord(sub(), l.fn)
    expect(l.calls).toBe(1)
    noTouch()
  })

  test('unknown eligibility still fails closed', async () => {
    db.gate = 'unknown'
    const l = legacy()
    await expect(issueCreatorRecord(sub(), l.fn)).rejects.toThrow('creator_record_artifact_eligibility_unknown')
    expect(l.calls).toBe(0)
    noTouch()
  })

  test('a legacy PDF still takes precedence: nothing is issued again', async () => {
    db.legacyPdf = true
    const l = legacy()
    await issueCreatorRecord(sub(), l.fn)
    expect(l.calls).toBe(0)
    expect(calls.gate).toBe(0)
    noTouch()
  })

  test('an existing artifact row still takes precedence over a legacy PDF', async () => {
    db.status = 'issued'
    db.legacyPdf = true
    db.row = { id: 'a1', submission_id: SUB_ID, record_id: 'CR-2026-3F2A9C10', attempt_id: 'old', storage_path: `${SUB_ID}/old.pdf`, sha256: 'a'.repeat(64), byte_size: 1, generator_version: 'legacy-creator-record-pdf-v3', status: 'issued', uat: false, issued_at: '2026-10-29T00:00:00Z' }
    const l = legacy()
    await issueCreatorRecord(sub(), l.fn)
    expect(l.calls).toBe(0)
    expect(calls.legacyHasPdf).toBe(0)
    noTouch()
  })

  test('the legacy generator is refused for a family that does not permit it', async () => {
    const l = legacy()
    const noLegacy = { ...rendererForFamily(CREATOR_RECORD_V1_FAMILY), legacy_path_permitted: false } as CreatorRecordRenderer
    await expect(legacyGenerateFor(noLegacy, l.fn)()).rejects.toThrow(UnsupportedProductFamilyError)
    expect(l.calls).toBe(0)
    await legacyGenerateFor(rendererForFamily(CREATOR_RECORD_V1_FAMILY), l.fn)()
    expect(l.calls).toBe(1)
  })
})

describe('every issuance entry point uses the same selection (source inspection)', () => {
  const APP_ROOT = path.resolve(__dirname, '..', '..')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      if (n === 'node_modules' || n === '.next') return []
      const p = path.join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
    })
  const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'lib'))].map((f) => ({ f: path.relative(APP_ROOT, f).split(path.sep).join('/'), src: readFileSync(f, 'utf8') }))
  const importing = (re: RegExp) => files.filter(({ src }) => re.test(src)).map(({ f }) => f).sort()

  test('payment fulfilment, the hourly sweep and admin reconciliation all run the production fulfilment deps', () => {
    expect(importing(/import\s*\{[^}]*\bproductionFulfillmentDeps\b[^}]*\}\s*from/)).toEqual([
      'app/api/admin/payments/[sessionId]/reconcile/route.ts',
      'app/api/internal/payment-fulfillments/sweep/route.ts',
      'app/api/webhooks/stripe/route.ts',
    ])
    const deps = files.find(({ f }) => f === 'lib/payments/fulfillment-deps.ts')!.src
    expect(deps).toMatch(/generateCreatorRecordPdf: \(sub\) => issueCreatorRecord\(sub, /)
  })

  test('the v1 render module is loaded only by the registry; no route renders or issues directly', () => {
    expect(importing(/from\s+['"](\.\/render|@\/lib\/creator-record-artifacts\/render)['"]|import\(\s*['"]\.\/render['"]\s*\)/)).toEqual(['lib/creator-record-artifacts/renderers.ts'])
    expect(importing(/\bissueDepsFor\b/)).toEqual(['app/api/admin/submissions/[id]/generate-creator-record/route.ts', 'lib/creator-record-artifacts/production.ts'])
    expect(importing(/\bselectCreatorRecordRenderer\b/)).toEqual([
      'app/api/admin/submissions/[id]/generate-creator-record/route.ts',
      'lib/creator-record-artifacts/production.ts',
      'lib/creator-record-artifacts/renderers.ts',
    ])
  })

  test('the generator version is recorded only through the registry', () => {
    expect(importing(/\bARTIFACT_GENERATOR_VERSION\b/)).toEqual(['lib/creator-record-artifacts/config.ts', 'lib/creator-record-artifacts/renderers.ts'])
    const issue = files.find(({ f }) => f === 'lib/creator-record-artifacts/issue.ts')!.src
    expect(issue).not.toMatch(/legacy-creator-record-pdf/)
  })
})
