/**
 * Fixture/markdown consistency guard (CRC Living Knowledge Phase 1,
 * 2026-08-16, PM-approved §13: "the smallest useful consistency guard...
 * do NOT build the full markdown->runtime compiler/index yet"). Same
 * class of change as subsystem-boundaries.test.ts -- a structural,
 * file-scanning test, not a real markdown parser (no markdown-parsing
 * precedent exists anywhere in this repo; matrix-fixture.ts's own header
 * already gives the reasoning for staying manual).
 *
 * Deliberately regex-based over the raw file, not a markdown AST parser --
 * only extracts what this check needs: claim IDs, and each claim's
 * Lifecycle/Publication scope lines, skipping the "## Entry template"
 * section's own fenced code-block example so it is never mistaken for a
 * real claim.
 */

import * as fs from 'fs'
import * as path from 'path'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { GOAL_CATEGORIES } from '@/types/interview-engine'

const GOVERNED_CLAIMS_PATH = path.join(__dirname, '..', '..', '..', '..', '06_Operations', 'institutional-knowledge', 'notebook', 'GOVERNED-CLAIMS.md')

/**
 * Claims that are real, Adopted governed knowledge in GOVERNED-CLAIMS.md but
 * have NO entry in TOPIC_CLAIMS_FIXTURE, because their actual subject has no
 * corresponding `GoalCategory` value yet -- see each claim's own "GOVERNANCE
 * TREATMENT" note in the markdown, and topic-claims-fixture.ts's own
 * matching comment. This is a deliberate, reviewed, documented exception,
 * not a sync gap -- never add an ID here to silence a failing test; only add
 * one when a real governance decision (mirroring CLAIM-STOCK-EDITORIAL-001's
 * own Formal Governance Review #1, 2026-08-17) has been recorded for it.
 * Remove an ID once its claim gains a real `GoalCategory` and a real
 * TOPIC_CLAIMS_FIXTURE entry -- this set should shrink over time, not grow
 * casually.
 */
const CLAIMS_WITHOUT_FIXTURE_REPRESENTATION = new Set([
  'CLAIM-STOCK-EDITORIAL-001-v1',
  'CLAIM-STOCK-EDITORIAL-002-v1',
  'CLAIM-STOCK-GETTY-EDITORIAL-001-v1',
  'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1',
  'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1',
])

/** Strips fenced code blocks (```...```) before scanning -- the entry template lives inside one and must never be counted as a real claim. */
function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

