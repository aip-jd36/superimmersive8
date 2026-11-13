/**
 * CR-ARTIFACT-1 — production composition of the private artifact path.
 * Used by payment fulfilment (lib/payments/fulfillment-deps.ts) and the admin
 * retry route; the fulfilment runner is unchanged.
 *
 * CR-OPTION-C-OC2A: the renderer is selected per submission (`./renderers`),
 * before any precedence lookup, and is used for both the private and the legacy
 * path. An unsupported family throws, so the step stays incomplete and nothing
 * is issued on either path.
 */

import { hasCreatorRecordPdf as legacyHasCreatorRecordPdf, loadFulfillmentSubmission, type FulfillmentSubmission } from '@/lib/payments/repository'
import { CREATOR_RECORD_ARTIFACT_ROLLOUT } from './config'
import { issueCreatorRecordArtifact, type IssueDeps } from './issue'
import { creatorRecordPdfComplete, issueCreatorRecordPdf, type PrecedencePorts } from './precedence'
import { selectCreatorRecordRenderer, UnsupportedProductFamilyError, type CreatorRecordRenderer } from './renderers'
import { artifactGateDecision, artifactStatus, artifactTable, newAttemptId, privateObjectStore } from './store'

export function issueDepsFor(sub: FulfillmentSubmission, renderer: CreatorRecordRenderer = selectCreatorRecordRenderer(sub)): IssueDeps {
  return {
    artifacts: artifactTable,
    objects: privateObjectStore,
    renderer: {
      family: renderer.family,
      generator_version: renderer.generator_version,
      ownsGeneratorVersion: (version) => renderer.ownsGeneratorVersion(version),
      render: (recordId) => renderer.render(sub, recordId, new Date()),
      ...(renderer.authorize ? { authorize: () => renderer.authorize!(sub, new Date()) } : {}),
      ...(renderer.rerenderOnlySameGenerator ? { rerenderOnlySameGenerator: true } : {}),
    },
    newAttemptId,
    now: () => new Date(),
    uat: CREATOR_RECORD_ARTIFACT_ROLLOUT === 'allowlist',
    onEvent: (e) => console.info('creator_record_artifact_event', e),
  }
}

export function precedencePortsFor(sub: FulfillmentSubmission | null, legacyGenerate: () => Promise<void>, renderer?: CreatorRecordRenderer): PrecedencePorts {
  return {
    artifactStatus,
    legacyHasPdf: legacyHasCreatorRecordPdf,
    gate: (submissionId) => artifactGateDecision(submissionId),
    issue: async (submissionId) => {
      const s = sub ?? (await loadFulfillmentSubmission(submissionId))
      if (!s) throw new Error('creator_record_submission_missing')
      return issueCreatorRecordArtifact(submissionId, issueDepsFor(s, renderer ?? selectCreatorRecordRenderer(s)))
    },
    legacyGenerate,
  }
}

const noLegacyGenerate = async () => {
  throw new Error('creator_record_legacy_generate_unavailable')
}

/** Fulfilment completion evidence, with explicit legacy / private precedence. */
export const creatorRecordComplete = (submissionId: string) => creatorRecordPdfComplete(submissionId, precedencePortsFor(null, noLegacyGenerate))

/** The legacy generator, only for a family that permits it. */
export function legacyGenerateFor(renderer: CreatorRecordRenderer, legacyGenerate: () => Promise<void>): () => Promise<void> {
  return async () => {
    if (!renderer.legacy_path_permitted) throw new UnsupportedProductFamilyError()
    return legacyGenerate()
  }
}

/** Fulfilment "generate" step, with explicit legacy / private precedence. Throws before any lookup when the family is unsupported. */
export async function issueCreatorRecord(sub: FulfillmentSubmission, legacyGenerate: () => Promise<void>): Promise<void> {
  const renderer = selectCreatorRecordRenderer(sub)
  return issueCreatorRecordPdf(sub.id, precedencePortsFor(sub, legacyGenerateFor(renderer, legacyGenerate), renderer))
}
