/**
 * Cross-Domain Bleed Preflight (Living Knowledge — generic provider-
 * registration safety tooling, 2026-08-27).
 *
 * Purpose (from the accepted diagnostic that recommended this milestone):
 * before a new asset-provider identifier is registered into
 * `ASSET_PROVIDER_IDS`/`KNOWN_ASSET_PROVIDERS`, deterministically answer
 * "what existing governed/runtime knowledge could become newly reachable or
 * collide with it?" -- the exact defect class `FGR_007` found AFTER Artlist
 * had already been evaluated (registering Artlist would have made
 * `CLAIM-STOCK-EDITORIAL-001-v1`/`-002-v1`'s `provider_scope: null` newly,
 * unintentionally reachable).
 *
 * This module is diagnostic tooling, not a runtime consumer. Nothing in
 * `app/api/*` or `app/*` pages imports it -- it never enters the deployed
 * bundle's live request path. It is invoked manually (see
 * `eval/run-cross-domain-bleed-preflight.ts`) or from a test, always BEFORE
 * a candidate provider is registered anywhere.
 *
 * Location: `lib/crc-engine/`, not `lib/retrieval-engine/` -- this module
 * genuinely needs both Interview Engine logic (`normalizeCandidate`,
 * `buildRetrievalHandoff`) and Retrieval Engine logic
 * (`providerScopeMatches`), and `lib/retrieval-engine/`'s own subsystem
 * boundary explicitly forbids importing Interview Engine LOGIC (only the
 * shared `@/types/interview-engine` contract module is permitted there --
 * `__tests__/crc-engine/subsystem-boundaries.test.ts`, confirmed the hard
 * way: the first draft of this file lived under `lib/retrieval-engine/`
 * and that exact test caught the violation). `lib/crc-engine/` is the
 * pre-existing, already-established location for code needing both --
 * `discovered-relevance.ts`'s own header states this precedent explicitly
 * ("the orchestration layer already established as the correct place for
 * code that needs both Interview Engine ... and Retrieval ... TYPES,
 * without either subsystem importing the other's logic"); this module
 * follows the identical pattern.
 *
 * Hard boundary (per the accepted diagnostic and this milestone's own task
 * spec): this tool REPORTS possible consequences. It never decides whether
 * a reported match is substantively correct, never mutates any registry or
 * fixture, never fabricates a real UserGoal inside any live CRC session
 * (the synthetic UserGoal/AssetProviderMention objects constructed below
 * exist only inside this offline diagnostic's own in-memory probe calls,
 * exactly mirroring the "synthetic-eligible clone, never mutating real
 * state" precedent already established by CPR_001/CPR_003 and the Artlist
 * A-3 synthetic runtime canary -- never injected into any real session,
 * never persisted, never returned to any CRC user).
 *
 * Reuses the REAL exported mechanisms directly -- `providerScopeMatches`
 * (this module) and `deriveDiscoveredTopicOccurrences` (discovered-
 * relevance.ts) -- rather than reimplementing their semantics. Per this
 * milestone's own explicit instruction ("if reuse is impossible... STOP and
 * report the architectural reason before duplicating logic"): the one
 * internal-only real function this preflight would ideally have called
 * directly, `hasGovernedClaimForTopic` (discovered-relevance.ts), is not
 * exported. Rather than exporting it (a production-code change this
 * bounded milestone did not need) or reimplementing its one-line logic
 * (exactly the kind of drift risk `VALID_PROVIDER_IDS` already proved is
 * real), this module exercises the SAME real code path indirectly and
 * completely, by calling the already-exported `deriveDiscoveredTopicOccurrences`
 * with a synthetic, offline `StructuredUnderstanding` for every real
 * `GoalCategory` -- `hasGovernedClaimForTopic` still runs, for real, inside
 * that call; this preflight never duplicates its logic.
 */

