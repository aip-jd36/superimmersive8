/**
 * CR-V2-1 — form validation, declared observations and guidance, on the
 * creator's declarations alone. Shared by the draft (`./build-draft`) and the
 * Creator Record v2 customer record (`../customer-record`). Loads no pilot
 * data: the sources are always passed in.
 *
 * Documents are not an input (Option C): they can neither create declarations
 * nor influence guidance.
 */

import { objectiveFactAuthorizationErrors } from '../contract/objective-fact-authorization'
import { declarationIntegrityRefusals, loadQuestionRegistry } from '../contract/question-registry'
import { CREATOR_RECORD_OBJECTIVE_CATALOG_IDS } from '../integration/objectives'
import type { DeclaredObservation } from '../contract/provenance'
import { runCreatorRecordGuidance, type CreatorRecordGuidanceResult } from '../integration/run-creator-record-guidance'
import type { BuildDraftInput, CreatorRecordSources } from './build-draft'
import { formToObservations, validateForm, type DiscardedAnswer, type FormConfig, type FormIssue } from './form'

export function loadFormConfig(sources: CreatorRecordSources): FormConfig {
  const r = loadQuestionRegistry(sources.registry_input)
  if (!r.ok) throw new Error(`Creator Record registry rejected: ${r.errors.join('; ')}`)
  // CR-V2-DECL-1A: every bundle obeys the same contracts, whichever path builds from it.
  const integrity = declarationIntegrityRefusals(sources.registry_input, sources.presentation)
  if (integrity.length > 0) throw new Error(`Creator Record registry rejected: ${integrity.map((x) => `${x.code}: ${x.ref}`).join('; ')}`)
  return { registry: r.registry, presentation: sources.presentation, acknowledgement_ids: sources.acknowledgement_ids, max_tools: sources.max_tools }
}

export type DeclaredGuidanceInput = Omit<BuildDraftInput, 'documents'>

export type DeclaredGuidanceResult =
  | { ok: true; config: FormConfig; observations: DeclaredObservation[]; discarded: DiscardedAnswer[]; guidance: CreatorRecordGuidanceResult }
  | { ok: false; issues: FormIssue[] }

export function runDeclaredGuidance(input: DeclaredGuidanceInput): DeclaredGuidanceResult {
  const config = loadFormConfig(input.sources)
  const issues = validateForm(config, input.state)
  if (issues.length > 0) return { ok: false, issues }

  const { observations, discarded } = formToObservations(config, input.state, input.record)
  const labels = input.sources.dependency_labels
  // CRV2-IA-4B: the sources' authorizations (set only from a validated bundle) are re-checked against these same sources;
  // any error refuses the run rather than applying part of the list. Absent: none (default deny).
  const authorizations = input.sources.objective_fact_authorizations ?? []
  const authErrors = objectiveFactAuthorizationErrors(authorizations, { objective_ids: CREATOR_RECORD_OBJECTIVE_CATALOG_IDS, registry_input: input.sources.registry_input })
  if (authErrors.length > 0) throw new Error(`Creator Record objective-fact authorizations rejected: ${authErrors.join('; ')}`)
  const guidance = runCreatorRecordGuidance({
    observations,
    topicClaims: input.topicClaims,
    ledger: input.sources.ledger,
    dependencyLabel: (id) => (Object.prototype.hasOwnProperty.call(labels, id) ? labels[id] : undefined),
    as_of: input.as_of,
    objectiveFactAuthorizations: authorizations,
  })
  return { ok: true, config, observations, discarded, guidance }
}
