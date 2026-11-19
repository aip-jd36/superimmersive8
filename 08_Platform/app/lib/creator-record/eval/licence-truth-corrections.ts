/**
 * CR-DOC-READER-EXT-9R5A — versioned, governed ground-truth adjudications for the licence reading evaluation.
 *
 * The licence counterpart of the receipt precedent (`./truth-corrections.ts`, PRODUCT-A-MVP-SPIKE-1B.2), with the same rules:
 *   - corrections live beside the fixture spec, never inside it: the pre-registered spec (`licence-fixtures-v1`), its hash, the
 *     rendered documents and every earlier result stay unchanged;
 *   - a correction file is pinned to the exact spec it was written for (SHA-256 of the spec, line endings normalised) and refuses any
 *     other;
 *   - inputs are never mutated: callers score under the ORIGINAL truth and, separately and labelled, under the adjudicated truth.
 *
 * The one extension the receipt mechanism lacks: an expected `not_shown` field whose printed text was adjudicated (by the founder)
 * as a defensible reading under the unchanged extraction contract. It becomes `optional` and stays bound to that printed text:
 *   - the field `not_shown` is accepted (the original expectation remains correct);
 *   - the field `present` is accepted ONLY when its value contains the adjudicated printed text;
 *   - the field `present` with anything else is still an invention (C1b). Every other field and fixture is untouched.
 *
 * An adjudication concerns what a document appears to show, nothing more. It does not establish that any authorization was given,
 * that a licence covers a use, or commercial clearance; the downstream assessment stays fail closed (`relevant_observation_unverified`,
 * standing `open`) whatever is extracted.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { LICENCE_FIELD_NAMES } from '../licence-examination/schema'
import type { LicenceSpec } from './score-licence'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
export const LICENCE_PREREGISTERED_SPEC_PATH = path.join(FIXTURES_DIR, 'licence-fixtures.json')
export const DEFAULT_LICENCE_TRUTH_CORRECTIONS_PATH = path.join(FIXTURES_DIR, 'history', 'licence-truth-corrections-v1.json')

export interface LicenceTruthCorrection {
  fixture_id: string
  field: (typeof LICENCE_FIELD_NAMES)[number]
  /** The only supported kind: an expected `not_shown` accepted as a defensible `present` reading of one printed text. */
  kind: 'accept_printed_text_as_present'
  /** The original expectation this correction is written against; refused if the spec says otherwise. */
  from_status: 'not_shown'
  /** A present value must contain this (normalised as the scorer normalises). */
  accept_contains: string
  /** The printed text the value must be grounded in (C2). */
  printed: string
  /** Who decided, and the decision reference. */
  adjudicated: string
  rationale: string
}

export interface LicenceTruthCorrections {
  corrections_version: string
  base_spec_version: string
  base_spec_sha256: string
  policy: string
  corrections: LicenceTruthCorrection[]
}

/** SHA-256 of a spec file with CRLF normalised to LF, so a Windows checkout and CI agree. */
export function licenceSpecSha256(file = LICENCE_PREREGISTERED_SPEC_PATH): string {
  return createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex')
}

export function loadLicenceTruthCorrections(file = DEFAULT_LICENCE_TRUTH_CORRECTIONS_PATH): LicenceTruthCorrections {
  return JSON.parse(readFileSync(file, 'utf8')) as LicenceTruthCorrections
}

/** A NEW spec with the adjudications applied; `spec` is not mutated. Throws on anything outside the one supported kind. */
export function applyLicenceTruthCorrections(spec: LicenceSpec, c: LicenceTruthCorrections, specHash: string): LicenceSpec {
  if (c.base_spec_version !== spec.spec_version) throw new Error(`${c.corrections_version} is for ${c.base_spec_version}, not ${spec.spec_version}`)
  if (c.base_spec_sha256 !== specHash) throw new Error(`${c.corrections_version} was written for a different fixture spec`)
  const out: LicenceSpec = JSON.parse(JSON.stringify(spec)) as LicenceSpec
  const seen = new Set<string>()
  for (const k of c.corrections) {
    const key = `${k.fixture_id}.${k.field}`
    if (seen.has(key)) throw new Error(`duplicate correction ${key}`)
    seen.add(key)
    if (k.kind !== 'accept_printed_text_as_present' || k.from_status !== 'not_shown') throw new Error(`correction ${key}: unsupported kind`)
    if (!(LICENCE_FIELD_NAMES as readonly string[]).includes(k.field)) throw new Error(`correction for unknown field ${k.field}`)
    for (const [name, v] of [['accept_contains', k.accept_contains], ['printed', k.printed], ['adjudicated', k.adjudicated], ['rationale', k.rationale]] as const) {
      if (typeof v !== 'string' || !v.trim()) throw new Error(`correction ${key} has no ${name}`)
    }
    const fixture = out.fixtures.find((f) => f.fixture_id === k.fixture_id)
    if (!fixture) throw new Error(`correction for unknown fixture ${k.fixture_id}`)
    const t = fixture.truth.fields[k.field]
    if (!t || t.status !== k.from_status) throw new Error(`correction ${key}: the original truth is not '${k.from_status}'`)
    const printedOnDocument = fixture.pages.flat().some((line) => line.toLowerCase().includes(k.printed.toLowerCase()))
    if (!printedOnDocument) throw new Error(`correction ${key}: '${k.printed}' is not printed on the document`)
    fixture.truth.fields[k.field] = { status: 'optional', contains: k.accept_contains, printed: k.printed }
  }
  return out
}
