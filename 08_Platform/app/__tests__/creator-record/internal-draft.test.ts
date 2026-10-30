/**
 * CR-OPTION-C-OC1 — deterministic internal Creator Record v2 snapshot and draft PDF.
 *
 * Proves: canonical form and hash determinism; hash sensitivity to declarations
 * and observations; no fabricated governance versions; documents never change
 * declarations; client-supplied reconciliation is still rejected; neutral
 * fallback (C1) in snapshot, summary and PDF; internal-draft marking on every
 * page; the renderer refuses tampered or non-draft snapshots; and the module is
 * isolated from Production issuance, payment and app code.
 *
 * Synthetic data only (fixture replay). Nothing here proves extraction quality.
 */

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import React from 'react'

// @react-pdf/renderer is ESM-only and cannot load under this Jest setup; inert element types let the
// component tree (what the PDF would print) be inspected, as in the CR-PDF-DECLARATIONS-1 tests.
jest.mock('@react-pdf/renderer', () => ({
  Document: 'DOCUMENT', Page: 'PAGE', Text: 'TEXT', View: 'VIEW',
  StyleSheet: { create: (s: unknown) => s },
  renderToStream: async () => { throw new Error('not available in unit tests') },
}))

import { type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { buildCreatorRecordDraft, governedSources, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { parseFormState } from '@/lib/creator-record/prototype/parse-form-state'
import { NEGATION_ALLOWLIST, T } from '@/lib/creator-record/presentation/templates'
import { PILOT_PUBLICATION_LEDGER } from '@/lib/creator-record/pilot/pilot-ledger'
import { CanonicalizationError, canonicalJson, sha256Hex } from '@/lib/creator-record/internal-draft/canonical'
import { buildInternalDraftDocument, documentText, InternalDraftRenderError } from '@/lib/creator-record/internal-draft/document-model'
import { InternalDraftPDF } from '@/lib/creator-record/internal-draft/InternalDraftPDF'
import { buildInternalDraftSnapshot, InternalDraftSnapshotError, snapshotDigestMatches, type InternalDraftSnapshot } from '@/lib/creator-record/internal-draft/snapshot'
import { D, INTERNAL_DRAFT_GENERATOR_ID } from '@/lib/creator-record/internal-draft/templates'
import { ARTIFACT_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/config'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'PROTOTYPE-OC1TEST', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ACK = { A1: true, A2: true }
const ANS = { P1: ['OC-1 synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

async function toolDoc(fixtureId: string, tool_index = 0): Promise<ToolDocument> {
  const bytes = new Uint8Array([...PNG, ...Buffer.from(`synthetic:${fixtureId}`)])
  const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === fixtureId)!
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes) } as ReplayFixture])
  return { tool_index, document: await examineUpload(bytes, `${fixtureId}.png`, { mode: 'fixture_replay', replayTable: table }) }
}
const state = (tools: Record<string, string[]>[], answers: Record<string, string[]> = {}): CreatorRecordFormState => ({ answers: { ...ANS, ...answers }, tools, acknowledgements: ACK })
const pika = (plan: string) => ({ T1: ['pika'], T3: [plan], T4: ['May 2026'] })
const input = (s: CreatorRecordFormState, documents: ToolDocument[] = [], sources = pilotSources()) => ({ state: s, sources, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, documents })
function snap(s: CreatorRecordFormState, documents: ToolDocument[] = []) {
  const r = buildInternalDraftSnapshot(input(s, documents))
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

/** Comparison wording the prototype uses; none of it may reach the internal draft (C1). */
const COMPARISON_WORDING = [
  'Appears consistent', 'Appears to conflict', 'Does not establish it',
  'Provisional document comparisons', 'compared, provisionally', 'not been compared with document evidence',
  T.recon_intro, T.recon_limit_consistent, T.recon_limit_conflict, T.recon_none, T.not_done_documents, T.open_documents_some,
]

// Wording lock, as in draft-record-wording.test.ts (PRD v0.3 §5.4).
const BANNED: [string, RegExp][] = [
  ['clear/cleared/clearance', /\bclear(ed|ance|ing|s)?\b/i], ['compliant', /complian/i], ['certified', /certif/i], ['verified', /verif/i],
  ['approved', /\bapprov/i], ['licensed to', /licensed to/i], ['permitted to', /permitted to/i], ['safe to', /\bsafe to\b/i],
  ['applies to you', /applies to you/i], ['governed by', /governed by/i], ['does not apply', /does not apply/i], ['guarantee', /guarantee/i],
  ['legally sufficient', /legally sufficient/i],
]
const violations = (text: string) => {
  let t = text
  for (const n of NEGATION_ALLOWLIST) t = t.split(n).join(' ')
  t = t.split('approved for Creator Records').join(' ')
  return BANNED.filter(([, re]) => re.test(t)).map(([n]) => n)
}

/** Every string the PDF tree would print, with function components expanded. */
function textOf(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textOf)
  const el = node as React.ReactElement<{ children?: unknown }>
  if (typeof el.type === 'function') return textOf((el.type as (p: unknown) => unknown)(el.props))
  return textOf(el.props?.children)
}
function elements(node: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(elements)
  const el = node as React.ReactElement<Record<string, unknown>>
  if (typeof el.type === 'function') return elements((el.type as (p: unknown) => unknown)(el.props))
  return [el, ...elements(el.props?.children)]
}

