/**
 * Results-email HTML + plain-text renderer (CRC Results Gate milestone,
 * 2026-08-14; paragraphing/readability updated CRC Email/UI Structural
 * Readability -- Phase 1, 2026-08-23). Uses ONLY existing, already-computed
 * ProjectionOutput fields plus fixed product copy already approved
 * elsewhere in this product (the "How this understanding was built"
 * paragraphs are copied verbatim from CommercialAssuranceBridge.tsx, not
 * rewritten) -- no new content is invented, no risk score, no verdict
 * language, no second analysis. This module never calls a model and never
 * touches Retrieval or Projection itself; it only renders a
 * ProjectionOutput the caller already computed via the same pure
 * runCRCConversation() GET uses.
 *
 * Deliberately excludes the Commercial Readiness Discovery educational
 * takeaway even when one occurred during the conversation -- it was
 * already delivered live, mid-chat, as its own transcript entry; it is not
 * part of ProjectionOutput's own contract, and pulling it in here would
 * mean reaching past Projection's clean content boundary for content some
 * users already read once and most sessions never trigger at all. Per PM
 * instruction, not reopened.
 *
 * Feedback is deliberately NOT included here in this milestone (PM
 * revision, 2026-08-14) -- the underlying feedback system is untouched,
 * just not wired into this new flow yet.
 *
 * CC-4C.2B (2026-09-19, Email Consumes Consultative Realization) --
 * `buildResultsEmailContent` now accepts an OPTIONAL fifth parameter,
 * `realization` (`ConsultativeRealization`, CC-4C.2A). When it is passed,
 * it becomes the STRUCTURAL SOURCE for the substantive consultative answer
 * -- `renderConsultativeAnswer` below reads `realization.goal_answers`
 * (never `output.goal_interpretations`) for per-goal content, and adds
 * three new answer-level sections driven only by
 * `realization.unresolved_groups`, `realization.missing_evidence_groups`,
 * and `realization.commercial_assurance`. `output.goal_interpretations`
 * and `consultativeNotes` are NOT read at all inside the `realization`
 * branch -- they remain the fallback path, exercised only when
 * `realization` is omitted (mirroring CC-3B's own "when plan is omitted,
 * output is byte-for-byte identical to before" precedent exactly, one
 * milestone later). See `renderConsultativeAnswer`'s own header for the
 * full per-section authority contract and duplication notes.
 *
 * `plan` is STILL accepted and used, independently of `realization`, for
 * exactly one purpose unchanged since CC-3B: `partitionKnowledgeItemsByPlan`
 * or the "Current guidance"/"Also relevant to your workflow" knowledge-item
 * dedup (Part 9 of CC-4C.2B: do not regress this, do not create a second
 * competing dedup implementation). `plan.discovered_context` is
 * DELIBERATELY not separately re-rendered from `realization.
 * discovered_context` -- the existing knowledge-item dedup + "Also
 * relevant to your workflow" heading already correctly keeps Track-C
 * discovered content subordinate to its authorizing goal (CC-3B/M3.1), so
 * CC-4C.2B reuses that existing, already-tested presentation rather than
 * building a second, redundant discovered-context rendering pass off
 * `realization.discovered_context` directly (Part 8: "if the current
 * presentation already preserves this distinction safely, reuse/adapt it
 * rather than redesigning it unnecessarily").
 *
 * "What this means for what you asked" section (CRC Milestone 2, User
 * Goal + Bounded Interpretation, 2026-08-15; structural source changed to
 * `ConsultativeRealization.goal_answers` by CC-4C.2B when `realization` is
 * present -- see above): renders one card per explicit goal, only when
 * non-empty. Each item quotes the user's own words verbatim ("You asked:
 * ...") -- this "You asked:" framing is composed HERE, at render time, not
 * baked into the source data (PM revision 6: preserve the user's wording,
 * never transform it into a stronger proposition).
 *
 * Phase 1 (2026-08-23): the fixed, bounded content per item renders from
 * `summary_blocks`/`content_blocks` (additive, `lib/bounded-interpretation`
 * / `lib/projection-layer` / `lib/crc-engine`) -- one `<p>` per
 * already-authorized block instead of one `<p>` around the whole
 * pre-joined string. This is presentation only: this module does not
 * decide where a boundary exists, only how to lay out boundaries
 * lib/bounded-interpretation already decided. Every block receives
 * IDENTICAL styling -- no block is emphasized, highlighted, or colored
 * differently from another; visual symmetry is a hard requirement, not a
 * default that happened to be convenient (PM instruction: dependency-free
 * and dependency-bearing content must carry equal visual weight).
 *
 * M2B (2026-09-05, Bounded Unresolved-Applicability Realization): a
 * realized note, when present, is appended as one more identically-styled
 * paragraph immediately after a goal's own content blocks. In the
 * `realization` branch this is `ConsultativeGoalAnswer.note` (already
 * matched by CC-4C.2A); in the fallback (`plan`-only or bare) branch this
 * remains the original `consultativeNotes?.find((n) => n.goal_index ===
 * goalIndex)` lookup against `output.goal_interpretations`, unchanged.
 */