import * as fs from 'fs'
import * as path from 'path'
import { providerScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import { deriveDiscoveredTopicOccurrences } from './discovered-relevance'
import { normalizeCandidate, type CandidateObservation } from '@/lib/interview-engine/extraction'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { ASSET_PROVIDER_IDS, GOAL_CATEGORIES } from '@/types/interview-engine'
import type { AssetProviderMention, GoalCategory, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

// ── A/B: provider-scope exposure ────────────────────────────────────────────

export interface NullScopeExposure {
  claim_id: string
  topic: GoalCategory
  lifecycle: string
  crc_eligible: string
}

export interface ExplicitScopeEffect {
  claim_id: string
  provider_scope: string[]
  matches_candidate: boolean
}

/**
 * Mirrors `lookupTopicClaims()`'s own candidate-computation filter exactly
 * (`c.superseded_by === null`) BEFORE applying `providerScopeMatches` --
 * this is the identical early-stage filter real Retrieval applies, not a
 * preflight-invented approximation. Lifecycle/crc_eligible are read and
 * reported (so a human can judge how live the exposure already is) but are
 * deliberately NOT used to exclude a claim from this report -- a
 * Candidate-lifecycle or Pending-eligible claim that later gets published
 * would immediately inherit the same exposure, so it belongs in this
 * report too.
 */
export function findNullScopeExposure(topicClaims: readonly TopicClaim[]): NullScopeExposure[] {
  return topicClaims
    .filter((c) => c.superseded_by === null && c.provider_scope === null)
    .map((c) => ({ claim_id: c.claim_id, topic: c.topic, lifecycle: c.lifecycle, crc_eligible: c.crc_eligible }))
}

/**
 * Explicit (non-null) provider_scope claims, partitioned into matches vs.
 * non-matches for the candidate provider -- via the REAL, unmodified
 * `providerScopeMatches`, never a reimplementation. Explanatory/audit
 * output only; never mutates any claim's own `provider_scope`.
 */
export function findExplicitScopeEffects(topicClaims: readonly TopicClaim[], candidateProviderId: string): { matches: ExplicitScopeEffect[]; nonMatches: ExplicitScopeEffect[] } {
  const matches: ExplicitScopeEffect[] = []
  const nonMatches: ExplicitScopeEffect[] = []
  for (const c of topicClaims) {
    if (c.superseded_by !== null || c.provider_scope === null) continue
    const matched = providerScopeMatches(c, [candidateProviderId])
    const effect: ExplicitScopeEffect = { claim_id: c.claim_id, provider_scope: [...c.provider_scope], matches_candidate: matched }
    ;(matched ? matches : nonMatches).push(effect)
  }
  return { matches, nonMatches }
}

// ── C: discovered-relevance exposure ────────────────────────────────────────

export interface DiscoveredTopicExposure {
  topic: GoalCategory
  /** Which synthetic goal category the probe used to surface this -- diagnostic transparency only, never a real UserGoal. */
  probed_via_goal_category: GoalCategory
}

function emptyProjectFacts(): StructuredUnderstanding['project_facts'] {
  const unknown = { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' }
  return { intended_use: unknown, jurisdiction: unknown, workflow_role: unknown, human_contribution_description: unknown }
}

/** Minimal, offline, never-persisted synthetic UserGoal -- exists only for this in-memory probe call, per this module's own header. */
function syntheticGoal(category: GoalCategory): UserGoal {
  return {
    goal_id: 'preflight-probe',
    state: 'confirmed',
    raw_text: `[cross-domain-bleed-preflight synthetic probe: ${category}]`,
    category,
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: `[cross-domain-bleed-preflight synthetic probe: ${category}]`,
  }
}

/** Minimal, offline, never-persisted synthetic AssetProviderMention for the candidate provider only -- see this module's own header. */
function syntheticProviderMention(candidateProviderId: string): AssetProviderMention {
  return {
    mention_id: 'preflight-probe',
    resolution: { kind: 'canonical', identifier: candidateProviderId },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `[cross-domain-bleed-preflight synthetic probe: ${candidateProviderId}]`,
    superseded_by: null,
    usage: { state: 'unknown' },
    license: { state: 'unknown' },
  }
}

/**
 * For every real `GoalCategory`, constructs one minimal synthetic
 * StructuredUnderstanding (one confirmed goal of that category + one
 * canonical, confirmed candidate-provider mention) and calls the REAL,
 * unmodified `deriveDiscoveredTopicOccurrences`. Black-box by design: does
 * not need to know how many discovered-relevance triggers exist or what
 * their own `allowed_parent_goals` are -- probing every goal category
 * covers any future trigger automatically, without importing or
 * duplicating `DISCOVERED_RELEVANCE_TRIGGERS` (module-private, not
 * exported). `buildRetrievalHandoff` is exercised too, matching the real
 * call shape `run-crc-conversation.ts` itself uses, not a shortcut.
 */
export function findDiscoveredTopicExposure(topicClaims: readonly TopicClaim[], candidateProviderId: string): DiscoveredTopicExposure[] {
  const exposures: DiscoveredTopicExposure[] = []
  for (const category of GOAL_CATEGORIES) {
    const su: StructuredUnderstanding = {
      user_goals: [syntheticGoal(category)],
      gate_1_state: 'met',
      gate_2_state: 'not_yet_stable',
      current_phase: 2,
      opt_out_scope: null,
      project_facts: emptyProjectFacts(),
      tool_mentions: [],
      completion_reason: null,
      scoped_observations: [],
      asset_provider_mentions: [syntheticProviderMention(candidateProviderId)],
    }
    buildRetrievalHandoff(su) // exercised for parity with the real call shape; occurrences themselves come from the call below
    const occurrences = deriveDiscoveredTopicOccurrences(su, topicClaims as TopicClaim[])
    for (const o of occurrences) {
      exposures.push({ topic: o.topic, probed_via_goal_category: category })
    }
  }
  return exposures
}

// ── D: provider / alias collisions ──────────────────────────────────────────

export interface AliasCollision {
  candidate_alias: string
  collides_with_provider: string
}

export interface CollisionResult {
  candidate_id_collides_with_registry: boolean
  candidate_id_collides_with_existing_alias: string | null
  alias_collisions: AliasCollision[]
  alias_self_collisions: string[]
}

function candidateObservation(rawProviderName: string): CandidateObservation {
  return { proposal_id: 'preflight-probe', turn: 1, raw_text: rawProviderName, kind: 'asset_provider_mention', raw_provider_name: rawProviderName }
}

/**
 * Reuses the REAL `normalizeCandidate` (extraction.ts) for every check --
 * never reads or reimplements `KNOWN_ASSET_PROVIDERS` (module-private,
 * correctly not exported). A candidate string that resolves to an
 * EXISTING, different canonical id is a real collision; one that resolves
 * `unrecognized` is clean (expected, since the candidate isn't registered
 * yet). This module has no separate/parallel alias system.
 */
export function findCollisions(candidateProviderId: string, candidateAliases: readonly string[]): CollisionResult {
  const candidateIdCollidesWithRegistry = (ASSET_PROVIDER_IDS as readonly string[]).includes(candidateProviderId)

  const idNorm = normalizeCandidate(candidateObservation(candidateProviderId))
  const candidateIdCollidesWithExistingAlias = idNorm.status === 'resolved' ? idNorm.canonical_identifier : null

  const aliasCollisions: AliasCollision[] = []
  for (const alias of candidateAliases) {
    const result = normalizeCandidate(candidateObservation(alias))
    if (result.status === 'resolved') {
      aliasCollisions.push({ candidate_alias: alias, collides_with_provider: result.canonical_identifier })
    }
  }

  const seen = new Set<string>()
  const selfCollisions: string[] = []
  for (const alias of candidateAliases) {
    const key = alias.trim().toLowerCase()
    if (seen.has(key)) selfCollisions.push(alias)
    seen.add(key)
  }

  return {
    candidate_id_collides_with_registry: candidateIdCollidesWithRegistry,
    candidate_id_collides_with_existing_alias: candidateIdCollidesWithExistingAlias,
    alias_collisions: aliasCollisions,
    alias_self_collisions: selfCollisions,
  }
}

// ── E: hardcoded full-provider-list duplication (narrow, best-effort) ──────

export interface HardcodedListMatch {
  file: string
  line: number
}

export interface HardcodedListScanResult {
  scanned: boolean
  scan_error: string | null
  matches: HardcodedListMatch[]
}

/**
 * Narrow, deterministic, NOT a static-analysis framework: scans the
 * `08_Platform/app` TypeScript tree (excluding node_modules and this
 * module's own file) for the exact, full, comma-joined content of the
 * CURRENT `ASSET_PROVIDER_IDS` array appearing as a hardcoded literal
 * elsewhere -- the precise fingerprint of the real defect this milestone
 * was chartered from (`VALID_PROVIDER_IDS` had duplicated exactly this).
 * Known, disclosed limitation (per this milestone's own explicit
 * permission to scope this narrowly): only catches an EXACT full-list
 * duplicate, not a partial/subset hardcoded assumption, and not any
 * hardcoded assumption unrelated to the provider-ID list shape. If the
 * source tree cannot be read, this returns `scanned: false` with a
 * reason -- never a silent "no matches found."
 */
export function scanForHardcodedProviderListDuplication(appRoot: string, currentAssetProviderIds: readonly string[]): HardcodedListScanResult {
  const needle = currentAssetProviderIds.map((id) => `'${id}'`).join(', ')
  const matches: HardcodedListMatch[] = []
  const skipDirs = new Set(['node_modules', '.next', '.git'])
  const selfFile = path.resolve(__filename)

  function walk(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (err) {
      throw new Error(`cannot read directory ${dir}: ${(err as Error).message}`)
    }
    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue
      if (path.resolve(full) === selfFile) continue
      let text: string
      try {
        text = fs.readFileSync(full, 'utf-8')
      } catch (err) {
        throw new Error(`cannot read file ${full}: ${(err as Error).message}`)
      }
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(needle) && !lines[i].includes('ASSET_PROVIDER_IDS =')) {
          matches.push({ file: path.relative(appRoot, full), line: i + 1 })
        }
      }
    }
  }

  try {
    walk(appRoot)
    return { scanned: true, scan_error: null, matches }
  } catch (err) {
    return { scanned: false, scan_error: (err as Error).message, matches: [] }
  }
}

