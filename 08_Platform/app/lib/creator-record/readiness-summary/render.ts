/**
 * CR-SUM-2A — a SYNTHETIC-ONLY renderer proof for the Creator Record consultative summary. INERT.
 *
 * Nothing in the application imports this module, and it has no approved wording: like the summary, its wording is an
 * input (`ReadinessRenderTemplates`) that must carry an approval whose fingerprint matches it exactly. No approved render
 * templates exist; tests use a clearly identified synthetic approval that is never registered anywhere.
 *
 * Contract:
 *   input   ONE `ReadinessSummary` (the bounded output of `buildReadinessSummary`) + render templates + their approval.
 *           The renderer never sees the record, a claim, Living Knowledge, a document or a reading.
 *   output  an ordered list of blocks, each tagged with the section it belongs to and where its text came from:
 *             header          what this section is and is not
 *             declared        what the creator declared (the answers that selected guidance, verbatim)
 *             guidance        what governed guidance says (topic framing, conclusion label, explanation, caveats)
 *             unresolved      what remains open (conditions, dependencies, topic-level caps, unidentified conditions,
 *                             answers the creator was not sure about)
 *             not_established what Creator Record cannot establish (subjects without guidance, the rest of the answers)
 *             assurance       what human-reviewed Commercial Assurance would examine (fixed text)
 *
 * Grounding: every text is either a string the summary carries (record text or approved summary wording) or a render
 * template string. No string is assembled from parts, no slot is filled, and no status is turned into prose: a
 * conclusion appears only as the label the summary already holds, in the same number and place.
 *
 * Bounds: the renderer cannot strengthen a conclusion (it prints the summary's label verbatim and never omits a
 * consideration or its open items), cannot invent a fact (it has no source of facts but the summary), and cannot compare
 * a reading with a declaration (it renders no document data at all in this proof; the summary's document codes are
 * deliberately left out). Anything it cannot label exactly refuses (`ReadinessRenderRefusal`); nothing renders partially.
 */
import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { READINESS_SUMMARY_METHOD, type ReadinessSummary, type SummaryConsideration, type SummaryDeclaration } from './summary'

export const READINESS_RENDER_METHOD = { id: 'si8/creator-record-v2-readiness-render', version: 1 } as const

export interface ReadinessRenderTemplates {
  template_id: string
  version: number
  /** The summary method this wording was written for. A different summary method refuses. */
  summary_method: { id: string; version: number }
  heading: string
  orientation: string
  declared_heading: string
  guidance_heading: string
  conclusion_label: string
  caveats_label: string
  depends_on_label: string
  /** Applicability fact code → label. A fact without a label refuses. */
  fact_labels: Readonly<Record<string, string>>
  unresolved_heading: string
  unresolved_intro: string
  unresolved_empty: string
  dependency_status_label: string
  dependency_status_labels: Readonly<Record<string, string>>
  dependency_sufficiency_label: string
  dependency_sufficiency_labels: Readonly<Record<string, string>>
  topic_qualified_heading: string
  unspecified_heading: string
  not_sure_heading: string
  not_established_heading: string
  guidance_empty: string
  uncovered_intro: string
  rest_of_answers: string
  assurance_heading: string
  assurance_text: string
}

export interface ReadinessRenderApproval {
  template_id: string
  version: number
  fingerprint: string
  lifecycle: 'approved'
  authority: string
  decision_date: string
}

export const readinessRenderFingerprint = (t: ReadinessRenderTemplates): string => sha256Hex(canonicalJson(t))

export const READINESS_RENDER_REFUSALS = ['templates_not_approved', 'templates_fingerprint_mismatch', 'templates_incomplete', 'summary_method_mismatch', 'unlabelled_fact', 'unlabelled_dependency_code', 'malformed_summary'] as const
export type ReadinessRenderRefusalCode = (typeof READINESS_RENDER_REFUSALS)[number]

