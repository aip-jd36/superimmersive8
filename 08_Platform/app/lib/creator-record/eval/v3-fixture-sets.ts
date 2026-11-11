/**
 * CRV2-IA-4D3 S2b — the fixture sets of a v3 (receipt-extraction-v3) evaluation. File reading and checks only; never calls a model.
 *
 *   issuer-evidence  the rendered issuer-evidence documents (`issuer-evidence-fixtures.ts`), each checked against its manifest hash
 *                    AND against the hash pinned in the repository (`issuer-evidence-fixtures.document-hashes.json`);
 *   baseline         the 45 receipt-fixtures-v2 documents (unchanged, hash-checked as before) scored against the additive v3 issuer
 *                    truth (`receipt-fixtures-v3-issuer-truth.json`), which is bound to the exact v2 spec by its SHA-256;
 *   private          optional: ONE local document outside the repository, named by a descriptor file (also outside the repository)
 *                    that holds its path, SHA-256 and v3 truth. The file must hash to the descriptor's value AND to the value given on
 *                    the command line. Nothing about it is committed: not the document, its text, its truth or its path.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { detectMediaType } from '../receipt-examination/examine'
import { ISSUER_EVIDENCE_STATES, ISSUER_STATEMENT_ROLES, type IssuerEvidenceState } from '../receipt-examination/issuer-evidence'
import { FIXTURES_DIR, DEFAULT_GENERATED_DIR, SPEC_PATH, loadManifest, readFixtureBytes, type FixtureManifest, type FixtureSpec, type ManifestEntry } from './fixtures'
import { ISSUER_EVIDENCE_FIXTURES, ISSUER_EVIDENCE_FIXTURE_SET, type IssuerEvidenceDocumentFixture } from './issuer-evidence-fixtures'
import type { ScorableIssuerDocument } from './score-issuer-evidence'

export const ISSUER_EVIDENCE_SPEC_FILE = path.join(FIXTURES_DIR, 'issuer-evidence-fixtures.json')
export const ISSUER_EVIDENCE_HASHES_FILE = path.join(FIXTURES_DIR, 'issuer-evidence-fixtures.document-hashes.json')
export const ISSUER_EVIDENCE_GENERATED_SUBDIR = 'issuer-evidence'
export const V3_BASELINE_TRUTH_FILE = path.join(FIXTURES_DIR, 'receipt-fixtures-v3-issuer-truth.json')

export const V3_FIXTURE_SETS = ['issuer-evidence', 'baseline'] as const
export type V3FixtureSet = (typeof V3_FIXTURE_SETS)[number]

const sha256 = (b: Uint8Array | Buffer) => createHash('sha256').update(b).digest('hex')

/**
 * SHA-256 of a committed text file with CRLF read as LF. A checkout may convert line endings (core.autocrlf), so every binding made
 * by this slice to a committed text file uses this form, identical on every machine. Rendered documents are binary and hashed raw.
 */