// ── Full report ──────────────────────────────────────────────────────────

export interface CrossDomainBleedPreflightReport {
  candidate_provider_id: string
  candidate_aliases: string[]
  /** Fail-closed flag (Section 6): false means at least one sub-check could not complete -- never silently treat as "no conflicts." */
  complete: boolean
  incomplete_reasons: string[]
  null_scope_exposure: NullScopeExposure[]
  explicit_matches: ExplicitScopeEffect[]
  explicit_non_matches: ExplicitScopeEffect[]
  discovered_topic_exposure: DiscoveredTopicExposure[]
  collisions: CollisionResult
  hardcoded_list_scan: HardcodedListScanResult
}

/**
 * Top-level entry point. `topicClaims` defaults to nothing -- callers must
 * pass the real `TOPIC_CLAIMS_FIXTURE` (or a test double) explicitly, per
 * this milestone's own "no duplicated source-of-truth" requirement; this
 * module never imports the fixture itself, so it can be run against
 * synthetic fixtures in tests without any risk of accidentally reading
 * real production state where a test intended not to.
 */
export function runCrossDomainBleedPreflight(candidateProviderId: string, candidateAliases: readonly string[], topicClaims: readonly TopicClaim[], appRoot: string): CrossDomainBleedPreflightReport {
  const incompleteReasons: string[] = []

  const nullScopeExposure = findNullScopeExposure(topicClaims)
  const { matches: explicitMatches, nonMatches: explicitNonMatches } = findExplicitScopeEffects(topicClaims, candidateProviderId)
  const discoveredTopicExposure = findDiscoveredTopicExposure(topicClaims, candidateProviderId)
  const collisions = findCollisions(candidateProviderId, candidateAliases)
  const hardcodedListScan = scanForHardcodedProviderListDuplication(appRoot, ASSET_PROVIDER_IDS)
  if (!hardcodedListScan.scanned) incompleteReasons.push(`hardcoded-list scan incomplete: ${hardcodedListScan.scan_error}`)

  return {
    candidate_provider_id: candidateProviderId,
    candidate_aliases: [...candidateAliases],
    complete: incompleteReasons.length === 0,
    incomplete_reasons: incompleteReasons,
    null_scope_exposure: nullScopeExposure,
    explicit_matches: explicitMatches,
    explicit_non_matches: explicitNonMatches,
    discovered_topic_exposure: discoveredTopicExposure,
    collisions,
    hardcoded_list_scan: hardcodedListScan,
  }
}

