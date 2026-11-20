/**
 * Read-only loader for the repository evidence that validation is checked
 * against. It opens files for reading and imports three existing data
 * modules. It writes nothing, fetches nothing and calls no model.
 *
 * Authority (approved direction B): claim identity and lifecycle come from
 * GOVERNED-CLAIMS.md. The runtime fixture is read for consistency, scope and
 * CRC exposure only.
 *
 * The ledger is read with the same narrow, line-anchored extraction the
 * existing guard uses (08_Platform/app/__tests__/retrieval-engine/
 * topic-claims-fixture-consistency.test.ts): `### CLAIM-...` headings and each
 * entry's own `Lifecycle:` line, outside fenced code blocks. This is not a
 * parser for the ledger's prose, and anything it cannot read exactly is
 * reported as a problem instead of being guessed.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { CreatorRecordEntry, Evidence, MatrixRowEvidence, Registry, RuntimeClaim } from './model.ts'

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export const LEDGER_PATH = '06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md'
const RUNTIME_CLAIMS_MODULE = '08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts'
const MATRIX_MODULE = '08_Platform/app/lib/retrieval-engine/matrix-fixture.ts'
const CREATOR_RECORD_MODULE = '08_Platform/app/lib/creator-record/governed/sources.ts'

const CLAIM_ID_IN_TEXT = /CLAIM-[A-Za-z0-9-]+-v[0-9]+/g

/**
 * Addresses written in one text block, normalised (see normaliseAddress in validate.ts). An address is
 * a host with a path, written with or without a scheme. This reads addresses only: it does not read
 * citations, titles or section numbers, and a truncated address (ending in "...") is not an address.
 */
