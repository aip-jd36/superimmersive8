/**
 * CR-V2-DECL-1B-1 — the questionnaire contract and its approval.
 *
 * The Source Text Approval (`./source-text`) binds wording only. This binds everything else about the questionnaire that
 * can change which answers are accepted or what they mean: one canonical object, identified by its SHA-256, named by one
 * approval in the same authority bundle. The contract includes the wording digest, so a contract approval covers the exact
 * wording set as well. `checkApprovedSources` enforces it, and is the one check both the form gate and preparation run.
 *
 * FAIL CLOSED ON NEW FIELDS. Every field of every input object is classified below. A field with no classification is
 * refused (`questionnaire_contract_unclassified_field`), never omitted, so a new setting cannot change behaviour outside the
 * approval until someone deliberately decides where it belongs.
 *
 * WHAT A DIGEST PROVES. Digest equality shows this contract is byte-for-byte the one the approval names. It does not
 * authenticate a reviewer or prove anyone read it: `authority` and `review_ref` are recorded text, and anyone who can commit
 * can change them and the digest together. Approval is only as strong as the review of the commit that carries it.
 *
 * CR-V2-DECL-1B-2: a prepared record of schema 7 or 8 embeds the whole contract and wording set it was prepared under
 * (`EmbeddedQuestionnaireContract`), so it can be read and reconstructed without the questionnaire deployed today. Schema 5
 * and 6 records carry none and are never given one. The contract the browser says it displayed is compared with the current
 * one by `preparePrepared`: a client's digest can only refuse, it never authorizes.
 *
 * Pure: no I/O, no clock.
 */

import { NOT_APPLICABLE, NOT_SURE } from '../contract/question-registry'
import { isIsoDate } from '../contract/types'
import type { CreatorRecordSources } from '../prototype/build-draft'
import { FREE_TEXT_NOT_SURE_VERBATIM, MAX_TEXT_LENGTH, QUESTION_INPUTS } from '../prototype/form'
import { ACKNOWLEDGEMENT_ID_PATTERN, MAX_BODY_BYTES, MAX_TOOL_BLOCKS, MAX_VALUES_PER_ANSWER, QUESTION_ID_PATTERN } from '../prototype/parse-form-state'
import { CUSTOMER_SECTION_TITLES, QUESTIONNAIRE_SECTION_ORDER, TOOL_QUESTION_ROLES } from '../prototype/questionnaire-structure'
import { canonicalJson, CanonicalizationError, sha256Hex } from '../record-core/canonical'
import { SOURCE_TEXT_LIFECYCLE, SOURCE_TEXT_SOURCE_ID, type SourceTextContent, type SourceTextLifecycle } from './source-text'

export const QUESTIONNAIRE_CONTRACT_ID = 'si8/creator-record-v2-questionnaire-contract'
/** The shape of the canonical object below. Raise it when the shape changes. */
export const QUESTIONNAIRE_CONTRACT_FORMAT_VERSION = 1

/**
 * The rules that turn a contract and answers into an accepted form: visibility, requiredness, exclusivity, value checks and
 * observation mapping. Code, so no digest can see it. Raise the version with any change to those rules.
 * `__tests__/creator-record/questionnaire-validation-rules.test.ts` fails when the code or its behaviour changes while this
 * stays the same. That is a test-time guard only: nothing detects a rule change at runtime.
 */
export const QUESTIONNAIRE_VALIDATION_RULES = { id: 'si8/creator-record-v2-questionnaire-validation', version: 1 } as const

/**
 * Where each input field belongs:
 *   contract             part of the canonical contract, directly;
 *   wording              covered by the wording digest, which the contract includes;
 *   separately_governed  has its own approval (the publication ledger);
 *   gate                 decides whether this check runs, or is the approval being checked; not part of what is approved.
 */
export type QuestionnaireFieldClass = 'contract' | 'wording' | 'separately_governed' | 'gate'