/**
 * Deterministic, human-readable rendering. Explicitly separates FACTS
 * FOUND from HUMAN GOVERNANCE QUESTIONS (Section 5) -- the tool never
 * answers the second section itself.
 */
export function renderPreflightReport(report: CrossDomainBleedPreflightReport): string {
  const lines: string[] = []
  lines.push(`Cross-Domain Bleed Preflight -- candidate provider: ${report.candidate_provider_id}`)
  lines.push(`Candidate aliases: ${report.candidate_aliases.join(', ') || '(none supplied)'}`)
  lines.push(report.complete ? 'Analysis: COMPLETE' : 'Analysis: INCOMPLETE / NEEDS REVIEW')
  for (const reason of report.incomplete_reasons) lines.push(`  - ${reason}`)
  lines.push('')

  lines.push('=== FACTS FOUND BY THE PREFLIGHT ===')
  lines.push('')
  lines.push(`Null-scope claims that would become provider-scope candidates (${report.null_scope_exposure.length}):`)
  for (const e of report.null_scope_exposure) {
    lines.push(`  FACT: ${e.claim_id} has provider_scope: null (topic: ${e.topic}, lifecycle: ${e.lifecycle}, crc_eligible: ${e.crc_eligible}) -- would match ${report.candidate_provider_id} under current providerScopeMatches semantics.`)
  }
  lines.push('')
  lines.push(`Existing explicit-scope claims that MATCH the candidate (${report.explicit_matches.length}):`)
  for (const e of report.explicit_matches) lines.push(`  FACT: ${e.claim_id} provider_scope=[${e.provider_scope.join(', ')}] matches ${report.candidate_provider_id}.`)
  lines.push(`Existing explicit-scope claims that do NOT match the candidate (${report.explicit_non_matches.length}):`)
  for (const e of report.explicit_non_matches) lines.push(`  FACT: ${e.claim_id} provider_scope=[${e.provider_scope.join(', ')}] does not match ${report.candidate_provider_id}.`)
  lines.push('')
  lines.push(`Discovered-relevance topic exposure (${report.discovered_topic_exposure.length}):`)
  for (const e of report.discovered_topic_exposure) lines.push(`  FACT: topic "${e.topic}" would become Track-A-discoverable for ${report.candidate_provider_id} (probed via synthetic ${e.probed_via_goal_category} goal).`)
  lines.push('')
  lines.push(`Provider ID / alias collisions:`)
  lines.push(`  FACT: candidate ID already in ASSET_PROVIDER_IDS: ${report.collisions.candidate_id_collides_with_registry}`)
  lines.push(`  FACT: candidate ID normalizes to an existing provider: ${report.collisions.candidate_id_collides_with_existing_alias ?? 'no'}`)
  for (const c of report.collisions.alias_collisions) lines.push(`  FACT: candidate alias "${c.candidate_alias}" normalizes to existing provider "${c.collides_with_provider}".`)
  for (const a of report.collisions.alias_self_collisions) lines.push(`  FACT: candidate alias "${a}" duplicates another candidate alias (case/whitespace-insensitive).`)
  lines.push('')
  lines.push(`Hardcoded full-provider-list duplication scan: ${report.hardcoded_list_scan.scanned ? 'completed' : 'INCOMPLETE'}`)
  for (const m of report.hardcoded_list_scan.matches) lines.push(`  FACT: ${m.file}:${m.line} contains the full current provider list as a literal -- will silently become stale once this candidate is registered.`)
  lines.push('')

  lines.push('=== HUMAN GOVERNANCE QUESTIONS (never answered by this tool) ===')
  if (report.null_scope_exposure.length > 0) lines.push('  Is the null-scope coverage above actually supported by governed evidence for this new provider, for each listed claim?')
  if (report.discovered_topic_exposure.length > 0) lines.push('  Is discovered-relevance exposure for the topics above intended once this provider is recognized?')
  if (report.collisions.candidate_id_collides_with_registry || report.collisions.candidate_id_collides_with_existing_alias || report.collisions.alias_collisions.length > 0) {
    lines.push('  Do the collisions above represent a genuine naming conflict requiring a different candidate ID/alias, or a legitimate intentional alias?')
  }
  if (report.hardcoded_list_scan.matches.length > 0) lines.push('  Should the hardcoded list(s) above be corrected to derive from ASSET_PROVIDER_IDS before registering this provider?')
  lines.push('  Does registering this provider require any FGR/CPR correction of the claims flagged above (mirroring FGR_007), before or alongside registration?')

  return lines.join('\n')
}
