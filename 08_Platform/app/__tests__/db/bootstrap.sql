-- CAA-SECURITY-3B DB tests — minimal Supabase-shaped environment.
-- Mirrors only what the payment ledger migration depends on, with the
-- production constraint vocabulary (read-only production check, 2026-10-21)
-- and Supabase's default privileges (so the migration's REVOKEs are tested).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE TABLE public.users (
  id       uuid PRIMARY KEY,
  email    text NOT NULL UNIQUE,
  name     text,
  is_admin boolean DEFAULT false
);

CREATE TABLE public.submissions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                      text NOT NULL DEFAULT 'Test Film',
  filmmaker_name             text NOT NULL DEFAULT 'Tester',
  tier                       text NOT NULL DEFAULT 'certified'
                               CHECK (tier IN ('creator_record', 'certified', 'si8_certified')),
  status                     text DEFAULT 'pending'
                               CHECK (status IN ('pending', 'under_review', 'info_requested', 'approved', 'rejected')),
  payment_status             text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  stripe_payment_intent_id   text,
  stripe_checkout_session_id text,
  amount_paid                integer,
  tools_used                 jsonb,
  authorship_statement       text,
  likeness_confirmation      boolean,
  ip_confirmation            boolean,
  territory_preferences      jsonb,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rights_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  document_url  text
);

-- Production: anon/authenticated have no direct grants on these tables.
REVOKE ALL ON public.users, public.submissions, public.rights_packages FROM anon, authenticated;
