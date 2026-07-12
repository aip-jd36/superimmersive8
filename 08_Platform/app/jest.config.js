/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Stub the Supabase admin client BEFORE the @/ alias so this takes
    // precedence over the catch-all alias below.
    // Prevents "supabaseUrl is required" errors in unit tests that transitively
    // import supabaseAdmin. Integration tests needing a live DB must provide
    // real env vars and are not run as part of the unit test suite.
    '^@/lib/supabase/admin$': '<rootDir>/__mocks__/supabaseAdmin.ts',
    // Support Next.js @/* path alias (must come after the specific stubs above)
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Exclude Next.js generated types and node_modules from test runs
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
}

module.exports = config
