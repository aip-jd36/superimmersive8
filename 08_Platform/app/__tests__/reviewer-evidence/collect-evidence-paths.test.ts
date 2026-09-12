/**
 * CAH-4I.3 — reviewer evidence-path reachability.
 *
 * Proves every known evidence channel is collected (not just the two that
 * existed before this milestone), that absent/malformed input never throws
 * or fabricates a path, that multiple items in an array channel each
 * produce a distinct entry, and — the assessment-integrity requirement —
 * that this module's output shape carries no verification/sufficiency
 * signal at all (it is a label+path pair, nothing else; "Verified" is a
 * separate, reviewer-only field this module never touches).
 */

import {
  collectSubmissionEvidencePaths,
  type SubmissionEvidenceInput,
} from '@/lib/reviewer-evidence/collect-evidence-paths'

function base(overrides: Partial<SubmissionEvidenceInput> = {}): SubmissionEvidenceInput {
  return {
    tools_used: [],
    audio_disclosure: null,
    likeness_release_path: null,
    ip_license_path: null,
    fair_use_doc_path: null,
    third_party_assets: null,
    production_evidence_paths: null,
    ...overrides,
  }
}

describe('collectSubmissionEvidencePaths — absent input', () => {
  it('returns an empty list when nothing was ever uploaded', () => {
    expect(collectSubmissionEvidencePaths(base())).toEqual([])
  })

  it('never throws on malformed JSON strings', () => {
    const input = base({
      tools_used: '{not valid json',
      audio_disclosure: '{also not valid',
      third_party_assets: '[]garbage',
      production_evidence_paths: 'null but a string',
    })
    expect(() => collectSubmissionEvidencePaths(input)).not.toThrow()
    expect(collectSubmissionEvidencePaths(input)).toEqual([])
  })

  it('ignores empty-string paths (treated as absent, not a malformed path)', () => {
    const input = base({ likeness_release_path: '', ip_license_path: '   ' })
    expect(collectSubmissionEvidencePaths(input)).toEqual([])
  })
})

describe('collectSubmissionEvidencePaths — the two pre-existing channels (regression guard)', () => {
  it('collects a tool receipt path with a tool-named label', () => {
    const input = base({
      tools_used: [{ tool_name: 'Runway', receipt_path: 'user-1/receipts/runway.pdf' }],
    })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Runway receipt', path: 'user-1/receipts/runway.pdf' },
    ])
  })

  it('collects an audio license path from a JSON-string audio_disclosure', () => {
    const input = base({
      audio_disclosure: JSON.stringify({ source_type: 'licensed', license_path: 'user-1/audio-docs/license.pdf' }),
    })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Audio license', path: 'user-1/audio-docs/license.pdf' },
    ])
  })
})

describe('collectSubmissionEvidencePaths — the five channels this milestone makes reachable', () => {
  it('collects a talent release path (the L03 discriminating case)', () => {
    const input = base({ likeness_release_path: 'user-1/screenshots/release.pdf' })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Talent release', path: 'user-1/screenshots/release.pdf' },
    ])
  })

  it('collects an IP license path', () => {
    const input = base({ ip_license_path: 'user-1/screenshots/ip-license.pdf' })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'IP license / authorization', path: 'user-1/screenshots/ip-license.pdf' },
    ])
  })

  it('collects a fair-use documentation path', () => {
    const input = base({ fair_use_doc_path: 'user-1/screenshots/fair-use.pdf' })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Fair-use documentation', path: 'user-1/screenshots/fair-use.pdf' },
    ])
  })

  it('collects every third-party asset item that has a file_path, skipping items that have none', () => {
    const input = base({
      third_party_assets: {
        has_third_party: true,
        items: [
          { id: 'a', type: 'Stock Footage', file_path: 'user-1/screenshots/stock-a.pdf' },
          { id: 'b', type: 'Music-SFX', description: 'no license doc for this one' }, // no file_path
          { id: 'c', description: 'Freelance element', file_path: 'user-1/screenshots/stock-c.pdf' },
        ],
      },
    })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Third-party asset license #1: Stock Footage', path: 'user-1/screenshots/stock-a.pdf' },
      { label: 'Third-party asset license #3: Freelance element', path: 'user-1/screenshots/stock-c.pdf' },
    ])
  })

  it('collects every production-evidence item that has a path, from a JSON-string field', () => {
    const input = base({
      production_evidence_paths: JSON.stringify({
        items: [
          { id: 'x', title: 'Session export', path: 'user-1/screenshots/session.zip' },
          { id: 'y', type: 'Timeline Export', path: 'user-1/screenshots/timeline.mp4' },
        ],
        notes: 'irrelevant to path collection',
      }),
    })
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Production evidence #1: Session export', path: 'user-1/screenshots/session.zip' },
      { label: 'Production evidence #2: Timeline Export', path: 'user-1/screenshots/timeline.mp4' },
    ])
  })
})

describe('collectSubmissionEvidencePaths — a full multi-channel submission', () => {
  it('collects all seven channels together, in stable order, with no cross-channel interference', () => {
    const input: SubmissionEvidenceInput = {
      tools_used: [{ tool_name: 'Kling', receipt_path: 'user-1/receipts/kling.pdf' }],
      audio_disclosure: { license_path: 'user-1/audio-docs/license.pdf' },
      likeness_release_path: 'user-1/screenshots/release.pdf',
      ip_license_path: 'user-1/screenshots/ip.pdf',
      fair_use_doc_path: 'user-1/screenshots/fair-use.pdf',
      third_party_assets: { items: [{ type: 'Stock Footage', file_path: 'user-1/screenshots/stock.pdf' }] },
      production_evidence_paths: { items: [{ title: 'Prompt log', path: 'user-1/screenshots/prompts.txt' }] },
    }
    expect(collectSubmissionEvidencePaths(input)).toEqual([
      { label: 'Kling receipt', path: 'user-1/receipts/kling.pdf' },
      { label: 'Audio license', path: 'user-1/audio-docs/license.pdf' },
      { label: 'Talent release', path: 'user-1/screenshots/release.pdf' },
      { label: 'IP license / authorization', path: 'user-1/screenshots/ip.pdf' },
      { label: 'Fair-use documentation', path: 'user-1/screenshots/fair-use.pdf' },
      { label: 'Third-party asset license #1: Stock Footage', path: 'user-1/screenshots/stock.pdf' },
      { label: 'Production evidence #1: Prompt log', path: 'user-1/screenshots/prompts.txt' },
    ])
  })
})

describe('collectSubmissionEvidencePaths — assessment-integrity shape guarantee', () => {
  it('every returned entry is exactly {label, path} — no status, no verified flag, no control id', () => {
    const input = base({ likeness_release_path: 'user-1/screenshots/release.pdf' })
    const result = collectSubmissionEvidencePaths(input)
    expect(result).toHaveLength(1)
    expect(Object.keys(result[0]).sort()).toEqual(['label', 'path'])
  })
})
