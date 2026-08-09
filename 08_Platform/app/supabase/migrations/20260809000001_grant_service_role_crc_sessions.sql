-- Migration: Grant service_role table-level access on crc_sessions
-- Date: 2026-08-09
--
-- Even with RLS enabled and service_role's own BYPASSRLS privilege, Postgres
-- still requires an explicit table-level GRANT before any role -- including
-- service_role -- can touch a table at all. This project's public schema
-- does not auto-grant that on newly created tables (the same issue this
-- project already hit once before, for a different set of tables -- see
-- 005_grant_service_role_permissions.sql in the older,
-- 08_Platform/supabase/migrations/ directory). Confirmed live: without
-- this grant, supabaseAdmin's own service_role key gets
-- "permission denied for table crc_sessions" (Postgres 42501) on every
-- query, identical in shape to the issue that migration fixed originally.

GRANT ALL ON public.crc_sessions TO service_role;