export const QUESTIONNAIRE_FIELD_CLASSES = {
  sources: {
    kind: 'gate', questionnaire_approval: 'gate', ledger: 'separately_governed', dependency_labels: 'wording', caveats: 'wording',
    registry_input: 'contract', presentation: 'contract', acknowledgement_ids: 'contract', versions: 'contract', max_tools: 'contract',
  },
  versions: { registry: 'contract', ledger: 'separately_governed' },
  registry_input: { questions: 'contract', observation_map: 'contract', semantic_mappings: 'contract', prohibited_dependency_targets: 'contract' },
  question: { q_id: 'contract', version: 'contract', question_kind: 'contract', wording_ref: 'contract', options: 'contract', display_condition: 'contract', approval: 'contract' },
  observation_map_entry: { o_id: 'contract', version: 'contract', q_id: 'contract', q_version: 'contract', applies_to: 'contract', observation_kind: 'contract', target: 'contract', value_mapping_version: 'contract', approval: 'contract' },
  semantic_mapping: { q_id: 'contract', q_version: 'contract', dependency_id: 'contract', review_ref: 'contract' },
  entry_approval: { status: 'contract', approver: 'contract', decision_date: 'contract', review_ref: 'contract' },
  presentation: {
    q_id: 'contract', section: 'contract', input: 'contract', required: 'contract', per_tool: 'contract', allow_not_sure: 'contract', exclusive_options: 'contract',
    text: 'wording', help: 'wording', option_labels: 'wording',
  },
} as const satisfies Record<string, Record<string, QuestionnaireFieldClass>>

/** Closed shapes, by `kind`. Tagged unions cannot be classified by a flat key list. */
const DISPLAY_CONDITION_FIELDS: Readonly<Record<string, readonly string[]>> = { always: ['kind'], answer_includes: ['kind', 'q_id', 'any_of'], all: ['kind', 'conditions'] }
const APPLIES_TO_FIELDS: Readonly<Record<string, readonly string[]>> = { option: ['kind', 'value'], any_answer: ['kind'] }
const TARGET_FIELDS: Readonly<Record<string, readonly string[]>> = {
  applicability_fact: ['kind', 'fact', 'tool'], tool_identity: ['kind'], asset_provider_identity: ['kind'], dependency: ['kind', 'dependency_id'], location: ['kind', 'role'],
}

type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v)

