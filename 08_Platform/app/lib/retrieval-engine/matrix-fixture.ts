/**
 * Typed Matrix fixture (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 2, Prototype
 * Beta). NOT a live parser of PLATFORM-RIGHTS-MATRIX.md -- confirmed before
 * writing this file that no Markdown-parsing precedent exists anywhere in
 * this repository (no remark/gray-matter/marked dependency, no existing
 * reader code), so a live parser would be new, unjustified infrastructure
 * for a correctness-and-testability milestone that doesn't need it. The
 * real Matrix will eventually feed Retrieval through a small adapter that
 * produces this same MatrixRow[] shape -- not designed here.
 *
 * Content mirrors the actual committed Matrix (06_Operations/institutional-
 * knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md) as of the CRC Claims
 * sub-table migration, 2026-08-08 -- real claim_ids, real CRC-Eligible
 * values, real Publication Scope text, copied verbatim. This is deliberate:
 * a fixture built from real data is both a realistic test double and an
 * implicit check that the committed schema migration is actually usable by
 * a consumer, not just internally consistent on the page.
 *
 * Markdown-authoring conventions translate to typed values here, not
 * verbatim: `—` (undecided/blank) becomes `null`; bolded Yes/No/Pending
 * becomes the CrcEligible literal. This translation is this file's own job
 * -- a future live adapter would need to make the same translation from
 * the real page, and this fixture is the reference for what that
 * translation should produce.
 *
 * `topic` tags (added 2026-08-15, CRC Milestone 2): every claim below is
 * tagged with the GoalCategory its subject matter actually is, INCLUDING
 * the Pending claims -- a claim being Pending (not yet publication-eligible)
 * says nothing about what it's ABOUT, and tagging it now means it needs no
 * revisit purely to add a topic once it later becomes eligible. All nine
 * tool rows are 'commercial_use' (each one's claim is a
 * commercial-use-by-tier statement); 'elevenlabs-voice-consent' is
 * 'likeness' (voice-cloning/consent). No claim in the current Matrix is
 * about copyright_ownership or copyrightability -- there is no real
 * governed coverage for either category yet, which is precisely the gap
 * Milestone 2's 'outside_current_coverage' status is designed to surface
 * honestly rather than paper over.
 */

import type { MatrixRow } from './types'

