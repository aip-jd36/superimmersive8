/**
 * Fixture/markdown consistency guard (Governed Topic Relationships
 * implementation milestone, 2026-08-16). Same class of change, same
 * regex-over-raw-file discipline, as topic-claims-fixture-consistency.test.ts
 * -- no markdown-parsing precedent exists anywhere in this repo, so this
 * stays a small, targeted structural check, not a real parser.
 */

import * as fs from 'fs'
import * as path from 'path'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'

const TOPIC_RELATIONSHIPS_PATH = path.join(__dirname, '..', '..', '..', '..', '06_Operations', 'institutional-knowledge', 'notebook', 'TOPIC-RELATIONSHIPS.md')

/** Strips fenced code blocks (```...```) before scanning -- the entry template lives inside one and must never be counted as a real relationship. */
function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

/** Extracts every real `### REL-...` heading (outside code fences) and its own field lines. */
function extractMarkdownRelationships(markdown: string): {
  relationship_id: string
  source_topic: string | null
  target_topic: string | null
  relationship_type: string | null
  lifecycle: string | null
  publication_scope: string | null
  crc_eligible: string | null
  superseded_by: string | null
}[] {
  const outsideFences = stripFencedCodeBlocks(markdown)
  const sections = outsideFences.split(/(?=^### REL-)/m).filter((s) => s.startsWith('### REL-'))
  return sections.map((section) => {
    const idMatch = section.match(/^### (REL-[A-Za-z0-9-]+)/)
    const sourceMatch = section.match(/^Source topic:\s*(.+)$/m)
    const targetMatch = section.match(/^Target topic:\s*(.+)$/m)
    const typeMatch = section.match(/^Relationship type:\s*(.+)$/m)
    const lifecycleMatch = section.match(/^Lifecycle:\s*(.+)$/m)
    const scopeMatch = section.match(/^Publication scope:\s*(.+)$/m)
    const crcEligibleMatch = section.match(/^CRC Eligible:\s*(.+)$/m)
    const supersededMatch = section.match(/^Superseded by:\s*(.+)$/m)
    return {
      relationship_id: idMatch ? idMatch[1].trim() : '',
      source_topic: sourceMatch ? sourceMatch[1].trim() : null,
      target_topic: targetMatch ? targetMatch[1].trim() : null,
      relationship_type: typeMatch ? typeMatch[1].trim() : null,
      lifecycle: lifecycleMatch ? lifecycleMatch[1].trim() : null,
      publication_scope: scopeMatch ? scopeMatch[1].trim() : null,
      crc_eligible: crcEligibleMatch ? crcEligibleMatch[1].trim() : null,
      superseded_by: supersededMatch ? supersededMatch[1].trim() : null,
    }
  })
}

describe('TOPIC-RELATIONSHIPS.md <-> topic-relationships-fixture.ts consistency', () => {
  test('the markdown file exists and is readable', () => {
    expect(fs.existsSync(TOPIC_RELATIONSHIPS_PATH)).toBe(true)
  })

  test('the entry template inside the fenced code block is never counted as a real relationship', () => {
    const markdown = fs.readFileSync(TOPIC_RELATIONSHIPS_PATH, 'utf-8')
    const relationships = extractMarkdownRelationships(markdown)
    expect(relationships.find((r) => r.relationship_id.startsWith('REL-{DOMAIN}'))).toBeUndefined()
  })

  test('every real relationship ID in the markdown has a matching entry in the runtime fixture', () => {
    const markdown = fs.readFileSync(TOPIC_RELATIONSHIPS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownRelationships(markdown).map((r) => r.relationship_id))
    const fixtureIds = new Set(TOPIC_RELATIONSHIPS_FIXTURE.map((r) => r.relationship_id))
    const missingFromFixture = [...markdownIds].filter((id) => !fixtureIds.has(id))
    expect(missingFromFixture).toEqual([])
  })

  test('every relationship ID in the runtime fixture has a matching entry in the markdown (no orphaned/stale fixture entries)', () => {
    const markdown = fs.readFileSync(TOPIC_RELATIONSHIPS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownRelationships(markdown).map((r) => r.relationship_id))
    const fixtureIds = new Set(TOPIC_RELATIONSHIPS_FIXTURE.map((r) => r.relationship_id))
    const orphanedInFixture = [...fixtureIds].filter((id) => !markdownIds.has(id))
    expect(orphanedInFixture).toEqual([])
  })

  test('no duplicate relationship IDs within the runtime fixture', () => {
    const ids = TOPIC_RELATIONSHIPS_FIXTURE.map((r) => r.relationship_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("a fixture relationship's source_topic/target_topic/relationship_type/lifecycle/publication_scope/CRC-eligible agree with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(TOPIC_RELATIONSHIPS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownRelationships(markdown).map((r) => [r.relationship_id, r]))

    for (const fixtureRel of TOPIC_RELATIONSHIPS_FIXTURE) {
      const markdownRel = markdownById.get(fixtureRel.relationship_id)
      if (!markdownRel) continue // already caught by the "missing from markdown" test above

      expect(markdownRel.source_topic).toBe(fixtureRel.source_topic)
      expect(markdownRel.target_topic).toBe(fixtureRel.target_topic)
      expect(markdownRel.relationship_type).toBe(fixtureRel.relationship_type)
      if (markdownRel.lifecycle) {
        expect(markdownRel.lifecycle.toLowerCase()).toContain(fixtureRel.lifecycle.toLowerCase())
      }
      if (markdownRel.publication_scope) {
        expect(markdownRel.publication_scope).toBe(fixtureRel.publication_scope)
      }
      const fixtureIsCrcEligible = fixtureRel.crc_eligible === 'Yes'
      const markdownSaysCrcEligible = (markdownRel.crc_eligible ?? '').toLowerCase() === 'yes'
      expect(fixtureIsCrcEligible).toBe(markdownSaysCrcEligible)
    }
  })

  test("a fixture relationship's superseded status agrees with the markdown", () => {
    const markdown = fs.readFileSync(TOPIC_RELATIONSHIPS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownRelationships(markdown).map((r) => [r.relationship_id, r]))

    for (const fixtureRel of TOPIC_RELATIONSHIPS_FIXTURE) {
      const markdownRel = markdownById.get(fixtureRel.relationship_id)
      if (!markdownRel) continue
      const markdownSaysSuperseded = (markdownRel.superseded_by ?? '').toLowerCase() !== 'none'
      expect(fixtureRel.superseded_by !== null).toBe(markdownSaysSuperseded)
    }
  })

  test('exactly one relationship in the runtime fixture is Adopted + CRC-eligible as of 2026-08-19 -- REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1, published atomically alongside its three target claims (CLAIM-COPY-001-v1/-002-v1/-003-v1) following a bounded Copyright CRC Publication-Readiness Review (recommendation A -- PASS/GO AS-IS, no rationale change); see governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md -- update only when a further real decision is recorded', () => {
    const liveRelationships = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.lifecycle === 'Adopted' && r.crc_eligible === 'Yes')
    expect(liveRelationships.map((r) => r.relationship_id)).toEqual(['REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1'])
  })
})