/** Every field below `sources` with no classification, or a value the contract cannot represent. Path strings only. */
export function unclassifiedQuestionnaireFields(sources: CreatorRecordSources): string[] {
  const out: string[] = []
  const fields = (v: unknown, classes: Readonly<Record<string, unknown>>, path: string): v is Plain => {
    if (!isPlain(v)) {
      out.push(`${path}: not an object`)
      return false
    }
    for (const k of Object.keys(v)) if (!Object.prototype.hasOwnProperty.call(classes, k)) out.push(`${path}.${k}`)
    return true
  }
  const list = (v: unknown, path: string, each: (item: unknown, at: string) => void) => {
    if (v === undefined) return
    if (!Array.isArray(v)) out.push(`${path}: not a list`)
    else v.forEach((item, i) => each(item, `${path}[${i}]`))
  }
  const tagged = (v: unknown, shapes: Readonly<Record<string, readonly string[]>>, path: string): v is Plain => {
    if (!isPlain(v) || typeof v.kind !== 'string' || !Object.prototype.hasOwnProperty.call(shapes, v.kind)) {
      out.push(`${path}: unclassified kind`)
      return false
    }
    for (const k of Object.keys(v)) if (!shapes[v.kind].includes(k)) out.push(`${path}.${k}`)
    return true
  }
  const condition = (c: unknown, path: string) => {
    if (tagged(c, DISPLAY_CONDITION_FIELDS, path) && c.kind === 'all') list(c.conditions, `${path}.conditions`, condition)
  }
  const approval = (a: unknown, path: string) => fields(a, QUESTIONNAIRE_FIELD_CLASSES.entry_approval, path)

  if (!fields(sources, QUESTIONNAIRE_FIELD_CLASSES.sources, 'sources')) return out
  fields(sources.versions, QUESTIONNAIRE_FIELD_CLASSES.versions, 'versions')
  if (fields(sources.registry_input, QUESTIONNAIRE_FIELD_CLASSES.registry_input, 'registry_input')) {
    const r = sources.registry_input
    list(r.questions, 'questions', (q, at) => {
      if (!fields(q, QUESTIONNAIRE_FIELD_CLASSES.question, at)) return
      condition(q.display_condition, `${at}.display_condition`)
      approval(q.approval, `${at}.approval`)
    })
    list(r.observation_map, 'observation_map', (o, at) => {
      if (!fields(o, QUESTIONNAIRE_FIELD_CLASSES.observation_map_entry, at)) return
      tagged(o.applies_to, APPLIES_TO_FIELDS, `${at}.applies_to`)
      tagged(o.target, TARGET_FIELDS, `${at}.target`)
      approval(o.approval, `${at}.approval`)
    })
    list(r.semantic_mappings, 'semantic_mappings', (m, at) => fields(m, QUESTIONNAIRE_FIELD_CLASSES.semantic_mapping, at))
  }
  if (isPlain(sources.presentation)) {
    for (const [id, p] of Object.entries(sources.presentation)) {
      const at = `presentation.${id}`
      if (!fields(p, QUESTIONNAIRE_FIELD_CLASSES.presentation, at)) continue
      // A question in an unknown section is never rendered, and an unknown input has no defined behaviour.
      if (!(QUESTIONNAIRE_SECTION_ORDER as readonly unknown[]).includes(p.section)) out.push(`${at}.section: unclassified value`)
      if (!(QUESTION_INPUTS as readonly unknown[]).includes(p.input)) out.push(`${at}.input: unclassified value`)
    }
  } else out.push('presentation: not an object')
  return out
}

/** A copy holding exactly the fields of class `contract`, so nothing classified otherwise can enter the digest. */
function contractFields(v: Plain, classes: Readonly<Record<string, QuestionnaireFieldClass>>): Plain {
  return Object.fromEntries(Object.entries(v).filter(([k]) => classes[k] === 'contract'))
}

export type QuestionnaireContractResult =
  | { ok: true; contract: Plain; canonical: string; sha256: string }
  | { ok: false; reason: 'unclassified'; fields: string[] }
  | { ok: false; reason: 'not_canonical'; path: string }

/** The canonical contract of these sources and this wording digest, or the reason there is none. Never a partial contract. */
export function questionnaireContract(sources: CreatorRecordSources, wording_sha256: string): QuestionnaireContractResult {
  const unclassified = unclassifiedQuestionnaireFields(sources)
  if (unclassified.length > 0) return { ok: false, reason: 'unclassified', fields: unclassified }
  const r = sources.registry_input
  const contract: Plain = {
    contract: { id: QUESTIONNAIRE_CONTRACT_ID, format_version: QUESTIONNAIRE_CONTRACT_FORMAT_VERSION },
    validation_rules: { ...QUESTIONNAIRE_VALIDATION_RULES },
    registry_version: sources.versions.registry,
    // Arrays keep their order: question order is display order, and map order is observation order.
    questions: r.questions,
    observation_map: r.observation_map,
    semantic_mappings: r.semantic_mappings ?? [],
    prohibited_dependency_targets: r.prohibited_dependency_targets ?? [],
    presentation: Object.fromEntries(Object.entries(sources.presentation).map(([id, p]) => [id, contractFields(p as unknown as Plain, QUESTIONNAIRE_FIELD_CLASSES.presentation)])),
    acknowledgement_ids: sources.acknowledgement_ids,
    max_tools: sources.max_tools,
    sections: { order: QUESTIONNAIRE_SECTION_ORDER, titles: CUSTOMER_SECTION_TITLES },
    tool_question_roles: TOOL_QUESTION_ROLES,
    answer_constraints: {
      max_text_length: MAX_TEXT_LENGTH, max_values_per_answer: MAX_VALUES_PER_ANSWER, max_tool_blocks: MAX_TOOL_BLOCKS, max_body_bytes: MAX_BODY_BYTES,
      question_id_pattern: QUESTION_ID_PATTERN.source, acknowledgement_id_pattern: ACKNOWLEDGEMENT_ID_PATTERN.source,
    },
    uncertainty: { not_sure: NOT_SURE, not_applicable: NOT_APPLICABLE, free_text_not_sure_verbatim: FREE_TEXT_NOT_SURE_VERBATIM },
    wording_sha256,
  }
  try {
    const canonical = canonicalJson(contract)
    return { ok: true, contract, canonical, sha256: sha256Hex(canonical) }
  } catch (err) {
    if (err instanceof CanonicalizationError) return { ok: false, reason: 'not_canonical', path: err.path }
    throw err
  }
}