export const MATRIX_FIXTURE: MatrixRow[] = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-05',
    /**
     * Matrix Retirement (2026-09-03): this claim was `crc_eligible: 'Yes'`
     * from 2026-08-05 (JD, CRC Decision Date 2026-08-05) until this date,
     * when JD/PM authorized its retirement as a CRC-active representation
     * -- see PLATFORM-RIGHTS-MATRIX.md's Runway Retirement status note.
     * This is representation supersession, not substantive reversal -- the
     * claim's core commercial-use grant is not found to be inaccurate; the
     * sole reason is CPR_016's empirical finding that simultaneous Matrix +
     * TopicClaim publication of the same knowledge produces scope-
     * inconsistent CRC output on the Enterprise dimension (worse than mere
     * duplication -- the two representations disagree, not merely repeat).
     * Separately, and independently of the coexistence issue, this claim's
     * own "same language applies to ... Enterprise" wording is itself found
     * (by FGR_015 and reconfirmed by CPR_016) to be unsupported by the
     * primary Runway Terms of Use, which carves Enterprise out to a
     * separate, non-public terms document -- a documentation-accuracy
     * finding preserved here, not silently corrected. This claim is
     * superseded by governed successor claim
     * CLAIM-RUNWAY-COMMERCIAL-USE-001-v1 (GOVERNED-CLAIMS.md, Lifecycle:
     * Adopted, CRC eligibility pending a separate, not-yet-conducted
     * post-retirement CPR reconsideration -- see
     * governance-reviews/FGR_015_CAND-RUNWAY-COMMERCIAL-USE-001_2026-09-03.md
     * and governance-reviews/CPR_016_RUNWAY_COMMERCIAL_USE_INITIAL_
     * PUBLICATION_REVIEW_2026-09-03.md). `crc_eligible` below is
     * accordingly 'No' effective 2026-09-03.
     */
    claims: [
      {
        claim_id: 'runway-gen3',
        crc_eligible: 'No',
        crc_publication_scope:
          "CRC may state only that Runway's current Terms permit commercial use across subscription tiers when the Terms of Service are followed, and that the Free plan differs primarily by watermarking rather than commercial-use rights. This publication scope does not extend to ownership analysis, enterprise training provisions, downstream IP clearance, platform suitability for a particular commercial project, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service. The Free plan mainly differs by watermarking rather than commercial-use permissions.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
    ],
  },
  {
    identifier: 'kling',
    // CRC Kling Governed Knowledge Correction + Decomposition milestone
    // (2026-08-24): re-verified directly against K1 (Kling AI Terms of
    // Service, kling.ai/docs/user-policy) and K2 (Kling AI Terms of Paid
    // Service, kling.ai/docs/payment-policy), both Release/Effective
    // 2026/04/21, human-captured browser Print->PDF -- the first direct
    // primary-source read this Matrix row has ever had (previously
    // corroborated only by JD's own unverifiable browser read + three
    // search-snippet excerpts). See PLATFORM-RIGHTS-MATRIX.md's own Kling
    // section for the full source-wording quotation and reconciliation.
    last_verified: '2026-08-24',
    /**
     * Matrix Retirement (2026-09-02): both claims below were
     * `crc_eligible: 'Yes'` from 2026-08-24 (JD, CRC Decision Date
     * 2026-08-24) until this date, when JD/PM authorized their retirement
     * as CRC-active representations via FGR_014 -- see
     * 06_Operations/institutional-knowledge/notebook/governance-reviews/
     * FGR_014_KLING_MATRIX_RETIREMENT_AUTHORIZATION_2026-09-02.md. This is
     * representation supersession, not substantive reversal -- FGR_014 §3
     * confirms neither claim's underlying content is inaccurate, unsafe,
     * or distrusted; the sole reason is CPR_013's empirical finding that
     * simultaneous Matrix + TopicClaim publication of the same knowledge
     * produces duplicate CRC output. `kling-commercial-use-baseline` is
     * superseded by governed successor claim
     * CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1; `kling-commercial-use-
     * member` is superseded by governed successor claim
     * CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1 (both GOVERNED-CLAIMS.md,
     * Lifecycle: Adopted, CRC eligibility pending a separate, not-yet-
     * conducted post-retirement CPR reconsideration -- see CPR_014 and its
     * disposition-correction addendum). `crc_eligible` below is
     * accordingly 'No' effective 2026-09-02.
     */
    claims: [
      /**
       * Model B decomposition (accepted design, following the Governed
       * Conditional/Variant Knowledge and Kling Primary-Source Evidence
       * Reconciliation diagnostics): the prior single claim compressed
       * K1's universal default rule and K2's separate, membership-
       * conditioned exception into one "paid members / free users"
       * sentence -- terminology neither document uses ("Member Account" /
       * "Regular Account" per K2 §1.4-1.6, never "paid"/"free"), and which
       * silently dropped the competing-product/service carve-out. Two
       * claims now represent this faithfully: an unconditional baseline
       * (K1 §4.6, applies regardless of account status) and an
       * applicability-gated Member exception (K2 §3.1.2/§1.4-1.6, applies
       * only when the account currently holds a Member Account). Neither
       * claim asserts anything about WHEN membership status must hold
       * relative to generation/download/commercial-use -- K1/K2 establish
       * only that the benefit is tied to Member Account status "during the
       * Validity Period" (K2 §3.1.5), never a specific triggering moment
       * for already-generated Output; that remains NOT ESTABLISHED and is
       * deliberately not encoded here.
       */
      {
        claim_id: 'kling-commercial-use-baseline',
        crc_eligible: 'No',
        crc_publication_scope:
          "CRC may state that, under Kling's current Terms of Service, using generated Output for commercial purposes without Kling's written permission is not permitted by default. This publication scope does not extend to branding requirements, training-data provisions, downstream IP clearance, ownership analysis, membership status, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
      /**
       * Applicability-gated on current Kling Member Account status (K2
       * §1.4-1.6: a Member Account is bound to having subscribed to the
       * Membership Service specifically -- NOT synonymous with "has paid
       * Kling anything," since Credits/Separately Purchased Services are
       * also Paid Services under K2 §1.1 without conferring Member status,
       * K2 §4.3.3). Gated on the new generic `tool_account_status` fact
       * (types/interview-engine.ts / retrieval-engine/types.ts), never a
       * Kling-specific fact name, and never `tool_plan_tier` (K2 §3.1.1's
       * Membership Grade -- Standard/Pro/Ultra/Team/Enterprise -- is a
       * structurally separate concept this claim does not depend on).
       * `value: 'Member Account'` uses K2's own exact term, not a
       * re-abstracted synonym, per the accepted canonical-value design.
       */
      {
        claim_id: 'kling-commercial-use-member',
        crc_eligible: 'No',
        crc_publication_scope:
          "CRC may state that, if the account currently holds a Kling Member Account (i.e. is subscribed to Kling's Membership Service), Kling's current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI. This publication scope does not extend to branding requirements, training-data provisions, downstream IP clearance, ownership analysis, membership status at any time other than currently, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "If you currently hold a Kling Member Account (i.e. you're subscribed to Kling's Membership Service), Kling's current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI.",
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }],
      },
    ],
  },
  {
    identifier: 'pika',
    last_verified: '2026-08-06',
    claims: [
      {
        claim_id: 'pika',
        crc_eligible: 'Yes',
        crc_publication_scope:
          "CRC may state that Pika's Free tier is limited to personal, non-commercial use, and that current paid plans include commercial-use rights. CRC must not imply that every feature within every paid plan is commercially licensed beyond what Pika's published documentation explicitly confirms.",
        crc_candidate_statement:
          "Pika's current Terms restrict the Free tier to personal, non-commercial use. Current paid plans include commercial-use rights, so if you're using Pika professionally it's worth confirming which subscription you're on.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
    ],
  },
  {
    identifier: 'google-veo',
    last_verified: '2026-08-05',
    claims: [
      { claim_id: 'google-veo', crc_eligible: 'Pending', crc_publication_scope: null, crc_candidate_statement: null, topic: 'commercial_use', applicability_requirements: [] },
    ],
  },
  {
    identifier: 'adobe-firefly',
    last_verified: '2026-08-05',
    claims: [
      { claim_id: 'adobe-firefly', crc_eligible: 'Pending', crc_publication_scope: null, crc_candidate_statement: null, topic: 'commercial_use', applicability_requirements: [] },
    ],
  },
  {
    identifier: 'openai-sora',
    last_verified: '2026-08-01',
    claims: [
      { claim_id: 'openai-sora', crc_eligible: 'Pending', crc_publication_scope: null, crc_candidate_statement: null, topic: 'commercial_use', applicability_requirements: [] },
    ],
  },
  {
    identifier: 'gemini-api',
    last_verified: '2026-08-05',
    claims: [
      { claim_id: 'gemini-api', crc_eligible: 'Pending', crc_publication_scope: null, crc_candidate_statement: null, topic: 'commercial_use', applicability_requirements: [] },
    ],
  },
  {
    identifier: 'gemini-consumer-app',
    last_verified: '2026-08-06',
    claims: [
      { claim_id: 'gemini-consumer-app', crc_eligible: 'Pending', crc_publication_scope: null, crc_candidate_statement: null, topic: 'commercial_use', applicability_requirements: [] },
    ],
  },
  {
    identifier: 'midjourney',
    last_verified: '2026-08-05',
    claims: [
      {
        claim_id: 'midjourney',
        crc_eligible: 'Yes',
        crc_publication_scope:
          "CRC may state only that Midjourney's commercial-use permissions differ by subscription under the current Terms: free users are limited to non-commercial use, while paid members may use generated assets commercially. CRC may also state that Midjourney's Terms require a corporate membership plan when the Service is used for the benefit of a company with more than US$1 million in annual gross revenue. This publication scope does not extend to Midjourney's ownership language, copyright analysis, training-data licensing, downstream IP clearance, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "Midjourney's commercial-use permissions depend on your subscription. Under the current Terms, free users are limited to non-commercial use, while paid members may use generated assets commercially. If the Service is being used for the benefit of a company with more than US$1 million in annual gross revenue, Midjourney's Terms also require a corporate membership plan.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
    ],
  },
  {
    identifier: 'elevenlabs',
    last_verified: '2026-08-05',
    claims: [
      {
        claim_id: 'elevenlabs-commercial-tiering',
        crc_eligible: 'Yes',
        crc_publication_scope:
          "CRC may state only that ElevenLabs' Free tier is limited to non-commercial use, that paid tiers permit commercial use, and that users retain rights to their generated output under the current Terms. This publication scope does not extend to training-data licensing, voice-cloning, consent, likeness-related provisions, downstream IP clearance, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "ElevenLabs' current Terms restrict the Free tier to non-commercial use, while paid tiers permit commercial use of generated audio. Users retain rights to their output under those Terms.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
      {
        claim_id: 'elevenlabs-voice-consent',
        crc_eligible: 'No',
        crc_publication_scope:
          'None — withheld under CRC Publication Policy Principle 3. Voice-cloning, consent, and likeness-related provisions are withheld regardless of verification status — describing platform-level safeguards could imply that uses not blocked by the platform are acceptable; those questions require contextual human review.',
        crc_candidate_statement: null,
        topic: 'likeness',
        applicability_requirements: [],
      },
    ],
  },
  {
    // Trial 5 (Living Knowledge onboarding benchmark, LK-84 through LK-87).
    // FGR decision 2026-09-01 (PM): ADOPT WITH NARROWED WORDING -- excludes
    // current plan prices/plan-name merchandising, any inference that
    // higher tiers inherit rights from the pricing page's own structure,
    // ownership, copyrightability, third-party-rights clearance, and
    // indemnification (in either direction -- no categorical indemnification
    // conclusion is encoded here). CRC Publication approved 2026-09-01 (CRC
    // Approver: JD (PM)) -- see 06_Operations/institutional-knowledge/
    // notebook/PLATFORM-RIGHTS-MATRIX.md's own "Luma AI (Dream Machine)"
    // section for the full governance record, source quotations, and
    // evidence-boundary discussion. Text below copied verbatim from that
    // record's own CRC Claims sub-table. `luma` registered in
    // lib/tool-identity/registry.ts's CANONICAL_TOOL_IDS the same task; no
    // KNOWN_TOOLS extraction alias added -- conversational reachability
    // remains a separate, independently-timed concern, same discipline as
    // every provider/tool onboarded in this corpus.
    identifier: 'luma',
    last_verified: '2026-09-01',
    claims: [
      {
        claim_id: 'luma',
        crc_eligible: 'Yes',
        crc_publication_scope:
          'CRC may state that under Luma AI\'s Terms of Service (effective May 14, 2026), Output may be used commercially only if it was produced during an active paid Subscription Term under a plan permitting commercial use, and that Output produced under Free or Trial use may not be used commercially. This publication scope does not extend to current plan prices or plan-name merchandising, ownership analysis, copyrightability, third-party-rights clearance, or indemnification — commercial-use permission under this claim does not itself establish that Luma provides indemnification or third-party-rights clearance, and CRC must not state or imply either. CRC must not state which specific plan the user holds or whether the user\'s own Output was produced during an eligible subscription term.',
        crc_candidate_statement:
          "Luma AI's current Terms of Service restrict commercial use of Dream Machine output to an active paid subscription plan that specifically permits commercial use. Output produced under Free or Trial use may not be used commercially.",
        topic: 'commercial_use',
        applicability_requirements: [],
      },
    ],
  },
  {
    // Trial 6 (Living Knowledge onboarding benchmark, LK-95 through LK-99) --
    // the first genuinely new identity registered after LK-94's
    // Canonicalization Readiness gate took effect. FGR decision 2026-09-01
    // (PM): ADOPT WITH NARROWED WORDING. CPR decision 2026-09-01 (PM):
    // APPROVE WITH BOUNDED WORDING -- excludes copyrightability, ownership
    // beyond Suno's own stated assignment, non-infringement, third-party-
    // rights clearance, training-data legality, indemnification, and any
    // post-cancellation/lapse persistence-or-termination conclusion (the
    // Terms are silent on the latter). See 06_Operations/institutional-
    // knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md's own "Suno" section for
    // the full governance record, source quotations, and evidence-boundary
    // discussion. Text below copied verbatim from that record's own CRC
    // Claims sub-table (the LK-99 §2-corrected wording, not LK-98's
    // over-strengthened first draft). `suno` registered in
    // lib/tool-identity/registry.ts's CANONICAL_TOOL_IDS the same task; no
    // KNOWN_TOOLS extraction alias added -- conversational reachability
    // remains a separate, independently-timed concern, same discipline as
    // every provider/tool onboarded in this corpus. LK-99's own first-attempt
    // Canonicalization Readiness check against this identity (representative
    // expression "Suno") FAILED -- see that milestone's own report; this
    // fixture entry represents structured-state governed-knowledge
    // reachability only, a separate property from conversational
    // canonicalization readiness, per the LK-93 five-property model.
    identifier: 'suno',
    last_verified: '2026-09-01',
    claims: [
      {
        claim_id: 'suno',
        crc_eligible: 'Yes',
        crc_publication_scope:
          "CRC may state that under Suno's Terms of Service (revised March 26, 2026), Output generated under Suno's Free or Basic tier is restricted to non-commercial use, and that for a user subscribed to Suno's Pro or Premier paid tier, Suno assigns its right, title and interest in Output generated during the term of that paid-tier subscription to the user. This publication scope does not extend to copyrightability of any specific Output (Suno's own Terms disclaim any warranty that copyright vests in Output), ownership beyond Suno's stated assignment, non-infringement, third-party-rights clearance, training-data legality, indemnification, or whether this status persists or terminates if the paid subscription is later cancelled or lapses (the Terms are silent on this) — CRC must not state or imply any of these. CRC must not state which specific plan the user holds or whether the user's own Output was generated during an eligible paid-tier term.",
        crc_candidate_statement:
          'Under Suno\'s Terms of Service revised March 26, 2026, Output generated under the Free or Basic tier is restricted to non-commercial use. For Output generated during a Pro or Premier paid-tier subscription term, Suno states that it assigns its right, title and interest in that Output to the user.',
        topic: 'commercial_use',
        applicability_requirements: [],
      },
    ],
  },
]
