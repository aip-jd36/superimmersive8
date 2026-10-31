/**
 * CR-V2-MVP-M4B — the SYNTHETIC TEST publication authority, for an isolated end-to-end test only.
 *
 * NOT governance approval. Selected only by `./publication-authority` in 'synthetic-isolated-test'
 * mode: outside Production, against a bound non-Production Supabase project, with a Stripe test key.
 * Governance mode (every Production deploy) never reads this file, and refuses any bundle classed
 * 'synthetic_test', so whatever is placed here can never become Production publication authority, on
 * any branch or deploy route.
 *
 * Empty (null) on purpose: the placeholder content for the staging test is added by the staging setup,
 * under PM review. It must keep `authority_class: 'synthetic_test'`.
 */

import type { PublicationAuthorityBundle } from './publication-authority'

export const CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY: (PublicationAuthorityBundle & { readonly authority_class: 'synthetic_test' }) | null = null
