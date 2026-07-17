/**
 * Unit tests for the processing_status state machine, specifically the
 * REPORT_GENERATED -> DRAFT invalidation transition added to support
 * stale-report detection (workbook data changes after a report was already
 * generated must invalidate that report, not leave it silently signable).
 *
 * Run: npx jest __tests__/assessments/processing-status-transitions.test.ts
 */

import { canTransitionProcessingStatus } from '../../lib/assessments/repository'
import type { ProcessingStatus } from '../../types/assessment'

describe('canTransitionProcessingStatus', () => {
  describe('forward lifecycle (unchanged)', () => {
    test('DRAFT -> REPORT_GENERATED is permitted', () => {
      expect(canTransitionProcessingStatus('DRAFT', 'REPORT_GENERATED')).toBe(true)
    })
    test('REPORT_GENERATED -> SIGNING is permitted', () => {
      expect(canTransitionProcessingStatus('REPORT_GENERATED', 'SIGNING')).toBe(true)
    })
    test('SIGNING -> SIGNED is permitted', () => {
      expect(canTransitionProcessingStatus('SIGNING', 'SIGNED')).toBe(true)
    })
    test('SIGNED -> DELIVERED is permitted', () => {
      expect(canTransitionProcessingStatus('SIGNED', 'DELIVERED')).toBe(true)
    })
  })

  describe('FAILED recovery (unchanged)', () => {
    test('any non-terminal status -> FAILED is permitted', () => {
      const statuses: ProcessingStatus[] = ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'DELIVERED']
      for (const s of statuses) {
        expect(canTransitionProcessingStatus(s, 'FAILED')).toBe(true)
      }
    })
    test('FAILED -> SIGNING is permitted (retry path)', () => {
      expect(canTransitionProcessingStatus('FAILED', 'SIGNING')).toBe(true)
    })
    test('FAILED -> DRAFT is NOT permitted (retry always resumes at SIGNING, never restarts drafting)', () => {
      expect(canTransitionProcessingStatus('FAILED', 'DRAFT')).toBe(false)
    })
    test('FAILED -> REPORT_GENERATED is NOT permitted', () => {
      expect(canTransitionProcessingStatus('FAILED', 'REPORT_GENERATED')).toBe(false)
    })
  })

  describe('stale-report invalidation (new)', () => {
    test('REPORT_GENERATED -> DRAFT is permitted', () => {
      expect(canTransitionProcessingStatus('REPORT_GENERATED', 'DRAFT')).toBe(true)
    })
    test('DRAFT -> DRAFT is NOT permitted (invalidation only applies once a report exists)', () => {
      expect(canTransitionProcessingStatus('DRAFT', 'DRAFT')).toBe(false)
    })
  })

  describe('invalid transitions still rejected', () => {
    test('DRAFT -> SIGNING is NOT permitted (must generate a report first)', () => {
      expect(canTransitionProcessingStatus('DRAFT', 'SIGNING')).toBe(false)
    })
    test('DRAFT -> SIGNED is NOT permitted', () => {
      expect(canTransitionProcessingStatus('DRAFT', 'SIGNED')).toBe(false)
    })
    test('DRAFT -> DELIVERED is NOT permitted', () => {
      expect(canTransitionProcessingStatus('DRAFT', 'DELIVERED')).toBe(false)
    })
    test('SIGNING -> DRAFT is NOT permitted (invalidation only defined from REPORT_GENERATED)', () => {
      expect(canTransitionProcessingStatus('SIGNING', 'DRAFT')).toBe(false)
    })
    test('SIGNED -> DRAFT is NOT permitted', () => {
      expect(canTransitionProcessingStatus('SIGNED', 'DRAFT')).toBe(false)
    })
    test('DELIVERED -> DRAFT is NOT permitted — a delivered assessment can never look undrafted again', () => {
      expect(canTransitionProcessingStatus('DELIVERED', 'DRAFT')).toBe(false)
    })
    test('SIGNING -> DELIVERED is NOT permitted (must pass through SIGNED)', () => {
      expect(canTransitionProcessingStatus('SIGNING', 'DELIVERED')).toBe(false)
    })
  })

  test('a status cannot transition to itself anywhere in the lifecycle', () => {
    const statuses: ProcessingStatus[] = ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'DELIVERED', 'FAILED']
    for (const s of statuses) {
      expect(canTransitionProcessingStatus(s, s)).toBe(false)
    }
  })
})
