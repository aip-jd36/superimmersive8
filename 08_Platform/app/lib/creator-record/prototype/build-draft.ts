/**
 * CR-V2-VERTICAL-SLICE-1 — questionnaire → existing guidance pipeline → draft record.
 *
 * Pure. No I/O, no model call, no writes, no clock (the caller passes `as_of`
 * and the record context). Governed claims are passed in by the caller; this
 * module never chooses them.
 *
 *   form state ─ validateForm ─ formToObservations (contract: eligibleQuestions + mapAnswer)
 *     → runCreatorRecordGuidance (existing pipeline, unchanged: facts → selectReviewerClaims
 *       → not_met excluded → Creator Record publication authorization → BI → composeGuidance)
 *     → buildDraftRecord (fixed templates)
 *
 * CR-V2-MVP-6 (Option C): documents never change a declaration. After
 * guidance is computed (from declarations only), each tool block gets a
 * provisional evidence reconciliation computed HERE, on the server, from the
 * declarations and the server-checked document observation. No reconciliation
 * is ever accepted from a request.
 *
 * The governance SOURCES are an explicit input. `governedSources()` returns the
 * authoritative (empty, fail-closed) sources; `pilotSources()` returns the
 * internal, unapproved pilot set. They are never merged.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import { loadQuestionRegistry, type QuestionRegistry, type RegistryInput } from '../contract/question-registry'
import type { RecordContext } from '../contract/provenance'
import { CREATOR_RECORD_DEPENDENCY_LABELS, CREATOR_RECORD_PUBLICATION_LEDGER, CREATOR_RECORD_REGISTRY_INPUT } from '../governed/sources'
import { runCreatorRecordGuidance, type CreatorRecordGuidanceResult } from '../integration/run-creator-record-guidance'
import { buildDraftRecord, type DraftRecordView } from '../presentation/build-draft-record'
import { PILOT_CAVEATS, PILOT_DEPENDENCY_LABELS, PILOT_LEDGER_VERSION, PILOT_PUBLICATION_LEDGER } from '../pilot/pilot-ledger'
import { PILOT_ACKNOWLEDGEMENTS, PILOT_MAX_TOOLS, PILOT_QUESTION_META, PILOT_REGISTRY_INPUT, PILOT_REGISTRY_VERSION, type PilotQuestionMeta } from '../pilot/pilot-registry'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { reconcileToolEvidence, toDocumentObservations, type EvidenceReconciliation, type ToolDocument } from '../evidence/document-observations'
import { resolveSellerIdentity } from '../integration/seller-identity'
import { formToObservations, shownToolQuestionIds, toolInstance, validateForm, visibleQuestions, type CreatorRecordFormState, type FormConfig, type FormIssue } from './form'

export interface CreatorRecordSources {
  kind: 'governed' | 'pilot'
  registry_input: RegistryInput
  presentation: Readonly<Record<string, PilotQuestionMeta>>
  acknowledgement_ids: readonly string[]
  ledger: readonly PublicationLedgerEntry[]
  dependency_labels: Readonly<Record<string, string>>
  caveats: Readonly<Record<string, string>>
  versions: { registry: string; ledger: string }
  max_tools: number
}

/** The authoritative sources. Empty today: no question is shown and nothing is published. */
export function governedSources(): CreatorRecordSources {
  return {
    kind: 'governed',
    registry_input: CREATOR_RECORD_REGISTRY_INPUT,
    presentation: {},
    acknowledgement_ids: [],
    ledger: CREATOR_RECORD_PUBLICATION_LEDGER,
    dependency_labels: CREATOR_RECORD_DEPENDENCY_LABELS,
    caveats: {},
    versions: { registry: 'none approved', ledger: 'none approved' },
    max_tools: PILOT_MAX_TOOLS,
  }
}

