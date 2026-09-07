/**
 * CA-RLK-2a — public-record historical stability + structural boundaries.
 *
 * Run: npx jest __tests__/assessments/signoff-public-record.test.ts
 */

import fs from 'fs'
import path from 'path'
import { DOMAIN_CODE_LABELS } from '../../lib/assessments/signoff'

const APP = path.resolve(__dirname, '../..')
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf-8')

// ── VerificationPageData allowlist ─────────────────────────────────────────

describe('Verification Page data contract (CA-RLK-2a)', () => {
  const typesSrc = read('types/assessment.ts')

  test('VerificationPageData exposes scope_domain_codes (the snapshotted scope)', () => {
    const block = typesSrc.slice(typesSrc.indexOf('interface VerificationPageData'))
    expect(block).toMatch(/scope_domain_codes:\s*string\[\]\s*\|\s*null/)
  })

  test('VerificationPageData does NOT expose sign-off actor / timestamp (internal only)', () => {
    const block = typesSrc.slice(
      typesSrc.indexOf('interface VerificationPageData'),
      typesSrc.indexOf('}', typesSrc.indexOf('interface VerificationPageData')) + 1,
    )
    expect(block).not.toMatch(/signed_off_by/)
    expect(block).not.toMatch(/signed_off_at/)
    expect(block).not.toMatch(/signoff_status/)
    expect(block).not.toMatch(/signed_workbook_revision/)
  })

  test('findAssessmentForVerification reads asset + scope from the assessments row, not a live submissions join', () => {
    const repo = read('lib/assessments/repository.ts')
    const fn = repo.slice(repo.indexOf('export async function findAssessmentForVerification'))
      .slice(0, 2000)
    // no per-request submissions join for the asset fields
    expect(fn).not.toMatch(/submission:submissions!submission_id\s*\(\s*title/)
    expect(fn).toMatch(/asset_title, asset_media_type, asset_runtime, scope_domain_codes/)
  })
})

// ── public page renders the snapshot ──────────────────────────────────────

describe('public assessment page (CA-RLK-2a)', () => {
  const pageSrc = read('app/assessment/[assessment_number]/page.tsx')

  test('DomainList takes the assessment\'s scope_domain_codes', () => {
    expect(pageSrc).toMatch(/<DomainList codes=\{assessment\.scope_domain_codes\}/)
    expect(pageSrc).toMatch(/function DomainList\(\{ codes \}/)
  })

  test('legacy NULL scope falls back to the current methodology constant', () => {
    expect(pageSrc).toMatch(/codes && codes\.length > 0[\s\S]*ASSESSMENT_DOMAINS\.map/)
  })

  test('an unrecognised domain code renders as itself, never an invented label', () => {
    expect(pageSrc).toMatch(/DOMAIN_CODE_LABELS\[code\]\s*\?\?\s*code/)
  })

  test('institutional status stays a live lookup (its purpose is to communicate current validity)', () => {
    expect(pageSrc).toMatch(/InstitutionalStatusBanner/)
    expect(pageSrc).toMatch(/institutional_status/)
  })

  test('the public page renders no reviewer-person / findings / evidence / score data', () => {
    // no reference to the sign-off actor, or to finding/evidence/score fields
    expect(pageSrc).not.toMatch(/signed_off_by|signed_off_at|signoff_status/)
    expect(pageSrc).not.toMatch(/assessment\.(findings|evidence|domain_score|risk_rating|reviewer_notes)/)
    expect(pageSrc).not.toMatch(/workbook_data/)
  })

  test('every methodology domain code has a public label', () => {
    for (const c of ['A', 'R', 'H', 'I', 'L', 'T', 'D']) expect(DOMAIN_CODE_LABELS[c]).toBeTruthy()
  })
})

// ── structural boundaries (CA-RLK-2a §38) ─────────────────────────────────

describe('assessment / reviewer code stays LK / CRC / Sales / RBAC free (CA-RLK-2a §38)', () => {
  const FILES = [
    'lib/assessments/signoff.ts',
    'lib/assessments/service.ts',
    'lib/assessments/repository.ts',
    'app/api/admin/submissions/[id]/sign-off/route.ts',
    'app/api/admin/submissions/[id]/ensure-assessment/route.ts',
    'app/api/admin/submissions/[id]/workbook/route.ts',
    'app/assessment/[assessment_number]/page.tsx',
  ]
  const src = FILES.map(read).join('\n')

  test('no Living Knowledge / Retrieval / BI / Projection / Composition import', () => {
    expect(src).not.toMatch(/@\/lib\/retrieval-engine/)
    expect(src).not.toMatch(/@\/lib\/bounded-interpretation/)
    expect(src).not.toMatch(/@\/lib\/projection-layer/)
    expect(src).not.toMatch(/@\/lib\/crc-engine/)
    expect(src).not.toMatch(/@\/lib\/crc-sales/)
    expect(src).not.toMatch(/@\/lib\/crc-assurance-handoff/)
    expect(src).not.toMatch(/runCRCConversation|buildBoundedInterpretation|GOVERNED-CLAIMS/)
  })

  test('no LLM / anthropic / openai import', () => {
    expect(src).not.toMatch(/anthropic|openai|\bllm\b/i)
  })

  test('no knowledge_claim_refs, no assessment_events, no reviewer-role schema', () => {
    expect(src).not.toMatch(/knowledge_claim_refs/)
    expect(src).not.toMatch(/assessment_events/)
    expect(src).not.toMatch(/assurance_reviewer|reviewer_role|assessment_signoffs/)
  })

  test('the migration adds no deferred infrastructure', () => {
    const mig = read('supabase/migrations/20260907000000_assessment_signoff_integrity.sql')
    // ignore the commented DOWN block
    const up = mig.split('-- DOWN (rollback)')[0]
    // strip line comments so we test the executable SQL, not the header prose
    const sql = up.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n')
    expect(sql).not.toMatch(/CREATE TABLE[^;]*assessment_signoffs/i)
    expect(sql).not.toMatch(/CREATE TABLE[^;]*assessment_events/i)
    expect(sql).not.toMatch(/knowledge_claim_refs|outcome_label/)
    // additive only: no DROP of an existing column / the updated_at trigger / a table
    expect(sql).not.toMatch(/DROP TRIGGER IF EXISTS assessments_updated_at/)
    expect(sql).not.toMatch(/ALTER TABLE assessments[\s\S]{0,80}DROP COLUMN/)
    expect(sql).not.toMatch(/DROP TABLE/)
    // the two new RPCs and the new columns ARE present
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION sign_off_assessment/)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION patch_workbook_atomic/)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS workbook_revision BIGINT NOT NULL DEFAULT 0/)
  })
})

