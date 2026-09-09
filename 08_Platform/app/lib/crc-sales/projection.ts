/**
 * CRC -> Sales DEFAULT context projection (CAH-3B).
 *
 * CAH-4B: the projection body was extracted VERBATIM into the neutral
 * `lib/crc-project-context/projection.ts` (`buildCrcProjectContext`) so the
 * Commercial Assurance reviewer-context surface can consume the same pure
 * projection without importing `lib/crc-sales` (the CAH-3B subsystem boundary
 * forbids that). This file is now a thin, behavior-preserving re-export —
 * `buildSalesSessionProject` returns exactly what it did before, proven by
 * `__tests__/crc-project-context/projection-equivalence.test.ts`.
 *
 * `SalesSessionProject` and the neutral `CrcProjectContext` are structurally
 * identical shapes, so no cast is needed.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import { buildCrcProjectContext } from '@/lib/crc-project-context/projection'
import type { SalesSessionProject } from './types'

export function buildSalesSessionProject(su: StructuredUnderstanding): SalesSessionProject {
  return buildCrcProjectContext(su)
}
