/**
 * CR-OPTION-C-OC1B — structured neutral projection and template provenance.
 *
 * - The internal snapshot reads the prototype's output only through the
 *   structured projection: prototype summary or comparison wording, and
 *   positive or negative reconciliation results, cannot reach it.
 * - Unknown, missing or ill-typed projection fields fail closed.
 * - The internal draft templates carry a pinned version; a template change
 *   without a version update stops snapshot building, and the version is part
 *   of the hash.
 *
 * Synthetic data only (replay fixtures). No model calls, no I/O beyond reading
 * source files.
 */

import { createHash } from 'node:crypto'
import { type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { T } from '@/lib/creator-record/presentation/templates'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/internal-draft/canonical'
import { buildInternalDraftDocument, documentText, InternalDraftRenderError } from '@/lib/creator-record/internal-draft/document-model'
import { InternalDraftProjectionError } from '@/lib/creator-record/internal-draft/projection'
import { buildInternalDraftSnapshot, snapshotFromDraft, type InternalDraftSnapshot } from '@/lib/creator-record/internal-draft/snapshot'
import { internalDraftTemplateContract, InternalDraftTemplateContractError, templateFingerprint } from '@/lib/creator-record/internal-draft/template-contract'
import { D, INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS, INTERNAL_DRAFT_TEMPLATE_ID, INTERNAL_DRAFT_TEMPLATE_VERSION } from '@/lib/creator-record/internal-draft/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'PROTOTYPE-OC1BTEST', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ANS = { P1: ['OC-1B synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

async function toolDoc(fixtureId: string, tool_index = 0): Promise<ToolDocument> {
  const bytes = new Uint8Array([...PNG, ...Buffer.from(`synthetic:${fixtureId}`)])
  const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === fixtureId)!
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes) } as ReplayFixture])
  return { tool_index, document: await examineUpload(bytes, `${fixtureId}.png`, { mode: 'fixture_replay', replayTable: table }) }
}
const state = (plan: string, tool = 'pika'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: [tool], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
const input = (s: CreatorRecordFormState, documents: ToolDocument[] = []) => ({ state: s, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, documents })

function draftOf(s: CreatorRecordFormState, documents: ToolDocument[] = []) {
  const r = buildCreatorRecordDraft(input(s, documents))
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}

/** Every reconciliation statement the prototype can make. None may reach the internal draft. */
const RECON_STRINGS = [
  ...Object.values(T.recon_result), ...Object.values(T.recon_reason), T.recon_intro, T.recon_limit_consistent, T.recon_limit_conflict,
  T.recon_none, T.not_done_documents, T.open_documents_some, 'Provisional document comparisons', 'not been compared with document evidence',
]
const RECON_TOKENS = /appears_consistent|appears_to_conflict|does_not_establish|not_assessed|evidence_reconciliation|cross_check|reconciliation/

// [tool, declared plan, document]: between them, positive ("appears consistent") and negative ("appears to conflict") provisional comparisons.
const CASES: [string, string, string][] = [
  ['pika', 'Pro', 'shot-pika-multiple-payments'],
  ['pika', 'Standard', 'shot-pika-multiple-payments'],
  ['pika', 'Pro', 'pdf-kling-pro-monthly'],
  ['kling', 'Pro', 'pdf-kling-pro-monthly'],
  ['kling', 'Standard', 'pdf-kling-pro-monthly'],
]

// ───────────────────────────────────────────── structured projection

describe('the internal snapshot never reads prototype summary or comparison output', () => {
  test('control: these cases give both positive and negative provisional comparison results in the prototype', async () => {
    const results = new Set<string>()
    for (const [tool, plan, fixture] of CASES) {
      for (const r of draftOf(state(plan, tool), [await toolDoc(fixture)]).view.trace.evidence_reconciliation) for (const f of [r.provider, r.plan]) results.add(f.result)
    }
    expect(results.has('appears_consistent')).toBe(true)
    expect(results.has('appears_to_conflict')).toBe(true)
  })

  test.each(CASES)('%s %s with %s: no positive or negative comparison reaches the snapshot or the PDF', async (tool, plan, fixture) => {
    const r = buildInternalDraftSnapshot(input(state(plan, tool), [await toolDoc(fixture)]))
    if (!r.ok) throw new Error('snapshot failed')
    const pdf = documentText(buildInternalDraftDocument(r.snapshot, r.sha256)).join('\n')
    for (const text of [r.canonical, pdf]) {
      for (const w of RECON_STRINGS) expect([w, text.includes(w)]).toEqual([w, false])
      expect(text).not.toMatch(RECON_TOKENS)
    }
  })

  test('changing the prototype summary, its reconciliation or its reconciliation trace does not change the snapshot', async () => {
    const docs = [await toolDoc('shot-pika-multiple-payments')]
    const { view, guidance } = draftOf(state('Pro'), docs)
    const base = snapshotFromDraft(input(state('Pro'), docs), view, guidance)

    const altered = clone(view)
    altered.summary = ['Appears consistent: your documents match all of your answers.', ...altered.summary, '3 of 3 documents appear consistent with your answers.']
    for (const item of altered.reconciliation.items) for (const row of item.rows) row.value = T.recon_result.appears_consistent
    for (const r of altered.trace.evidence_reconciliation) {
      r.provider = { ...r.provider, result: 'appears_to_conflict' } as typeof r.provider
      r.plan = { ...r.plan, result: 'appears_consistent' } as typeof r.plan
    }
    const after = snapshotFromDraft(input(state('Pro'), docs), altered, guidance)
    expect(after.canonical).toBe(base.canonical)
    expect(after.sha256).toBe(base.sha256)
  })

  test('a prototype summary or comparison template that is not pinned cannot reach the snapshot', async () => {
    const docs = [await toolDoc('pdf-pika-pro-no-period')]
    const base = buildInternalDraftSnapshot(input(state('Pro'), docs))
    let after: ReturnType<typeof buildInternalDraftSnapshot> | undefined
    let viewSummary: string[] = []
    jest.isolateModules(() => {
      jest.doMock('@/lib/creator-record/presentation/templates', () => {
        const actual = jest.requireActual('@/lib/creator-record/presentation/templates')
        return {
          ...actual,
          T: {
            ...actual.T,
            recon_summary: () => 'Your documents appear consistent with all of your answers.',
            summary_tools_without_documents: () => 'Every tool appears consistent with its document.',
          },
        }
      })
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { buildInternalDraftSnapshot: build } = require('@/lib/creator-record/internal-draft/snapshot')
      const { buildCreatorRecordDraft: buildDraft } = require('@/lib/creator-record/prototype/build-draft')
      /* eslint-enable @typescript-eslint/no-var-requires */
      viewSummary = buildDraft(input(state('Pro'), docs)).view.summary
      after = build(input(state('Pro'), docs))
    })
    expect(viewSummary).toContain('Your documents appear consistent with all of your answers.') // control: the prototype picked it up
    expect(after && after.ok && base.ok && after.sha256 === base.sha256).toBe(true)
  })

  test('a change to a prototype summary sentence the internal draft pins stops snapshot building', async () => {
    let error: unknown
    jest.isolateModules(() => {
      jest.doMock('@/lib/creator-record/presentation/templates', () => {
        const actual = jest.requireActual('@/lib/creator-record/presentation/templates')
        return { ...actual, T: { ...actual.T, summary_not_assessment: `${actual.T.summary_not_assessment} Your documents appear consistent with your answers.` } }
      })
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { buildInternalDraftSnapshot: build } = require('@/lib/creator-record/internal-draft/snapshot')
      try {
        build(input(state('Pro')))
      } catch (e) {
        error = e
      }
    })
    expect((error as Error)?.message).toMatch(/^internal_draft_template_contract: templates changed without a version update/)
  })

  test('the summary is the prototype summary without its document lines, plus the neutral document line', () => {
    const { view } = draftOf(state('Pro'))
    const r = buildInternalDraftSnapshot(input(state('Pro')))
    if (!r.ok) throw new Error('snapshot failed')
    expect(r.snapshot.summary.filter((l) => l !== D.summary_documents(0))).toEqual(view.summary.filter((l) => l !== T.recon_none))
  })
})

// ───────────────────────────────────────────── fail closed

describe('unknown, missing or unsupported projection fields fail closed', () => {
  type View = ReturnType<typeof draftOf>['view']
  const refusedView = async (mutate: (v: View & Record<string, unknown>) => void, documents: ToolDocument[] = [], plan = 'Pro') => {
    const { view, guidance } = draftOf(state(plan), documents)
    const v = clone(view) as View & Record<string, unknown>
    expect(() => snapshotFromDraft(input(state(plan), documents), clone(view), guidance)).not.toThrow() // control
    mutate(v)
    expect(() => snapshotFromDraft(input(state(plan), documents), v, guidance)).toThrow(InternalDraftProjectionError)
  }

  test('a new top-level field (for example a new comparison summary)', () => refusedView((v) => void (v.comparison_summary = ['Appears consistent'])))
  test('a new field on a guidance card', () => refusedView((v) => void ((v.guidance.cards[0] as unknown as Record<string, unknown>).document_match = 'Appears consistent')))
  test('a new field on an item this record does not establish (plan not given)', () =>
    refusedView(
      (v) => {
        const target = v.open_items.not_established[0] as unknown as Record<string, unknown>
        expect(target).toBeDefined()
        target.comparison = 'Appears consistent'
      },
      [],
      'not_sure',
    ))
  test('a new field on an open evidence item', () =>
    refusedView((v) => {
      v.open_items.items.push({ dependency_id: 'X', label: 'x', told_us: 'x', documents: 'x', evidence: 'x', sufficiency: 'x', status: 'x', for_guidance: [], comparison: 'Appears consistent' } as unknown as View['open_items']['items'][number])
    }))
  test('a new field on a document view', async () => refusedView((v) => void ((v.documents.items[0] as unknown as Record<string, unknown>).comparison = 'Appears consistent'), [await toolDoc('pdf-pika-pro-no-period')]))
  test('a new field on a declaration row', () => refusedView((v) => void ((v.declarations.groups[0].rows[0] as unknown as Record<string, unknown>).document_value = 'Pro')))
  test('a missing field', () => refusedView((v) => void delete (v.guidance.cards[0] as unknown as Record<string, unknown>).explanation))
  test('a missing withheld field (the shape must still be known)', () => refusedView((v) => void delete (v as Record<string, unknown>).reconciliation))
  test('a value of the wrong type', () => refusedView((v) => void ((v.declarations as unknown as Record<string, unknown>).intro = 3)))
  test('an unsupported guidance conclusion', () => refusedView((v) => void ((v.guidance.cards[0] as unknown as Record<string, unknown>).conclusion = 'cleared_for_use')))

  const refusedDocument = async (mutate: (d: Record<string, unknown>) => void) => {
    const docs = [await toolDoc('pdf-pika-pro-no-period')]
    const { view, guidance } = draftOf(state('Pro'), docs)
    const altered = clone(docs)
    mutate(altered[0].document as unknown as Record<string, unknown>)
    expect(() => snapshotFromDraft(input(state('Pro'), altered), view, guidance)).toThrow(InternalDraftProjectionError)
  }
  test('an unsupported document outcome', () => refusedDocument((d) => void (d.outcome = 'document_verified')))
  test('an unsupported extraction mode', () => refusedDocument((d) => void (d.extraction_mode = 'human_review')))
  test('a new field on a document (for example a reconciliation)', () => refusedDocument((d) => void (d.reconciliation = { result: 'appears_consistent' })))
  test('a malformed fingerprint', () => refusedDocument((d) => void (d.sha256 = 'not-a-digest')))

  test('documents that do not correspond to the view', async () => {
    const { view, guidance } = draftOf(state('Pro'))
    const docs = [await toolDoc('pdf-pika-pro-no-period')]
    expect(() => snapshotFromDraft(input(state('Pro'), docs), view, guidance)).toThrow(InternalDraftProjectionError)
  })
})

// ───────────────────────────────────────────── declarations stay independent of documents

describe('declarations remain independent of documents', () => {
  test.each(CASES)('%s %s with %s: declarations, declared observations and guidance equal the snapshot without documents', async (tool, plan, fixture) => {
    const without = buildInternalDraftSnapshot(input(state(plan, tool)))
    const withDoc = buildInternalDraftSnapshot(input(state(plan, tool), [await toolDoc(fixture)]))
    if (!without.ok || !withDoc.ok) throw new Error('snapshot failed')
    expect(withDoc.snapshot.declarations).toEqual(without.snapshot.declarations)
    expect(withDoc.snapshot.declared_observations).toEqual(without.snapshot.declared_observations)
    expect(withDoc.snapshot.guidance).toEqual(without.snapshot.guidance)
  })
})

// ───────────────────────────────────────────── template provenance

describe('internal draft template version', () => {
  test('the running templates match the fingerprint pinned for the current version', () => {
    expect(templateFingerprint()).toBe(INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS[INTERNAL_DRAFT_TEMPLATE_VERSION])
    expect(internalDraftTemplateContract()).toEqual({ id: INTERNAL_DRAFT_TEMPLATE_ID, version: INTERNAL_DRAFT_TEMPLATE_VERSION, fingerprint: templateFingerprint() })
  })

  test('versions are consecutive from 1, the current one is the latest, and no fingerprint is reused', () => {
    const versions = Object.keys(INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS).map(Number).sort((a, b) => a - b)
    expect(versions).toEqual(Array.from({ length: versions.length }, (_, i) => i + 1))
    expect(versions[versions.length - 1]).toBe(INTERNAL_DRAFT_TEMPLATE_VERSION)
    const fps = Object.values(INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS)
    expect(new Set(fps).size).toBe(fps.length)
    for (const fp of fps) expect(fp).toMatch(/^[0-9a-f]{64}$/)
  })

  test('the fingerprint covers every template string and every branch of every template function', () => {
    const base = templateFingerprint()
    expect(templateFingerprint({ ...D, marking: `${D.marking}.` })).not.toBe(base)
    expect(templateFingerprint({ ...D, section: { ...D.section, documents: 'Documents compared' } })).not.toBe(base)
    expect(templateFingerprint({ ...D, not_done_base: [...D.not_done_base, 'Another line.'] })).not.toBe(base)
    // Only the plural branch changes here; the probes still see it.
    expect(templateFingerprint({ ...D, summary_documents: (n: number) => (n > 1 ? 'Documents appear consistent.' : D.summary_documents(n)) })).not.toBe(base)
  })

  test('the snapshot records the template contract apart from the registry, mapping and ledger versions', () => {
    const r = buildInternalDraftSnapshot(input(state('Pro')))
    if (!r.ok) throw new Error('snapshot failed')
    expect(r.snapshot.templates).toEqual(internalDraftTemplateContract())
    expect(r.snapshot.sources.registry_version).not.toContain(INTERNAL_DRAFT_TEMPLATE_ID)
    expect(r.snapshot.sources.ledger_version).not.toContain(INTERNAL_DRAFT_TEMPLATE_ID)
    expect(r.snapshot.missing_versions).toEqual(['prototype_presentation_templates'])
    const method = r.snapshot.method.map((m) => `${m.label}: ${m.value}`).join('\n')
    expect(method).toContain(`${D.method_templates}: ${INTERNAL_DRAFT_TEMPLATE_ID} v${INTERNAL_DRAFT_TEMPLATE_VERSION} (${templateFingerprint()})`)
  })

  test('a template version change changes the snapshot hash, and the renderer refuses a snapshot from other templates', () => {
    const r = buildInternalDraftSnapshot(input(state('Pro')))
    if (!r.ok) throw new Error('snapshot failed')
    const other = clone(r.snapshot) as InternalDraftSnapshot
    other.templates = { ...other.templates, version: other.templates.version + 1 }
    const otherHash = sha256Hex(canonicalJson(other))
    expect(otherHash).not.toBe(r.sha256)
    expect(() => buildInternalDraftDocument(other, otherHash)).toThrow(InternalDraftRenderError)
  })

  test('changed templates build only after an intentional version update, and the new version changes the hash', () => {
    const base = buildInternalDraftSnapshot(input(state('Pro')))
    const changed = { ...D, comparison_no_documents: 'No documents were added.' }
    const fp = templateFingerprint(changed)
    const run = (pin: boolean) => {
      let out: { ok: boolean; sha256?: string; version?: number } | Error = new Error('not run')
      jest.isolateModules(() => {
        jest.doMock('@/lib/creator-record/internal-draft/templates', () => {
          const actual = jest.requireActual('@/lib/creator-record/internal-draft/templates')
          return pin
            ? { ...actual, D: changed, INTERNAL_DRAFT_TEMPLATE_VERSION: 2, INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS: { ...actual.INTERNAL_DRAFT_TEMPLATE_FINGERPRINTS, 2: fp } }
            : { ...actual, D: changed }
        })
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { buildInternalDraftSnapshot: build } = require('@/lib/creator-record/internal-draft/snapshot')
        try {
          const r = build(input(state('Pro')))
          out = { ok: r.ok, sha256: r.sha256, version: r.snapshot.templates.version }
        } catch (e) {
          out = e as Error
        }
      })
      return out
    }
    const unpinned = run(false)
    expect(unpinned).toBeInstanceOf(Error)
    expect((unpinned as Error).message).toMatch(/^internal_draft_template_contract:/)
    const pinned = run(true) as unknown as { ok: boolean; sha256: string; version: number }
    expect(pinned.ok).toBe(true)
    expect(pinned.version).toBe(2)
    expect(base.ok && pinned.sha256 !== base.sha256).toBe(true)
  })

  test('the contract error type is exported for callers', () => {
    expect(new InternalDraftTemplateContractError('x').message).toBe('internal_draft_template_contract: x')
  })
})
