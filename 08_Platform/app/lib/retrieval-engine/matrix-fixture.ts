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
    claims: [
      {
        claim_id: 'runway-gen3',
        crc_eligible: 'Yes',
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
    last_verified: '2026-08-05',
    claims: [
      {
        claim_id: 'kling',
        crc_eligible: 'Yes',
        crc_publication_scope:
          "CRC may state only that Kling's commercial-use permissions differ by account type under the current Terms: paid members may use generated output commercially, while free users require Kling's written permission for commercial use. This publication scope does not extend to branding requirements, training-data provisions, downstream IP clearance, ownership analysis, or broader commercial-readiness conclusions.",
        crc_candidate_statement:
          "Kling's commercial-use permissions depend on your account type. Under the current Terms, paid members may use generated output commercially, while free users require Kling's written permission for commercial use.",
        topic: 'commercial_use',
        applicability_requirements: [],
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
]