export class ReadinessRenderRefusal extends Error {
  constructor(readonly code: ReadinessRenderRefusalCode, readonly ref: string | null = null) {
    super(`creator_record_readiness_render_refused: ${code}${ref ? `: ${ref}` : ''}`)
  }
}

export type RenderSection = 'header' | 'declared' | 'guidance' | 'unresolved' | 'not_established' | 'assurance'
/** `summary`: a string the summary carries (record text or approved summary wording). `render`: a render template string. */
export type RenderSource = 'summary' | 'render'
export type RenderBlock =
  | { section: RenderSection; kind: 'heading' | 'subheading' | 'label' | 'paragraph' | 'bullet'; role: RenderRole; text: string; source: RenderSource }
  | { section: RenderSection; kind: 'row'; role: RenderRole; label: string; label_source: RenderSource; value: string; value_source: RenderSource }

/** What a block is, so tests can check structure, not wording. Exactly one role carries a conclusion. */
export type RenderRole = 'chrome' | 'subject' | 'declaration' | 'topic' | 'framing' | 'conclusion' | 'explanation' | 'caveat' | 'condition' | 'note' | 'open_item' | 'uncovered' | 'boundary'

export interface RenderedReadinessSummary {
  method: typeof READINESS_RENDER_METHOD
  summary: { method: ReadinessSummary['method']; snapshot_sha256: string; record_ref: string; record_version: number; templates_fingerprint: string }
  templates: { template_id: string; version: number; fingerprint: string }
  blocks: RenderBlock[]
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const TEXT_KEYS = ['heading', 'orientation', 'declared_heading', 'guidance_heading', 'conclusion_label', 'caveats_label', 'depends_on_label', 'unresolved_heading', 'unresolved_intro', 'unresolved_empty', 'dependency_status_label', 'dependency_sufficiency_label', 'topic_qualified_heading', 'unspecified_heading', 'not_sure_heading', 'not_established_heading', 'guidance_empty', 'uncovered_intro', 'rest_of_answers', 'assurance_heading', 'assurance_text'] as const

function checkTemplates(t: ReadinessRenderTemplates, a: ReadinessRenderApproval | null): string {
  if (!a || a.lifecycle !== 'approved' || !nonEmpty(a.authority) || !nonEmpty(a.decision_date) || a.template_id !== t.template_id || a.version !== t.version) throw new ReadinessRenderRefusal('templates_not_approved')
  const fp = readinessRenderFingerprint(t)
  if (fp !== a.fingerprint) throw new ReadinessRenderRefusal('templates_fingerprint_mismatch')
  for (const k of TEXT_KEYS) if (!nonEmpty(t[k])) throw new ReadinessRenderRefusal('templates_incomplete', k)
  return fp
}

/**
 * Render one bounded summary. Pure and deterministic: the same summary and templates always give the same blocks.
 */
export function renderReadinessSummary(summary: ReadinessSummary, templates: ReadinessRenderTemplates, approval: ReadinessRenderApproval | null): RenderedReadinessSummary {
  const fingerprint = checkTemplates(templates, approval)
  const T = templates
  if (summary.method.id !== T.summary_method.id || summary.method.version !== T.summary_method.version || summary.method.id !== READINESS_SUMMARY_METHOD.id || summary.method.version !== READINESS_SUMMARY_METHOD.version) {
    throw new ReadinessRenderRefusal('summary_method_mismatch')
  }
  const considerations = summary.groups.flatMap((g) => g.considerations)
  if (considerations.some((c, i) => c.index !== i + 1)) throw new ReadinessRenderRefusal('malformed_summary', 'consideration order')
  const byIndex = new Map(considerations.map((c) => [c.index, c]))
  const subjectOf = new Map<number, SummaryDeclaration | null>()
  for (const g of summary.groups) for (const c of g.considerations) subjectOf.set(c.index, g.subject)
  const topicOf = new Map(summary.topics.map((t) => [t.topic, t]))
  for (const c of considerations) if (!topicOf.has(c.topic)) throw new ReadinessRenderRefusal('malformed_summary', `topic ${c.topic}`)

  const blocks: RenderBlock[] = []
  const r = (section: RenderSection, kind: 'heading' | 'subheading' | 'label' | 'paragraph' | 'bullet', role: RenderRole, text: string): void => {
    blocks.push({ section, kind, role, text, source: 'render' })
  }
  const s = (section: RenderSection, kind: 'heading' | 'subheading' | 'label' | 'paragraph' | 'bullet', role: RenderRole, text: string): void => {
    blocks.push({ section, kind, role, text, source: 'summary' })
  }
  const row = (section: RenderSection, role: RenderRole, label: string, label_source: RenderSource, value: string, value_source: RenderSource): void => {
    blocks.push({ section, kind: 'row', role, label, label_source, value, value_source })
  }
  /** A consideration is named by what selected it (the creator's answer) and its topic label: both summary strings. */
  const name = (section: RenderSection, c: SummaryConsideration): void => {
    const subject = subjectOf.get(c.index) ?? null
    row(section, 'subject', topicOf.get(c.topic)!.label, 'summary', subject ? subject.answer : topicOf.get(c.topic)!.label, 'summary')
  }

  // Header: what this is and is not.
  r('header', 'heading', 'chrome', T.heading)
  r('header', 'paragraph', 'boundary', T.orientation)

  // What the creator declared: each answer that selected guidance, verbatim, in questionnaire order.
  const subjects = summary.groups.map((g) => g.subject).filter((x): x is SummaryDeclaration => x !== null)
  if (subjects.length > 0) {
    r('declared', 'subheading', 'chrome', T.declared_heading)
    for (const d of subjects) row('declared', 'declaration', d.question, 'summary', d.answer, 'summary')
  }

  // What governed guidance says.
  r('guidance', 'subheading', 'chrome', T.guidance_heading)
  if (considerations.length === 0) r('guidance', 'paragraph', 'boundary', T.guidance_empty)
  const framed = new Set<string>()
  for (const g of summary.groups) {
    if (g.subject) s('guidance', 'label', 'subject', g.subject.answer)
    for (const c of g.considerations) {
      const topic = topicOf.get(c.topic)!
      s('guidance', 'label', 'topic', topic.label)
      if (!framed.has(c.topic)) {
        framed.add(c.topic)
        s('guidance', 'paragraph', 'framing', topic.framing)
      }
      row('guidance', 'conclusion', T.conclusion_label, 'render', c.conclusion.label, 'summary')
      s('guidance', 'paragraph', 'explanation', c.explanation)
      if (c.topic_qualified !== null) s('guidance', 'paragraph', 'note', c.topic_qualified)
      if (c.unspecified_condition !== null) s('guidance', 'paragraph', 'note', c.unspecified_condition)
      s('guidance', 'label', 'chrome', c.selected_because.label)
      for (const d of c.selected_because.declarations) row('guidance', 'declaration', d.question, 'summary', d.answer, 'summary')
      if (c.caveats.length > 0) {
        r('guidance', 'label', 'chrome', T.caveats_label)
        for (const cv of c.caveats) s('guidance', 'bullet', 'caveat', cv)
      }
    }
  }

  // What remains unresolved: every open item the summary carries, under its own consideration where it has one.
  r('unresolved', 'subheading', 'chrome', T.unresolved_heading)
  const open = summary.open_items
  const anyOpen = open.dependencies.length + open.unresolved_applicability.length + open.topic_qualified.length + open.unspecified.length + open.not_sure.length > 0
  if (!anyOpen) r('unresolved', 'paragraph', 'boundary', T.unresolved_empty)
  else r('unresolved', 'paragraph', 'boundary', T.unresolved_intro)
  for (const c of considerations) {
    const facts = open.unresolved_applicability.filter((x) => x.consideration === c.index)
    const deps = open.dependencies.filter((x) => x.consideration === c.index)
    if (facts.length === 0 && deps.length === 0) continue
    name('unresolved', c)
    r('unresolved', 'label', 'chrome', T.depends_on_label)
    for (const f of facts) {
      const label = T.fact_labels[f.fact]
      if (!nonEmpty(label)) throw new ReadinessRenderRefusal('unlabelled_fact', f.fact)
      blocks.push({ section: 'unresolved', kind: 'bullet', role: 'condition', text: label, source: 'render' })
    }
    for (const d of deps) {
      const status = T.dependency_status_labels[d.status]
      const sufficiency = T.dependency_sufficiency_labels[d.sufficiency]
      if (!nonEmpty(status) || !nonEmpty(sufficiency)) throw new ReadinessRenderRefusal('unlabelled_dependency_code', `${d.status}/${d.sufficiency}`)
      s('unresolved', 'bullet', 'condition', d.label)
      row('unresolved', 'open_item', T.dependency_status_label, 'render', status, 'render')
      row('unresolved', 'open_item', T.dependency_sufficiency_label, 'render', sufficiency, 'render')
    }
  }
  if (open.topic_qualified.length > 0) {
    r('unresolved', 'label', 'chrome', T.topic_qualified_heading)
    for (const x of open.topic_qualified) {
      const c = byIndex.get(x.consideration)
      if (!c || c.topic_qualified === null) throw new ReadinessRenderRefusal('malformed_summary', `topic_qualified ${x.consideration}`)
      name('unresolved', c)
    }
  }
  if (open.unspecified.length > 0) {
    r('unresolved', 'label', 'chrome', T.unspecified_heading)
    for (const x of open.unspecified) {
      const c = byIndex.get(x.consideration)
      if (!c || c.unspecified_condition === null) throw new ReadinessRenderRefusal('malformed_summary', `unspecified ${x.consideration}`)
      name('unresolved', c)
    }
  }
  if (open.not_sure.length > 0) {
    r('unresolved', 'label', 'chrome', T.not_sure_heading)
    for (const q of open.not_sure) s('unresolved', 'bullet', 'open_item', q.question)
  }

  // What Creator Record cannot establish.
  r('not_established', 'subheading', 'chrome', T.not_established_heading)
  if (summary.uncovered_subjects.length > 0) {
    r('not_established', 'paragraph', 'boundary', T.uncovered_intro)
    for (const u of summary.uncovered_subjects) row('not_established', 'uncovered', u.question, 'summary', u.answer, 'summary')
  }
  r('not_established', 'paragraph', 'boundary', T.rest_of_answers)

  // What human-reviewed Commercial Assurance would examine (fixed text; no offer, price or link).
  r('assurance', 'subheading', 'chrome', T.assurance_heading)
  r('assurance', 'paragraph', 'boundary', T.assurance_text)

  return {
    method: READINESS_RENDER_METHOD,
    summary: { method: summary.method, snapshot_sha256: summary.identity.snapshot_sha256, record_ref: summary.identity.record_ref, record_version: summary.identity.record_version, templates_fingerprint: summary.templates.fingerprint },
    templates: { template_id: T.template_id, version: T.version, fingerprint },
    blocks,
  }
}

/** Plain text of a rendered summary, for review. Deterministic; adds only layout characters. */
export function readinessRenderText(r: RenderedReadinessSummary): string {
  const out: string[] = []
  for (const b of r.blocks) {
    if (b.kind === 'row') out.push(`  ${b.label}: ${b.value}`)
    else if (b.kind === 'heading') out.push(`# ${b.text}`, '')
    else if (b.kind === 'subheading') out.push('', `## ${b.text}`)
    else if (b.kind === 'label') out.push(`### ${b.text}`)
    else if (b.kind === 'bullet') out.push(`  - ${b.text}`)
    else out.push(b.text)
  }
  return out.join('\n') + '\n'
}