/** Extracts every real `### CLAIM-...` heading (outside code fences) and its own Topic/Lifecycle/Publication scope/CRC Approver lines. */
function extractMarkdownClaims(markdown: string): { claim_id: string; topic: string | null; lifecycle: string | null; publication_scope: string | null; crc_approver: string | null }[] {
  const outsideFences = stripFencedCodeBlocks(markdown)
  const sections = outsideFences.split(/(?=^### CLAIM-)/m).filter((s) => s.startsWith('### CLAIM-'))
  return sections.map((section) => {
    const idMatch = section.match(/^### (CLAIM-[A-Za-z0-9-]+)/)
    const topicMatch = section.match(/^Topic:\s*(.+)$/m)
    const lifecycleMatch = section.match(/^Lifecycle:\s*(.+)$/m)
    const scopeMatch = section.match(/^Publication scope:\s*(.+)$/m)
    const crcApproverMatch = section.match(/^CRC Approver:\s*(.+)$/m)
    return {
      claim_id: idMatch ? idMatch[1].trim() : '',
      topic: topicMatch ? topicMatch[1].trim() : null,
      lifecycle: lifecycleMatch ? lifecycleMatch[1].trim() : null,
      publication_scope: scopeMatch ? scopeMatch[1].trim() : null,
      crc_approver: crcApproverMatch ? crcApproverMatch[1].trim() : null,
    }
  })
}

describe('GOVERNED-CLAIMS.md <-> topic-claims-fixture.ts consistency', () => {
  test('the markdown file exists and is readable', () => {
    expect(fs.existsSync(GOVERNED_CLAIMS_PATH)).toBe(true)
  })

  test('the entry template inside the fenced code block is never counted as a real claim', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const claims = extractMarkdownClaims(markdown)
    expect(claims.find((c) => c.claim_id.startsWith('CLAIM-XXX-NNN'))).toBeUndefined()
  })

  test('every real claim ID in the markdown has a matching entry in the runtime fixture, except claims explicitly documented as unrepresentable (CLAIMS_WITHOUT_FIXTURE_REPRESENTATION)', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownClaims(markdown).map((c) => c.claim_id))
    const fixtureIds = new Set(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id))
    const missingFromFixture = [...markdownIds].filter((id) => !fixtureIds.has(id) && !CLAIMS_WITHOUT_FIXTURE_REPRESENTATION.has(id))
    expect(missingFromFixture).toEqual([])
  })

  describe('CLAIM-STOCK-EDITORIAL-001-v1 -- documented fixture-representation exception', () => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('is intentionally absent from TOPIC_CLAIMS_FIXTURE -- not a sync gap', () => {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')).toBeUndefined()
    })

    test("'third_party_source_rights' IS now an implemented GoalCategory value (M1, 2026-08-18) -- the original blocker for this generic claim is closed; it remains unrepresented only because runtime-fixture representation (M4) is a separate, not-yet-authorized governance decision, never an automatic consequence of the category existing", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  describe('CLAIM-STOCK-EDITORIAL-002-v1 -- documented fixture-representation exception (same architecture gap as -001, not a second one)', () => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('is intentionally absent from TOPIC_CLAIMS_FIXTURE -- not a sync gap', () => {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')).toBeUndefined()
    })

    test("'third_party_source_rights' IS now an implemented GoalCategory value (M1, 2026-08-18, shared with CLAIM-STOCK-EDITORIAL-001-v1) -- the original blocker is closed; this claim remains unrepresented only because runtime-fixture representation (M4) is a separate, not-yet-authorized governance decision", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  describe('CLAIM-STOCK-GETTY-EDITORIAL-001-v1 -- documented fixture-representation exception (same architecture gap as -001/-002, not a third independent one)', () => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('is intentionally absent from TOPIC_CLAIMS_FIXTURE -- not a sync gap', () => {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeUndefined()
    })

    test("'third_party_source_rights' IS now an implemented GoalCategory value (M1, 2026-08-18) -- but this provider-specific claim has a SECOND, still-unresolved blocker: provider-scoped retrieval (M3) is not implemented, so it remains unrepresented in TOPIC_CLAIMS_FIXTURE regardless of the GoalCategory gap closing (THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md §17, §19)", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  describe('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 -- documented fixture-representation exception (same architecture gap as the other three stock claims, not a fourth independent one)', () => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('is intentionally absent from TOPIC_CLAIMS_FIXTURE -- not a sync gap', () => {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeUndefined()
    })

    test("'third_party_source_rights' IS now an implemented GoalCategory value (M1, 2026-08-18) -- but this provider-specific claim has a SECOND, still-unresolved blocker: provider-scoped retrieval (M3) is not implemented, so it remains unrepresented in TOPIC_CLAIMS_FIXTURE regardless of the GoalCategory gap closing (same M3 blocker as CLAIM-STOCK-GETTY-EDITORIAL-001-v1, not a second independent one)", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  describe('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 -- documented fixture-representation exception (same architecture gap as the other four stock claims, not a fifth independent one)', () => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('is intentionally absent from TOPIC_CLAIMS_FIXTURE -- not a sync gap', () => {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBeUndefined()
    })

    test("'third_party_source_rights' IS now an implemented GoalCategory value (M1, 2026-08-18) -- but this provider-specific claim has a SECOND, still-unresolved blocker: provider-scoped retrieval (M3) is not implemented, so it remains unrepresented in TOPIC_CLAIMS_FIXTURE regardless of the GoalCategory gap closing (same M3 blocker as the other two provider-specific stock claims, not a third independent one)", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  test('every claim ID in the runtime fixture has a matching entry in the markdown (no orphaned/stale fixture entries)', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownClaims(markdown).map((c) => c.claim_id))
    const fixtureIds = new Set(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id))
    const orphanedInFixture = [...fixtureIds].filter((id) => !markdownIds.has(id))
    expect(orphanedInFixture).toEqual([])
  })

  test('no duplicate claim IDs within the runtime fixture', () => {
    const ids = TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("a fixture claim's Lifecycle/CRC-eligibility agrees with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownClaims(markdown).map((c) => [c.claim_id, c]))

    for (const fixtureClaim of TOPIC_CLAIMS_FIXTURE) {
      const markdownClaim = markdownById.get(fixtureClaim.claim_id)
      if (!markdownClaim) continue // already caught by the "missing from markdown" test above

      if (markdownClaim.lifecycle) {
        expect(markdownClaim.lifecycle.toLowerCase()).toContain(fixtureClaim.lifecycle.toLowerCase())
      }
      // BUG FIX (2026-08-17, exposed by the CLAIM-COPY-004 CRC-publication
      // decision, the first time these two signals ever diverged): this
      // heuristic previously derived markdown-side CRC eligibility from
      // whether `Publication scope` contained the literal string "CRC
      // eligible" -- but `Publication scope` and CRC eligibility are two
      // independent fields in this document's own entry template (see
      // GOVERNED-CLAIMS.md's own governance-discipline bullet: "Publication
      // scope: CRC eligible is a SEPARATE decision from Adoption"), and
      // `Publication scope` isn't even a field on the runtime TopicClaim
      // type at all -- nothing in production code ever reads it. PM's
      // approved COPY-004 decision keeps `Publication scope: Reviewer/
      // Commercial Assurance` unchanged while separately flipping CRC
      // eligibility via `CRC Approver`/`CRC Decision Date` -- exposing that
      // this test was checking the wrong field. The real governance signal,
      // matching what `CRC Approver` has always meant in this document (a
      // real, named human vs. the literal placeholder "PENDING"), is now
      // checked directly instead.
      const fixtureIsCrcEligible = fixtureClaim.crc_eligible === 'Yes'
      const markdownSaysCrcEligible = !!markdownClaim.crc_approver && !markdownClaim.crc_approver.toUpperCase().startsWith('PENDING')
      expect(fixtureIsCrcEligible).toBe(markdownSaysCrcEligible)
    }
  })

  /**
   * Topic drift detection (added 2026-08-16, LK Phase 1 governance
   * refinement) -- the exact gap that let CLAIM-COPY-001/002/003 sit at
   * `Topic: copyright_ownership` in the fixture for one review cycle after
   * the markdown's own field name was corrected to `copyrightability`
   * during the taxonomy decision in this same refinement. Lifecycle and
   * Publication scope already had drift detection; Topic didn't. Closing
   * that gap now rather than leaving the next taxonomy correction to rely
   * on a human re-reading both files side by side again.
   */
  test("a fixture claim's Topic agrees with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownClaims(markdown).map((c) => [c.claim_id, c]))

    for (const fixtureClaim of TOPIC_CLAIMS_FIXTURE) {
      const markdownClaim = markdownById.get(fixtureClaim.claim_id)
      if (!markdownClaim) continue // already caught by the "missing from markdown" test above
      expect(markdownClaim.topic).toBe(fixtureClaim.topic)
    }
  })

  test('exactly one claim in the runtime fixture is Adopted + CRC-eligible as of 2026-08-17 -- CLAIM-COPY-004-v1, the first real PM CRC-publication decision (update only when a further real decision is recorded)', () => {
    const liveClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(liveClaims.map((c) => c.claim_id)).toEqual(['CLAIM-COPY-004-v1'])
  })
})
