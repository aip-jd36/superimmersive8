-- CR-V2-DOC-2C-B — Creator Record v2 examination runs: synthetic-only, isolated-environment persistence (envelope v2).
-- ADDITIVE except a defaulted `purpose` column and an insert guard on creator_record_v2_evidence_access_log (DOC-1 download rows unchanged).
--
-- Requires 20261103000000 (DOC-1). Targets the committed DOC-2B contract at cc0db608 (envelope v2).
--
-- AUTHORITY MODEL
--   * EXECUTION authority = an operator-established ENVIRONMENT MARKER (creator_record_v2_examination_environment).
--     No API role can read or write it. This migration never creates it. In Production it must stay absent, so
--     every examination write (and every examination-purpose read log) is refused there, by the database.
--     It is created only by isolated-test tooling (local PostgreSQL tests; the staging script, which refuses the
--     Production ref and any non-empty database). Its project ref may never be the Production ref (CHECK).
--   * CONTENT recognition = creator_record_v2_synthetic_fixtures: the committed fixture bytes AND their committed
--     recorded outputs (recording_sha256). A content precondition only, never authority: the generator is public.
--   * WORKFLOW authorization stays 'not_established' (envelope v2); nothing here establishes it.
--   LIMITATION: the database cannot observe which environment it runs in. The marker carries the operator's /
--   tooling's decision. It is unforgeable by service_role, anon, authenticated and application code; it is NOT a
--   defence against the database operator (postgres), who can also drop any function here.
--
-- AUDIT: a run requires an unconsumed, recent, examination-purpose access-log row for the same document and owner.
-- That is EVENT CORRELATION (the server logged an examination read before persisting), not database proof that
-- object bytes were read. DOC-1 download rows keep their exact current behaviour.
--
-- Not decided here (therefore not possible): run deletion, retention or expiry; record linking (DOC-2D);
-- admissibility (DOC-2E); customer or Production authority; live execution.
--
-- Apply inside the transactional wrapper (BEGIN … self-check … COMMIT). The Production self-check must assert that
-- the environment marker is ABSENT. ROLLBACK (only while no run and no examination-purpose read exists): drop the
-- objects below and the `purpose` column; the DB test suite exercises the exact rollback statements and its guard.