/** INTERNAL, UNAPPROVED pilot sources for the admin prototype only. */
export function pilotSources(): CreatorRecordSources {
  return {
    kind: 'pilot',
    registry_input: PILOT_REGISTRY_INPUT,
    presentation: PILOT_QUESTION_META,
    acknowledgement_ids: Object.keys(PILOT_ACKNOWLEDGEMENTS),
    ledger: PILOT_PUBLICATION_LEDGER,
    dependency_labels: PILOT_DEPENDENCY_LABELS,
    caveats: PILOT_CAVEATS,
    versions: { registry: `${PILOT_REGISTRY_VERSION} (internal, unapproved)`, ledger: `${PILOT_LEDGER_VERSION} (internal, unapproved)` },
    max_tools: PILOT_MAX_TOOLS,
  }
}

export function loadFormConfig(sources: CreatorRecordSources): FormConfig {
  const r = loadQuestionRegistry(sources.registry_input)
  if (!r.ok) throw new Error(`Creator Record registry rejected: ${r.errors.join('; ')}`)
  return { registry: r.registry, presentation: sources.presentation, acknowledgement_ids: sources.acknowledgement_ids, max_tools: sources.max_tools }
}

export interface BuildDraftInput {
  state: CreatorRecordFormState
  sources: CreatorRecordSources
  topicClaims: TopicClaim[]
  as_of: string
  record: RecordContext
  /**
   * Documents the creator added (CR-V2-EVIDENCE-SLICE-1), already strictly
   * parsed. DISPLAY-ONLY: they are never passed to the guidance pipeline.
   */
  documents?: readonly ToolDocument[]
}

export type BuildDraftResult =
  | { ok: true; view: DraftRecordView; guidance: CreatorRecordGuidanceResult }
  | { ok: false; issues: FormIssue[] }

export function buildCreatorRecordDraft(input: BuildDraftInput): BuildDraftResult {
  const config = loadFormConfig(input.sources)
  const documents = input.documents ?? []
  const issues = validateForm(config, input.state)
  if (issues.length > 0) return { ok: false, issues }

  const { observations, discarded } = formToObservations(config, input.state, input.record)
  const labels = input.sources.dependency_labels
  // Only customer declarations reach the guidance pipeline. Documents are not an input.
  const guidance = runCreatorRecordGuidance({
    observations,
    topicClaims: input.topicClaims,
    ledger: input.sources.ledger,
    dependencyLabel: (id) => (Object.prototype.hasOwnProperty.call(labels, id) ? labels[id] : undefined),
    as_of: input.as_of,
  })

  // Provisional evidence reconciliation, one per tool block. After guidance; never an input to it.
  const prov = guidance.facts.provenance
  const reconciliation: EvidenceReconciliation[] = input.state.tools.map((t, i) => {
    const ids = Array.from(new Set(prov.tools.filter((x) => x.instance === toolInstance(i)).map((x) => x.tool_id)))
    return reconcileToolEvidence(
      {
        tool_index: i,
        document: documents.find((d) => d.tool_index === i)?.document ?? null,
        declared_tool_id: ids.length === 1 ? ids[0] : null,
        declared_plan: (t.T3 ?? [])[0] ?? null,
      },
      resolveSellerIdentity,
    )
  })

  const shown = visibleQuestions(config, Object.fromEntries(Object.entries(input.state.answers).filter(([, v]) => v.some((x) => x.trim() !== ''))))
  const caveats = input.sources.caveats
  const view = buildDraftRecord({
    state: input.state,
    presentation: input.sources.presentation,
    question_order: Array.from(config.registry.questions.keys()),
    shown: { single: shown.single.map((q) => q.q_id), per_tool: shownToolQuestionIds(config, input.state) },
    observations,
    discarded,
    guidance,
    topicClaims: input.topicClaims,
    dependencyLabel: (id) => (Object.prototype.hasOwnProperty.call(labels, id) ? labels[id] : undefined),
    caveatText: (id) => (Object.prototype.hasOwnProperty.call(caveats, id) ? caveats[id] : undefined),
    record: { record_id: input.record.record_id, version: input.record.record_version, prepared_on: input.as_of },
    versions: { ...input.sources.versions, as_of: input.as_of },
    pilot: input.sources.kind === 'pilot',
    documents,
    document_observations: documents.flatMap((d) => toDocumentObservations(input.record, d)),
    reconciliation,
  })
  return { ok: true, view, guidance }
}

export type { QuestionRegistry }
