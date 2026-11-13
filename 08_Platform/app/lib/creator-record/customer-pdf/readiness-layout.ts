/**
 * CR-PDF-IMPL-1 — the three-level reading layout of the consultative Creator Record PDF (design: CR-PDF-READABILITY-1/2).
 *
 * Pure presentation. It decides only WHERE existing blocks are shown and how they are grouped; it adds no wording of its own,
 * draws no inference, and never changes a block's text. Used by the document model only for a template set that carries the
 * readiness block (no approved set does), so every legacy document is composed exactly as before.
 *
 *   Understand — overview: the summary heading and orientation; what the creator told SI8; "considerations and what remains
 *                open" as a map with one row per consideration (verbatim labels only, never a conclusion); the not-sure
 *                answers; the shared caveats.
 *   Examine    — the guidance by provider (the summary's own subject groups); each consideration complete, with the open
 *                matters the summary attaches to it placed beneath it.
 *   Verify     — the supporting record (declarations, documents, limitations, provenance), laid out by `flowLayout`.
 *
 * Every readiness block is placed exactly once, or CONSOLIDATED: not shown again because a block with the same strings and the
 * same source is shown in the same place (the open entry's own reference/subject rows under its consideration; a provider's
 * selection provenance when every consideration under it was selected by the same declared observations). Navigation copies in
 * the map are verbatim copies of a reference, topic, provider, "depends on" label, condition or list label. The only template
 * text the layout places is the render set's own `overview_no_open` for a map row without open matters (never blank), and its
 * own `caveat_applies_to_label` with a mechanical list of consideration numbers (CR-PDF-REVIEW-2) after an open fact the record
 * holds for more than one consideration. That cross-reference joins items only by the record's own identity of the fact (fact
 * type and tool), never by matching labels; governed dependencies are never cross-referenced (each belongs to its own claim).
 * In the map, considerations are grouped under the summary's own subject groups (a verbatim copy of the subject).
 * Grouping uses only the structure the renderer emits (section, role, consideration). No provider, tool or claim is named here.
 */
import type { RenderRole, RenderSection } from '../readiness-summary/render'
import type { ReadinessSummary } from '../readiness-summary/summary'

/** The document-model block shape this module places (kept structural to avoid an import cycle). */
export type LayoutBlock =
  | { kind: 'heading' | 'subheading' | 'label' | 'paragraph' | 'bullet'; text: string; from: 'record' | 'issuance' | 'template' }
  | { kind: 'row'; label: string; label_from: 'record' | 'issuance' | 'template'; value: string; value_from: 'record' | 'issuance' | 'template' }

/**
 * A readiness block with the structure the renderer gave it. CR-PDF-DECISION-1: only renderer blocks; nothing derived from a
 * document (no integrated assessment, reading, excerpt or relevance statement) can be placed in this section.
 */
export interface PlacedSource {
  block: LayoutBlock
  section: RenderSection
  role: RenderRole
  consideration?: number
  applies_to?: number[]
}

export type LayoutHint =
  | 'title' | 'h1' | 'lead' | 'h2' | 'h2_kept' | 'band' | 'reference' | 'topic' | 'provider' | 'eyebrow' | 'compact' | 'conclusion' | 'framing'
  | 'explanation' | 'fine' | 'note' | 'bullet' | 'row' | 'condition' | 'dep_title' | 'map_ref_label' | 'map_ref_value' | 'map_topic'
  | 'map_provider' | 'map_label' | 'map_item' | 'map_xref' | 'map_group' | 'map_none' | 'body' | 'qa_question' | 'qa_answer' | 'reading' | 'reading_sub' | 'digest'
export type LayoutBox =
  | 'identity' | 'overview' | 'panel' | 'map' | 'map_group' | 'map_row' | 'map_ref' | 'map_topic' | 'map_open' | 'guidance' | 'group' | 'consideration'
  | 'consideration_head' | 'open' | 'dependency' | 'scope' | 'keep' | 'qa' | 'qa_answers' | 'reading' | 'document' | 'section'