/** Names one exact contract. It says who the bundle records as approving it; it does not prove that they did. */
export interface QuestionnaireContractApproval {
  contract_id: typeof QUESTIONNAIRE_CONTRACT_ID
  /** A positive integer, raised for every new approval. */
  contract_version: number
  contract_sha256: string
  lifecycle: SourceTextLifecycle
  authority: string
  decision_date: string
  review_ref: string
}

export const QUESTIONNAIRE_CONTRACT_REFUSAL_CODES = [
  'questionnaire_contract_missing',
  'questionnaire_contract_malformed',
  'questionnaire_contract_not_approved',
  'questionnaire_contract_withdrawn',
  'questionnaire_contract_superseded',
  'questionnaire_contract_digest_mismatch',
  'questionnaire_contract_unclassified_field',
  'option_label_orphan',
] as const
export type QuestionnaireContractRefusalCode = (typeof QUESTIONNAIRE_CONTRACT_REFUSAL_CODES)[number]
export interface QuestionnaireContractRefusal { code: QuestionnaireContractRefusalCode | 'pilot_marker'; ref: string | null }

const APPROVAL_KEYS = 'authority,contract_id,contract_sha256,contract_version,decision_date,lifecycle,review_ref'
const HEX64 = /^[0-9a-f]{64}$/
const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval|not a creator record publication approval/i
const text = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

export function approvalRefusals(a: unknown): QuestionnaireContractRefusal[] {
  if (a === null || a === undefined) return [{ code: 'questionnaire_contract_missing', ref: null }]
  const malformed: QuestionnaireContractRefusal = { code: 'questionnaire_contract_malformed', ref: null }
  if (!isPlain(a) || Object.keys(a).sort().join(',') !== APPROVAL_KEYS) return [malformed]
  if (a.contract_id !== QUESTIONNAIRE_CONTRACT_ID || !Number.isInteger(a.contract_version) || (a.contract_version as number) < 1) return [malformed]
  if (typeof a.contract_sha256 !== 'string' || !HEX64.test(a.contract_sha256)) return [malformed]
  if (!(SOURCE_TEXT_LIFECYCLE as readonly unknown[]).includes(a.lifecycle) || !text(a.authority) || !text(a.review_ref) || !isIsoDate(a.decision_date)) return [malformed]
  const out: QuestionnaireContractRefusal[] = []
  if (a.lifecycle === 'withdrawn') out.push({ code: 'questionnaire_contract_withdrawn', ref: null })
  else if (a.lifecycle === 'superseded') out.push({ code: 'questionnaire_contract_superseded', ref: null })
  else if (a.lifecycle !== 'approved') out.push({ code: 'questionnaire_contract_not_approved', ref: null })
  if (UNAPPROVED_MARKER.test(a.authority as string) || UNAPPROVED_MARKER.test(a.review_ref as string)) out.push({ code: 'pilot_marker', ref: 'questionnaire_contract' })
  return out
}

