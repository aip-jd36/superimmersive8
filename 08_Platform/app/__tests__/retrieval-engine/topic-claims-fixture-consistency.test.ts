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

const GOVERNED_CLAIMS_PATH = path.join(__dirname, '..', '..', '..', '..', '06_Operations', 'institutional-knowledge', 'notebook', 'GOVERNED-CLAIMS.md')

/** Strips fenced code blocks (```...```) before scanning -- the entry template lives inside one and must never be counted as a real claim. */
function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

/** Extracts every real `### CLAIM-...` heading (outside code fences) and its own Lifecycle/Publication scope lines. */
function extractMarkdownClaims(markdown: string): { claim_id: string; lifecycle: string | null; publication_scope: string | null }[] {
  const outsideFences = stripFencedCodeBlocks(markdown)
  const sections = outsideFences.split(/(?=^### CLAIM-)/m).filter((s) => s.startsWith('### CLAIM-'))
  return sections.map((section) => {
    const idMatch = section.match(/^### (CLAIM-[A-Za-z0-9-]+)/)
    const lifecycleMatch = section.match(/^Lifecycle:\s*(.+)$/m)
    const scopeMatch = section.match(/^Publication scope:\s*(.+)$/m)
    return {
      claim_id: idMatch ? idMatch[1].trim() : '',
      lifecycle: lifecycleMatch ? lifecycleMatch[1].trim() : null,
      publication_scope: scopeMatch ? scopeMatch[1].trim() : null,
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

  test('every real claim ID in the markdown has a matching entry in the runtime fixture', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownClaims(markdown).map((c) => c.claim_id))
    const fixtureIds = new Set(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id))
    const missingFromFixture = [...markdownIds].filter((id) => !fixtureIds.has(id))
    expect(missingFromFixture).toEqual([])
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

  test("a fixture claim's Lifecycle/Publication-scope agrees with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownClaims(markdown).map((c) => [c.claim_id, c]))

    for (const fixtureClaim of TOPIC_CLAIMS_FIXTURE) {
      const markdownClaim = markdownById.get(fixtureClaim.claim_id)
      if (!markdownClaim) continue // already caught by the "missing from markdown" test above

      if (markdownClaim.lifecycle) {
        expect(markdownClaim.lifecycle.toLowerCase()).toContain(fixtureClaim.lifecycle.toLowerCase())
      }
      const fixtureIsCrcEligible = fixtureClaim.crc_eligible === 'Yes'
      const markdownSaysCrcEligible = (markdownClaim.publication_scope ?? '').toLowerCase().includes('crc eligible')
      expect(fixtureIsCrcEligible).toBe(markdownSaysCrcEligible)
    }
  })

  test('no claim in the runtime fixture is Adopted + CRC-eligible yet -- Phase 1 has not published anything to CRC (update only once a real PM adoption/publication decision is recorded)', () => {
    const liveClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(liveClaims).toEqual([])
  })
})
