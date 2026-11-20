/**
 * Registry and mapping validation (PRD FR-1 to FR-4, FR-8, FR-17 to FR-20,
 * AC-1 to AC-4, AC-2a, AC-6). Pure: every input is passed in, nothing is read
 * from disk or network here, and nothing is written anywhere.
 *
 * Fail closed: an unknown field, an unknown claim, a lifecycle or scope
 * disagreement, or unreadable evidence is an error. A relationship or
 * exclusion that no named human has confirmed is reported as 'pending' and
 * keeps the verdict from being VALID.
 *
 * Nothing here says whether a claim is correct, current or cleared.
 */

import {
  EVIDENCE_TIERS, LEDGER_LIFECYCLES, RETRIEVAL_METHODS, SCHEMA_VERSION, SCOPE_KINDS, SCOPED_SOURCE_CLASSES, SOURCE_CLASSES,
  type Evidence, type Issue, type Registry, type RuntimeClaim, type SourceEntry, type ValidationResult,
} from './model.ts'

const SOURCE_ID = /^[a-z0-9][a-z0-9-]*$/
const GOVERNED_CLAIM_ID = /^CLAIM-[A-Za-z0-9-]+-v[0-9]+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SHA256 = /^[0-9a-f]{64}$/

const SOURCE_KEYS = [
  'source_id', 'name', 'owner', 'source_class', 'canonical_url', 'redirect_steps', 'expected_final_url', 'identity_markers',
  'retrieval_method', 'extraction_rule', 'min_extracted_length', 'version_locator', 'evidence_tier', 'applicability_scope_note',
  'cadence_class', 'scope', 'baseline', 'evidence_manifest', 'notes',
]
const RELATIONSHIP_KEYS = ['source_id', 'claim_ref', 'basis_path', 'basis_note', 'confirmed_by', 'confirmed_on']
const EXCLUSION_KEYS = ['source_id', 'claim_ref', 'reason', 'confirmed_by', 'confirmed_on']
const BASELINE_KEYS = ['snapshot', 'raw_sha256', 'extracted_sha256', 'extraction_rule_version', 'accepted_by', 'accepted_on']
const REGISTRY_KEYS = ['schema_version', 'sources', 'relationships', 'exclusions']

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}
function stringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/** An exact https URL with no credentials and no fragment. */
export function isExactHttpsUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v !== v.trim()) return false
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return false
  }
  return u.protocol === 'https:' && u.username === '' && u.password === '' && u.hash === '' && u.hostname.includes('.')
}

function isRealIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function keyProblems(o: Obj, allowed: string[]): string[] {
  const out: string[] = []
  for (const k of Object.keys(o)) if (!allowed.includes(k)) out.push(`unknown field "${k}"`)
  for (const k of allowed) if (!(k in o)) out.push(`missing field "${k}"`)
  return out
}

function scopeNames(c: RuntimeClaim, kind: string): string[] {
  return (kind === 'tool' ? c.tool_scope : c.provider_scope) ?? []
}

