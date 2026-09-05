/**
 * Shared "build the complete-session response body" helper (CRC Results
 * Gate milestone, 2026-08-14, PM-revised, mandatory per PM §4). Used by
 * BOTH GET and POST /api/crc/turn so the server-side gating logic exists
 * in exactly one place -- the two handlers cannot drift out of sync on
 * whether `projection` is ever exposed pre-email.
 *
 * Grandfathering (PM §22): sessions created before
 * CRC_CONFIG.resultsGateLaunchedAt behave exactly as this product did
 * before this milestone -- full `projection` unconditionally, no
 * teaser/results_email fields at all (there is no gate to describe for
 * them). This is the ONLY branch that ever returns `projection`.
 *
 * Non-grandfathered sessions NEVER receive `projection`, `understood_summary`,
 * or `knowledge_items` content in this response -- not before email, not
 * after a successful send. `runCRCConversation()` is still called (it's
 * pure, no model call, same function GET always used) because the teaser's
 * `consideration_count` needs `knowledge_items.length` -- only the COUNT
 * ever leaves this function for a non-grandfathered session, never the
 * items themselves.
 *
 * `email` is deliberately omitted from the non-grandfathered response
 * entirely (not even masked) -- the browser-side Commercial Assurance CTA
 * on the confirmation screen builds its Calendly link from
 * `attribution_token` alone, without an email param. The already-emailed
 * CTA (results-email-template.ts) has the raw address directly, server-side,
 * with no round-trip through the client at all. `results_email.masked_email`
 * is the only email-shaped thing this function ever returns to the browser.
 */

import { CRC_CONFIG } from './config'
import { maskEmail } from './results-gate-copy'
import type { CrcResultsEmailState, CrcTeaser } from './api-contract'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { ConsultativeNote } from './unresolved-applicability-realization'

/**
 * Takes an already-computed ProjectionOutput rather than computing it
 * internally -- every caller already either has one ready (runTurn()'s own
 * 'complete' outcome, the exact moment a session first finishes) or
 * computes one immediately before calling this (GET/POST's other
 * already-complete branches, via the same pure runCRCConversation() GET
 * has always used). Keeping the recompute call at the caller avoids this
 * function silently recomputing a result its caller already has, while
 * still guaranteeing every caller goes through the same gating logic
 * below once it has an output in hand.
 */
export interface CompleteResponseInput {
  sessionCreatedAt: string
  output: ProjectionOutput
  /**
   * M2B (2026-09-05). Required, not defaulted -- every real call site
   * already has `CRCPipelineResult.consultative_notes` in hand from the
   * same `runCRCConversation()` call that produced `output`, so there is no
   * safe default that wouldn't silently under-report. Non-grandfathered
   * sessions never receive this in the response regardless of what is
   * passed here (see the non-grandfathered branch below) -- passing it is
   * about keeping this function's own gating logic the single place that
   * decision is made, mirroring `output`'s own "caller already has it"
   * discipline (this file's own header).
   */
  consultativeNotes: ConsultativeNote[]
  attributionToken: string | null | undefined
  email: string | null
  resultsEmailStatus: string | null
  resultsEmailLastRecipient: string | null
}

export interface CompleteResponseFields {
  grandfathered: boolean
  teaser?: CrcTeaser
  results_email?: CrcResultsEmailState
  projection?: ProjectionOutput
  /**
   * M2B (2026-09-05). Additive, Consultative-Composition-owned bounded
   * realization -- present ONLY on the grandfathered branch, exactly
   * mirroring `projection`'s own gating (this file's own header: "This is
   * the ONLY branch that ever returns `projection`"; the non-grandfathered
   * branch must never leak Composition's realized content pre-email any
   * more than it may leak `projection` itself). A renderer treats an
   * absent/empty array as "no additional bounded detail" -- never as an
   * error.
   */
  consultative_notes?: ConsultativeNote[]
  attribution_token?: string
  email?: string | null
}

export function buildCompleteResponseFields(input: CompleteResponseInput): CompleteResponseFields {
  const grandfathered = input.sessionCreatedAt < CRC_CONFIG.resultsGateLaunchedAt

  if (grandfathered) {
    return {
      grandfathered: true,
      projection: input.output,
      consultative_notes: input.consultativeNotes,
      attribution_token: input.attributionToken ?? undefined,
      email: input.email,
    }
  }

  const resultsEmail: CrcResultsEmailState = input.resultsEmailStatus
    ? {
        status: input.resultsEmailStatus as CrcResultsEmailState['status'],
        masked_email: input.resultsEmailLastRecipient ? maskEmail(input.resultsEmailLastRecipient) : undefined,
      }
    : { status: 'not_sent' }

  return {
    grandfathered: false,
    teaser: { consideration_count: input.output.knowledge_items.length },
    results_email: resultsEmail,
    attribution_token: input.attributionToken ?? undefined,
  }
}
