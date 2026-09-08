/**
 * CA-RLK-2g — Explicit Publication Authorization.
 *
 * Public visibility is now: processing_status === 'DELIVERED' AND exactly one
 * structurally-valid active (non-revoked) publication episode. Publication is a
 * deliberate, audited act — never inferred from DELIVERED alone, verification_url,
 * is_system_test, institutional_status, report existence, or provenance.
 *
 * Pure-domain behavior is tested directly; DB-level invariants (CHECKs, partial
 * unique index, guarded legacy backfill) and route command semantics are pinned
 * by source guards against the migration and the /publish + /revoke-publication
 * routes.
 *
 * Run: npx jest __tests__/assessments/publication.test.ts
 */

import fs from 'fs'
import path from 'path'
import {
  PUBLICATION_BASES,
  isStructurallyValidEpisode,
  isActiveEpisode,
  isRevokedEpisode,
  resolvePublicVisibility,
  isPubliclyVisible,
  projectAdminPublicationState,
  type PublicationEpisode,
} from '@/lib/assessments/publication'

const A = 'assessment-uuid-1'

function ep(over: Partial<PublicationEpisode> = {}): PublicationEpisode {
  return {
    id: 'ep-1',
    assessment_id: A,
    publication_basis: 'EXPLICIT_AUTHORIZATION',
    recorded_at: '2026-09-09T10:00:00Z',
    published_by: 'admin-uuid',
    revoked_at: null,
    revoked_by: null,
    revoked_reason: null,
    ...over,
  }
}

// ── Structural validity (P1/P2/P3) ─────────────────────────────────────────

describe('episode structural validity', () => {
  it('P1: EXPLICIT_AUTHORIZATION requires published_by', () => {
    expect(isStructurallyValidEpisode(ep({ publication_basis: 'EXPLICIT_AUTHORIZATION', published_by: null }))).toBe(false)
    expect(isStructurallyValidEpisode(ep({ publication_basis: 'EXPLICIT_AUTHORIZATION', published_by: 'x' }))).toBe(true)
  })

  it('P2: LEGACY_DELIVERED_MIGRATION permits published_by = null', () => {
    expect(isStructurallyValidEpisode(ep({ publication_basis: 'LEGACY_DELIVERED_MIGRATION', published_by: null }))).toBe(true)
  })

  it('P3: revoke fields must be all-null or all-set with a non-empty reason', () => {
    expect(isStructurallyValidEpisode(ep({ revoked_at: null, revoked_by: null, revoked_reason: null }))).toBe(true)
    expect(isStructurallyValidEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: 'a', revoked_reason: 'x' }))).toBe(true)
    // partial revoke state → invalid
    expect(isStructurallyValidEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: null, revoked_reason: null }))).toBe(false)
    expect(isStructurallyValidEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: 'a', revoked_reason: null }))).toBe(false)
    // empty reason → invalid
    expect(isStructurallyValidEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: 'a', revoked_reason: '   ' }))).toBe(false)
  })

  it('unknown publication_basis → invalid', () => {
    expect(isStructurallyValidEpisode(ep({ publication_basis: 'SOMETHING_ELSE' }))).toBe(false)
  })

  it('isActiveEpisode / isRevokedEpisode', () => {
    expect(isActiveEpisode(ep())).toBe(true)
    expect(isActiveEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: 'a', revoked_reason: 'x' }))).toBe(false)
    expect(isRevokedEpisode(ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: 'a', revoked_reason: 'x' }))).toBe(true)
    expect(isRevokedEpisode(ep())).toBe(false)
    expect(isActiveEpisode(null)).toBe(false)
  })
})

// ── Authoritative visibility predicate (V1–V10) ────────────────────────────

