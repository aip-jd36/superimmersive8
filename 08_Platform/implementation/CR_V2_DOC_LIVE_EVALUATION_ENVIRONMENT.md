# Creator Record V2: Isolated Evaluation Environment (CR-V2-DOC-LIVE-1C-B1)

**Status: PROCEDURE ONLY. No project has been created, and nothing here has been run against any remote database.** Following it does not authorize an evaluation; that needs the separate authorization in the evaluation protocol (`CR_V2_DOC_LIVE_EVALUATION_PROTOCOL.md`).

It describes how a dedicated, isolated Supabase project would be prepared for the controlled evaluation, how to verify it, and how to remove the evaluation schema again. Every SQL file it uses is in `08_Platform/app/supabase/evaluation-only/` and has been tested on disposable local PostgreSQL only.

## 1. What this environment is, and is not

- **A new, dedicated Supabase project** used for nothing else, holding no customer data, with no Stripe, Resend, Vercel or other production integration connected.
- **Never Production.** The Production project reference is `lehqgcgnenwdmuzudbrs`. Both environment markers refuse it, and the runner refuses it.
- **Destroyable.** The intended end state of the evaluation is that the whole project is deleted once results are recorded outside the repository.

## 2. Install

Every step is done by the operator, by hand, in the dashboard of the evaluation project. Stop at the first unexpected result.

1. **Create the project** in its own organization or with its own name, for example `si8-cr-eval-<date>`. Record its project reference from the dashboard URL (`https://supabase.com/dashboard/project/<ref>`). It must be 20 lowercase letters and digits and must not be `lehqgcgnenwdmuzudbrs`.
2. **Apply the migration chain** from `supabase/migrations`, in order, up to and including `20261108000000`, with the Supabase CLI linked to this project only (`supabase link --project-ref <ref>`, then confirm `supabase/.temp/project-ref` shows `<ref>`). Do not link the CLI to Production in the same shell.
3. **Establish the isolated-test marker** (it is needed for the examination read log, and the install guard requires it):

   ```sql
   INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason)
   VALUES ('isolated_synthetic_test', '<ref>', '<operator name>', 'CR-V2 live examination evaluation project');
   ```
4. **Install the evaluation schema**: run `20261109000000_creator_record_v2_live_evaluation.sql` in the SQL editor. It refuses to install unless the isolated-test marker exists and the project holds no rows in `submissions`, `rights_packages`, `payment_fulfillments`, `creator_record_artifacts`, `creator_record_artifact_uat` or `creator_record_v2_examination_uat_grants`, and no submitted prepared version.
5. **Establish the evaluation marker**, with the same reference:

   ```sql
   INSERT INTO public.creator_record_v2_live_evaluation_environment (supabase_project_ref, established_by, reason)
   VALUES ('<ref>', '<operator name>', 'CR-V2 live examination evaluation');
   ```
6. **Verify** (section 3). Only then would an authorization be written, which is a separate, approved step.

The install guard cannot observe which project it is in. It refuses any database that looks like anything other than an empty isolated project; the project reference check in steps 1, 5 and 3 is the operator's.

## 3. Verify

Run `verify_live_evaluation_environment.sql`. It only reads. Each row must show `ok = true`, and the last row, `ALL CHECKS`, must be true. Read its `detail` aloud against the dashboard URL.

| Check | Meaning |
|---|---|
| isolated-test marker present, not Production | Step 3 was done here |
| evaluation marker present, not Production, same project as the isolated-test marker | Step 5 was done here, with the same reference |
| every authorization names this project | No authorization for another environment exists |
| no customer, payment, issuance or UAT data | The project is empty of commercial data |
| all five evaluation tables exist with row level security on and no policy | RLS blocks every API role except the service role |
| anon and authenticated hold no privilege on any evaluation table | Ordinary users can read and write nothing |
| service_role holds SELECT only, and on the four tables other than the marker | The application cannot write authority, spend or results directly |
| only the four entry functions are executable, and only by service_role | The authority helper and guards are not callable |
| every evaluation function runs with a fixed search_path | No function can be redirected by a schema on the path |
| the 1A store still refuses live output | The deployed 1A function is unchanged |

The runner then checks the same identity again on every run: the reference in `NEXT_PUBLIC_SUPABASE_URL` must equal `CREATOR_RECORD_LIVE_EVALUATION_PROJECT_REF` and must not be Production, and the database requires the authorization to name its own evaluation marker.

## 4. Roll back

- **Remove the schema**, in this order, only if no authorization, reservation or result was ever written (those rows cannot be deleted, so the rollback refuses while they exist):
  1. Confirm the four data tables are empty: `SELECT (SELECT count(*) FROM public.creator_record_v2_live_evaluation_authorizations), (SELECT count(*) FROM public.creator_record_v2_live_evaluation_documents), (SELECT count(*) FROM public.creator_record_v2_live_evaluation_reservations), (SELECT count(*) FROM public.creator_record_v2_live_evaluation_attempts);` If any is not zero, do not roll back: retire the project instead (below).
  2. Delete the evaluation marker, which the rollback also requires to be empty: `DELETE FROM public.creator_record_v2_live_evaluation_environment;` (deleting is allowed; changing it is not).
  3. Run `rollback_20261109000000.sql`, in one transaction. It leaves the isolated-test marker and every other object in place.
- **Retire a project that holds results**: revoke its authorizations and delete the evaluation marker, which stops every evaluation function, or delete the whole project.
- **Undo the isolated-test marker**: `DELETE FROM public.creator_record_v2_examination_environment;` once nothing else needs it.

## 5. What this procedure does not establish

An authorization, consent, provider data terms, a workspace spending limit, the dedicated key, model compatibility, ground truth or a retention policy. See section 2 of the evaluation protocol.