import type { ProjectionKnowledgeItem, ProjectionOutput } from '@/lib/projection-layer/types'
import type { ConsultativeAnswerPlan } from './consultative-answer-plan'
import { partitionKnowledgeItemsByPlan, planHasExplicitGoalSections } from './consultative-realization'
import type { ConsultativeNote } from './unresolved-applicability-realization'
import type {
  ConsultativeGoalAnswer,
  ConsultativeMissingEvidenceGroup,
  ConsultativeRealization,
  ConsultativeUnresolvedPresentationGroup,
} from './consultative-realization-contract'
import type { MissingEvidenceClassification, PlanUnresolvedItem } from './consultative-answer-plan'
import type { ApplicabilityFact } from '@/lib/retrieval-engine/types'
import { getApplicabilityFactLabel } from './applicability-fact-display'
import { buildCalendlyUrl } from './calendly-attribution'

function formatLastVerified(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Same escaping discipline any HTML-email renderer needs -- ProjectionOutput text is user-influenced (derived from conversation content), never assume it's safe to inline raw. Exported (LK-DEMAND-2E, 2026-09-18) so other user-influenced-content email builders (e.g. lib/emails.ts's sendMaterialDemandAdminNotification) can reuse this exact discipline rather than duplicate it -- no behavior change to this file's own callers. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface ResultsEmailContent {
  html: string
  text: string
}

const HOW_BUILT_PARAGRAPH_1 =
  'This understanding came from what you shared in conversation — a fast, educational way to surface commercial-readiness considerations.'
const HOW_BUILT_PARAGRAPH_2 =
  "A Commercial Assurance Assessment works differently: an independent SI8 reviewer examines evidence like your files, licenses, and prompts, and produces an Assessment Report you can hand to a client, a platform, or legal."
const EDUCATIONAL_DISCLAIMER =
  'This is educational workflow guidance from a short conversation, not an SI8 Commercial Assurance Assessment. It does not provide legal advice or certify commercial use.'
const CTA_LABEL = 'Talk with SI8 about a Commercial Assurance Assessment'

/**
 * CC-4C.2B, Part 5. Fixed, neutral presentation label per existing
 * `MissingEvidenceClassification` value -- a lexical translation only,
 * never a meaning change. `requires_documentary_evidence`'s own label is
 * deliberately worded so it can never be read as something the user can
 * self-attest in this conversation (Part 5's own critical rule) -- it never
 * says "confirm," "just tell us," or any conversational-answer framing.
 * `applicability_unresolved`'s own label deliberately names only that
 * applicability is undetermined -- it never guesses what evidence would
 * resolve it.
 */
const MISSING_EVIDENCE_LABELS: Record<MissingEvidenceClassification, string> = {
  answerable_in_conversation: 'can be confirmed in a follow-up conversation',
  requires_documentary_evidence: 'requires supporting documentation for a human reviewer',
  applicability_unresolved: 'not yet determined whether this applies',
}