/** Labels for options a question no longer has. The wording digest alone would let an option vanish while its label stays. */
function orphanLabels(sources: CreatorRecordSources): QuestionnaireContractRefusal[] {
  const out: QuestionnaireContractRefusal[] = []
  for (const q of sources.registry_input.questions) {
    const p = sources.presentation[q.q_id]
    if (!p || !isPlain(p.option_labels)) continue
    const allowed = new Set<string>(q.options === 'free_text' ? (p.allow_not_sure ? [NOT_SURE] : []) : q.options)
    for (const label of Object.keys(p.option_labels)) if (!allowed.has(label)) out.push({ code: 'option_label_orphan', ref: `${q.q_id}.${label}` })
  }
  return out
}

/** The approved contract as `checkApprovedSources` reports it: what the approval names, and the body it names. */
export interface ApprovedQuestionnaireContract {
  contract_id: typeof QUESTIONNAIRE_CONTRACT_ID
  contract_version: number
  contract_sha256: string
  authority: string
  decision_date: string
  review_ref: string
  body: Record<string, unknown>
}

/** What a schema 7 or 8 record stores, inside its own digest: the approved contract plus the whole wording set it names. */
export interface EmbeddedQuestionnaireContract extends ApprovedQuestionnaireContract {
  /** Every approved question, not only the answered ones. */
  wording: SourceTextContent
}

const EMBEDDED_KEYS = 'authority,body,contract_id,contract_sha256,contract_version,decision_date,review_ref,wording'

/**
 * Whether an embedded contract is exactly what it says it is, from the record alone: nothing here reads the current
 * questionnaire, its approval or any constant that could change later, apart from the contract and wording identifiers.
 */
export function embeddedContractValid(sources: { registry_version?: unknown; source_text?: { content_sha256?: unknown }; questionnaire_contract?: unknown }): boolean {
  const e = sources.questionnaire_contract
  if (!isPlain(e) || Object.keys(e).sort().join(',') !== EMBEDDED_KEYS) return false
  if (e.contract_id !== QUESTIONNAIRE_CONTRACT_ID || !Number.isInteger(e.contract_version) || (e.contract_version as number) < 1) return false
  if (typeof e.contract_sha256 !== 'string' || !HEX64.test(e.contract_sha256) || !text(e.authority) || !text(e.review_ref) || !isIsoDate(e.decision_date)) return false
  if (!isPlain(e.body) || !isPlain(e.wording) || e.wording.source_id !== SOURCE_TEXT_SOURCE_ID) return false
  try {
    if (sha256Hex(canonicalJson(e.body)) !== e.contract_sha256) return false
    const wording = sha256Hex(canonicalJson(e.wording))
    if (e.body.wording_sha256 !== wording || sources.source_text?.content_sha256 !== wording) return false
  } catch (err) {
    if (err instanceof CanonicalizationError) return false
    throw err
  }
  const declared = e.body.contract
  return isPlain(declared) && declared.id === e.contract_id && e.body.registry_version === sources.registry_version
}

/** Whether these sources are exactly the contract their approval names. Every reason found, never only the first. */
export function checkQuestionnaireContract(sources: CreatorRecordSources, wording_sha256: string): QuestionnaireContractRefusal[] {
  const refusals = approvalRefusals(sources.questionnaire_approval)
  const built = questionnaireContract(sources, wording_sha256)
  if (!built.ok) {
    if (built.reason === 'unclassified') for (const f of built.fields) refusals.push({ code: 'questionnaire_contract_unclassified_field', ref: f })
    else refusals.push({ code: 'questionnaire_contract_malformed', ref: built.path })
    return refusals
  }
  refusals.push(...orphanLabels(sources))
  const a = sources.questionnaire_approval
  if (a && !refusals.some((r) => r.code === 'questionnaire_contract_malformed') && a.contract_sha256 !== built.sha256) refusals.push({ code: 'questionnaire_contract_digest_mismatch', ref: null })
  return refusals
}
