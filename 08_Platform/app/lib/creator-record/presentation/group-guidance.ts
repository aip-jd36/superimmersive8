/**
 * CR-V2-MVP-17 — groups guidance cards by subject for display.
 *
 * Rendering structure only. Every card is kept, in its original order within
 * its subject; groups appear in the order their subject first appears. Nothing
 * is merged, rewritten or dropped: a card's explanation, conclusion, basis and
 * dependencies stay on the card. Only text that is IDENTICAL on every card of a
 * group is lifted to the group, so it is shown once:
 *   - a caveat present on every card of the group;
 *   - the source line, when every card of the group has the same one.
 * Anything that differs between cards stays on its own card. A group of one
 * card lifts nothing. Adds no wording.
 */

export interface GroupableCard {
  subject: string
  caveats: readonly string[]
  source: string
}

export interface GuidanceGroupCard<C> {
  card: C
  /** The card's caveats not shown once for the whole group. */
  own_caveats: string[]
  /** False when the group shows this card's source line once for all its cards. */
  show_own_source: boolean
}

export interface GuidanceGroup<C> {
  subject: string
  cards: GuidanceGroupCard<C>[]
  shared_caveats: string[]
  shared_source: string | null
}

export function groupGuidanceCards<C extends GroupableCard>(cards: readonly C[]): GuidanceGroup<C>[] {
  const bySubject = new Map<string, C[]>()
  for (const c of cards) {
    const list = bySubject.get(c.subject)
    if (list) list.push(c)
    else bySubject.set(c.subject, [c])
  }
  return Array.from(bySubject, ([subject, members]) => {
    const many = members.length > 1
    const shared_caveats = many ? Array.from(new Set(members[0].caveats)).filter((cv) => members.every((m) => m.caveats.includes(cv))) : []
    const shared_source = many && members.every((m) => m.source === members[0].source) ? members[0].source : null
    return {
      subject,
      shared_caveats,
      shared_source,
      cards: members.map((card) => ({
        card,
        own_caveats: card.caveats.filter((cv) => !shared_caveats.includes(cv)),
        show_own_source: shared_source === null,
      })),
    }
  })
}
