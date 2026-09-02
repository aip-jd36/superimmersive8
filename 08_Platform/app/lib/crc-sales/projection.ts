/**
 * CRC -> Sales DEFAULT context projection (CAH-3B).
 *
 * Pure. Deterministic. Presentation-only. Consumes ONLY the persisted
 * `StructuredUnderstanding` (already deserialized) plus a few persisted
 * session/lead columns passed in by the repository. It NEVER:
 *   - calls an LLM;
 *   - recomputes Retrieval or Bounded Interpretation (that is
 *     answer-context.ts, a separate secondary path);
 *   - interprets meaning of any assertion;
 *   - infers materiality / risk / readiness / priority;
 *   - branches on a provider / tool / topic / domain VALUE;
 *   - converts an evidence-only fact into a question or self-attestation;
 *   - synthesises a resolution of conflicting append-only statements.
 *
 * "Current view" = the non-superseded subset (`superseded_by === null`), the
 * exact filter `buildRetrievalHandoff` and the rest of the CRC pipeline use.
 * Superseded entries are returned verbatim in `correction_history`, never
 * rewritten, never dropped.
 */

import type {
  StructuredUnderstanding,
  ToolMention,
  AssetProviderMention,
  AssessmentJurisdictionMention,
  ContentPresenceMention,
  ScopedObservation,
  UserGoal,
  Attested,
} from '@/types/interview-engine'
import type { SalesSessionProject, SalesGoal, SalesAssertion, SalesCorrectionHistoryItem } from './types'

function attestedToText(a: Attested<string>): string | null {
  switch (a.state) {
    case 'confirmed':
      return a.value
    case 'confirmed_absent':
      return '(stated: not present)'
    case 'declined':
      return '(declined to say)'
    case 'unresolved_no_visibility':
      return '(stated: not sure)'
    case 'unknown':
      return null
  }
}

function toolStated(m: ToolMention): string {
  if (m.source_statement && m.source_statement.trim().length > 0) return m.source_statement
  const id = m.resolution.kind === 'canonical' ? m.resolution.identifier : m.resolution.raw_name
  const bits: string[] = [id]
  const surface = attestedToText(m.access_surface)
  const tier = attestedToText(m.plan_tier)
  const account = attestedToText(m.account_status)
  if (surface) bits.push(`surface: ${surface}`)
  if (tier) bits.push(`plan: ${tier}`)
  if (account) bits.push(`account: ${account}`)
  return bits.join(' — ')
}

function providerStated(m: AssetProviderMention): string {
  if (m.source_statement && m.source_statement.trim().length > 0) return m.source_statement
  const id = m.resolution.kind === 'canonical' ? m.resolution.identifier : m.resolution.raw_name
  const bits: string[] = [id]
  const usage = attestedToText(m.usage)
  const license = attestedToText(m.license)
  if (usage) bits.push(`usage: ${usage}`)
  if (license) bits.push(`license: ${license}`)
  return bits.join(' — ')
}

function canonicalIdOf(resolution: ToolMention['resolution'] | AssetProviderMention['resolution']): string | null {
  return resolution.kind === 'canonical' ? resolution.identifier : null
}

/** Push either a current assertion or a correction-history item, depending on superseded_by. */
function classify(
  kind: string,
  stated: string,
  canonical_id: string | null,
  state: ToolMention['confidence'],
  source_turn: number,
  superseded_by: string | null,
  current: SalesAssertion[],
  history: SalesCorrectionHistoryItem[],
): void {
  if (superseded_by == null) {
    current.push({ kind, stated, canonical_id, state, source_turn })
  } else {
    history.push({ kind, stated, source_turn, superseded_by })
  }
}

export function buildSalesSessionProject(su: StructuredUnderstanding): SalesSessionProject {
  const assertions: SalesAssertion[] = []
  const correction_history: SalesCorrectionHistoryItem[] = []

  // Goals -- current vs superseded.
  const goals: SalesGoal[] = []
  for (const g of su.user_goals as UserGoal[]) {
    if (g.superseded_by == null) {
      goals.push({ raw_text: g.raw_text, category: g.category, scope: g.scope, state: g.state })
    } else {
      correction_history.push({ kind: 'goal', stated: g.raw_text, source_turn: g.source_turn, superseded_by: g.superseded_by })
    }
  }

  // Tools.
  for (const m of su.tool_mentions as ToolMention[]) {
    classify('tool', toolStated(m), canonicalIdOf(m.resolution), m.confidence, m.source_turn, m.superseded_by, assertions, correction_history)
  }

  // Asset providers.
  for (const m of su.asset_provider_mentions as AssetProviderMention[]) {
    classify('asset_provider', providerStated(m), canonicalIdOf(m.resolution), m.confidence, m.source_turn, m.superseded_by, assertions, correction_history)
  }

  // Assessment-jurisdiction mentions.
  for (const m of su.assessment_jurisdiction_mentions as AssessmentJurisdictionMention[]) {
    classify('assessment_jurisdiction', m.source_statement || m.value, null, m.confidence, m.source_turn, m.superseded_by, assertions, correction_history)
  }

  // Content-presence mentions -- append-only: `superseded_by` is always null
  // for anything the pipeline produces, so ALL are shown as current, each a
  // separately-stated fact. No resolution of apparent contradictions.
  for (const m of su.content_presence_mentions as ContentPresenceMention[]) {
    const parts: string[] = [m.category]
    if (m.real_or_synthetic) parts.push(m.real_or_synthetic)
    classify(
      'content_presence',
      m.source_statement || parts.join(': '),
      null,
      m.confidence,
      m.source_turn,
      m.superseded_by,
      assertions,
      correction_history,
    )
  }

  // Scoped observations (current only).
  for (const o of su.scoped_observations as ScopedObservation[]) {
    classify('workflow_observation', o.source_statement || o.note, null, o.confidence, o.source_turn, o.superseded_by, assertions, correction_history)
  }

  // Project facts -- single-value, no supersession model; show only confirmed/meaningful.
  const pf = su.project_facts
  const pfEntries: Array<[string, Attested<string>, number, string]> = [
    ['intended_use', pf.intended_use.attestation, pf.intended_use.source_turn, pf.intended_use.source_statement],
    ['workflow_role', pf.workflow_role.attestation, pf.workflow_role.source_turn, pf.workflow_role.source_statement],
    ['jurisdiction', pf.jurisdiction.attestation, pf.jurisdiction.source_turn, pf.jurisdiction.source_statement],
    ['human_contribution', pf.human_contribution_description.attestation, pf.human_contribution_description.source_turn, pf.human_contribution_description.source_statement],
  ]
  for (const [kind, att, turn, statement] of pfEntries) {
    const text = statement && statement.trim().length > 0 ? statement : attestedToText(att)
    if (text == null) continue
    assertions.push({
      kind,
      stated: text,
      canonical_id: null,
      state: att.state === 'confirmed' ? 'confirmed' : 'unknown',
      source_turn: turn,
    })
  }

  // Stable ordering: by source_turn, then kind -- deterministic, never a priority rank.
  assertions.sort((a, b) => a.source_turn - b.source_turn || a.kind.localeCompare(b.kind))
  correction_history.sort((a, b) => a.source_turn - b.source_turn || a.kind.localeCompare(b.kind))

  return { goals, assertions, correction_history }
}