/**
 * CC-4C.2B, Part 4; extended CC-4C.2D (2026-09-19). Fixed, kind-level,
 * non-item-specific sentence, driven ONLY by the SAME `getApplicabilityFactLabel`
 * registry M2B already reads (fail-closed to a generic sentence when no
 * label is registered -- currently only `tool_account_status` has one; see
 * that module's own header). `boundedFactCategorySentence` is the ONE place
 * this file ever turns a governed `ApplicabilityFact` into user-facing
 * wording -- reused verbatim for BOTH `unresolved_applicability` (an
 * already-matched claim's own hedge) and `withheld_relevant_claim` (a
 * DIFFERENT, wholly withheld sibling claim, CC-4C.2D) rather than
 * duplicating the label-sentence string a second time. `item.tool` is
 * NEVER read here -- `getApplicabilityFactLabel` takes no tool parameter at
 * all, so no tool-specific wording ("your Kling account") is or can be
 * generated by this mechanism (CC-4C.2D Part 7).
 *
 * No display label exists anywhere in the repository for a bare claim_id or
 * dependency_id -- `open_project_dependency` (and `withheld_relevant_claim`
 * when its own `fact` is `null`, i.e. no label was available or the
 * underlying claim carried more than one distinct unresolved fact) share
 * one fixed, maximally generic fallback sentence rather than inventing
 * claim/dependency-specific wording this module has no authority to
 * generate (CC-4C.2C Part J: no governed dependency-display semantics
 * exist; do not add any here). See this module's own header + the
 * CC-4C.2B Final Report's duplication analysis for why even the labelled
 * sentence is EXPECTED to sometimes overlap with BI's own already-rendered
 * `mixedResolutionUnresolvedGuidanceSentence()` content in `content_blocks`
 * -- that overlap is reported, not hidden or suppressed by paraphrasing/
 * deleting BI content.
 */
/** Shared fixed sentence shape for ANY governed Level-1 category label (fact or dependency) -- one template, one place, so the two callers below can never drift apart. */
function categoryLabelSentence(label: string): string {
  return `Your ${label} hasn't been confirmed in this conversation.`
}

function boundedFactCategorySentence(fact: ApplicabilityFact | null): string | null {
  if (!fact) return null
  const label = getApplicabilityFactLabel(fact)
  return label ? categoryLabelSentence(label) : null
}

/**
 * CRC-CC-SCOPE-6F (2026-09-25). `displayLabel` is the ALREADY-RESOLVED
 * governed dependency label for this exact item (or `null`), read straight
 * off `ConsultativeUnresolvedItemPresentation.display_label` -- this
 * function never looks up `item.dependency_id` itself, never imports the
 * dependency registry, and has no branch on `item.kind` beyond what already
 * existed. Scoped narrowly: `displayLabel` is non-null today only for
 * `human_contribution_description`-shaped items (the one registered
 * dependency) -- this does not assume every future registered dependency
 * automatically reuses this same sentence template; that remains a
 * separate governance question for whenever a second dependency is
 * registered (SCOPE-6E §Y/§13).
 */
function unresolvedItemSentence(item: PlanUnresolvedItem, displayLabel: string | null): string {
  if (displayLabel) return categoryLabelSentence(displayLabel)
  if (item.kind === 'unresolved_applicability') {
    return boundedFactCategorySentence(item.fact) ?? "A related condition hasn't been confirmed in this conversation."
  }
  if (item.kind === 'withheld_relevant_claim') {
    return boundedFactCategorySentence(item.fact) ?? "An additional governed consideration for this topic hasn't been confirmed."
  }
  return "An additional governed consideration for this topic hasn't been confirmed."
}