export type LayoutNode = { kind: 'block'; index: number; hint: LayoutHint } | { kind: 'box'; box: LayoutBox; children: LayoutNode[]; consideration?: number }

/** A readiness block not printed again, with the printed blocks that carry its exact strings. */
export interface Consolidation {
  /** Position of the consolidated block in the renderer's sequence, and its exact strings (for audit). */
  source: number
  texts: string[]
  /** Printed blocks (indices in this section) that carry the same strings in the same place. */
  same_as: number[]
  reason: 'open_entry_name_row' | 'shared_selection'
}
export interface SectionLayout { blocks: LayoutBlock[]; layout: LayoutNode[]; consolidated?: Consolidation[] }

export class ReadinessLayoutRefusal extends Error {
  constructor(readonly ref: string) {
    super(`creator_record_readiness_layout_refused: ${ref}`)
  }
}

const textsOf = (b: LayoutBlock): string[] => (b.kind === 'row' ? [b.label, b.value] : [b.text])
const DIGEST = /^[0-9a-f]{64}$/

/** Builds blocks and a tree together: every printed block is appended once, in reading order. */
class Builder {
  readonly blocks: LayoutBlock[] = []
  add(block: LayoutBlock, hint: LayoutHint): LayoutNode {
    this.blocks.push(block)
    return { kind: 'block', index: this.blocks.length - 1, hint }
  }
}
const box = (b: LayoutBox, children: LayoutNode[], consideration?: number): LayoutNode => ({ kind: 'box', box: b, children, ...(consideration !== undefined ? { consideration } : {}) })

/**
 * The readiness summary section. `sources` are the renderer's blocks in order, with the integrated-assessment blocks inserted
 * after their consideration (as the document model composes them). `overviewNoOpen` is the render set's own wording.
 */
export interface ReadinessLayoutWording {
  /** The render set's `overview_no_open`. */
  overviewNoOpen: string
  /** The render set's `caveat_applies_to_label`, before a mechanical list of consideration numbers. */
  appliesTo: string
}