describe('resolvePublicVisibility', () => {
  it('V1: SIGNED + active episode → NOT_PUBLIC', () => {
    expect(resolvePublicVisibility({ processingStatus: 'SIGNED', activeEpisode: ep(), hasRevokedHistory: false })).toBe('NOT_PUBLIC')
  })

  it('V2: DELIVERED + no episode → NOT_PUBLIC', () => {
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: null, hasRevokedHistory: false })).toBe('NOT_PUBLIC')
  })

  it('V3: DELIVERED + valid active EXPLICIT episode → RECORD', () => {
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: ep(), hasRevokedHistory: false })).toBe('RECORD')
    expect(isPubliclyVisible({ processingStatus: 'DELIVERED', activeEpisode: ep(), hasRevokedHistory: false })).toBe(true)
  })

  it('V4: DELIVERED + valid active LEGACY episode (published_by null) → RECORD', () => {
    const legacy = ep({ publication_basis: 'LEGACY_DELIVERED_MIGRATION', published_by: null })
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: legacy, hasRevokedHistory: false })).toBe('RECORD')
  })

  it('V5: DELIVERED + no active episode but revoked history → TOMBSTONE', () => {
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: null, hasRevokedHistory: true })).toBe('TOMBSTONE')
  })

  it('V6/V7: WITHDRAWN/SUPERSEDED do not enter the predicate — DELIVERED + active episode is still RECORD', () => {
    // institutional_status is intentionally not an input to resolvePublicVisibility.
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: ep(), hasRevokedHistory: false })).toBe('RECORD')
  })

  it('V8: DELIVERED + malformed active episode → NOT_PUBLIC (fail closed)', () => {
    const malformed = ep({ publication_basis: 'EXPLICIT_AUTHORIZATION', published_by: null })
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: malformed, hasRevokedHistory: false })).toBe('NOT_PUBLIC')
    const badRevoke = ep({ revoked_at: '2026-09-10T00:00:00Z', revoked_by: null, revoked_reason: null })
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: badRevoke, hasRevokedHistory: false })).toBe('NOT_PUBLIC')
  })

  it('V8: unknown / null processing_status → NOT_PUBLIC', () => {
    expect(resolvePublicVisibility({ processingStatus: null, activeEpisode: ep(), hasRevokedHistory: false })).toBe('NOT_PUBLIC')
    expect(resolvePublicVisibility({ processingStatus: 'WHATEVER', activeEpisode: ep(), hasRevokedHistory: false })).toBe('NOT_PUBLIC')
  })

  it('V9: is_system_test does not affect the visibility predicate — it is not an input', () => {
    // The predicate has no is_system_test parameter; a system-test record with a
    // valid active episode is a RECORD exactly like any other.
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: ep(), hasRevokedHistory: false })).toBe('RECORD')
  })

  it('V10: verification_url alone does NOT grant visibility — it is not an input either', () => {
    expect(resolvePublicVisibility({ processingStatus: 'DELIVERED', activeEpisode: null, hasRevokedHistory: false })).toBe('NOT_PUBLIC')
  })
})

// ── Admin projection (UI2/UI3/UI4) ─────────────────────────────────────────

describe('projectAdminPublicationState', () => {
  it('UI3: explicit active episode → shows actor + time', () => {
    const s = projectAdminPublicationState(ep({ published_by: 'admin-9' }), ep({ published_by: 'admin-9' }))
    expect(s).toEqual({ kind: 'published_explicit', recordedAt: '2026-09-09T10:00:00Z', publishedBy: 'admin-9' })
  })

  it('UI2: legacy active episode → does NOT invent an actor', () => {
    const legacy = ep({ publication_basis: 'LEGACY_DELIVERED_MIGRATION', published_by: null })
    const s = projectAdminPublicationState(legacy, legacy)
    expect(s.kind).toBe('published_legacy')
    expect(s).not.toHaveProperty('publishedBy')
  })

  it('UI4: no active episode + most recent revoked → revoked state', () => {
    const revoked = ep({ revoked_at: '2026-09-11T00:00:00Z', revoked_by: 'admin-2', revoked_reason: 'demo retired' })
    const s = projectAdminPublicationState(null, revoked)
    expect(s).toEqual({
      kind: 'revoked',
      recordedAt: '2026-09-09T10:00:00Z',
      revokedAt: '2026-09-11T00:00:00Z',
      revokedReason: 'demo retired',
    })
  })

  it('no episodes → not_published', () => {
    expect(projectAdminPublicationState(null, null)).toEqual({ kind: 'not_published' })
  })
})

