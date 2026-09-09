/**
 * Reviewer-readable topic labels (CAH-4F, FR-2 / OQ-5).
 *
 * DISPLAY ONLY. The value sent to `GET /api/admin/submissions/[id]/reviewer-lk`
 * is always the exact `GoalCategory` enum string — this module never changes
 * what the route receives, only how the topic reads in the picker and in the
 * results header.
 *
 * Wording is plain professional language (OQ-5 resolved: plain, not the
 * `SI8-Reviewer-Manual-v0.2.md` domain-letter vocabulary — the reviewer picks
 * a research topic here, they are not classifying a control).
 *
 * Pure: imports one type, no I/O, no `.insert`, no assessment/workbook/CRC
 * dependency. Lives in `lib/reviewer-lk/**` so the authority firewall scans it.
 */

import type { GoalCategory } from '@/types/interview-engine'

/** Every `GoalCategory` a reviewer can research (`'unknown'` is never a topic). */
export const REVIEWER_TOPIC_LABELS: Record<Exclude<GoalCategory, 'unknown'>, string> = {
  commercial_use: 'Commercial use',
  copyright_ownership: 'Copyright ownership',
  copyrightability: 'Copyrightability',
  likeness: 'Likeness',
  third_party_source_rights: 'Third-party source rights',
}

/**
 * The reviewer-facing label for a topic. Falls back to a readable
 * transformation of the enum if a value is ever unmapped — never throws,
 * never blank (fail-safe per REVIEWER_RESOURCES_ARCHITECTURE.md §9).
 */
export function reviewerTopicLabel(topic: string): string {
  if (topic in REVIEWER_TOPIC_LABELS) {
    return REVIEWER_TOPIC_LABELS[topic as Exclude<GoalCategory, 'unknown'>]
  }
  const spaced = topic.replace(/_/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
