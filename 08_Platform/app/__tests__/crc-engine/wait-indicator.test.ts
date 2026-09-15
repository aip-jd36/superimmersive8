/**
 * CRC wait-state elapsed-indicator tests (CRC Wait-State UX). Same
 * framework-free, directly-unit-testable discipline as
 * rate-limit-copy.test.ts. Uses Jest's built-in fake timers (no new test
 * dependency) to prove the ticker's timing/reset behavior without
 * rendering the React component -- this repository's jest config has no
 * component-rendering environment (testEnvironment: 'node', no
 * @testing-library/react), and this task does not introduce one.
 */

import { formatWaitIndicator, startElapsedSecondsTicker, STILL_WORKING_THRESHOLD_SECONDS } from '../../lib/crc-engine/wait-indicator'

describe('formatWaitIndicator', () => {
  test('0 (or below) -> plain "Thinking…", no number', () => {
    expect(formatWaitIndicator(0)).toBe('Thinking…')
    expect(formatWaitIndicator(-1)).toBe('Thinking…')
  })

  test('1 through threshold-1 -> "Thinking… Ns"', () => {
    expect(formatWaitIndicator(1)).toBe('Thinking… 1s')
    expect(formatWaitIndicator(3)).toBe('Thinking… 3s')
    expect(formatWaitIndicator(STILL_WORKING_THRESHOLD_SECONDS - 1)).toBe(`Thinking… ${STILL_WORKING_THRESHOLD_SECONDS - 1}s`)
  })

  test('at and above the threshold -> "Still working… Ns"', () => {
    expect(formatWaitIndicator(STILL_WORKING_THRESHOLD_SECONDS)).toBe(`Still working… ${STILL_WORKING_THRESHOLD_SECONDS}s`)
    expect(formatWaitIndicator(STILL_WORKING_THRESHOLD_SECONDS + 5)).toBe(`Still working… ${STILL_WORKING_THRESHOLD_SECONDS + 5}s`)
  })

  test('never renders a percentage, a stage name, or a decimal', () => {
    const sample = [0, 1, 9, 10, 42].map(formatWaitIndicator).join(' ')
    expect(sample).not.toMatch(/%/)
    expect(sample).not.toMatch(/\./)
    expect(sample).not.toMatch(/retriev|bounded|interpret|composit|project/i)
  })
})

describe('startElapsedSecondsTicker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('ticks whole seconds, one at a time, at 1000ms resolution', () => {
    const onTick = jest.fn()
    startElapsedSecondsTicker(onTick)

    expect(onTick).not.toHaveBeenCalled()

    jest.advanceTimersByTime(999)
    expect(onTick).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(onTick).toHaveBeenCalledTimes(1)
    expect(onTick).toHaveBeenLastCalledWith(1)

    jest.advanceTimersByTime(1000)
    expect(onTick).toHaveBeenCalledTimes(2)
    expect(onTick).toHaveBeenLastCalledWith(2)

    jest.advanceTimersByTime(3000)
    expect(onTick).toHaveBeenCalledTimes(5)
    expect(onTick).toHaveBeenLastCalledWith(5)
  })

  test('stop() ends ticking immediately -- no further onTick calls', () => {
    const onTick = jest.fn()
    const ticker = startElapsedSecondsTicker(onTick)

    jest.advanceTimersByTime(2000)
    expect(onTick).toHaveBeenCalledTimes(2)

    ticker.stop()
    jest.advanceTimersByTime(10000)
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  test('a later ticker always starts fresh at 1 on its own first tick, regardless of a prior ticker\'s final count', () => {
    const firstOnTick = jest.fn()
    const first = startElapsedSecondsTicker(firstOnTick)
    jest.advanceTimersByTime(7000)
    expect(firstOnTick).toHaveBeenLastCalledWith(7)
    first.stop()

    const secondOnTick = jest.fn()
    startElapsedSecondsTicker(secondOnTick)
    jest.advanceTimersByTime(1000)
    expect(secondOnTick).toHaveBeenCalledTimes(1)
    expect(secondOnTick).toHaveBeenLastCalledWith(1)
  })
})