// ── authoritative sign-off cannot be client-supplied (CA-RLK-2a §35) ──────

describe('sign-off authority cannot be spoofed', () => {
  test('the sign-off route derives the actor from the session, accepts no identity/time/methodology/scope body', () => {
    const route = read('app/api/admin/submissions/[id]/sign-off/route.ts')
    expect(route).toMatch(/supabase\.auth\.getUser\(\)/)
    expect(route).toMatch(/signOffAssessment\(params\.id,\s*authUser\.id\)/)
    expect(route).not.toMatch(/body\.(signed_off_by|signed_off_at|methodology|scope|revision|asset)/)
    // the route reads NOTHING from the request body
    expect(route).not.toMatch(/await\s+_?request\.json\(\)/)
  })

  test('the service derives outcome from the canonical workbook, methodology from the constant, time/date in the RPC', () => {
    const svc = read('lib/assessments/service.ts')
    const start = svc.indexOf('export async function signOffAssessment')
    const end = svc.indexOf('\nexport ', start + 10)
    const fn = svc.slice(start, end === -1 ? undefined : end)
    expect(fn).toMatch(/validateWorkbookForSignoff/)
    expect(fn).toMatch(/domainCodesForMethodology\(METHODOLOGY_VERSION\)/)
    expect(fn).toMatch(/outcome:\s*validation\.outcome/)
    // no client clock / client identity in the sign-off function itself
    expect(fn).not.toMatch(/Date\.now\(\)|new Date\(\)/)
  })

  test('the sign_off_assessment RPC uses DB time (now / CURRENT_DATE), never a parameter, for signed_off_at / assessment_date', () => {
    const mig = read('supabase/migrations/20260907000000_assessment_signoff_integrity.sql')
    const start = mig.indexOf('CREATE OR REPLACE FUNCTION sign_off_assessment')
    const fn = mig.slice(start, mig.indexOf('$$ LANGUAGE plpgsql;', start) + 20)
    expect(fn).toMatch(/v_now\s+TIMESTAMPTZ\s*:=\s*now\(\)/)
    expect(fn).toMatch(/v_today\s+DATE\s*:=\s*\(now\(\)\)::date/)
    expect(fn).not.toMatch(/p_signed_off_at|p_assessment_date/)
    // revision guard is a hard precondition
    expect(fn).toMatch(/v_rev IS DISTINCT FROM p_expected_revision/)
    expect(fn).toMatch(/FOR UPDATE/)
  })
})