export function canonicalTextSha256(file: string): string {
  return sha256(Buffer.from(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8'))
}

/** `--set issuer-evidence | baseline | all` (comma lists allowed). */
export function parseV3Sets(value: string): V3FixtureSet[] {
  const parts = value === 'all' ? [...V3_FIXTURE_SETS] : value.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) throw new Error('--set needs issuer-evidence, baseline or all')
  for (const p of parts) if (!(V3_FIXTURE_SETS as readonly string[]).includes(p)) throw new Error(`unknown --set ${p}`)
  return V3_FIXTURE_SETS.filter((s) => parts.includes(s))
}

// ---------------------------------------------------------------- issuer-evidence set

export interface PinnedHashes {
  spec_version: string
  spec_sha256: string
  generator_version: string
  pymupdf_version: string
  pillow_version: string
  documents: Record<string, string>
}

export interface IssuerEvidenceSetLoaded {
  fixtures: IssuerEvidenceDocumentFixture[]
  manifest: FixtureManifest
  pins: PinnedHashes
  dir: string
}

export function issuerEvidenceDocuments(): IssuerEvidenceDocumentFixture[] {
  return ISSUER_EVIDENCE_FIXTURES.filter((f): f is IssuerEvidenceDocumentFixture => f.kind === 'document')
}

/** Refuses unless the rendered set is exactly the committed spec, and every document matches BOTH its manifest and its pinned hash. */
export function loadIssuerEvidenceSet(generatedRoot: string = DEFAULT_GENERATED_DIR): IssuerEvidenceSetLoaded {
  const dir = path.join(generatedRoot, ISSUER_EVIDENCE_GENERATED_SUBDIR)
  const pins = JSON.parse(readFileSync(ISSUER_EVIDENCE_HASHES_FILE, 'utf8')) as PinnedHashes
  if (pins.spec_sha256 !== canonicalTextSha256(ISSUER_EVIDENCE_SPEC_FILE)) throw new Error('issuer-evidence pinned hashes were not made from the committed spec')
  const manifest = loadManifest(dir)
  if (!manifest) throw new Error(`no manifest in ${dir}: render the issuer-evidence fixtures first (generate_receipt_fixtures.py --spec issuer-evidence-fixtures.json --out generated/issuer-evidence)`)
  // The generator hashes the spec file's raw bytes: the rendering must come from this very file (in this checkout's line endings).
  if (manifest.spec_sha256 !== sha256(readFileSync(ISSUER_EVIDENCE_SPEC_FILE))) throw new Error('rendered issuer-evidence fixtures are stale: the spec changed since rendering')
  const fixtures = issuerEvidenceDocuments()
  const ids = fixtures.map((f) => f.id)
  if (JSON.stringify(manifest.documents.map((d) => d.id)) !== JSON.stringify(ids)) throw new Error('rendered issuer-evidence documents differ from the fixture set')
  if (JSON.stringify(Object.keys(pins.documents)) !== JSON.stringify(ids)) throw new Error('pinned issuer-evidence hashes differ from the fixture set')
  for (const e of manifest.documents) {
    if (e.sha256 !== pins.documents[e.id]) {
      throw new Error(`rendered ${e.id} does not match its pinned hash (renderer ${manifest.pymupdf_version}/${manifest.pillow_version}; pinned with ${pins.pymupdf_version}/${pins.pillow_version})`)
    }
    readFixtureBytes(dir, e) // the file on disk still matches the manifest
  }
  return { fixtures, manifest, pins, dir }
}

// ---------------------------------------------------------------- baseline v3 truth

export interface V3BaselineTruthFile {
  truth_version: string
  contract: string
  base_spec_version: string
  base_spec_sha256: string
  documents: Array<{ id: string; issuer: ScorableIssuerDocument['truth'] | null; basis: string }>
}

/** The v3 issuer truth for the baseline, refused unless it is bound to the exact committed v2 spec and covers every document once. */
export function loadV3BaselineTruth(spec: FixtureSpec, file: string = V3_BASELINE_TRUTH_FILE): { file: V3BaselineTruthFile; byId: Map<string, ScorableIssuerDocument['truth'] | null> } {
  const t = JSON.parse(readFileSync(file, 'utf8')) as V3BaselineTruthFile
  if (t.contract !== 'receipt-extraction-v3') throw new Error('baseline v3 truth is for another contract')
  if (t.base_spec_sha256 !== canonicalTextSha256(SPEC_PATH) || t.base_spec_version !== spec.spec_version) throw new Error('baseline v3 truth is not bound to the committed receipt-fixtures spec')
  const ids = spec.documents.map((d) => d.id)
  if (JSON.stringify(t.documents.map((d) => d.id)) !== JSON.stringify(ids)) throw new Error('baseline v3 truth does not cover exactly the spec documents, in order')
  const byId = new Map<string, ScorableIssuerDocument['truth'] | null>()
  for (const d of t.documents) {
    if (d.issuer !== null) validateTruth(d.issuer, d.id)
    byId.set(d.id, d.issuer)
  }
  return { file: t, byId }
}

// ---------------------------------------------------------------- private document

export interface PrivateFixtureDescriptor {
  id: string
  file: string
  sha256: string
  truth: ScorableIssuerDocument['truth']
}

export interface PrivateFixtureLoaded {
  id: string
  bytes: Uint8Array
  media_type: 'application/pdf' | 'image/png' | 'image/jpeg'
  sha256: string
  truth: ScorableIssuerDocument['truth']
}

export const PRIVATE_FIXTURE_ID = /^private-[a-z0-9-]{1,40}$/
const HEX64 = /^[0-9a-f]{64}$/

/** True when `file` lies inside ANY git working tree (a `.git` entry in one of its ancestor directories), not only this repository. */
export function insideGitWorkTree(file: string): boolean {
  let dir = path.dirname(path.resolve(file))
  for (;;) {
    if (existsSync(path.join(dir, '.git'))) return true
    const parent = path.dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

/**
 * Loads the private document. Refuses unless: the descriptor and the document are both outside the repository and outside any git
 * working tree (a git-ignored file inside another checkout is still refused); the id is a neutral
 * `private-…` label; the document hashes to the descriptor's SHA-256 and to `expectedSha256` (given separately on the command line);
 * it is a PDF, PNG or JPEG by its own bytes; and the truth is well formed. Error messages never include the document's content.
 */
export function loadPrivateFixture(descriptorPath: string, expectedSha256: string, insideRepository: (file: string) => boolean): PrivateFixtureLoaded {
  if (!HEX64.test(expectedSha256)) throw new Error('--private-sha256 must be 64 lowercase hex characters')
  if (insideRepository(descriptorPath) || insideGitWorkTree(descriptorPath)) throw new Error('the private fixture descriptor must be outside the repository and any git working tree')
  if (!existsSync(descriptorPath)) throw new Error('the private fixture descriptor does not exist')
  const d = JSON.parse(readFileSync(descriptorPath, 'utf8')) as PrivateFixtureDescriptor
  if (typeof d.id !== 'string' || !PRIVATE_FIXTURE_ID.test(d.id)) throw new Error('the private fixture id must match private-[a-z0-9-]{1,40}')
  if (typeof d.file !== 'string' || typeof d.sha256 !== 'string' || !HEX64.test(d.sha256)) throw new Error('the private fixture descriptor needs file and sha256')
  const file = path.isAbsolute(d.file) ? d.file : path.resolve(path.dirname(descriptorPath), d.file)
  if (insideRepository(file) || insideGitWorkTree(file)) throw new Error('the private fixture document must be outside the repository and any git working tree')
  if (!existsSync(file)) throw new Error('the private fixture document does not exist')
  const bytes = new Uint8Array(readFileSync(file))
  const actual = sha256(bytes)
  if (actual !== d.sha256 || actual !== expectedSha256) throw new Error('the private fixture document does not match its pinned SHA-256')
  const media = detectMediaType(bytes)
  if (!media) throw new Error('the private fixture document is not a PDF, PNG or JPEG')
  validateTruth(d.truth, d.id)
  return { id: d.id, bytes, media_type: media, sha256: actual, truth: d.truth }
}

function validateTruth(t: ScorableIssuerDocument['truth'], id: string): void {
  const states = ISSUER_EVIDENCE_STATES.filter((s) => s !== 'unclassified') as readonly string[]
  if (!t || !states.includes(t.state)) throw new Error(`${id}: truth state must be one of ${states.join(', ')}`)
  if ((t.state === 'identified') !== (typeof t.business === 'string' && t.business !== '')) throw new Error(`${id}: truth business is required exactly when the state is identified`)
  if (!Array.isArray(t.statements) || t.statements.some((s) => typeof s.business !== 'string' || !(ISSUER_STATEMENT_ROLES as readonly string[]).includes(s.role))) throw new Error(`${id}: malformed truth statements`)
  for (const a of t.accept_states ?? []) if (a === ('identified' as IssuerEvidenceState) || !states.includes(a)) throw new Error(`${id}: accept_states may not contain ${a}`)
}

/** Manifest-shaped description of the private document, for estimates only. Its text is never extracted or recorded. */
export function privateManifestEntry(p: PrivateFixtureLoaded): ManifestEntry {
  return { id: p.id, file: '(private)', media_type: p.media_type, bytes: p.bytes.length, sha256: p.sha256, width: null, height: null, document_text: '' }
}

export const ISSUER_EVIDENCE_SET_REF = ISSUER_EVIDENCE_FIXTURE_SET
