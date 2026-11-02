/**
 * CAA-SECURITY-3B — PostgreSQL integration tests (payment ledger).
 * Requires DATABASE_URL_TEST pointing at a DISPOSABLE database whose name
 * starts with `si8_test_`. Run in CI by .github/workflows/payment-ledger-db-tests.yml.
 * Excluded from the default unit-test config.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/db/**/*.db.test.ts'],
  // CR-V2-DOC-2C-B: the @/ alias, as in jest.config.js, so a DB suite can build real envelopes with the
  // committed (pure) examination code. No other mapping; no Supabase stub (DB suites never import it).
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testTimeout: 30000,
}