// ───────────────────────────────────────────── canonical form

describe('canonical JSON', () => {
  test('key order does not matter; array order does; strings are kept verbatim', () => {
    expect(canonicalJson({ b: 1, a: [2, 1], c: { y: null, x: 'é' } })).toBe('{"a":[2,1],"b":1,"c":{"x":"é","y":null}}')
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }))
    expect(canonicalJson(['a', 'b'])).not.toBe(canonicalJson(['b', 'a']))
    // Composed and decomposed "é" are different answers and stay different.
    expect(sha256Hex(canonicalJson('é'))).not.toBe(sha256Hex(canonicalJson('é')))
  })

  test.each([
    ['undefined', { a: undefined }], ['NaN', { a: Number.NaN }], ['Infinity', [Infinity]], ['a Date', { a: new Date(0) }],
    ['a Map', { a: new Map() }], ['a function', { a: () => 1 }], ['a bigint', { a: BigInt(1) }],
  ])('rejects %s instead of dropping or coercing it', (_n, value) => {
    expect(() => canonicalJson(value)).toThrow(CanonicalizationError)
  })
})

// ───────────────────────────────────────────── determinism and sensitivity

describe('snapshot hash', () => {
  test('identical inputs yield an identical canonical snapshot and hash (also with answer keys reordered)', async () => {
    const docs = [await toolDoc('pdf-pika-pro-no-period')]
    const a = snap(state([pika('Pro')]), docs)
    const b = snap(state([pika('Pro')]), docs)
    expect(b.canonical).toBe(a.canonical)
    expect(b.sha256).toBe(a.sha256)
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Hex(a.canonical)).toBe(a.sha256)
    const reordered: CreatorRecordFormState = { ...state([pika('Pro')]), answers: Object.fromEntries(Object.entries(state([pika('Pro')]).answers).reverse()) }
    expect(snap(reordered, docs).sha256).toBe(a.sha256)
  })

  test('a change to a declaration changes the hash', () => {
    const base = snap(state([pika('Pro')])).sha256
    expect(snap(state([pika('Pro')], { P1: ['Another title'] })).sha256).not.toBe(base)
    expect(snap(state([pika('Standard')])).sha256).not.toBe(base)
    expect(snap(state([pika('Pro')], { L1: ['not_sure'] })).sha256).not.toBe(base)
  })

  test('adding a document, or a different document, changes the hash', async () => {
    const none = snap(state([pika('Pro')])).sha256
    const one = snap(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period')]).sha256
    const other = snap(state([pika('Pro')]), [await toolDoc('conflict-two-plan-names')]).sha256
    expect(new Set([none, one, other]).size).toBe(3)
  })

  test('record context is part of the snapshot', () => {
    const a = buildInternalDraftSnapshot(input(state([pika('Pro')])))
    const b = buildInternalDraftSnapshot({ ...input(state([pika('Pro')])), record: { ...RECORD, record_version: 2 } })
    expect(a.ok && b.ok && a.sha256 !== b.sha256).toBe(true)
  })
})

