-- ============================================================================
-- CAA-SECURITY-2A — Emergency assessment access lockdown (2026-10-15)
-- ============================================================================
--
-- Finding (CAA-SECURITY-1, confirmed in production via count-only anon HEAD
-- requests): the `assessments_public_select` policy (USING (true), created in
-- 20260712000000_create_assessments_table.sql) plus Supabase's default table
-- grants let the anon and authenticated roles read every row and every column
-- of `assessments` through PostgREST — including assessments that are not
-- DELIVERED and not published, bypassing the DELIVERED + active-publication
-- gate the public Assessment Record page enforces in application code.
--
-- Why nothing legitimate depends on that access: every application read and
-- write of `assessments` uses the service role (`supabaseAdmin`), which
-- bypasses RLS and is not affected by this change:
--   - lib/assessments/repository.ts (incl. findAssessmentForVerification,
--     which backs the public /assessment/[assessment_number] page)
--   - app/admin/submissions/[id]/page.tsx
--   - app/api/admin/submissions/[id]/approve/route.ts
--   - app/api/admin/submissions/[id]/delivery-files/route.ts
-- The public Assessment Record stays a server-rendered, service-role,
-- application-gated representation. The table itself is never public.
--
-- Scope: `assessments`, its numbering sequence, and the numbering function
-- only. No other table, policy, user permission, submission policy, or
-- payment logic is touched. `assessments_deny_delete` (restrictive) is kept.
--
-- APPLIED: executed manually in the production Supabase SQL Editor on
-- 2026-10-15 (PM-confirmed privilege checks: anon/authenticated cannot read,
-- service_role can; anon cannot execute the function or use the sequence).
-- Independently verified CAA-SECURITY-2B: anon REST HEAD → 401. Do not
-- re-run against production.
--
-- RECOVERY: never re-create a permissive anon/authenticated SELECT policy or
-- re-grant SELECT on this table to anon/authenticated. If a future feature
-- needs public data, expose a server-side, service-role, allowlisted path
-- (as findAssessmentForVerification already does), not table access.
-- ============================================================================

BEGIN;

-- 1. Remove the permissive public read policy.
DROP POLICY IF EXISTS "assessments_public_select" ON public.assessments;

-- 2. Remove all table privileges from the client-facing roles (RLS stays
--    enabled as a second layer; with no permissive policy it denies anyway).
REVOKE ALL ON TABLE public.assessments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.assessments TO service_role;

-- 3. Assessment numbering is service-role only (prevents anon/authenticated
--    from burning numbers via RPC or the sequence directly).
REVOKE EXECUTE ON FUNCTION public.generate_assessment_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_assessment_number() TO service_role;
REVOKE ALL ON SEQUENCE public.assessments_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.assessments_number_seq TO service_role;

COMMIT;