export function readinessLayout(sources: readonly PlacedSource[], summary: ReadinessSummary, wording: ReadinessLayoutWording): SectionLayout {
  const { overviewNoOpen, appliesTo } = wording
  const a = sources
  const out = new Builder()
  const printedAt = new Map<number, number>()
  const consolidated: Omit<Consolidation, 'texts'>[] = []
  const show = (i: number, hint: LayoutHint): LayoutNode => {
    if (printedAt.has(i)) throw new ReadinessLayoutRefusal(`block ${i} placed twice`)
    const n = out.add(a[i].block, hint)
    printedAt.set(i, (n as { index: number }).index)
    return n
  }
  /** A verbatim navigation copy of one string of block i (the copy keeps the source's own origin). */
  const copy = (i: number, part: 'text' | 'label' | 'value', hint: LayoutHint): LayoutNode => {
    const b = a[i].block
    const text = b.kind === 'row' ? (part === 'label' ? b.label : b.value) : b.text
    const from = b.kind === 'row' ? (part === 'label' ? b.label_from : b.value_from) : b.from
    // A copy is a label only where it labels what follows ("Depends on", a list label); otherwise it is plain text.
    return out.add({ kind: hint === 'map_label' || hint === 'eyebrow' ? 'label' : 'paragraph', text, from }, hint)
  }
  const idx = (pred: (x: PlacedSource, i: number) => boolean) => a.map((x, i) => (pred(x, i) ? i : -1)).filter((i) => i >= 0)
  const isCaveatLabel = (i: number) => a[i].role === 'chrome' && a[i].block.kind === 'label' && a[i + 1]?.role === 'caveat'

  // ── Structure, from the renderer's own annotations ──
  const header = idx((x) => x.section === 'header')
  const declared = idx((x) => x.section === 'declared')
  const scope = idx((x) => x.section === 'not_established' || x.section === 'assurance')
  const gChrome = idx((x, i) => x.section === 'guidance' && x.consideration === undefined && x.role !== 'subject' && x.role !== 'caveat' && !(x.role === 'reference' && x.applies_to) && !isCaveatLabel(i))
  const caveatPanel = idx((x, i) => x.section === 'guidance' && (isCaveatLabel(i) || x.role === 'caveat' || (x.role === 'reference' && x.applies_to !== undefined)))
  const cBlocks = (c: number) => idx((x) => x.section === 'guidance' && x.consideration === c && x.role !== 'caveat' && !(x.role === 'reference' && x.applies_to))
  const groups: { subject: number | null; cs: number[] }[] = []
  a.forEach((x, i) => {
    if (x.section !== 'guidance') return
    if (x.role === 'subject') groups.push({ subject: i, cs: [] })
    else if (x.role === 'reference' && x.consideration !== undefined && !x.applies_to) {
      if (groups.length === 0) groups.push({ subject: null, cs: [] })
      groups[groups.length - 1].cs.push(x.consideration)
    }
  })
  const uHead: number[] = []
  const entries = new Map<number, number[]>()
  const lists: { label: number; members: { c: number; rows: number[] }[]; loose: number[] }[] = []
  let current: (typeof lists)[number] | null = null
  for (const i of idx((x) => x.section === 'unresolved')) {
    const x = a[i]
    if (x.consideration === undefined && x.role === 'chrome' && x.block.kind === 'label') { current = { label: i, members: [], loose: [] }; lists.push(current); continue }
    if (x.consideration === undefined) { if (current) current.loose.push(i); else uHead.push(i); continue }
    if (current) {
      let m = current.members.find((y) => y.c === x.consideration)
      if (!m) { m = { c: x.consideration, rows: [] }; current.members.push(m) }
      m.rows.push(i)
    } else entries.set(x.consideration, [...(entries.get(x.consideration) ?? []), i])
  }
  for (const L of lists) if (L.members.length > 0 && L.loose.length > 0) throw new ReadinessLayoutRefusal('a list with both members and loose items')
  const considerations = summary.groups.flatMap((g) => g.considerations)
  const selectionOf = (c: number) => {
    const bs = cBlocks(c)
    const start = bs.findIndex((i) => a[i].role === 'chrome')
    if (start < 0) throw new ReadinessLayoutRefusal(`consideration ${c} has no selection provenance`)
    const sel = [bs[start]]
    for (let k = start + 1; k < bs.length && a[bs[k]].role === 'declaration'; k++) sel.push(bs[k])
    return sel
  }
  const sameStrings = (x: number[], y: number[]) => x.length === y.length && x.every((i, k) => JSON.stringify(textsOf(a[i].block)) === JSON.stringify(textsOf(a[y[k]].block)))
  const selectingObservations = (c: number) => JSON.stringify(considerations.find((x) => x.index === c)!.selected_because.declarations.map((d) => d.observation_id))

  // ── A. Understand: overview ──
  const overview: LayoutNode[] = []
  overview.push(box('keep', header.map((i) => show(i, a[i].block.kind === 'heading' ? 'h1' : 'lead'))))
  if (declared.length > 0) overview.push(box('panel', declared.map((i) => show(i, a[i].block.kind === 'row' ? 'row' : 'h2'))))
  overview.push(box('keep', uHead.map((i) => show(i, a[i].block.kind === 'subheading' ? 'h2' : 'fine'))))
  // CR-PDF-REVIEW-2: an open fact is identified by the record's own fact type and tool; the considerations it is open for.
  const factKey = (x: { fact: string; tool: string | null }) => `${x.fact}\u0000${x.tool ?? ''}`
  const factConsiderations = new Map<string, number[]>()
  for (const x of summary.open_items.unresolved_applicability) {
    const list = factConsiderations.get(factKey(x)) ?? []
    if (!list.includes(x.consideration)) list.push(x.consideration)
    factConsiderations.set(factKey(x), list)
  }
  const mapNodes: LayoutNode[] = []
  let mapRowCount = 0
  for (const g of groups) {
    // The group heading is placed first, so the printed order is the reading order.
    const groupHead = g.subject !== null && g.cs.length > 0 ? copy(g.subject, 'text', 'map_group') : null
    const mapRows: LayoutNode[] = []
    for (const c of g.cs) {
      const bs = cBlocks(c)
      const ref = bs.find((i) => a[i].role === 'reference')!
      const topic = bs.find((i) => a[i].role === 'topic')!
      // Reading order: reference, topic, then the open matters. The subject heads the row's group (below), once.
      const refBox = box('map_ref', [copy(ref, 'label', 'map_ref_label'), copy(ref, 'value', 'map_ref_value')])
      const topicBox = box('map_topic', [copy(topic, 'text', 'map_topic')])
      const open: LayoutNode[] = []
      const entry = entries.get(c)
      if (entry) {
        const dependsOn = entry.find((i) => a[i].role === 'chrome')
        if (dependsOn !== undefined) open.push(copy(dependsOn, 'text', 'map_label'))
        // The renderer lists a consideration's open facts first, then its governed dependencies, one condition each.
        const conditions = entry.filter((i) => a[i].role === 'condition')
        const facts = summary.open_items.unresolved_applicability.filter((x) => x.consideration === c)
        const deps = summary.open_items.dependencies.filter((x) => x.consideration === c)
        if (conditions.length !== facts.length + deps.length) throw new ReadinessLayoutRefusal(`consideration ${c} conditions do not match its open items`)
        conditions.forEach((i, k) => {
          open.push(copy(i, 'text', 'map_item'))
          const shared = k < facts.length ? factConsiderations.get(factKey(facts[k]))! : []
          if (shared.length > 1) open.push(out.add({ kind: 'row', label: appliesTo, label_from: 'template', value: [...shared].sort((x, y) => x - y).join(', '), value_from: 'template' }, 'map_xref'))
        })
      }
      for (const L of lists) if (L.members.some((m) => m.c === c)) open.push(copy(L.label, 'text', 'map_item'))
      if (open.length === 0) open.push(out.add({ kind: 'paragraph', text: overviewNoOpen, from: 'template' }, 'map_none'))
      mapRows.push(box('map_row', [refBox, topicBox, box('map_open', open)], c))
    }
    mapRowCount += mapRows.length
    if (groupHead !== null) mapNodes.push(box('map_group', [groupHead, ...mapRows]))
    else mapNodes.push(...mapRows)
  }
  if (mapRowCount > 0) overview.push(box('map', mapNodes))
  for (const L of lists.filter((x) => x.loose.length > 0)) overview.push(box('keep', [show(L.label, 'eyebrow'), ...L.loose.map((i) => show(i, 'bullet'))]))
  if (caveatPanel.length > 0) overview.push(box('panel', caveatPanel.map((i) => show(i, a[i].role === 'caveat' ? 'bullet' : a[i].block.kind === 'row' ? 'compact' : 'eyebrow'))))

  // ── B. Examine: guidance by provider, open matters beside each consideration ──
  const guidance: LayoutNode[] = [box('keep', gChrome.map((i) => show(i, a[i].block.kind === 'subheading' ? 'h2' : a[i].block.kind === 'bullet' ? 'bullet' : 'fine')))]
  const openFor = (c: number, ref: number, topic: number, subject: number | null): LayoutNode[] => {
    const nodes: LayoutNode[] = []
    const nameRows = (rows: number[]) => {
      const [r, sj] = rows
      if (a[r]?.role !== 'reference' || a[sj]?.role !== 'subject') throw new ReadinessLayoutRefusal(`open entry ${c} must open with its name rows`)
      consolidated.push({ source: r, same_as: [ref], reason: 'open_entry_name_row' })
      consolidated.push({ source: sj, same_as: subject !== null ? [topic, subject] : [topic], reason: 'open_entry_name_row' })
    }
    const entry = entries.get(c)
    if (entry) {
      nameRows(entry)
      const rest = entry.slice(2)
      const items: LayoutNode[] = []
      for (let k = 0; k < rest.length; k++) {
        const i = rest[k]
        if (a[i].role === 'condition' && a[rest[k + 1]]?.role === 'chrome') {
          const dep: LayoutNode[] = [show(i, 'dep_title')]
          while (rest[k + 1] !== undefined && a[rest[k + 1]].role !== 'condition') { const j = rest[++k]; dep.push(show(j, a[j].block.kind === 'label' ? 'eyebrow' : a[j].block.kind === 'bullet' ? 'bullet' : 'compact')) }
          items.push(box('dependency', dep))
        } else items.push(show(i, a[i].block.kind === 'label' ? 'eyebrow' : a[i].block.kind === 'bullet' ? 'condition' : 'compact'))
      }
      nodes.push(box('open', items, c))
    }
    for (const L of lists) {
      const m = L.members.find((y) => y.c === c)
      if (!m) continue
      if (m.rows.length !== 2) throw new ReadinessLayoutRefusal(`list entry ${c} must be its two name rows`)
      nameRows(m.rows)
      // D5: the label is already shown above the note it belongs to; no standalone open box.
      if (pairedList.get(c) === L) continue
      // The list label is shown under its first member; under any later member it is a navigation copy.
      nodes.push(box('open', [L.members[0].c === c ? show(L.label, 'eyebrow') : copy(L.label, 'text', 'eyebrow')], c))
    }
    return nodes
  }
  // CR-PDF-DECISION-1 (D5): a consideration that belongs to exactly one list (the summary's topic-qualified or unspecified list)
  // and carries exactly one note has that list's note: the renderer prints the note exactly when the consideration is a member.
  // Its list label then heads the note (explaining it) instead of standing alone in an open box. Any other case is unchanged.
  const pairedList = new Map<number, (typeof lists)[number]>()
  for (const c of considerations.map((x) => x.index)) {
    const member = lists.filter((L) => L.members.some((m) => m.c === c))
    const notes = cBlocks(c).filter((i) => a[i].role === 'note')
    if (member.length === 1 && notes.length === 1) pairedList.set(c, member[0])
  }
  for (const g of groups) {
    const selections = g.cs.map(selectionOf)
    const shared = g.subject !== null && g.cs.length > 1 && selections.every((s) => sameStrings(s, selections[0])) && g.cs.every((c) => selectingObservations(c) === selectingObservations(g.cs[0]))
    const groupNodes: LayoutNode[] = []
    if (g.subject !== null) groupNodes.push(show(g.subject, 'band'))
    if (shared) {
      groupNodes.push(box('keep', selections[0].map((i) => show(i, a[i].block.kind === 'label' ? 'eyebrow' : 'compact'))))
      for (const sel of selections.slice(1)) sel.forEach((i, k) => consolidated.push({ source: i, same_as: [selections[0][k]], reason: 'shared_selection' }))
    }
    g.cs.forEach((c, n) => {
      const bs = cBlocks(c)
      const ref = bs.find((i) => a[i].role === 'reference')!
      const topic = bs.find((i) => a[i].role === 'topic')!
      const skip = new Set(shared ? selections[n] : [])
      const head = box('consideration_head', [show(ref, 'reference'), show(topic, 'topic')])
      const body: LayoutNode[] = []
      for (let k = 0; k < bs.length; k++) {
        const i = bs[k]
        if (i === ref || i === topic || skip.has(i)) continue
        const x = a[i]
        // CR-PDF-DECISION-1 (D5): a list label that would stand alone heads the note that explains it instead (see `pairedList`).
        const paired = pairedList.get(c)
        if (x.role === 'note' && paired) {
          body.push(box('keep', [paired.members[0].c === c ? show(paired.label, 'eyebrow') : copy(paired.label, 'text', 'eyebrow'), show(i, 'note')]))
          continue
        }
        const hint: LayoutHint = x.role === 'conclusion' ? 'conclusion' : x.role === 'framing' ? 'framing' : x.role === 'explanation' ? 'explanation' : x.role === 'boundary' ? 'fine' : x.role === 'note' ? 'note' : x.role === 'declaration' ? 'compact' : x.block.kind === 'label' ? 'eyebrow' : 'row'
        body.push(show(i, hint))
      }
      groupNodes.push(box('consideration', [head, ...body, ...openFor(c, ref, topic, g.subject)], c))
    })
    guidance.push(box('group', groupNodes))
  }

  // ── Scope statements close the section ──
  // CR-PDF-REVIEW-2: each scope heading travels with the short paragraph(s) under it as one unit (as headings do in the supporting
  // record), so a heading never needs a fixed look-ahead and a pair that fits is never pushed to the next page.
  const scopeNodes: LayoutNode[] = []
  for (let k = 0; k < scope.length; k++) {
    const i = scope[k]
    if (a[i].block.kind !== 'subheading') { scopeNodes.push(show(i, 'fine')); continue }
    const run = [show(i, 'h2_kept')]
    let chars = 0
    while (k + 1 < scope.length && a[scope[k + 1]].block.kind !== 'subheading' && run.length < 3 && chars < 400) {
      const j = scope[++k]
      chars += textsOf(a[j].block).join('').length
      run.push(a[j].block.kind === 'row' ? show(j, 'row') : show(j, 'fine'))
    }
    scopeNodes.push(box('keep', run))
  }

  // Every source block is printed exactly once or consolidated.
  const consolidatedSet = new Set(consolidated.map((x) => x.source))
  for (let i = 0; i < a.length; i++) if (printedAt.has(i) === consolidatedSet.has(i)) throw new ReadinessLayoutRefusal(`block ${i} ${printedAt.has(i) ? 'both printed and consolidated' : 'not placed'}`)
  const resolved: Consolidation[] = consolidated.map((x) => ({ ...x, texts: textsOf(a[x.source].block), same_as: x.same_as.map((s) => printedAt.get(s)!) }))
  return checked({ blocks: out.blocks, layout: [box('overview', overview), box('guidance', guidance), box('scope', scopeNodes)], consolidated: resolved })
}