// ── Migration source guards (P4/P5/P6/P7) ─────────────────────────────────

describe('migration 20260909000000_assessment_publications.sql', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260909000000_assessment_publications.sql'),
    'utf8',
  )

  it('P4: partial unique index enforces one active episode', () => {
    const oneLine = sql.replace(/\s+/g, ' ')
    expect(oneLine).toMatch(/CREATE UNIQUE INDEX[^;]*assessment_publications[^;]*\(assessment_id\)[^;]*WHERE revoked_at IS NULL/)
  })

  it('P1 (DB): CHECK — EXPLICIT_AUTHORIZATION requires published_by', () => {
    expect(sql).toMatch(/publication_basis <> 'EXPLICIT_AUTHORIZATION' OR published_by IS NOT NULL/)
  })

  it('P3 (DB): CHECK — coherent revoke state with non-empty reason', () => {
    expect(sql).toContain('revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL')
    expect(sql).toContain('length(btrim(revoked_reason)) > 0')
  })

  it('governed vocabulary constrained', () => {
    expect(sql).toMatch(/CHECK \(publication_basis IN \('EXPLICIT_AUTHORIZATION', 'LEGACY_DELIVERED_MIGRATION'\)\)/)
  })

  it('P6: legacy episode targets ONLY ASSESS-005, basis LEGACY, published_by NULL, no fabricated publication time', () => {
    expect(sql).toContain("assessment_number = 'ASSESS-005-2026-07-12'")
    // the ONE insert: LEGACY basis, recorded_at = now(), NO human authorizer
    expect(sql).toContain("'LEGACY_DELIVERED_MIGRATION', now(), NULL")
    // never uses a row's own created_at / updated_at as the publication time
    expect(sql).not.toMatch(/VALUES\s*\([^)]*\b(created_at|updated_at)\b/)
  })

  it('P7 + no blanket backfill: exactly one INSERT, no UPDATE-all-DELIVERED', () => {
    const inserts = sql.match(/INSERT INTO assessment_publications/g) ?? []
    expect(inserts.length).toBe(1)
    expect(sql.replace(/\s+/g, ' ')).not.toMatch(/INSERT INTO assessment_publications .*SELECT .*FROM assessments .*WHERE processing_status = 'DELIVERED'/)
  })

  it('no publication columns added to assessments (one source of truth)', () => {
    expect(sql).not.toMatch(/ALTER TABLE assessments\s+ADD COLUMN\s+published/i)
  })

  it('RLS enabled, service_role only', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('GRANT ALL ON public.assessment_publications TO service_role')
  })

  // ── Migration assertion hardening (CA-RLK-2g-D2 §2/§4) ──────────────────
  // The legacy block is a guarded PL/pgSQL DO block. These guard its control
  // flow by structure, not by executing Postgres.
  const legacyBlock = (() => {
    // the final DO block (the one that names ASSESS-005)
    const blocks = sql.match(/DO \$\$[\s\S]*?END \$\$;/g) ?? []
    return blocks.find((b) => b.includes('ASSESS-005-2026-07-12')) ?? ''
  })()
  // executable text of the block: -- comments stripped, whitespace collapsed,
  // so branch-structure assertions are not fooled by prose.
  const stripSqlComments = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/--.*/, ''))
      .join('\n')
  const flat = stripSqlComments(legacyBlock).replace(/\s+/g, ' ')

  it('M1: RAISE EXCEPTION when ASSESS-005 is missing (no silent skip)', () => {
    expect(legacyBlock).toMatch(/IF v_id IS NULL THEN\s+RAISE EXCEPTION/)
    expect(flat).toMatch(/v_id IS NULL THEN RAISE EXCEPTION 'CA-RLK-2g: assessment ASSESS-005-2026-07-12 not found/)
  })

  it('M2: RAISE EXCEPTION when ASSESS-005 is not DELIVERED', () => {
    expect(flat).toMatch(/v_status IS DISTINCT FROM 'DELIVERED' THEN RAISE EXCEPTION[^;]*expected DELIVERED/)
  })

  it('M3: zero existing episodes → the legacy episode is inserted', () => {
    // the INSERT lives in the ELSE branch, reached only when neither an active
    // nor any revoked episode exists.
    expect(flat).toMatch(/ELSE .*INSERT INTO assessment_publications .*'LEGACY_DELIVERED_MIGRATION', now\(\), NULL/)
  })

  it('M4: an active episode already exists → idempotent no-op (NOTICE, not EXCEPTION, no INSERT)', () => {
    expect(flat).toMatch(/IF v_active_count > 0 THEN RAISE NOTICE/)
    // the active-episode branch must not raise or insert
    const activeBranch = flat.match(/IF v_active_count > 0 THEN (.*?) ELSIF/)?.[1] ?? ''
    expect(activeBranch).not.toMatch(/RAISE EXCEPTION/)
    expect(activeBranch).not.toMatch(/INSERT INTO/)
  })

  it('M5: revoked history + no active episode → RAISE EXCEPTION, no fresh legacy episode', () => {
    expect(flat).toMatch(/ELSIF v_total_count > 0 THEN RAISE EXCEPTION .*?refusing to silently re-publish/)
    const revokedBranch = flat.match(/ELSIF v_total_count > 0 THEN (.*?) ELSE /)?.[1] ?? ''
    expect(revokedBranch).not.toMatch(/INSERT INTO/)
  })

  it('M6: the legacy insert is still LEGACY_DELIVERED_MIGRATION / published_by NULL / server time', () => {
    expect(legacyBlock).toContain("INSERT INTO assessment_publications (assessment_id, publication_basis, recorded_at, published_by)")
    expect(legacyBlock).toContain("VALUES (v_id, 'LEGACY_DELIVERED_MIGRATION', now(), NULL)")
    // no fabricated actor of any kind
    expect(legacyBlock).not.toMatch(/founder|reviewer|system_actor|'00000000-0000/i)
    // recorded_at is server time; no row's own created_at/updated_at used as
    // the publication time, no hardcoded timestamp literal in the INSERT
    expect(legacyBlock).not.toMatch(/VALUES\s*\([^)]*\b(created_at|updated_at)\b/)
    expect(legacyBlock).not.toMatch(/VALUES\s*\([^)]*'20\d\d-\d\d-\d\dT/)
  })

  it('M7: no blanket DELIVERED-row migration anywhere in the file', () => {
    const oneLine = sql.replace(/\s+/g, ' ')
    expect(oneLine).not.toMatch(/INSERT INTO assessment_publications[^;]*SELECT[^;]*FROM assessments/i)
    expect(oneLine).not.toMatch(/FOR .* IN SELECT .* FROM assessments .* WHERE processing_status = 'DELIVERED'/i)
  })

  it('M8: ASSESS-007 is never referenced in executable SQL (comments may explain the exclusion)', () => {
    // strip -- line comments; ASSESS-007 may appear only in prose explaining
    // that it is deliberately NOT a target.
    const executable = stripSqlComments(sql)
    expect(executable).not.toContain('ASSESS-007')
    // and the only assessment_number the block references is ASSESS-005
    const referenced = [...new Set(legacyBlock.match(/ASSESS-\d{3}-\d{4}-\d{2}-\d{2}/g) ?? [])]
    expect(referenced).toEqual(['ASSESS-005-2026-07-12'])
  })
})

// ── Route command semantics source guards (C1–C10) ────────────────────────

describe('/publish route (CA-RLK-2g)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'api', 'admin', 'submissions', '[id]', 'publish', 'route.ts'),
    'utf8',
  )
  it('C1: requires authenticated admin', () => {
    expect(src).toContain('supabase.auth.getUser()')
    expect(src).toMatch(/\.from\(['"]users['"]\)\.select\(['"]is_admin['"]\)/)
    expect(src).toContain("{ error: 'Forbidden' }")
    expect(src).toContain("{ error: 'Unauthorized' }")
  })
  it('C2: requires DELIVERED', () => {
    expect(src).toContain("assessment.processing_status !== 'DELIVERED'")
  })
  it('C3/C4: basis + actor + time are server-derived; request supplies nothing', () => {
    expect(src).toContain('publishedBy: authUser.id')
    expect(src).not.toContain('request.json()')
    expect(src).toContain('createPublicationEpisode({')
  })
  it('C5: already-public publish is idempotent (no second row)', () => {
    expect(src).toContain('findActivePublication(assessment.id)')
    expect(src).toContain('alreadyPublished: true')
  })
  it('does not mutate assessment / institutional_status / sign-off / workbook / provenance', () => {
    // no write to the assessments table, no institutional_status / processing_status assignment
    expect(src).not.toMatch(/\.from\(['"]assessments['"]\)\s*\.update/)
    expect(src).not.toMatch(/institutional_status\s*:/)
    expect(src).not.toMatch(/processing_status\s*:/)
    expect(src).not.toContain('transitionProcessingStatus')
  })
})

describe('/revoke-publication route (CA-RLK-2g)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'api', 'admin', 'submissions', '[id]', 'revoke-publication', 'route.ts'),
    'utf8',
  )
  it('C6: requires authenticated admin', () => {
    expect(src).toContain("{ error: 'Forbidden' }")
  })
  it('C7: requires a non-empty reason', () => {
    expect(src).toContain("error: 'reason_required'")
  })
  it('C8: changes only the publication episode', () => {
    expect(src).toContain('revokeActivePublication({')
  })
  it('C9: does not touch processing_status / institutional_status / sign-off / workbook / provenance', () => {
    expect(src).not.toMatch(/processing_status\s*:/)
    expect(src).not.toMatch(/institutional_status\s*:/)
    expect(src).not.toContain('transitionProcessingStatus')
    expect(src).not.toMatch(/\.from\(['"]assessments['"]\)\s*\.update/)
  })
  it('idempotent: no active episode → already-revoked success', () => {
    expect(src).toContain('alreadyRevoked: true')
  })
})

describe('republish (C10)', () => {
  it('createPublicationEpisode always writes EXPLICIT_AUTHORIZATION — a republish is a fresh explicit act', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'assessments', 'repository.ts'),
      'utf8',
    )
    expect(src).toContain("publication_basis: 'EXPLICIT_AUTHORIZATION'")
    // revoke UPDATEs the active row (by id, while still active); it does not delete history
    expect(src).toMatch(/\.update\(\{[\s\S]*revoked_at:[\s\S]*\}\)[\s\S]*\.eq\('id', active\.id\)/)
    expect(src).not.toContain('.delete()')
  })
})

// ── Public page projection (UI1/UI5/UI6) ───────────────────────────────────

describe('public assessment page (CA-RLK-2g)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'assessment', '[assessment_number]', 'page.tsx'),
    'utf8',
  )
  it('UI1: publicly visible is_system_test record gets a prominent lead banner (not only the footer)', () => {
    expect(src).toContain('assessment.is_system_test && <SystemTestBanner />')
    expect(src).toContain('Internal SI8 Demonstration / System Test')
  })
  it('UI5/record: renders a tombstone for the tombstone result kind', () => {
    expect(src).toContain("result.kind === 'tombstone'")
    expect(src).toContain('<PublicationRevoked')
  })
  it('UI6: tombstone does not expose substantive content', () => {
    // The PublicationRevoked component receives only VerificationTombstoneData
    // (assessment_number, revoked_at, institutional_status). It must not read
    // outcome / methodology / reviewer_organization / asset_title / domain / reason.
    const start = src.indexOf('function PublicationRevoked')
    const body = src.slice(start, start + 2000)
    for (const forbidden of ['outcome', 'methodology_version', 'reviewer_organization', 'asset_title', 'scope_domain_codes', 'revoked_reason', 'is_system_test']) {
      expect(body).not.toContain(forbidden)
    }
  })
})

describe('vocabulary', () => {
  it('exactly two publication bases', () => {
    expect([...PUBLICATION_BASES]).toEqual(['EXPLICIT_AUTHORIZATION', 'LEGACY_DELIVERED_MIGRATION'])
  })
})
