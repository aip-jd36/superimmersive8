/**
 * CR-ARTIFACT-1 — production composition of the private artifact path.
 * Used by payment fulfilment (lib/payments/fulfillment-deps.ts) and the admin
 * retry route; the fulfilment runner is unchanged.
 */

import { hasCreatorRecordPdf as legacyHasCreatorRecordPdf, loadFulfillmentSubmission, type FulfillmentSubmission } from '@/lib/payments/repository'
import { CREATOR_RECORD_ARTIFACT_ROLLOUT } from './config'
import { issueCreatorRecordArtifact, type IssueDeps } from './issue'
import { creatorRecordPdfComplete, issueCreatorRecordPdf, type PrecedencePorts } from './precedence'
import { renderCreatorRecordPdf } from './render'
import { artifactGateDecision, artifactStatus, artifactTable, newAttemptId, privateObjectStore } from './store'

export function issueDepsFor(sub: FulfillmentSubmission): IssueDeps {
  return {
    artifacts: artifactTable,
    objects: privateObjectStore,
    render: (recordId) => renderCreatorRecordPdf(sub, recordId, new Date()),
    newAttemptId,
    now: () => new Date(),
    uat: CREATOR_RECORD_ARTIFACT_ROLLOUT === 'allowlist',
    onEvent: (e) => console.info('creator_record_artifact_event', e),
  }
}

export function precedencePortsFor(sub: FulfillmentSubmission | null, legacyGenerate: () => Promise<void>): PrecedencePorts {
  return {
    artifactStatus,
    legacyHasPdf: legacyHasCreatorRecordPdf,
    gate: (submissionId) => artifactGateDecision(submissionId),
    issue: async (submissionId) => {
      const s = sub ?? (await loadFulfillmentSubmission(submissionId))
      if (!s) throw new Error('creator_record_submission_missing')
      return issueCreatorRecordArtifact(submissionId, issueDepsFor(s))
    },
    legacyGenerate,
  }
}

const noLegacyGenerate = async () => {
  throw new Error('creator_record_legacy_generate_unavailable')
}

/** Fulfilment completion evidence, with explicit legacy / private precedence. */
export const creatorRecordComplete = (submissionId: string) => creatorRecordPdfComplete(submissionId, precedencePortsFor(null, noLegacyGenerate))

/** Fulfilment "generate" step, with explicit legacy / private precedence. */
export const issueCreatorRecord = (sub: FulfillmentSubmission, legacyGenerate: () => Promise<void>) => issueCreatorRecordPdf(sub.id, precedencePortsFor(sub, legacyGenerate))
