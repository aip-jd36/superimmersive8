/**
 * Supabase admin client stub for unit tests.
 *
 * This mock is used by jest.config.js to replace @/lib/supabase/admin
 * so that tests importing modules that transitively use supabaseAdmin
 * do not fail with "supabaseUrl is required" at load time.
 *
 * Tests that need a real Supabase connection (integration tests) must
 * set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env,
 * not use this mock.
 */

export const supabaseAdmin = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ data: null, error: null }),
    download: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}