export function validateRegistry(input: unknown, ev: Evidence): ValidationResult {
  const issues: Issue[] = []
  const err = (code: string, where: string, message: string) => issues.push({ severity: 'error', code, where, message })
  const pend = (code: string, where: string, message: string) => issues.push({ severity: 'pending', code, where, message })
  const finish = (): ValidationResult => ({
    verdict: issues.some((i) => i.severity === 'error') ? 'INVALID' : issues.length > 0 ? 'VALID_PENDING_CONFIRMATION' : 'VALID',
    issues,
  })

  for (const p of ev.problems) err('evidence_unreadable', 'repository evidence', p)

  if (!isObj(input)) {
    err('registry_malformed', 'registry', 'the registry is not an object')
    return finish()
  }
  for (const p of keyProblems(input, REGISTRY_KEYS)) err('registry_malformed', 'registry', p)
  if (input.schema_version !== SCHEMA_VERSION) err('schema_version_unsupported', 'registry', `schema_version must be ${SCHEMA_VERSION}`)
  if (!Array.isArray(input.sources) || !Array.isArray(input.relationships) || !Array.isArray(input.exclusions)) {
    err('registry_malformed', 'registry', 'sources, relationships and exclusions must be lists')
    return finish()
  }
  const reg = input as unknown as Registry

  // Identifiers that belong to the frozen Legacy Matrix (OPEN-8): never valid in the mapping.
  const matrixIds = new Set<string>()
  for (const row of ev.matrix) {
    matrixIds.add(row.identifier)
    for (const c of row.claims) matrixIds.add(c.claim_id)
  }
  const runtimeById = new Map(ev.runtime.map((c) => [c.claim_id, c]))
  const knownScope = (kind: string, id: string) => ev.runtime.some((c) => scopeNames(c, kind).includes(id))

  // ── Sources ──────────────────────────────────────────────────────────────
  const sources = new Map<string, SourceEntry>()
  reg.sources.forEach((raw: unknown, i: number) => {
    const where = isObj(raw) && nonEmpty(raw.source_id) ? `source ${raw.source_id}` : `sources[${i}]`
    if (!isObj(raw)) return err('source_malformed', where, 'entry is not an object')
    for (const p of keyProblems(raw, SOURCE_KEYS)) err('source_malformed', where, p)
    const s = raw as unknown as SourceEntry

    if (!nonEmpty(s.source_id) || !SOURCE_ID.test(s.source_id)) err('source_id_invalid', where, 'source_id must be lower-case letters, digits and hyphens')
    else if (sources.has(s.source_id)) err('source_id_duplicate', where, 'source_id is used more than once')
    for (const k of ['name', 'owner', 'applicability_scope_note', 'cadence_class'] as const) {
      if (!nonEmpty(s[k])) err('source_field_missing', where, `${k} must be a non-empty string`)
    }
    if (typeof s.notes !== 'string') err('source_field_missing', where, 'notes must be a string')
    if (!(SOURCE_CLASSES as readonly string[]).includes(s.source_class)) err('source_class_unknown', where, `unknown source_class "${String(s.source_class)}"`)
    if (!(RETRIEVAL_METHODS as readonly string[]).includes(s.retrieval_method)) err('retrieval_method_unknown', where, `unknown retrieval_method "${String(s.retrieval_method)}"`)
    if (!(EVIDENCE_TIERS as readonly string[]).includes(s.evidence_tier)) err('evidence_tier_unknown', where, 'evidence_tier must be A, B, C or D (SOP section 4)')

    // FR-4, FR-5: exact https locations only; redirects only along registered steps.
    if (!isExactHttpsUrl(s.canonical_url)) err('url_invalid', where, 'canonical_url must be an exact https URL')
    if (!isExactHttpsUrl(s.expected_final_url)) err('final_url_missing', where, 'expected_final_url must be an exact https URL')
    if (!stringArray(s.redirect_steps) || !s.redirect_steps.every(isExactHttpsUrl)) err('url_invalid', where, 'redirect_steps must be a list of exact https URLs')
    else if (isExactHttpsUrl(s.canonical_url) && isExactHttpsUrl(s.expected_final_url)) {
      const last = s.redirect_steps.length ? s.redirect_steps[s.redirect_steps.length - 1] : s.canonical_url
      if (last !== s.expected_final_url) err('redirect_chain_inconsistent', where, 'expected_final_url must equal the last redirect step, or canonical_url when there are no steps')
    }
    if (!stringArray(s.identity_markers) || !s.identity_markers.every(nonEmpty)) err('source_field_missing', where, 'identity_markers must be a list of non-empty strings')
    if (s.version_locator !== null && !nonEmpty(s.version_locator)) err('source_field_missing', where, 'version_locator must be null or a non-empty string')
    if (s.min_extracted_length !== null && !(Number.isInteger(s.min_extracted_length) && s.min_extracted_length > 0)) err('source_field_missing', where, 'min_extracted_length must be null or a positive integer')

    // Extraction rule: automated sources need one; human-capture sources are never extracted automatically (FR-9).
    let ruleVersion: number | null = null
    if (s.extraction_rule === null) {
      if (s.retrieval_method !== 'human_capture') err('extraction_rule_missing', where, 'an automated source must declare an extraction_rule')
    } else if (!isObj(s.extraction_rule) || !nonEmpty(s.extraction_rule.id) || !Number.isInteger(s.extraction_rule.version) || s.extraction_rule.version < 1 || Object.keys(s.extraction_rule).length !== 2) {
      err('extraction_rule_invalid', where, 'extraction_rule must be { id, version } with a positive integer version')
    } else ruleVersion = s.extraction_rule.version

    // Scope identity (approved direction C): explicit, never inferred from a URL or a name.
    if (!isObj(s.scope) || Object.keys(s.scope).length !== 2 || !(SCOPE_KINDS as readonly string[]).includes(s.scope.kind)) {
      err('scope_invalid', where, 'scope must be { kind: tool | provider | none, id }')
    } else if (s.scope.kind === 'none') {
      if (s.scope.id !== null) err('scope_invalid', where, 'scope.id must be null when scope.kind is none')
      if (SCOPED_SOURCE_CLASSES.includes(s.source_class)) err('scope_required', where, `a ${s.source_class} source must name the tool or provider it covers`)
    } else if (!nonEmpty(s.scope.id)) {
      err('scope_invalid', where, 'scope.id must name a tool or provider')
    } else if (!knownScope(s.scope.kind, s.scope.id)) {
      err('scope_identity_unknown', where, `no governed runtime claim names ${s.scope.kind} "${s.scope.id}"`)
    }

    // Baseline: empty until a named human accepts one. FR-17: its rule version must match the entry's.
    if (s.baseline !== null) {
      const b = s.baseline
      if (!isObj(b)) err('baseline_invalid', where, 'baseline must be null or an object')
      else {
        for (const p of keyProblems(b, BASELINE_KEYS)) err('baseline_invalid', where, p)
        if (!nonEmpty(b.snapshot) || !nonEmpty(b.accepted_by) || !isRealIsoDate(b.accepted_on)) err('baseline_invalid', where, 'baseline needs a snapshot pointer, a named accepter and an ISO date')
        if (!SHA256.test(String(b.raw_sha256)) || !SHA256.test(String(b.extracted_sha256))) err('baseline_invalid', where, 'baseline hashes must be SHA-256 hex')
        if (ruleVersion === null || b.extraction_rule_version !== ruleVersion) err('baseline_rule_version_mismatch', where, 'the baseline was accepted under a different extraction-rule version than the entry declares')
        if (s.min_extracted_length === null) err('baseline_invalid', where, 'min_extracted_length must be set before a baseline exists')
      }
    }

    if (s.evidence_manifest !== null) {
      if (!nonEmpty(s.evidence_manifest)) err('manifest_missing', where, 'evidence_manifest must be null or a repository path')
      else if (!ev.manifests.has(s.evidence_manifest) || ev.manifests.get(s.evidence_manifest) === null) err('manifest_missing', where, `evidence manifest not found: ${s.evidence_manifest}`)
    }

    // Registered by identifier even when other fields are wrong, so its relationships are still checked.
    if (nonEmpty(s.source_id) && SOURCE_ID.test(s.source_id) && !sources.has(s.source_id)) sources.set(s.source_id, s)
  })

  // ── Relationships and exclusions ─────────────────────────────────────────
  const mapped = new Set<string>()
  const excluded = new Set<string>()
  const pair = (sourceId: string, claim: string) => `${sourceId}\u0000${claim}`

  const checkConfirmation = (o: Obj, where: string, kind: string) => {
    const by = o.confirmed_by
    const on = o.confirmed_on
    if (by === null && on === null) return pend(`${kind}_unconfirmed`, where, 'proposed; no named human has confirmed it')
    if (!nonEmpty(by) || !isRealIsoDate(on)) err('confirmation_invalid', where, 'confirmed_by and confirmed_on must both be set (a name and an ISO date) or both be null')
  }
  const checkRefShape = (ref: unknown, where: string): ref is string => {
    if (!nonEmpty(ref)) {
      err('claim_ref_invalid', where, 'claim_ref is missing')
      return false
    }
    // AC-2a: Matrix rows and Matrix claims are not part of the mapping.
    if (matrixIds.has(ref)) {
      err('matrix_identifier_not_allowed', where, `"${ref}" is a Legacy Matrix identifier; the mapping covers governed Living Knowledge claims only (OPEN-8)`)
      return false
    }
    if (!GOVERNED_CLAIM_ID.test(ref)) {
      err('claim_ref_invalid', where, `"${ref}" is not a governed Living Knowledge claim ID`)
      return false
    }
    return true
  }

  reg.relationships.forEach((raw: unknown, i: number) => {
    const where = isObj(raw) ? `relationship ${String(raw.source_id)} -> ${String(raw.claim_ref)}` : `relationships[${i}]`
    if (!isObj(raw)) return err('relationship_malformed', where, 'entry is not an object')
    for (const p of keyProblems(raw, RELATIONSHIP_KEYS)) err('relationship_malformed', where, p)
    const src = typeof raw.source_id === 'string' ? sources.get(raw.source_id) : undefined
    if (!src) err('source_unknown', where, 'source_id does not name a valid registered source')
    if (!nonEmpty(raw.basis_note)) err('basis_missing', where, 'basis_note must say how the dependence is evidenced')
    if (!nonEmpty(raw.basis_path) || !ev.existingPaths.has(raw.basis_path)) err('basis_missing', where, 'basis_path must be an existing repository path')
    checkConfirmation(raw, where, 'relationship')
    if (!checkRefShape(raw.claim_ref, where)) return
    const ref = raw.claim_ref

    // Identity and lifecycle: the ledger is the authority (approved direction B).
    const ledgerLifecycle = ev.ledger.get(ref)
    const rt = runtimeById.get(ref)
    if (ledgerLifecycle === undefined) {
      err('claim_unknown', where, `${ref} is not in GOVERNED-CLAIMS.md`)
    } else {
      if (ledgerLifecycle !== 'Adopted') err('claim_not_adopted', where, `${ref} is ${ledgerLifecycle} in the ledger; only Adopted claims are mapped`)
      if (rt && rt.lifecycle !== ledgerLifecycle) err('lifecycle_mismatch', where, `${ref} is ${ledgerLifecycle} in the ledger and ${rt.lifecycle} in the runtime fixture`)
    }

    // Scope: a scoped source may only be mapped to claims that name the same tool or provider.
    if (src && src.scope && src.scope.kind !== 'none' && nonEmpty(src.scope.id) && ledgerLifecycle !== undefined) {
      if (!rt) err('scope_unverifiable', where, `${ref} has no runtime representation, so its scope cannot be checked against ${src.scope.kind} "${src.scope.id}"`)
      else if (!scopeNames(rt, src.scope.kind).includes(src.scope.id)) err('scope_mismatch', where, `${ref} does not name ${src.scope.kind} "${src.scope.id}" in its governed scope`)
    }

    if (src) {
      const key = pair(src.source_id, ref)
      if (mapped.has(key)) err('relationship_duplicate', where, 'the same source and claim are related more than once')
      mapped.add(key)
    }
  })

  reg.exclusions.forEach((raw: unknown, i: number) => {
    const where = isObj(raw) ? `exclusion ${String(raw.source_id)} -> ${String(raw.claim_ref)}` : `exclusions[${i}]`
    if (!isObj(raw)) return err('exclusion_malformed', where, 'entry is not an object')
    for (const p of keyProblems(raw, EXCLUSION_KEYS)) err('exclusion_malformed', where, p)
    const src = typeof raw.source_id === 'string' ? sources.get(raw.source_id) : undefined
    if (!src) err('source_unknown', where, 'source_id does not name a valid registered source')
    if (!nonEmpty(raw.reason)) err('exclusion_reason_missing', where, 'an exclusion must state its reason')
    checkConfirmation(raw, where, 'exclusion')
    // An excluded ID need not be in the ledger: a manifest may name a proposed claim that was never adopted.
    if (!checkRefShape(raw.claim_ref, where) || !src) return
    const key = pair(src.source_id, raw.claim_ref)
    if (excluded.has(key)) err('exclusion_duplicate', where, 'the same exclusion is listed more than once')
    if (mapped.has(key)) err('mapped_and_excluded', where, 'the same source and claim are both mapped and excluded')
    excluded.add(key)
  })

  // ── Independent cross-checks (FR-20) ─────────────────────────────────────
  // Ledger and runtime mirror must agree on every claim both carry, mapped or not.
  for (const [id, lifecycle] of ev.ledger) {
    if (!(LEDGER_LIFECYCLES as readonly string[]).includes(lifecycle)) err('ledger_lifecycle_unrecognised', `claim ${id}`, `ledger lifecycle "${lifecycle}" is not a recognised value`)
  }

  for (const s of sources.values()) {
    const where = `source ${s.source_id}`
    // Scope cross-check (AC-3): every runtime claim naming this tool or provider is mapped to one of
    // that tool's or provider's registered sources, or excluded with a reason.
    if (isObj(s.scope) && s.scope.kind !== 'none' && nonEmpty(s.scope.id)) {
      const siblings = [...sources.values()].filter((o) => isObj(o.scope) && o.scope.kind === s.scope.kind && o.scope.id === s.scope.id)
      for (const c of ev.runtime) {
        if (!scopeNames(c, s.scope.kind).includes(s.scope.id)) continue
        const explained = siblings.some((o) => mapped.has(pair(o.source_id, c.claim_id)) || excluded.has(pair(o.source_id, c.claim_id)))
        if (!explained) err('scope_claim_unexplained', where, `${c.claim_id} names ${s.scope.kind} "${s.scope.id}" and is neither mapped nor excluded`)
      }
    }
    // Manifest cross-check (AC-4).
    if (nonEmpty(s.evidence_manifest)) {
      for (const id of ev.manifests.get(s.evidence_manifest) ?? []) {
        if (!mapped.has(pair(s.source_id, id)) && !excluded.has(pair(s.source_id, id))) err('manifest_claim_unexplained', where, `${id} is named in ${s.evidence_manifest} and is neither mapped nor excluded`)
      }
    }
  }

  return finish()
}