/**
 * A supporting-record section, laid out generically (no block added or reordered):
 *   - `qa`: a question label followed by its bullet answers → one two-column question/answer unit (declaration sections);
 *   - `subRows`: a document reading row followed by its basis / status / excerpt rows → one reading group (template labels);
 *   - `documents`: each document (from its subheading) is one bordered unit;
 *   - a heading run travels with up to two short intro paragraphs and the first content unit.
 */
export function flowLayout(blocks: readonly LayoutBlock[], opts: { qa?: boolean; subRows?: ReadonlySet<string>; documents?: boolean; fine?: boolean; compactRows?: boolean } = {}): SectionLayout {
  const out = new Builder()
  const isSub = (b: LayoutBlock | undefined) => !!b && b.kind === 'row' && !!opts.subRows?.has(b.label)
  type Unit = { kind: 'heading' | 'para' | 'content'; size: number; node: LayoutNode; startsDocument: boolean; head?: boolean }
  const units: Unit[] = []
  const size = (bs: readonly LayoutBlock[]) => bs.reduce((n, b) => n + textsOf(b).join('').length, 0)
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind === 'row' && !isSub(b) && isSub(blocks[i + 1])) {
      const group = [out.add(b, DIGEST.test(b.value) ? 'digest' : 'reading')]
      const bs: LayoutBlock[] = [b]
      while (isSub(blocks[i + 1])) { const s = blocks[++i]; bs.push(s); group.push(out.add(s, 'reading_sub')) }
      units.push({ kind: 'content', size: size(bs), node: box('reading', group), startsDocument: false })
    } else if (opts.qa && b.kind === 'label' && blocks[i + 1]?.kind === 'bullet') {
      const q = out.add(b, 'qa_question')
      const answers: LayoutNode[] = []
      const bs: LayoutBlock[] = [b]
      while (blocks[i + 1]?.kind === 'bullet') { const s = blocks[++i]; bs.push(s); answers.push(out.add(s, 'qa_answer')) }
      units.push({ kind: 'content', size: size(bs), node: box('qa', [q, box('qa_answers', answers)]), startsDocument: false })
    } else if (b.kind === 'heading' || b.kind === 'subheading' || b.kind === 'label') {
      units.push({ kind: 'heading', size: size([b]), node: out.add(b, b.kind === 'heading' ? 'h1' : b.kind === 'subheading' ? 'h2' : 'eyebrow'), startsDocument: !!opts.documents && b.kind === 'subheading' })
    } else if (b.kind === 'paragraph') units.push({ kind: 'para', size: size([b]), node: out.add(b, opts.fine ? 'fine' : 'body'), startsDocument: false })
    // CR-PDF-REVIEW-2: `compactRows` draws every row of the section alike (a row that opened a keep run was drawn larger).
    else units.push({ kind: 'content', size: size([b]), node: out.add(b, b.kind === 'bullet' ? 'bullet' : opts.compactRows && b.kind === 'row' ? 'compact' : b.kind === 'row' && DIGEST.test(b.value) ? 'digest' : 'row'), startsDocument: false })
  }
  // Heading runs travel with their intro paragraphs and first content unit.
  const grouped: Unit[] = []
  for (let k = 0; k < units.length; k++) {
    if (units[k].kind !== 'heading') { grouped.push(units[k]); continue }
    const run: Unit[] = []
    while (units[k]?.kind === 'heading') run.push(units[k++])
    let paras = 0
    while (units[k]?.kind === 'para' && paras < 2 && units[k].size < 400) { run.push(units[k++]); paras++ }
    if (units[k]) run.push(units[k++])
    k--
    grouped.push({ kind: 'content', size: run.reduce((n, u) => n + u.size, 0), node: box('keep', run.map((u) => u.node)), startsDocument: run[0].startsDocument, head: true })
  }
  // CR-PDF-REVIEW-2 (widow control): the last WIDOW units of a run of content (up to the next heading run or the section's end)
  // travel together when they are short, so a page never ends a run with a single stray row or bullet. Order is unchanged.
  const WIDOW = 3
  const WIDOW_CHARS = 650
  const tailed: Unit[] = []
  for (let k = 0; k < grouped.length; ) {
    if (grouped[k].head || grouped[k].startsDocument) { tailed.push(grouped[k++]); continue }
    const run: Unit[] = []
    while (k < grouped.length && !grouped[k].head && !grouped[k].startsDocument) run.push(grouped[k++])
    const tail = run.slice(-WIDOW)
    if (run.length > WIDOW && tail.reduce((n, u) => n + u.size, 0) <= WIDOW_CHARS) {
      tailed.push(...run.slice(0, -WIDOW), { kind: 'content', size: tail.reduce((n, u) => n + u.size, 0), node: box('keep', tail.map((u) => u.node)), startsDocument: false })
    } else tailed.push(...run)
  }
  grouped.length = 0
  grouped.push(...tailed)
  if (!opts.documents) return checked({ blocks: out.blocks, layout: grouped.map((u) => u.node) })
  // Documents: each document (from its subheading) is one unit.
  const layout: LayoutNode[] = []
  let doc: LayoutNode[] | null = null
  for (const u of grouped) {
    if (u.startsDocument) { doc = [u.node]; layout.push(box('document', doc)) }
    else if (doc) doc.push(u.node)
    else layout.push(u.node)
  }
  return checked({ blocks: out.blocks, layout })
}

/** Every block index of a layout tree, in reading order. */
export function layoutOrder(nodes: readonly LayoutNode[]): number[] {
  return nodes.flatMap((n) => (n.kind === 'block' ? [n.index] : layoutOrder(n.children)))
}

/** The tree must visit every printed block exactly once, in printed order: what is read is what is printed. */
function checked(l: SectionLayout): SectionLayout {
  const order = layoutOrder(l.layout)
  if (order.length !== l.blocks.length || order.some((v, i) => v !== i)) throw new ReadinessLayoutRefusal('layout order differs from the printed order')
  return l
}
