/**
 * CAH-4E §9 / CAH-4G.7 — reviewer LK framing + selector projection fidelity.
 *
 * `projectReviewerLkResult` / `ReviewerLkLookupResult` were retired with the
 * legacy `GET .../reviewer-lk` route (CAH-4G.7). What survives and is still
 * required:
 *   - the fixed reviewer-facing authority framing (`REVIEWER_LK_FRAMING`);
 *   - `selectReviewerClaims` carrying the FULL governed record a reviewer needs
 *     (still the input to `runHrrResearch`).
 */

import * as fs from 'fs'
import * as path from 'path'
import { REVIEWER_LK_FRAMING } from '@/lib/reviewer-lk/project-reviewer-claims'
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

test('the framing module imports no bounded-interpretation / consultative / retrieve module (and no longer any projection helper)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'reviewer-lk', 'project-reviewer-claims.ts'), 'utf-8')
  const imports = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
  expect(imports).not.toMatch(/bounded-interpretation|consultative|retrieval-engine\/retrieve|projection-layer/)
  // it is now a leaf constant module — no imports at all
  expect(imports).toBe('')
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
  expect(code).not.toMatch(/projectReviewerLkResult|ReviewerLkLookupResult/)
})

test('a selected claim carries the FULL governed record a reviewer needs (more than RetrievalResult) — the input to runHrrResearch', () => {
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
