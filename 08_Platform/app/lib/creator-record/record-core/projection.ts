/**
 * CR-OPTION-C-OC1B — generic, fail-closed exact-key projection combinators.
 * Shared (CR-V2-1) by the internal draft projection and the Creator Record v2
 * customer record.
 *
 * Every object is projected against an exact key list. An unknown key, a
 * missing key or a value of the wrong type throws `ProjectionRefusal`; nothing
 * unrecognised is carried and nothing is filled in. `WITHHELD` keys must be
 * present (so the shape is still known) but their values are never read.
 * Callers translate `ProjectionRefusal` into their own error.
 */

export class ProjectionRefusal extends Error {
  constructor(readonly path: string, readonly reason: string) {
    super(`projection_refused: ${path}: ${reason}`)
  }
}

export type P<V> = (value: unknown, path: string) => V
export const WITHHELD = Symbol('withheld')
export type Optional<V> = { optional: P<V> }
type Field = P<unknown> | typeof WITHHELD | Optional<unknown>
type Projected<S extends Record<string, Field>> = {
  [K in keyof S as S[K] extends typeof WITHHELD ? never : S[K] extends Optional<unknown> ? never : K]: S[K] extends P<infer V> ? V : never
} & {
  [K in keyof S as S[K] extends Optional<unknown> ? K : never]?: S[K] extends Optional<infer V> ? V : never
}

export const fail = (path: string, reason: string): never => {
  throw new ProjectionRefusal(path, reason)
}
export const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype

export const str: P<string> = (v, path) => (typeof v === 'string' ? v : fail(path, 'expected a string'))
export const int: P<number> = (v, path) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : fail(path, 'expected a non-negative integer'))
export const bool: P<boolean> = (v, path) => (typeof v === 'boolean' ? v : fail(path, 'expected a boolean'))
export const hex64: P<string> = (v, path) => (typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : fail(path, 'expected a SHA-256 hex digest'))
export const nullable = <V>(p: P<V>): P<V | null> => (v, path) => (v === null ? null : p(v, path))
export const arr = <V>(p: P<V>): P<V[]> => (v, path) => (Array.isArray(v) ? v.map((x, i) => p(x, `${path}[${i}]`)) : fail(path, 'expected an array'))
export const oneOf = <V extends string>(values: readonly V[]): P<V> => (v, path) => ((values as readonly unknown[]).includes(v) ? (v as V) : fail(path, 'unsupported value'))
export const opt = <V>(p: P<V>): Optional<V> => ({ optional: p })

export function obj<S extends Record<string, Field>>(spec: S): P<Projected<S>> {
  return (v, path) => {
    if (!isPlainObject(v)) return fail(path, 'expected an object')
    for (const key of Object.keys(v)) if (!(key in spec)) fail(`${path}.${key}`, 'unsupported field')
    const out: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(spec)) {
      const at = `${path}.${key}`
      if (field === WITHHELD) {
        if (!(key in v)) fail(at, 'missing field')
        continue
      }
      if (typeof field === 'object') {
        if (key in v && v[key] !== undefined) out[key] = field.optional(v[key], at)
        continue
      }
      if (!(key in v)) fail(at, 'missing field')
      out[key] = field(v[key], at)
    }
    return out as Projected<S>
  }
}
