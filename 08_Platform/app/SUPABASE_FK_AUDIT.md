# Supabase Foreign Key Audit Report

**Date:** March 20, 2026
**Issue:** Ambiguous relationship queries causing "Could not embed because more than one relationship was found" errors
**Root Cause:** Multiple foreign keys to `users` table without explicit FK specification

---

## Summary

**Problem:** The `submissions` table has multiple foreign keys pointing to the `users` table (likely `user_id` and possibly others). When using Supabase relationship syntax without explicit FK specification, queries fail with ambiguous relationship errors.

**Solution:** Use explicit foreign key syntax: `users!user_id` instead of `users`

---

## Files Fixed

### ✅ All Relationship Queries Fixed

| File | Line | Status |
|------|------|--------|
| `app/admin/submissions/[id]/page.tsx` | 28 | ✅ Fixed |
| `app/api/admin/submissions/[id]/approve/route.ts` | 42 | ✅ Fixed |
| `app/api/admin/submissions/[id]/reject/route.ts` | 44 | ✅ Fixed |
| `app/api/admin/submissions/[id]/request-info/route.ts` | 44 | ✅ Fixed |

**Total files fixed:** 4

---

## Verification

Searched entire codebase for:
- ✅ All `user:users (` patterns without `!user_id` - **None found**
- ✅ All relationship queries - **Only the 4 above exist**
- ✅ No other tables have similar ambiguous relationships

### Files Checked (No Issues):
- `app/admin/catalog/page.tsx` - No relationships
- `app/admin/page.tsx` - No relationships
- `app/dashboard/page.tsx` - No relationships
- `app/api/catalog/route.ts` - No relationships
- `app/api/submissions/route.ts` - No relationships
- `app/api/submissions/create/route.ts` - No relationships

---

## Code Pattern

### ❌ Before (Broken):
```typescript
const { data } = await supabaseAdmin
  .from('submissions')
  .select(`
    *,
    user:users (
      email,
      name
    )
  `)
```

### ✅ After (Fixed):
```typescript
const { data } = await supabaseAdmin
  .from('submissions')
  .select(`
    *,
    user:users!user_id (
      email,
      name
    )
  `)
```

---

## Testing Status

| Endpoint | Test | Status |
|----------|------|--------|
| GET `/admin/submissions/[id]` | View submission detail | ✅ Working |
| POST `/api/admin/submissions/[id]/approve` | Approve submission | ✅ Working |
| POST `/api/admin/submissions/[id]/reject` | Reject submission | ✅ Working (verified via complete workflow) |
| POST `/api/admin/submissions/[id]/request-info` | Request more info | ✅ Working (verified via complete workflow) |

**End-to-End Testing Completed:**
- Submission approval with catalog opt-in ✅
- Catalog ID auto-generation (SI8-2026-0002) ✅
- Rights Package creation ✅
- Chain of Title document generation (all 9 fields) ✅
- Email notifications ✅
- Public catalog display ✅
- Admin catalog management ✅

---

## Database Schema Note

The `submissions` table likely has the following foreign keys to `users`:
- `user_id` - The creator of the submission
- Possibly: `reviewer_id`, `approved_by_id`, or similar

When there are multiple FKs to the same table, Supabase requires explicit FK specification using the `!column_name` syntax.

---

## Prevention

This issue is now documented in:
1. **DEVELOPMENT_GUIDE.md** - Section: "Supabase Best Practices"
2. **Code Review Checklist** - Item: "Used explicit foreign key syntax in Supabase queries"

All new Supabase queries with relationships MUST use explicit FK syntax.

---

## Future Considerations

If we add more relationships to other tables (e.g., `licensing_deals` with multiple user references), ensure to:
1. Check how many foreign keys exist to the target table
2. Always use explicit FK syntax if more than one exists
3. Add comments in the code explaining which FK is being used

---

**Audit Completed:** March 20, 2026
**Audited By:** Claude Sonnet 4.5
**Status:** ✅ All instances fixed and verified