// ───────────────────────────────────────────── versions and governance (never fabricated)

describe('versions and governance', () => {
  test('pilot sources are recorded as unapproved; missing versions are listed, not invented', () => {
    const { snapshot } = snap(state([pika('Pro')]))
    expect(snapshot.sources.kind).toBe('pilot')
    expect(snapshot.sources.approval).toBe('pilot_unapproved')
    expect(snapshot.sources.registry_version).toContain('(internal, unapproved)')
    expect(snapshot.sources.ledger_version).toContain('(internal, unapproved)')
    expect(snapshot.missing_versions).toEqual(['presentation_templates'])
    expect(snapshot.generator_id).toBe(INTERNAL_DRAFT_GENERATOR_ID)
  })

  test('every guidance card names a real ledger entry and its version; nothing outside the ledger appears', () => {
    const { snapshot } = snap(state([pika('Pro')]))
    expect(snapshot.guidance.cards.length).toBeGreaterThan(0)
    const entries = new Map(PILOT_PUBLICATION_LEDGER.map((e) => [e.entry_id, e]))
    for (const c of snapshot.guidance.cards) {
      const e = entries.get(c.provenance.publication_entry_id)
      expect(e).toBeDefined()
      expect(c.provenance.publication_entry_version).toBe(e!.version)
      expect(c.provenance.publication_approver).toBe(e!.approver)
    }
  })

  test('the authoritative (empty) sources publish nothing and record no approved version', () => {
    const r = buildInternalDraftSnapshot(input(state([pika('Pro')]), [], governedSources()))
    if (r.ok) {
      expect(r.snapshot.sources).toEqual(expect.objectContaining({ kind: 'governed', registry_version: 'none approved', ledger_version: 'none approved' }))
      expect(r.snapshot.guidance.cards).toEqual([])
    } else {
      expect(r.issues.length).toBeGreaterThan(0)
    }
  })

  test('declared observations keep their question and Observation Map versions', () => {
    const { snapshot } = snap(state([pika('Pro')]))
    expect(snapshot.declared_observations.length).toBeGreaterThan(0)
    for (const o of snapshot.declared_observations) {
      expect(o.source_kind).toBe('customer_declared')
      expect(typeof o.question.q_version).toBe('number')
      if (o.map_entry) expect(o.map_entry.value_mapping_version).toEqual(expect.any(String))
    }
    const ids = snapshot.declared_observations.map((o) => o.observation_id)
    expect(ids).toEqual([...ids].sort())
  })

  test('an issued Creator Record id can never be used for a draft', () => {
    expect(() => buildInternalDraftSnapshot({ ...input(state([pika('Pro')])), record: { ...RECORD, record_id: 'CR-2026-8F1E748E' } })).toThrow(InternalDraftSnapshotError)
  })
})

// ───────────────────────────────────────────── declare first (Option C)

describe('documents never modify declarations', () => {
  test.each(['pdf-pika-pro-no-period', 'conflict-two-plan-names', 'conflict-reseller-merchant', 'conflict-other-provider', 'unreadable-dark-image'])(
    '%s: declarations, declared observations and guidance are identical to the snapshot without documents',
    async (fixture) => {
      const s = state([pika('Standard')])
      const without = snap(s).snapshot
      const withDoc = snap(s, [await toolDoc(fixture)]).snapshot
      expect(withDoc.declarations).toEqual(without.declarations)
      expect(withDoc.declared_observations).toEqual(without.declared_observations)
      expect(withDoc.guidance).toEqual(without.guidance)
      expect(withDoc.declared_observations.every((o) => o.source_kind === 'customer_declared')).toBe(true)
    },
  )

  test('a client-supplied reconciliation, review or adoption is still rejected by the request parser', () => {
    const body = { answers: ANS, tools: [pika('Pro')], acknowledgements: ACK, documents: [] }
    expect(parseFormState(body).ok).toBe(true)
    for (const extra of ['reconciliation', 'review', 'adoption']) expect(parseFormState({ ...body, [extra]: [] }).ok).toBe(false)
  })
})

// ───────────────────────────────────────────── C1: neutral fallback