-- ── 0. Exact-key helper (pure) ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_jsonb_exact_keys(p_obj jsonb, p_keys text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_typeof(p_obj) = 'object'
     AND (SELECT coalesce(array_agg(k ORDER BY k), '{}'::text[]) FROM jsonb_object_keys(CASE WHEN jsonb_typeof(p_obj) = 'object' THEN p_obj ELSE '{}'::jsonb END) k)
       = (SELECT array_agg(x ORDER BY x) FROM unnest(p_keys) x)
$$;

-- ── 1. Environment marker: the execution-authority boundary ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_record_v2_examination_environment (
  singleton             boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  environment_kind      text NOT NULL CHECK (environment_kind IN ('isolated_synthetic_test')),
  supabase_project_ref  text NOT NULL CHECK (supabase_project_ref ~ '^[a-z0-9]{20}$' AND supabase_project_ref <> 'lehqgcgnenwdmuzudbrs'),
  established_by        text NOT NULL CHECK (length(trim(established_by)) > 0),
  reason                text NOT NULL CHECK (length(trim(reason)) > 0),
  established_at        timestamptz NOT NULL DEFAULT now()
);

-- The marker cannot be repurposed; it can only be removed (removal only narrows authority).
CREATE OR REPLACE FUNCTION public.creator_record_v2_examination_environment_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'the examination environment marker cannot be changed; remove it and establish a new one' USING ERRCODE = 'P0001';
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_examination_environment_guard ON public.creator_record_v2_examination_environment;
CREATE TRIGGER creator_record_v2_examination_environment_guard
  BEFORE UPDATE ON public.creator_record_v2_examination_environment
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_environment_guard();

-- ── 2. Committed synthetic fixtures: bytes AND recorded output (content recognition only) ────────────

CREATE TABLE IF NOT EXISTS public.creator_record_v2_synthetic_fixtures (
  sha256            char(64) PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  fixture_set       text NOT NULL CHECK (fixture_set ~ '^[a-z0-9][a-z0-9._/-]{0,99}$'),
  fixture_id        text NOT NULL CHECK (fixture_id ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  recording_sha256  char(64) NOT NULL CHECK (recording_sha256 ~ '^[0-9a-f]{64}$'),
  UNIQUE (fixture_set, fixture_id)
);

-- receipt-fixtures-v2: must equal lib/creator-record/evidence/replay-fixtures.data.ts, with recording_sha256 =
-- sha256Hex(canonicalJson(parsed_output)) (static test).
INSERT INTO public.creator_record_v2_synthetic_fixtures (sha256, fixture_set, fixture_id, recording_sha256) VALUES
  ('7f9ff947c9d00b08f4cb1438b16af5b7b717aff127afc4e0da0b556af776ad38', 'receipt-fixtures-v2/oracle-replay', 'conflict-current-plan-vs-charge-line', '4a37e0f2106d81455802317581e9914431ff8143b723d2dfb8b6f785bc59b0a6'),
  ('3a037f1fe9b2c027e3ba5885b7cf58699478937ffc5121db76669b257f559ab3', 'receipt-fixtures-v2/oracle-replay', 'conflict-date-after-production', 'aeab706e592d5b8688ae8b4684cd5d974a4119de1163e2f881bc1067926fea68'),
  ('7a0612c354d53ec78875b7a4a96ce42c169bbd9ee4ad08bdd593c46410ccc1ae', 'receipt-fixtures-v2/oracle-replay', 'conflict-lookalike-issuer', '4c8be1528eeba0c01377f8c29170bea44c8a6ee5c77cea4b4e4374cedcea1f19'),
  ('8674e8a06e0443c0b755f517937ebdf854ba883c25bcf10e44ade1d747c40198', 'receipt-fixtures-v2/oracle-replay', 'conflict-other-provider', '9d3d86d3aba82c5304d4deeef8a80f7f17a1753f28069a0028af6a31ce07b5e9'),
  ('1fb7031af4b445348f042a9d11595b9b27395f6662b25568c3d89c8b167b7efe', 'receipt-fixtures-v2/oracle-replay', 'conflict-period-shorter-than-production', 'f6011026df8d37ee6fcd4f001ff97721fced6c644e43ca8a4744d2975c19a072'),
  ('bfa067e9a2884e529ae0046323a942aff15832cd6e825cdc48c44ef6401510ba', 'receipt-fixtures-v2/oracle-replay', 'conflict-reseller-merchant', 'dba52ee8654a0f164beb88db367bd43cc1ea54687c649824b1c7fae29253940e'),
  ('6e36e697411e38f6e72c0e270ea5b9c3e04cd7aa52f128dbce2a7123194ae211', 'receipt-fixtures-v2/oracle-replay', 'conflict-two-plan-names', '1799b031a082f0101356b43841449c897eb249eef6d9fe20dd475d81ef0223e5'),
  ('5f9ff6828a9e89b5486d6b6172fa075b0d63c766745c6c3432a607a01369deeb', 'receipt-fixtures-v2/oracle-replay', 'inject-hidden-text-layer', 'fcc454634fb5c721fe9039b1cd46fd6b214af8b3b6a0b36241329d47c1cc023b'),
  ('6f05d4c41ad28a77db94c252168fbd66133f3162f8fc7f7211cf886e37ad2053', 'receipt-fixtures-v2/oracle-replay', 'inject-pricing-page-claims-invoice', '5bd42e73b31abcdf1e05cf156c480a2dcfa34948f156789c2645bf65bff58222'),
  ('23d6fca370380e1bd58e56541e572508de3b109cb0445042163b6458675df0d5', 'receipt-fixtures-v2/oracle-replay', 'inject-visible-instructions', 'c5fca713d31830182a9cc77a5eb115faf202a097ce335440d812da6f58b9f944'),
  ('8878ec74cf5faa316e1ac56f96a00f6b8b8522b641fb26b01aa29a0289df6906', 'receipt-fixtures-v2/oracle-replay', 'missing-amount-only-receipt', '5bb68ee5e9e3e7708253a4ceba4917317378255eb1b75a75a2e8358fb9a02b31'),
  ('7f01a171d65d9afb6a2ec2746a560c68eb4f61fffc68f46c985861742dd03cf9', 'receipt-fixtures-v2/oracle-replay', 'missing-generic-subscription-line', 'a51aff791706481355e3dd7d2d3c710f2b663ecd1c5ee0a52d107caea5bc35ce'),
  ('6d929c002cb99abbd6fa7d58010c353060443bc25445bf5edb6c32bc433b472d', 'receipt-fixtures-v2/oracle-replay', 'missing-no-date', '734d26b7e86c8ac5e2280344e6c716f82109204d03e2017d27e8fc9b3a5bd55d'),
  ('93e143aade31f1ca9e44607fd9a06b71fc57fd8c9f603134ce8cf95dd12e0e83', 'receipt-fixtures-v2/oracle-replay', 'missing-no-issuer', '90d2cd6c0b72483e99429c7f21b1767a12f74e63dd5c12d8c1990fb73c8bda17'),
  ('924d1acb812a0acb217734d18a7d3c01540898236a68dd824c34116a02fae23f', 'receipt-fixtures-v2/oracle-replay', 'missing-period-end', '6f42122107d52269c16b1452e5241f2dccce615f049f6ea6ddb52231ba7ab74b'),
  ('d64a6ce7fdf1f8ff0bf4c49a8470a6deb45e9517a9a332d9398b5c98bdb0d627', 'receipt-fixtures-v2/oracle-replay', 'nonreceipt-abstract-photo', 'c01e1094c99f94b496c6a1b067e1c71ea92986b1c59742703467bfe2ebb49c74'),
  ('bd3a1db57f99781e18f3336479ed2d5256a0e6e98a0b658d6f92a8566eca909f', 'receipt-fixtures-v2/oracle-replay', 'nonreceipt-contract-excerpt', 'c01e1094c99f94b496c6a1b067e1c71ea92986b1c59742703467bfe2ebb49c74'),
  ('05b993160a68be300b3424260885c7fc27a1ecc7536cb4cf1a69de0088a9781a', 'receipt-fixtures-v2/oracle-replay', 'nonreceipt-marketing-page', 'c01e1094c99f94b496c6a1b067e1c71ea92986b1c59742703467bfe2ebb49c74'),
  ('761a6a690a299d51bf8112554b56a4a67183a111f0da4aa115201984c1fe325e', 'receipt-fixtures-v2/oracle-replay', 'nonreceipt-pricing-page', 'c01e1094c99f94b496c6a1b067e1c71ea92986b1c59742703467bfe2ebb49c74'),
  ('5aa3a177fec0d5b07f4be861f213bf08593e969f235ad31b9e92f56553355825', 'receipt-fixtures-v2/oracle-replay', 'pdf-elevenlabs-creator', 'bdf1b37e5dbb76cd48d232b94c6d6e84d8a892fee8835f4b84de90a928deb483'),
  ('3148d52df765fe00d3357f4f063802273e08a01dce6ed8d495841b87734e814f', 'receipt-fixtures-v2/oracle-replay', 'pdf-higgsfield-day-month-format', '8a122b3bfbced2f8140db3a9e928b5a430ea347559a8a05b74a94c215f4adf51'),
  ('4db805768f966b748098e3890d9a8c4a76ed12e46609aaeccb8902733563501c', 'receipt-fixtures-v2/oracle-replay', 'pdf-kling-pro-monthly', '64c7129795dfddf9b9990c285d53324b1fc5825b24b4519556d0c1a4ca096d87'),
  ('226eecd824ee81c53981fe7e500dcb84d40e2e5af6c4ee342c6e533ef38af5a4', 'receipt-fixtures-v2/oracle-replay', 'pdf-luma-plus-monthly', '24a02a40771b1e1030ff68d05f5caca2cfd99d632438c259fa8f0687b674d53d'),
  ('f129f328d0f50cdebce9d750de9a7e403b01aa5df101967eb6ff69c92e13eef5', 'receipt-fixtures-v2/oracle-replay', 'pdf-midjourney-standard-annual', '6f5f766cb9b0d90bd7dc1145a06a82d306b8b07cb04377d820ba3926d0c7c047'),
  ('f72f878167e7583a042187a6827a4b20a3a6424dcf01ada5d88c60239ccbc03c', 'receipt-fixtures-v2/oracle-replay', 'pdf-pika-pro-no-period', '6c7a77991a7c36b628564c6b24609b1a5bb45b9a697118fd7dba8cf11c6fa950'),
  ('3c884fed0bf6d65e6bceab38f7135ffdf44390c572d1456fe3c01e2a559181f2', 'receipt-fixtures-v2/oracle-replay', 'pdf-pro-repeated-descriptions', 'a1160ba18f20d1f930c2eec80f9a3071944bdb1ee7b3655231f7658acb8fcac9'),
  ('ec1578d24de83b4cd022779538685d1cc2ee3d980383a3f78d503c96c9ad569d', 'receipt-fixtures-v2/oracle-replay', 'pdf-runway-standard-monthly', 'fcc454634fb5c721fe9039b1cd46fd6b214af8b3b6a0b36241329d47c1cc023b'),
  ('44b96c49611baa9fbe340ff8356db5410455e6566f31c71423171b78063c0d1c', 'receipt-fixtures-v2/oracle-replay', 'pdf-runway-unlimited-annual-with-tax', '992170b0ffff93e7b7f2b2e7bf48e045b5b99b1e35db0842a1b9f79c69e51f88'),
  ('31222174b86048609a4027dd130a4882af197d465f298c1a29c0cbf42144295c', 'receipt-fixtures-v2/oracle-replay', 'photo-elevenlabs-low-resolution', '9ebe0593ae8752ffd9603b66b6d69674300107d0c3737170d80505d1ef05e443'),
  ('a95c4b7224c2607308b268732e2aac0e493e05c98d75bb82f0b9fb0ba1d2e448', 'receipt-fixtures-v2/oracle-replay', 'photo-glare-over-date', 'f48516b2a133e36a00bbc8408626cd1d44af2d1022de1daa465b1c035fa71520'),
  ('a1970ec723ddc3e1ec1423335c4492af9891121a2ba15fe11757f65a9fdf9f77', 'receipt-fixtures-v2/oracle-replay', 'photo-kling-dim', '3458dea433ae4d0b62fba1ee6e4ce0f90a8c2fd8647efd5b6b658dd32553f36f'),
  ('5d9eaadb68a79e04353d32cd8fcd65ad703452d3634dc5efe738dc06fbd56e77', 'receipt-fixtures-v2/oracle-replay', 'photo-luma-shadow', '24a02a40771b1e1030ff68d05f5caca2cfd99d632438c259fa8f0687b674d53d'),
  ('869daa539b4cb249d4bbdca5107bf6ab21b454b226cbda7e04aeaa32ee273801', 'receipt-fixtures-v2/oracle-replay', 'photo-pika-sideways', '6c7a77991a7c36b628564c6b24609b1a5bb45b9a697118fd7dba8cf11c6fa950'),
  ('190995abf846ec1cfbcb8d88df36406ba33f7eeb552fe7cb7ae75c9ce785aa31', 'receipt-fixtures-v2/oracle-replay', 'photo-runway-rotated', 'fcc454634fb5c721fe9039b1cd46fd6b214af8b3b6a0b36241329d47c1cc023b'),
  ('7729f1b726bd9cee86dc67886f2d17303bea81a96cca36a94b2e67c2f05864e7', 'receipt-fixtures-v2/oracle-replay', 'shot-elevenlabs-no-date-column', '3097a33f89adf8500eb6b63560293b7c5291bbd05a34affd421b1186f6d2ded6'),
  ('ef9503875c12f600d168e8169f74000e19b0f05d0affa2e226f9ca1489f6726e', 'receipt-fixtures-v2/oracle-replay', 'shot-history-plan-change', '02f6a08c20d0975ad9c760713360361b86e99ad065c07a178b17d91d6b4bebea'),
  ('6e37d2b8882dffb123853b6ece19a853a6f0987c705994731b196a2444fe4b46', 'receipt-fixtures-v2/oracle-replay', 'shot-kling-confirmation-email', '4e950a513aed5a694ea75ed45c0895e851184c485105dd846e7e9d593e634a3a'),
  ('386a3211247fdbc8651f29460a607c5485c10b3725c598e015099002f0427fd3', 'receipt-fixtures-v2/oracle-replay', 'shot-luma-ambiguous-date', '9478200d620e72ec3b2ca84ab19885df08c683aa033792ae6f65e6791ec25b30'),
  ('9b0dbe30b7afeb2cac691d16ddc41140127b675ffb5aefd17ae88b863fcf713a', 'receipt-fixtures-v2/oracle-replay', 'shot-midjourney-plan-change', '92f84acc74fd71c0ba5cbf5479ea7c93e657e0bc6be9f58aee47737504924fd0'),
  ('57576c4e5bac9700984896b167b3d7b34ef41bf8cae8a154b03a9feeec835acd', 'receipt-fixtures-v2/oracle-replay', 'shot-pika-multiple-payments', 'e38d41a7398a852b780cb5f250e57fbeb4495dbb255abc71a4dc50e3b63de86c'),
  ('7866e9765712f58d9594fee8edd4c5742967a1ce33db2c3b8c3a3595ae0fa48a', 'receipt-fixtures-v2/oracle-replay', 'shot-runway-billing-history', '4db5b4bf66c8f4b5c316944f309828a7558b5dce2bdc5e9f474b2b3da8f59112'),
  ('068fcc5bde917edadbdbe83cc191efb4d2abaa273cf8c2ca837b1342205b634b', 'receipt-fixtures-v2/oracle-replay', 'shot-truncated-plan-name', 'cd0ae72aa0f43ad932817e09f09c2957ca392f357f41613588d93ab5176eca45'),
  ('c9ee8a42dbbe8747a322b3391fc01e5a5e0eda3218087b5e1a8d44aea64883e5', 'receipt-fixtures-v2/oracle-replay', 'unreadable-dark-image', '6bed37d1a1793d2e4fe8f52d32b88eefd27806b4979c94922e22fe12d44ecb28'),
  ('1d27ef18afd098a6a60d80e1379c0483b741f371724ecf4429ce8d4f611ebbd7', 'receipt-fixtures-v2/oracle-replay', 'unreadable-heavy-blur', '6bed37d1a1793d2e4fe8f52d32b88eefd27806b4979c94922e22fe12d44ecb28'),
  ('a1b905aee3aa9a2533dab0fef20abc86a664ed7c4ca6d383532f045afca5fca0', 'receipt-fixtures-v2/oracle-replay', 'unreadable-tiny-thumbnail', '6bed37d1a1793d2e4fe8f52d32b88eefd27806b4979c94922e22fe12d44ecb28')
ON CONFLICT (sha256) DO NOTHING;

-- ── 3. Access log: examination-purpose reads (DOC-1 download rows unchanged) ─────────────────────────

ALTER TABLE public.creator_record_v2_evidence_access_log
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'file_download';
ALTER TABLE public.creator_record_v2_evidence_access_log
  DROP CONSTRAINT IF EXISTS creator_record_v2_evidence_access_log_purpose_check;
ALTER TABLE public.creator_record_v2_evidence_access_log
  ADD CONSTRAINT creator_record_v2_evidence_access_log_purpose_check CHECK (purpose IN ('file_download', 'examination'));

-- SECURITY DEFINER so the guard can read the marker, which no API role can; EXECUTE revoked (trigger only).
CREATE OR REPLACE FUNCTION public.creator_record_v2_evidence_access_log_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.purpose = 'examination' THEN
    NEW.accessed_at := now();  -- server time: the correlation window cannot be back- or forward-dated
    IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment WHERE singleton) THEN
      RAISE EXCEPTION 'examination reads are not authorized in this environment' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.actor_role <> 'owner' OR NOT EXISTS (
         SELECT 1 FROM public.creator_record_v2_documents d
         WHERE d.id = NEW.document_id AND d.user_id = NEW.actor_user_id AND d.state = 'stored') THEN
      RAISE EXCEPTION 'an examination read is logged only for the owner of a stored document' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;  -- 'file_download' rows: exactly as before (no field changed)
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_evidence_access_log_insert_guard ON public.creator_record_v2_evidence_access_log;
CREATE TRIGGER creator_record_v2_evidence_access_log_insert_guard
  BEFORE INSERT ON public.creator_record_v2_evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_evidence_access_log_insert_guard();

-- ── 4. Examination runs (envelope v2) ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_record_v2_examination_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_key         char(64) NOT NULL UNIQUE CHECK (examination_key ~ '^[0-9a-f]{64}$'),
  document_id             uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_sha256         char(64) NOT NULL CHECK (document_sha256 ~ '^[0-9a-f]{64}$'),
  envelope_version        integer NOT NULL CHECK (envelope_version = 2),
  content_class           text NOT NULL CHECK (content_class = 'known_synthetic_fixture'),
  workflow_authorization  text NOT NULL CHECK (workflow_authorization = 'not_established'),
  execution_boundary      text NOT NULL CHECK (execution_boundary = 'isolated_synthetic_test'),
  environment_project_ref text NOT NULL CHECK (environment_project_ref ~ '^[a-z0-9]{20}$' AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs'),
  profile_id              text NOT NULL CHECK (profile_id ~ '^[a-z][a-z0-9_-]{0,39}$'),
  profile_version         integer NOT NULL CHECK (profile_version >= 1),
  schema_version          text NOT NULL CHECK (schema_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  prompt_version          text NOT NULL CHECK (prompt_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  executor_mode           text NOT NULL CHECK (executor_mode = 'fixture_replay'),
  replay_set              text NOT NULL CHECK (replay_set ~ '^[a-z0-9][a-z0-9._/-]{0,99}$'),
  recording_sha256        char(64) NOT NULL CHECK (recording_sha256 ~ '^[0-9a-f]{64}$'),
  replay_fixture_id       text NOT NULL CHECK (replay_fixture_id ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  outcome_status          text NOT NULL CHECK (outcome_status IN ('examined', 'could_not_examine')),
  outcome_reason          text CHECK (outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_error', 'structured_output_missing', 'schema_invalid')),
  envelope_canonical      text NOT NULL CHECK (length(envelope_canonical) BETWEEN 2 AND 262144),
  envelope_sha256         char(64) NOT NULL UNIQUE CHECK (envelope_sha256 ~ '^[0-9a-f]{64}$'),
  supersedes_id           uuid UNIQUE REFERENCES public.creator_record_v2_examination_runs(id) ON DELETE RESTRICT,
  access_log_id           bigint NOT NULL UNIQUE REFERENCES public.creator_record_v2_evidence_access_log(id) ON DELETE RESTRICT,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CHECK ((outcome_status = 'examined') = (outcome_reason IS NULL)),
  CHECK (supersedes_id IS NULL OR supersedes_id <> id)
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_record_v2_examination_runs_root_idx
  ON public.creator_record_v2_examination_runs (document_id, profile_id) WHERE supersedes_id IS NULL;
CREATE INDEX IF NOT EXISTS creator_record_v2_examination_runs_owner_idx
  ON public.creator_record_v2_examination_runs (user_id, document_id);

-- Runs and fixtures never change: every UPDATE and DELETE is refused. A dedicated guard, not the shared DOC-1
-- creator_record_v2_append_only_guard(): that function reads OLD.prepared_id on DELETE, which fails with 42703
-- (still refusing) for tables without that column. This guard reads no column. (TRUNCATE does not fire row
-- triggers: no API role holds TRUNCATE; the database operator can still truncate.)
CREATE OR REPLACE FUNCTION public.creator_record_v2_examination_append_only_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_examination_runs_append_only ON public.creator_record_v2_examination_runs;
CREATE TRIGGER creator_record_v2_examination_runs_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_examination_runs
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();
DROP TRIGGER IF EXISTS creator_record_v2_synthetic_fixtures_append_only ON public.creator_record_v2_synthetic_fixtures;
CREATE TRIGGER creator_record_v2_synthetic_fixtures_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_synthetic_fixtures
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- ── 5. The only write path ───────────────────────────────────────────────────────────────────────────
-- Every argument is untrusted, including a service-role-submitted envelope. Result: 'created' or 'existing'
-- (same key AND byte-identical envelope). Fixed refusals (P0001): examination_environment_not_authorized,
-- examination_envelope_invalid, examination_key_mismatch, examination_access_not_logged,
-- examination_document_mismatch, examination_content_not_recognized, examination_key_conflict,
-- examination_profile_regression.

CREATE OR REPLACE FUNCTION public.creator_record_v2_record_examination(p_access_log_id bigint, p_envelope text)
RETURNS TABLE (run_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_marker    public.creator_record_v2_examination_environment%ROWTYPE;
  v_env       jsonb;
  v_log       public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc       public.creator_record_v2_documents%ROWTYPE;
  v_fixture   public.creator_record_v2_synthetic_fixtures%ROWTYPE;
  v_existing  public.creator_record_v2_examination_runs%ROWTYPE;
  v_head      public.creator_record_v2_examination_runs%ROWTYPE;
  v_has_head  boolean;
  v_key       text;
  v_id        uuid;
  k           text;
BEGIN
  -- (a) Execution authority first: nothing else is even parsed outside an established isolated environment.
  SELECT * INTO v_marker FROM public.creator_record_v2_examination_environment WHERE singleton;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'examination_environment_not_authorized' USING ERRCODE = 'P0001';
  END IF;

  -- (b) Envelope v2: parse, then exact keys at every level, closed vocabularies, typed scalars.
  IF p_envelope IS NULL OR length(p_envelope) NOT BETWEEN 2 AND 262144 THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  BEGIN
    v_env := p_envelope::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END;
  IF NOT coalesce(
       public.creator_record_v2_jsonb_exact_keys(v_env, ARRAY['envelope', 'examination_key', 'identity', 'document', 'content_class', 'workflow_authorization', 'profile', 'executor', 'outcome', 'observations', 'limitations', 'provenance'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'envelope', ARRAY['id', 'version'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'document', ARRAY['document_id', 'sha256', 'media_type', 'byte_size'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'profile', ARRAY['id', 'version', 'schema', 'prompt'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'executor', ARRAY['mode', 'replay_set', 'recording_sha256'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'outcome', ARRAY['status', 'reason'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'provenance', ARRAY['integrity', 'replay_fixture_id', 'engine_attempts', 'model_calls', 'prompt_sent'])
       AND jsonb_typeof(v_env -> 'observations') = 'array'
       AND jsonb_typeof(v_env -> 'limitations') = 'array', false) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF NOT coalesce(
       v_env #>> '{envelope,id}' = 'si8/creator-record-v2-examination'
       AND v_env #> '{envelope,version}' = '2'::jsonb
       AND v_env ->> 'identity' = 'deterministic_replay_key'
       AND v_env ->> 'content_class' = 'known_synthetic_fixture'
       AND v_env ->> 'workflow_authorization' = 'not_established'
       AND jsonb_typeof(v_env -> 'examination_key') = 'string' AND v_env ->> 'examination_key' ~ '^[0-9a-f]{64}$'
       AND jsonb_typeof(v_env #> '{document,document_id}') = 'string' AND v_env #>> '{document,document_id}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND jsonb_typeof(v_env #> '{document,sha256}') = 'string' AND v_env #>> '{document,sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{document,media_type}' IN ('application/pdf', 'image/png', 'image/jpeg')
       AND jsonb_typeof(v_env #> '{document,byte_size}') = 'number' AND v_env #>> '{document,byte_size}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,id}') = 'string' AND v_env #>> '{profile,id}' ~ '^[a-z][a-z0-9_-]{0,39}$'
       AND jsonb_typeof(v_env #> '{profile,version}') = 'number' AND v_env #>> '{profile,version}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,schema}') = 'string' AND v_env #>> '{profile,schema}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND jsonb_typeof(v_env #> '{profile,prompt}') = 'string' AND v_env #>> '{profile,prompt}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,mode}' = 'fixture_replay'
       AND jsonb_typeof(v_env #> '{executor,replay_set}') = 'string' AND v_env #>> '{executor,replay_set}' ~ '^[a-z0-9][a-z0-9._/-]{0,99}$'
       AND jsonb_typeof(v_env #> '{executor,recording_sha256}') = 'string' AND v_env #>> '{executor,recording_sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{provenance,integrity}' = 'sha256_size_and_type_rechecked'
       AND jsonb_typeof(v_env #> '{provenance,replay_fixture_id}') = 'string' AND v_env #>> '{provenance,replay_fixture_id}' ~ '^[a-z0-9][a-z0-9-]{0,99}$'
       AND jsonb_typeof(v_env #> '{provenance,engine_attempts}') = 'number' AND v_env #>> '{provenance,engine_attempts}' ~ '^[0-9]{1,3}$'
       AND v_env #> '{provenance,model_calls}' = '0'::jsonb
       AND v_env #> '{provenance,prompt_sent}' = 'false'::jsonb
       AND ((v_env #>> '{outcome,status}' = 'examined' AND v_env #> '{outcome,reason}' = 'null'::jsonb)
            OR (v_env #>> '{outcome,status}' = 'could_not_examine'
                AND v_env #>> '{outcome,reason}' IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_error', 'structured_output_missing', 'schema_invalid')
                AND jsonb_array_length(v_env -> 'observations') = 0))
       AND (v_env -> 'limitations') @> '["recorded_test_data_not_model_output", "observations_not_verified"]'::jsonb, false) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- Limitations: closed vocabulary, strings, no duplicates.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'limitations') l
             WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR l #>> '{}' NOT IN (
               'recorded_test_data_not_model_output', 'observations_not_verified', 'no_location_reference', 'fields_not_established',
               'single_plan_reading_does_not_exclude_others', 'multiple_plans_shown', 'instruction_like_text_present',
               'not_a_billing_document', 'partially_legible', 'illegible'))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'limitations')) <> (SELECT count(DISTINCT l) FROM jsonb_array_elements(v_env -> 'limitations') l) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- Observations: exact keys, closed vocabularies, value iff present, same document, id prefixed by the key.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'observations') o
             WHERE NOT coalesce(
                   public.creator_record_v2_jsonb_exact_keys(o, ARRAY['observation_id', 'field', 'qualifier', 'basis', 'status', 'value', 'excerpt', 'source', 'verification', 'origin'])
               AND public.creator_record_v2_jsonb_exact_keys(o -> 'source', ARRAY['document_sha256', 'location'])
               AND jsonb_typeof(o -> 'field') = 'string' AND length(o ->> 'field') BETWEEN 1 AND 100
               AND jsonb_typeof(o -> 'observation_id') = 'string'
               AND o ->> 'observation_id' = substr(v_env ->> 'examination_key', 1, 16) || ':' || (o ->> 'field') || ':' || substring(o ->> 'observation_id' FROM '[0-9]+$')
               AND o ->> 'observation_id' ~ ':[0-9]{1,4}$'
               AND jsonb_typeof(o -> 'qualifier') IN ('string', 'null')
               AND o ->> 'basis' IN ('printed_text', 'examiner_classification')
               AND o ->> 'status' IN ('present', 'not_shown', 'unreadable', 'ambiguous')
               AND ((o ->> 'status' = 'present' AND jsonb_typeof(o -> 'value') = 'string') OR (o ->> 'status' <> 'present' AND o -> 'value' = 'null'::jsonb))
               AND jsonb_typeof(o -> 'excerpt') IN ('string', 'null')
               AND o #>> '{source,document_sha256}' = v_env #>> '{document,sha256}'
               AND o #> '{source,location}' = 'null'::jsonb
               AND o ->> 'verification' = 'not_verified'
               AND o ->> 'origin' = 'fixture_replay_recorded', false))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'observations')) <> (SELECT count(DISTINCT o ->> 'observation_id') FROM jsonb_array_elements(v_env -> 'observations') o) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (c) Identity: the database RECOMPUTES the deterministic replay key from the validated (escape-free) fields,
  -- exactly as canonicalJson orders them (proved equal to examinationKey()).
  v_key := encode(sha256(convert_to(
    '{"document_id":"' || (v_env #>> '{document,document_id}')
    || '","envelope":{"id":"si8/creator-record-v2-examination","version":2},"executor":{"mode":"fixture_replay","recording_sha256":"'
    || (v_env #>> '{executor,recording_sha256}') || '","replay_set":"' || (v_env #>> '{executor,replay_set}')
    || '"},"profile":{"id":"' || (v_env #>> '{profile,id}') || '","prompt":"' || (v_env #>> '{profile,prompt}')
    || '","schema":"' || (v_env #>> '{profile,schema}') || '","version":' || (v_env #>> '{profile,version}')
    || '},"sha256":"' || (v_env #>> '{document,sha256}') || '"}', 'UTF8')), 'hex');
  IF v_key <> v_env ->> 'examination_key' THEN
    RAISE EXCEPTION 'examination_key_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (d) Audit-event correlation: a recent, unconsumed examination read logged for this document and its owner.
  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = p_access_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.purpose <> 'examination' OR v_log.actor_role <> 'owner'
     OR v_log.document_id::text <> v_env #>> '{document,document_id}'
     OR v_log.accessed_at < now() - interval '15 minutes' OR v_log.accessed_at > now()
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs r WHERE r.access_log_id = v_log.id) THEN
    RAISE EXCEPTION 'examination_access_not_logged' USING ERRCODE = 'P0001';
  END IF;

  -- (e) The document: stored, owned by the logged actor, exactly the bytes the envelope names.
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_log.document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> v_log.actor_user_id
     OR v_doc.sha256 <> v_env #>> '{document,sha256}'
     OR v_doc.byte_size::text <> v_env #>> '{document,byte_size}'
     OR v_doc.media_type <> v_env #>> '{document,media_type}' THEN
    RAISE EXCEPTION 'examination_document_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (f) Content recognition (precondition only, never authority): committed fixture bytes, set, id AND recording.
  SELECT * INTO v_fixture FROM public.creator_record_v2_synthetic_fixtures f
   WHERE f.sha256 = v_doc.sha256 AND f.fixture_set = v_env #>> '{executor,replay_set}';
  IF NOT FOUND OR v_fixture.fixture_id <> v_env #>> '{provenance,replay_fixture_id}'
     OR v_fixture.recording_sha256 <> v_env #>> '{executor,recording_sha256}' THEN
    RAISE EXCEPTION 'examination_content_not_recognized' USING ERRCODE = 'P0001';
  END IF;

  -- (g) Serialize per (document, profile id); idempotency and the head are decided under this lock.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_exam:' || v_doc.id::text || ':' || (v_env #>> '{profile,id}'), 0));

  SELECT * INTO v_existing FROM public.creator_record_v2_examination_runs r WHERE r.examination_key = v_key;
  IF FOUND THEN
    IF v_existing.envelope_canonical IS DISTINCT FROM p_envelope THEN
      RAISE EXCEPTION 'examination_key_conflict' USING ERRCODE = 'P0001';  -- never overwrite, never replace
    END IF;
    RETURN QUERY SELECT v_existing.id, 'existing'::text;
    RETURN;
  END IF;

  SELECT * INTO v_head FROM public.creator_record_v2_examination_runs r
   WHERE r.document_id = v_doc.id AND r.profile_id = v_env #>> '{profile,id}'
     AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs s WHERE s.supersedes_id = r.id);
  v_has_head := FOUND;
  IF v_has_head AND v_head.profile_version > (v_env #>> '{profile,version}')::integer THEN
    RAISE EXCEPTION 'examination_profile_regression' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_examination_runs (
    examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization,
    execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version,
    executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason,
    envelope_canonical, envelope_sha256, supersedes_id, access_log_id)
  VALUES (
    v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 2, 'known_synthetic_fixture', 'not_established',
    v_marker.environment_kind, v_marker.supabase_project_ref, v_env #>> '{profile,id}', (v_env #>> '{profile,version}')::integer,
    v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'fixture_replay', v_env #>> '{executor,replay_set}',
    v_env #>> '{executor,recording_sha256}', v_fixture.fixture_id, v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}',
    p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), CASE WHEN v_has_head THEN v_head.id END, v_log.id)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

-- ── 6. Access: RLS on, no policies; the marker is invisible to every API role ───────────────────────

ALTER TABLE public.creator_record_v2_examination_environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_synthetic_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_examination_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.creator_record_v2_examination_environment FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_synthetic_fixtures FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_examination_runs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_jsonb_exact_keys(jsonb, text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_environment_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_append_only_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_evidence_access_log_insert_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_examination(bigint, text) FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.creator_record_v2_synthetic_fixtures TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_examination_runs TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) TO service_role;
-- Unchanged from DOC-1: service_role keeps SELECT, INSERT (only) on creator_record_v2_evidence_access_log.
-- Deliberately NO grant of any kind on creator_record_v2_examination_environment.