export function addressesInText(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\/[^\s`'"<>()\[\],;]*/g)) {
    let a = m[0]
    if (a.endsWith('...')) continue
    a = a.replace(/[.:]+$/, '')
    out.add(a.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '').toLowerCase())
  }
  return [...out].sort()
}

/** Claim ID to the addresses in that entry's own "Source references" block. Exported for tests. */
export function readLedgerSourceAddresses(markdown: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const outsideFences = markdown.replace(/```[\s\S]*?```/g, '')
  for (const section of outsideFences.split(/(?=^### CLAIM-)/m).filter((s) => s.startsWith('### CLAIM-'))) {
    const id = section.match(/^### (CLAIM-[A-Za-z0-9-]+)\s*$/m)?.[1]
    if (!id || out.has(id)) continue
    // The block runs from the "Source references:" line to the next line that starts a new field.
    const block = section.match(/^Source references:[^\n]*\n((?:[ \t]+[^\n]*\n?|[ \t]*\n)*)/m)?.[1] ?? ''
    out.set(id, addressesInText(block))
  }
  return out
}

/** Claim ID to lifecycle, from ledger text. Exported for tests. */
export function readLedgerText(markdown: string, problems: string[]): Map<string, string> {
  const out = new Map<string, string>()
  const outsideFences = markdown.replace(/```[\s\S]*?```/g, '')
  const sections = outsideFences.split(/(?=^### CLAIM-)/m).filter((s) => s.startsWith('### CLAIM-'))
  for (const section of sections) {
    const id = section.match(/^### (CLAIM-[A-Za-z0-9-]+)\s*$/m)?.[1]
    if (!id) {
      problems.push(`ledger: unreadable claim heading "${section.split(/\r?\n/)[0]}"`)
      continue
    }
    const lifecycle = section.match(/^Lifecycle:[ \t]*(\S.*?)[ \t]*$/m)?.[1]
    if (out.has(id)) problems.push(`ledger: ${id} appears more than once`)
    else if (!lifecycle) problems.push(`ledger: ${id} has no Lifecycle line`)
    else out.set(id, lifecycle)
  }
  if (out.size === 0) problems.push('ledger: no claims found')
  return out
}

/** Claim IDs named anywhere in a manifest's text. Exported for tests. */
export function claimIdsInText(text: string): string[] {
  return [...new Set(text.match(CLAIM_ID_IN_TEXT) ?? [])].sort()
}

function safeRepoPath(rel: unknown): string | null {
  if (typeof rel !== 'string' || rel === '' || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) return null
  return path.join(REPO_ROOT, rel)
}

function nullableStrings(v: unknown): v is string[] | null {
  return v === null || (Array.isArray(v) && v.every((x) => typeof x === 'string'))
}

async function load(rel: string, exportName: string, problems: string[]): Promise<unknown[]> {
  try {
    const mod = (await import(pathToFileURL(path.join(REPO_ROOT, rel)).href)) as Record<string, unknown>
    const value = mod[exportName]
    if (Array.isArray(value)) return value
    problems.push(`${rel}: export ${exportName} is not a list`)
  } catch (e) {
    problems.push(`${rel}: could not be loaded (${(e as Error).message.split('\n')[0]})`)
  }
  return []
}

/** Loads every input validation needs. `registry` is used only to learn which manifest and basis paths to look at. */
export async function loadEvidence(registry: unknown): Promise<Evidence> {
  const problems: string[] = []

  let ledger = new Map<string, string>()
  let ledgerSourceAddresses = new Map<string, string[]>()
  try {
    const text = fs.readFileSync(path.join(REPO_ROOT, LEDGER_PATH), 'utf8')
    ledger = readLedgerText(text, problems)
    ledgerSourceAddresses = readLedgerSourceAddresses(text)
  } catch {
    problems.push(`ledger: ${LEDGER_PATH} could not be read`)
  }

  const runtime: RuntimeClaim[] = []
  for (const c of (await load(RUNTIME_CLAIMS_MODULE, 'TOPIC_CLAIMS_FIXTURE', problems)) as Record<string, unknown>[]) {
    if (typeof c?.claim_id === 'string' && typeof c.lifecycle === 'string' && typeof c.crc_eligible === 'string' && nullableStrings(c.tool_scope) && nullableStrings(c.provider_scope)) {
      runtime.push({ claim_id: c.claim_id, lifecycle: c.lifecycle, crc_eligible: c.crc_eligible, tool_scope: c.tool_scope, provider_scope: c.provider_scope })
    } else problems.push(`runtime fixture: an entry has an unexpected shape (${String(c?.claim_id)})`)
  }

  const matrix: MatrixRowEvidence[] = []
  for (const r of (await load(MATRIX_MODULE, 'MATRIX_FIXTURE', problems)) as Record<string, unknown>[]) {
    const claims = Array.isArray(r?.claims) ? (r.claims as Record<string, unknown>[]) : null
    if (typeof r?.identifier === 'string' && (r.last_verified === null || typeof r.last_verified === 'string') && claims && claims.every((c) => typeof c?.claim_id === 'string' && typeof c.crc_eligible === 'string')) {
      matrix.push({ identifier: r.identifier, last_verified: r.last_verified as string | null, claims: claims.map((c) => ({ claim_id: c.claim_id as string, crc_eligible: c.crc_eligible as string })) })
    } else problems.push(`Matrix fixture: a row has an unexpected shape (${String(r?.identifier)})`)
  }

  const creatorRecord: CreatorRecordEntry[] = []
  for (const e of (await load(CREATOR_RECORD_MODULE, 'CREATOR_RECORD_PUBLICATION_LEDGER', problems)) as Record<string, unknown>[]) {
    if (typeof e?.entry_id === 'string' && typeof e.claim_id === 'string' && typeof e.creator_record_eligible === 'string') {
      creatorRecord.push({ entry_id: e.entry_id, claim_id: e.claim_id, creator_record_eligible: e.creator_record_eligible, refresh_by: typeof e.refresh_by === 'string' ? e.refresh_by : null })
    } else problems.push('Creator Record ledger: an entry has an unexpected shape')
  }

  const manifests = new Map<string, string[] | null>()
  const existingPaths = new Set<string>()
  const reg = (typeof registry === 'object' && registry !== null ? registry : {}) as Partial<Registry>
  const evidenceFiles = [
    ...(Array.isArray(reg.sources) ? reg.sources : []).map((s) => s?.evidence_manifest),
    ...(Array.isArray(reg.exclusions) ? reg.exclusions : []).map((x) => x?.evidence_path),
  ]
  for (const rel of evidenceFiles) {
    if (typeof rel !== 'string' || manifests.has(rel)) continue
    const abs = safeRepoPath(rel)
    manifests.set(rel, abs && fs.existsSync(abs) && fs.statSync(abs).isFile() ? claimIdsInText(fs.readFileSync(abs, 'utf8')) : null)
  }
  for (const r of Array.isArray(reg.relationships) ? reg.relationships : []) {
    const abs = safeRepoPath(r?.basis_path)
    if (abs && fs.existsSync(abs)) existingPaths.add(r.basis_path)
  }

  return { ledger, ledgerSourceAddresses, runtime, matrix, creatorRecord, manifests, existingPaths, problems }
}