describe('neutral fallback (C1)', () => {
  test('control: the prototype view itself shows comparison results for this document', async () => {
    const r = buildCreatorRecordDraft(input(state([pika('Pro')]), [await toolDoc('pdf-pika-pro-no-period')]))
    if (!r.ok) throw new Error('draft failed')
    const text = JSON.stringify(r.view)
    expect(COMPARISON_WORDING.some((w) => text.includes(w))).toBe(true)
  })

  test.each(['pdf-pika-pro-no-period', 'conflict-two-plan-names', 'conflict-reseller-merchant'])(
    '%s: no comparison result, count, cross-check or comparison wording reaches the snapshot or the PDF',
    async (fixture) => {
      const r = snap(state([pika('Pro')]), [await toolDoc(fixture)])
      const pdf = documentText(buildInternalDraftDocument(r.snapshot, r.sha256)).join('\n')
      for (const text of [r.canonical, pdf]) {
        for (const w of COMPARISON_WORDING) expect([w, text.includes(w)]).toEqual([w, false])
        expect(text).not.toMatch(/appears_consistent|appears_to_conflict|does_not_establish|evidence_reconciliation|cross_check/)
      }
      expect(r.snapshot.comparison_policy).toBe('neutral_fallback')
      expect(r.snapshot.comparison.tools).toEqual([{ tool_index: 0, document_id: expect.any(String), line: D.comparison_tool_with_document(1) }])
      expect(r.snapshot.summary).toContain(D.summary_documents(1))
      expect(pdf).toContain(D.comparison_intro)
    },
  )

  test('without documents the summary and the section say only that none was added', () => {
    const r = snap(state([pika('Pro')]))
    expect(r.snapshot.summary).toContain(D.summary_documents(0))
    expect(r.snapshot.comparison).toEqual({ intro: D.comparison_no_documents, tools: [] })
  })

  test('a tool without a document is described neutrally', async () => {
    const two = state([pika('Pro'), { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }])
    const r = snap(two, [await toolDoc('pdf-pika-pro-no-period', 0)])
    expect(r.snapshot.comparison.tools.map((t) => t.line)).toEqual([D.comparison_tool_with_document(1), D.comparison_tool_without_document(2)])
  })
})

// ───────────────────────────────────────────── the PDF

describe('internal draft PDF', () => {
  async function model(fixture?: string) {
    const r = snap(state([pika('Pro')]), fixture ? [await toolDoc(fixture)] : [])
    return { r, m: buildInternalDraftDocument(r.snapshot, r.sha256) }
  }

  test('the marking is a fixed header and footer of the single flowing page, so it repeats on every page', async () => {
    const { m } = await model('pdf-pika-pro-no-period')
    const tree = InternalDraftPDF({ model: m })
    const pages = elements(tree).filter((e) => e.type === 'PAGE')
    expect(pages).toHaveLength(1)
    const page = pages[0]
    expect(page.props.wrap).toBe(true)
    const fixed = elements(page.props.children).filter((e) => e.props.fixed === true)
    expect(fixed).toHaveLength(2)
    for (const f of fixed) expect(textOf(f).join(' ')).toContain(D.marking)
    expect(textOf(fixed[1]).join(' ')).toContain(m.marking.footer)
  })

  test('the PDF prints only strings from the document model', async () => {
    const { m } = await model('pdf-pika-pro-no-period')
    const printed = textOf(InternalDraftPDF({ model: m })).map((t) => t.replace(/^• /, ''))
    const allowed = new Set(documentText(m))
    for (const t of printed) expect([t, allowed.has(t)]).toEqual([t, true])
  })

  test('structure: summary, sections 1–7 and the separate document section', async () => {
    const { m } = await model()
    expect(m.sections.map((s) => s.id)).toEqual(['summary', 'declarations', 'documents', 'guidance', 'open_items', 'not_shown', 'independent_review', 'not_done', 'method'])
    expect(m.sections.map((s) => (s.blocks[0] as { text: string }).text)).toEqual([
      D.section.summary, D.section.declarations, D.section.documents, D.section.guidance, D.section.open_items, D.section.not_shown, D.section.independent_review, D.section.not_done, D.section.method,
    ])
  })

  test.each([undefined, 'pdf-pika-pro-no-period', 'conflict-two-plan-names'])('wording lock holds for every printed string (%s)', async (fixture) => {
    const { m } = await model(fixture)
    expect(documentText(m).flatMap((t) => violations(t).map((v) => `${v}: ${t}`))).toEqual([])
  })

  test('the method section records generator, schema, comparison policy and the missing version', async () => {
    const { m } = await model()
    const method = documentText({ ...m, sections: m.sections.filter((s) => s.id === 'method') }).join('\n')
    for (const v of [INTERNAL_DRAFT_GENERATOR_ID, D.method_comparison_policy_value, 'presentation_templates']) expect(method).toContain(v)
  })
})

