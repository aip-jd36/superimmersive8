/**
 * Test fixture only (never imported by application code): a stand-in for a model, so the closed live-examination contract can
 * be exercised with no provider, no key and no cost. Everything it produces says so: `mock_test` mode, the `test_double` provider,
 * the `mock-model-test-only` model and a `mock-` response id. The contract refuses any of those on a `live_model` envelope.
 */
import { MOCK_MODEL } from '@/lib/creator-record/live-examination/envelope'
import { LiveModelTimeout, type LiveExecutor } from '@/lib/creator-record/live-examination/examine'
import type { ReceiptModelResponse } from '@/lib/creator-record/receipt-examination/examine'

export type MockStep = { output: unknown; response_id?: string | null } | 'timeout' | 'provider_failure'

/** Plays the steps in order, one per model request; the last step repeats. */
export function mockLiveExecutor(steps: readonly MockStep[]): LiveExecutor & { calls: () => number } {
  let calls = 0
  return {
    identity: { mode: 'mock_test', provider: 'test_double', model: MOCK_MODEL },
    calls: () => calls,
    callModel: async () => {
      const step = steps[Math.min(calls, steps.length - 1)]
      calls += 1
      if (step === 'timeout') throw new LiveModelTimeout()
      if (step === 'provider_failure') throw new Error('mock provider failure')
      const id = step.response_id === undefined ? `mock-response-${calls}` : step.response_id
      return { id: id ?? undefined, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 11, output_tokens: 7 }, parsed_output: step.output } as unknown as ReceiptModelResponse
    },
  }
}