export function buildResultsEmailContent(
  output: ProjectionOutput,
  attributionToken: string | null | undefined,
  email: string,
  plan?: ConsultativeAnswerPlan,
  consultativeNotes?: ConsultativeNote[],
  realization?: ConsultativeRealization,
): ResultsEmailContent {
  const isFullyEmpty =
    output.opening_line === '' && output.understood_summary === '' && output.knowledge_items.length === 0 && output.goal_interpretations.length === 0
  const ctaUrl = buildCalendlyUrl(attributionToken, email)

  const htmlParts: string[] = []
  const textParts: string[] = []

  htmlParts.push('<h1 style="font-size:20px;margin:0 0 20px;padding-bottom:14px;color:#111;border-bottom:2px solid #233f66;">Your Commercial Readiness Check</h1>')
  textParts.push('YOUR COMMERCIAL READINESS CHECK\n')

  // CC-3B: with a plan, drop any knowledge_item already rendered verbatim
  // inside a goal section, and label the rest as subordinate context.
  // Without a plan, this resolves to "render every item under the original
  // 'Current guidance' heading" -- byte-identical to before CC-3B.
  // CC-4C.2B: unchanged by this milestone -- still keyed on `plan`, not
  // `realization` (Part 9: do not regress, do not create a second dedup).
  const knowledgeItemsToRender: ProjectionKnowledgeItem[] = plan
    ? partitionKnowledgeItemsByPlan(output.knowledge_items, plan).supplementary
    : output.knowledge_items
  const hasExplicitGoals = realization ? realization.goal_answers.length > 0 : Boolean(plan && planHasExplicitGoalSections(plan))
  const knowledgeHeadingHtml = hasExplicitGoals ? 'Also relevant to your workflow' : 'Current guidance'
  const knowledgeHeadingText = hasExplicitGoals ? 'ALSO RELEVANT TO YOUR WORKFLOW' : 'CURRENT GUIDANCE'

  const renderKnowledgeItems = () => {
    if (knowledgeItemsToRender.length === 0) return
    htmlParts.push(`<p style="font-size:13px;font-weight:600;margin:0 0 10px;color:#111;">${knowledgeHeadingHtml}</p>`)
    textParts.push(`\n${knowledgeHeadingText}\n`)
    for (const item of knowledgeItemsToRender) {
      const lastUpdated = formatLastVerified(item.last_verified)
      htmlParts.push(
        `<div style="border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin:0 0 12px;">` +
          `<p style="font-size:14px;color:#222;white-space:pre-line;margin:0;">${escapeHtml(item.statement)}</p>` +
          (lastUpdated ? `<p style="font-size:12px;color:#888;margin:8px 0 0;">Content last updated ${escapeHtml(lastUpdated)}</p>` : '') +
          `</div>`,
      )
      textParts.push(`- ${item.statement}${lastUpdated ? ` (Content last updated ${lastUpdated})` : ''}\n`)
    }
  }

  // ── Legacy path (CRC Milestone 2 / CC-3B / M2B): renders
  // output.goal_interpretations directly. Exercised only when `realization`
  // is NOT supplied -- unchanged, byte-for-byte, since before CC-4C.2B. ──
  const renderGoalInterpretations = () => {
    if (output.goal_interpretations.length === 0) return
    htmlParts.push('<p style="font-size:14px;font-weight:600;margin:24px 0 10px;color:#111;border-top:1px solid #eee;padding-top:20px;">What this means for what you asked</p>')
    textParts.push('\nWHAT THIS MEANS FOR WHAT YOU ASKED\n')
    output.goal_interpretations.forEach((item, goalIndex) => {
      const note = consultativeNotes?.find((n) => n.goal_index === goalIndex)
      const blocks = note ? [...item.summary_blocks, note.text] : item.summary_blocks
      const blockParagraphsHtml = blocks
        .map((block, i) => {
          const isLast = i === blocks.length - 1
          return `<p style="font-size:14px;color:#222;white-space:pre-line;margin:0${isLast ? '' : ' 0 10px'};">${escapeHtml(block)}</p>`
        })
        .join('')
      htmlParts.push(
        `<div style="border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin:0 0 12px;">` +
          `<p style="font-size:13px;font-style:italic;color:#555;margin:0 0 10px;">You asked: &ldquo;${escapeHtml(item.goal_text)}&rdquo;</p>` +
          blockParagraphsHtml +
          `</div>`,
      )
      textParts.push(`You asked: "${item.goal_text}"\n\n${blocks.join('\n\n')}\n\n`)
    })
  }

  // ── CC-4C.2B answer, driven ONLY by `realization`. See this module's own
  // header for the full per-section authority contract. ──
  const renderGoalAnswers = (goalAnswers: ConsultativeGoalAnswer[]) => {
    if (goalAnswers.length === 0) return
    htmlParts.push('<p style="font-size:14px;font-weight:600;margin:24px 0 10px;color:#111;border-top:1px solid #eee;padding-top:20px;">What this means for what you asked</p>')
    textParts.push('\nWHAT THIS MEANS FOR WHAT YOU ASKED\n')
    goalAnswers.forEach((answer) => {
      // Verbatim content_blocks (BI-authorized, CC-3A passthrough) + the
      // already-realized note, if any -- never paraphrased, never
      // reordered, never labelled "resolved"/"cleared"/"approved"/"safe"/
      // "commercially ready" anywhere in this renderer. `disposition` and
      // `boundary_ref` are read ONLY as internal routing (they already
      // fully determined `content_blocks`' own wording upstream in
      // rules.ts) -- neither is independently re-worded or summarized
      // here.
      const blocks = answer.note ? [...answer.content_blocks, answer.note.text] : answer.content_blocks
      const blockParagraphsHtml = blocks
        .map((block, i) => {
          const isLast = i === blocks.length - 1
          return `<p style="font-size:14px;color:#222;white-space:pre-line;margin:0${isLast ? '' : ' 0 10px'};">${escapeHtml(block)}</p>`
        })
        .join('')
      htmlParts.push(
        `<div style="border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin:0 0 12px;">` +
          `<p style="font-size:13px;font-style:italic;color:#555;margin:0 0 10px;">You asked: &ldquo;${escapeHtml(answer.goal_text)}&rdquo;</p>` +
          blockParagraphsHtml +
          `</div>`,
      )
      textParts.push(`You asked: "${answer.goal_text}"\n\n${blocks.join('\n\n')}\n\n`)
    })
  }

  /**
   * CC-4C.2B, Part 4. "Still open" -- neutral, non-ranked, deterministic
   * order. Goal attribution uses the user's own `goal_text` (never an
   * internal GoalCategory/goal_index), and is shown ONLY when more than one
   * goal has open items -- for the common single-goal case, omitting a
   * redundant "You asked: ..." repeat is unambiguous (there is only one
   * candidate goal), never a provenance loss (the underlying `goal_index`
   * is still correct internally, simply not re-printed).
   *
   * CRC-CC-SCOPE-6D.1 (2026-09-25): now driven by
   * `realization.unresolved_presentation_groups` directly -- each entry is
   * an already-fully-resolved `ConsultativeUnresolvedPresentationGroup`
   * (goal_index, optional governed `heading`, and its own `items` array of
   * already-built `ConsultativeUnresolvedItemPresentation` children,
   * `display_label` and all). This REPLACES the SCOPE-6F-era
   * `presentation.find((p) => p.item === item)` object-reference
   * correlation entirely -- the accepted, explicitly-non-durable coupling
   * that milestone flagged -- because the new structure already carries
   * each child pre-attached to its group; no renderer-level re-matching is
   * needed at all. `groups` is goal-major, dimension-minor ordered
   * (Realization's own construction, per-goal outer loop, first-occurrence
   * inner order) -- `multiGoal`'s "For: ..." line is emitted once per
   * goal-index TRANSITION (tracked via `lastGoalIndex` below), reproducing
   * exactly the same "once per goal, at the top of that goal's items"
   * placement the old per-goal-group loop already had, now correct across
   * however many dimension-groups a single goal contributes. A non-null
   * `heading` renders as one more structural line, using the SAME governed
   * Level-1 label Realization already resolved -- no new prose, no
   * "Main issue"/"Material"/"Risk" framing, ever. A `null` heading renders
   * nothing extra -- children still render via the unchanged
   * `unresolvedItemSentence`, producing output visually identical to the
   * pre-grouping flat rendering for any unlabeled/ungrouped dimension.
   */
  const renderUnresolved = (groups: ConsultativeUnresolvedPresentationGroup[], goalAnswers: ConsultativeGoalAnswer[]) => {
    if (groups.length === 0) return
    const multiGoal = goalAnswers.length > 1
    htmlParts.push('<p style="font-size:14px;font-weight:600;margin:24px 0 10px;color:#111;border-top:1px solid #eee;padding-top:20px;">Still open</p>')
    textParts.push('\nSTILL OPEN\n')
    let lastGoalIndex: number | null = null
    for (const group of groups) {
      if (multiGoal && group.goal_index !== lastGoalIndex) {
        const goalText = goalAnswers[group.goal_index]?.goal_text ?? ''
        htmlParts.push(`<p style="font-size:13px;font-style:italic;color:#555;margin:12px 0 6px;">For: &ldquo;${escapeHtml(goalText)}&rdquo;</p>`)
        textParts.push(`For: "${goalText}"\n`)
        lastGoalIndex = group.goal_index
      }
      if (group.heading) {
        htmlParts.push(`<p style="font-size:13px;font-weight:600;margin:10px 0 4px;color:#333;">${escapeHtml(group.heading)}</p>`)
        textParts.push(`${group.heading}\n`)
      }
      for (const child of group.items) {
        const sentence = unresolvedItemSentence(child.item, child.display_label)
        htmlParts.push(`<p style="font-size:14px;color:#222;margin:0 0 8px;">${escapeHtml(sentence)}</p>`)
        textParts.push(`- ${sentence}\n`)
      }
    }
  }

  /**
   * CC-4C.2B, Part 5. "What's still needed" -- driven only by
   * `realization.missing_evidence_groups`. Renders a per-classification
   * COUNT within each goal's group, never re-narrating each item's
   * specific claim/dependency (no display-label source exists for those --
   * see `unresolvedItemSentence`'s own header) and never cross-referencing
   * back to a specific "Still open" line (no safe existing join exists
   * between `unresolved_groups` and `missing_evidence_groups` short of
   * re-deriving CC-3A's own construction logic here, which this renderer
   * must not do). The CC-4C.2B Final Report's duplication analysis reports
   * this expected overlap for human review rather than inventing a merge.
   * The three classifications are rendered as three structurally distinct
   * labels (`MISSING_EVIDENCE_LABELS`) -- never collapsed into each other,
   * and `requires_documentary_evidence` is never phrased as something to
   * "confirm" in conversation (Part 5's critical rule).
   */
  const renderMissingEvidence = (groups: ConsultativeMissingEvidenceGroup[], goalAnswers: ConsultativeGoalAnswer[]) => {
    if (groups.length === 0) return
    const multiGoal = goalAnswers.length > 1
    htmlParts.push('<p style="font-size:14px;font-weight:600;margin:24px 0 10px;color:#111;border-top:1px solid #eee;padding-top:20px;">What\'s still needed</p>')
    textParts.push("\nWHAT'S STILL NEEDED\n")
    for (const group of groups) {
      if (multiGoal) {
        const goalText = goalAnswers[group.goal_index]?.goal_text ?? ''
        htmlParts.push(`<p style="font-size:13px;font-style:italic;color:#555;margin:12px 0 6px;">For: &ldquo;${escapeHtml(goalText)}&rdquo;</p>`)
        textParts.push(`For: "${goalText}"\n`)
      }
      const counts = new Map<MissingEvidenceClassification, number>()
      for (const item of group.items) counts.set(item.classification, (counts.get(item.classification) ?? 0) + 1)
      // Deterministic, fixed presentation order (matches
      // MISSING_EVIDENCE_CLASSIFICATIONS' own declared order in
      // consultative-answer-plan.ts) -- never reordered by count or by any
      // notion of importance.
      const ORDER: MissingEvidenceClassification[] = ['answerable_in_conversation', 'requires_documentary_evidence', 'applicability_unresolved']
      for (const classification of ORDER) {
        const count = counts.get(classification)
        if (!count) continue
        const noun = count === 1 ? 'item' : 'items'
        const line = `${count} ${noun} ${MISSING_EVIDENCE_LABELS[classification]}.`
        htmlParts.push(`<p style="font-size:14px;color:#222;margin:0 0 8px;">${escapeHtml(line)}</p>`)
        textParts.push(`- ${line}\n`)
      }
    }
  }

  /**
   * CC-4C.2B, Part 7. One answer-level Commercial Assurance sentence,
   * rendered only when `commercial_assurance.applies` is true. `applies`
   * is consulted ONLY as a boolean gate -- never read as authority to
   * generate any prose beyond the verbatim, already-approved `closing_cta`
   * string (`assemble-projection-output.ts`'s own fixed copy). No ref
   * counts, claim ids, dependency ids, or "will resolve/clear/approve/
   * certify/confirm" wording is ever introduced here.
   */
  const renderCommercialAssurance = (ca: ConsultativeRealization['commercial_assurance']) => {
    if (!ca.applies || ca.closing_cta === '') return
    htmlParts.push('<p style="font-size:14px;color:#222;margin:20px 0 0;padding-top:16px;border-top:1px solid #eee;">' + escapeHtml(ca.closing_cta) + '</p>')
    textParts.push(`\n${ca.closing_cta}\n`)
  }

  if (isFullyEmpty) {
    const emptyLine =
      "The interview is complete. There wasn't enough information shared to generate a summary this time — nothing was lost, and you're welcome to start a new conversation whenever you'd like to share more."
    htmlParts.push(`<p style="font-size:14px;color:#555;margin:0 0 20px;">${escapeHtml(emptyLine)}</p>`)
    textParts.push(`${emptyLine}\n`)
  } else {
    if (output.opening_line !== '') {
      htmlParts.push(`<p style="font-size:16px;font-weight:600;margin:0 0 12px;color:#111;">${escapeHtml(output.opening_line)}</p>`)
      textParts.push(`${output.opening_line}\n`)
    }
    if (output.understood_summary !== '') {
      htmlParts.push('<p style="font-size:13px;font-weight:600;margin:0 0 6px;color:#111;">Your workflow</p>')
      textParts.push('YOUR WORKFLOW\n')
      htmlParts.push(`<p style="font-size:14px;color:#444;white-space:pre-line;margin:0 0 20px;">${escapeHtml(output.understood_summary)}</p>`)
      textParts.push(`${output.understood_summary}\n`)
    }
    if (realization) {
      // CC-4C.2B: ConsultativeRealization is the structural source. Order:
      // goal answers, then knowledge items (Part 9: unchanged position
      // relative to goal answers), then the three new answer-level
      // sections, then the existing footer block below.
      renderGoalAnswers(realization.goal_answers)
      renderKnowledgeItems()
      renderUnresolved(realization.unresolved_presentation_groups, realization.goal_answers)
      renderMissingEvidence(realization.missing_evidence_groups, realization.goal_answers)
      renderCommercialAssurance(realization.commercial_assurance)
    } else if (plan) {
      // Legacy CC-3B/M2B path, unchanged: explicit-goal answer first, then
      // any subordinate workflow context. No new answer-level sections.
      renderGoalInterpretations()
      renderKnowledgeItems()
    } else {
      // Pre-CC-3B order, preserved byte-for-byte when neither is supplied.
      renderKnowledgeItems()
      renderGoalInterpretations()
    }
  }

  htmlParts.push('<hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0 24px;" />')
  htmlParts.push('<p style="font-size:14px;font-weight:600;margin:0 0 8px;color:#111;">How this understanding was built</p>')
  htmlParts.push(`<p style="font-size:13px;color:#555;margin:0 0 10px;">${escapeHtml(HOW_BUILT_PARAGRAPH_1)}</p>`)
  htmlParts.push(`<p style="font-size:13px;color:#555;margin:0 0 20px;">${escapeHtml(HOW_BUILT_PARAGRAPH_2)}</p>`)
  textParts.push(`\nHOW THIS UNDERSTANDING WAS BUILT\n${HOW_BUILT_PARAGRAPH_1}\n${HOW_BUILT_PARAGRAPH_2}\n`)

  htmlParts.push(
    `<p style="margin:0 0 24px;"><a href="${ctaUrl}" style="display:inline-block;background:#233f66;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">${escapeHtml(CTA_LABEL)}</a></p>`,
  )
  textParts.push(`\n${CTA_LABEL}: ${ctaUrl}\n`)

  htmlParts.push(`<p style="font-size:12px;color:#999;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px;">${escapeHtml(EDUCATIONAL_DISCLAIMER)}</p>`)
  textParts.push(`\n${EDUCATIONAL_DISCLAIMER}\n`)

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">${htmlParts.join('\n')}</div>`
  const text = textParts.join('\n')

  return { html, text }
}