// ───────────────────────────────────────────── the renderer refuses

describe('the renderer refuses anything but an intact internal draft', () => {
  const base = () => snap(state([pika('Pro')]))
  const refused = (s: InternalDraftSnapshot, h: string) => expect(() => buildInternalDraftDocument(s, h)).toThrow(InternalDraftRenderError)

  test('a wrong or malformed digest', () => {
    const { snapshot, sha256 } = base()
    refused(snapshot, sha256.replace(/^./, (c) => (c === '0' ? '1' : '0')))
    refused(snapshot, 'not-a-hash')
  })

  test('a snapshot edited after hashing (stronger conclusion label, comparison policy, status or issued id)', () => {
    const { snapshot, sha256 } = base()
    const label = clone(snapshot)
    label.guidance.cards[0].conclusion_label = 'Cleared for commercial use'
    refused(label, sha256)
    refused(label, sha256Hex(canonicalJson(label)))
    const policy = clone(snapshot) as unknown as Record<string, unknown>
    policy.comparison_policy = 'prototype_reconciliation'
    refused(policy as unknown as InternalDraftSnapshot, sha256Hex(canonicalJson(policy)))
    const status = clone(snapshot) as unknown as { status: string }
    status.status = 'issued'
    refused(status as unknown as InternalDraftSnapshot, sha256Hex(canonicalJson(status)))
    const issued = clone(snapshot)
    issued.record.draft_id = 'CR-2026-8F1E748E'
    refused(issued, sha256Hex(canonicalJson(issued)))
    expect(snapshotDigestMatches(snapshot, sha256)).toBe(true)
  })
})

// ───────────────────────────────────────────── isolation

const APP_ROOT = path.resolve(__dirname, '..', '..')
const DRAFT_ROOT = path.join(APP_ROOT, 'lib', 'creator-record', 'internal-draft')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === '.next') return []
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}
const importsOf = (f: string) => Array.from(readFileSync(f, 'utf8').matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)).map((m) => m[1])

describe('isolation from Production issuance, payment and the app', () => {
  test('nothing outside lib/creator-record/internal-draft imports it', () => {
    const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components')), ...walk(path.join(APP_ROOT, 'lib'))].filter((f) => !f.startsWith(DRAFT_ROOT))
    const importers = files.filter((f) => importsOf(f).some((i) => i.includes('internal-draft'))).map((f) => path.relative(APP_ROOT, f))
    expect(importers).toEqual([])
  })

  test('it imports only the reused prototype modules, react, @react-pdf/renderer and node:crypto', () => {
    const external = new Set(walk(DRAFT_ROOT).flatMap(importsOf).filter((i) => !i.startsWith('./')))
    expect(Array.from(external).sort()).toEqual([
      '../contract/compose', '../contract/provenance', '../presentation/build-draft-record', '../presentation/templates',
      '../prototype/build-draft', '../prototype/form', '@react-pdf/renderer', 'node:crypto', 'react',
    ])
  })

  test('its generator id is distinct from the issued-artifact generator', () => {
    expect(INTERNAL_DRAFT_GENERATOR_ID).not.toBe(ARTIFACT_GENERATOR_VERSION)
    expect(INTERNAL_DRAFT_GENERATOR_ID.startsWith('legacy-creator-record-pdf')).toBe(false)
    expect(INTERNAL_DRAFT_GENERATOR_ID.startsWith('si8-internal-draft/')).toBe(true)
  })
})
