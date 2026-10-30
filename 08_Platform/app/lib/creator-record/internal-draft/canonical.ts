/**
 * CR-OPTION-C-OC1 — canonical JSON and its SHA-256, for the internal draft snapshot.
 *
 * Canonical form: object keys sorted by UTF-16 code unit (Array.prototype.sort),
 * no whitespace, strings and numbers as JSON.stringify writes them, arrays in
 * their given order. Strings are never normalized: answers are kept verbatim.
 *
 * Fail closed: `undefined`, functions, symbols, bigints, non-finite numbers and
 * anything that is not a plain object or array (Date, Map, class instances)
 * throw, so two different snapshots can never serialize to the same text and a
 * value can never be silently dropped.
 */

import { createHash } from 'node:crypto'

export class CanonicalizationError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`canonical_json_rejected at ${path}: ${reason}`)
  }
}

function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function write(value: unknown, path: string): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalizationError(path, 'non-finite number')
      return JSON.stringify(value)
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((v, i) => write(v, `${path}[${i}]`)).join(',')}]`
      if (!isPlainObject(value)) throw new CanonicalizationError(path, 'not a plain object')
      const keys = Object.keys(value).sort()
      return `{${keys.map((k) => `${JSON.stringify(k)}:${write((value as Record<string, unknown>)[k], `${path}.${k}`)}`).join(',')}}`
    }
    default:
      throw new CanonicalizationError(path, `unsupported ${typeof value}`)
  }
}

export function canonicalJson(value: unknown): string {
  return write(value, '$')
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}
