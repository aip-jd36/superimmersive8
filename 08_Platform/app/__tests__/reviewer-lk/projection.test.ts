/**
 * CAH-4E §9 — reviewer projection: thin, neutral, required framing, no prose,
 * no bounded interpretation, no consultative composition.
 */

import * as fs from 'fs'
import * as path from 'path'
import { REVIEWER_LK_FRAMING, projectReviewerLkResult } from '@/lib/reviewer-lk/project-reviewer-claims'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const NO_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

test('the framing states: governed knowledge / for research / not a conclusion / completes no control / applicability != judgment', () => {
  const all = `${REVIEWER_LK_FRAMING.heading} ${REVIEWER_LK_FRAMING.body} ${REVIEWER_LK_FRAMING.applicability_note}`.toLowerCase()
  expect(all).toMatch(/governed/)
  expect(all).toMatch(/research/)
  expect(all).toMatch(/not an assessment conclusion/)
  expect(all).toMatch(/completes no commercial assurance control|completes no control/)
  expect(all).toMatch(/does not substitute for reviewer judgment/)
  expect(all).toMatch(/not a negative finding/)
})

test('the projection module imports no bounded-interpretation / consultative / retrieve module', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'reviewer-lk', 'project-reviewer-claims.ts'), 'utf-8')
  const imports = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
  expect(imports).not.toMatch(/bounded-interpretation|consultative|retrieval-engine\/retrieve|projection-layer/)
})

test('projectReviewerLkResult is a pure assembly — same claims/withheld, plus topic + context, ok:true', () => {
  const selection = selectReviewerClaims({
    topic: 'copyright_ownership',
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    assetProviderIds: [],
    activeToolIds: [],
    applicabilityFacts: NO_FACTS,
  })
  const ctx = { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] }
  const result = projectReviewerLkResult({ topic: 'copyright_ownership', retrievalContext: ctx, selection })
  expect(result.ok).toBe(true)
  expect(result.topic).toBe('copyright_ownership')
  expect(result.claims).toBe(selection.claims)
  expect(result.withheld).toBe(selection.withheld)
  expect(result.retrieval_context).toBe(ctx)
})

test('a projected claim carries the FULL governed record a reviewer needs (more than RetrievalResult)', () => {
  const selection = selectReviewerClaims({
    topic: 'copyright_ownership', topicClaims: TOPIC_CLAIMS_FIXTURE, assetProviderIds: [], activeToolIds: [], applicabilityFacts: NO_FACTS,
  })
  const copy004 = selection.claims.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!
  expect(copy004).toBeDefined()
  expect(copy004.lifecycle).toBe('Adopted')
  expect(copy004.publication_scope).toBe('Reviewer/Commercial Assurance')
  expect(typeof copy004.crc_eligible).toBe('string') // displayed, not a gate
  expect(copy004.statement).toBeTruthy()
  expect(copy004.governed_claims_reference).toMatch(/GOVERNED-CLAIMS\.md#claim-copy-004-v1/)
  expect(Array.isArray(copy004.applicability_outcomes)).toBe(true)
  expect(copy004.superseded_by).toBeNull()
})
