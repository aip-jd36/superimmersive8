# Code Audit - Industry Standard Patterns

**Date:** March 20, 2026
**Auditor:** Claude Code
**Scope:** Authentication, security, and Supabase usage patterns

---

## 🚨 Issues Found

### 1. **CRITICAL: Multiple files using `getSession()` instead of `getUser()`**

**Supabase Recommendation:** Always use `getUser()` on the server for secure authentication.

**Files that need fixing:**

#### Server Components (Pages):
- ✅ `/app/dashboard/page.tsx` - **FIXED** (already using getUser())
- ❌ `/app/submit/page.tsx` - **NEEDS FIX**
- ❌ `/app/dashboard/layout.tsx` - **NEEDS FIX**
- ❌ `/app/page.tsx` (root) - **NEEDS FIX**

#### API Routes:
- ❌ `/app/api/admin/catalog/[id]/toggle-visibility/route.ts` - **NEEDS FIX**
- ❌ `/app/api/admin/submissions/[id]/approve/route.ts` - **NEEDS FIX**
- ❌ `/app/api/admin/submissions/[id]/reject/route.ts` - **NEEDS FIX**
- ❌ `/app/api/admin/submissions/[id]/request-info/route.ts` - **NEEDS FIX**
- ❌ `/app/api/checkout/create-session/route.ts` - **NEEDS FIX**
- ❌ `/app/api/submissions/route.ts` - **NEEDS FIX**

**Impact:** Security risk - session data from cookies is not authenticated by Supabase server.

**Fix:** Replace all `getSession()` with `getUser()` in server-side code.

---

### 2. **Admin API Routes Not Using Service Role**

**Issue:** Admin API routes use regular `createClient()` for auth checks, which goes through RLS.

**Best Practice:** Admin routes should use `supabaseAdmin` (service role) for privileged operations.

**Files:**
- `/app/api/admin/catalog/[id]/toggle-visibility/route.ts`
- `/app/api/admin/submissions/[id]/approve/route.ts`
- `/app/api/admin/submissions/[id]/reject/route.ts`
- `/app/api/admin/submissions/[id]/request-info/route.ts`

**Current Pattern:**
```typescript
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession() // ❌ Wrong
const { data: user } = await supabase.from('users').select('is_admin') // ❌ Goes through RLS
```

**Correct Pattern:**
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser() // ✅ Authenticated
const { data: userData } = await supabaseAdmin.from('users').select('is_admin') // ✅ Bypasses RLS
```

---

### 3. **Potential Issues to Investigate**

#### A. Input Validation
- ✅ **Forms:** Using React Hook Form + Zod validation (GOOD)
- ⚠️ **API Routes:** Need to verify all API routes validate inputs server-side

#### B. SQL Injection
- ✅ **Using Supabase client:** Safe from SQL injection (uses parameterized queries)
- ✅ **No raw SQL in code:** All queries use Supabase query builder

#### C. XSS (Cross-Site Scripting)
- ✅ **React auto-escapes:** React escapes all output by default
- ⚠️ **User-generated content:** Check if any `dangerouslySetInnerHTML` is used (needs audit)

#### D. CSRF Protection
- ✅ **Next.js handles this:** Server Actions and API routes have built-in CSRF protection
- ✅ **Supabase handles this:** Cookie-based auth includes CSRF tokens

#### E. Rate Limiting
- ❌ **NOT IMPLEMENTED:** No rate limiting on API routes
- **Recommendation:** Add rate limiting middleware for production (e.g., `upstash/ratelimit`)

#### F. Error Handling
- ⚠️ **Inconsistent:** Some routes catch errors, others don't
- **Recommendation:** Standardize error handling pattern across all API routes

---

## 📋 Recommended Fixes (Priority Order)

### Priority 1: CRITICAL (Security)
1. **Replace all `getSession()` with `getUser()`** - 10 files
2. **Update admin API routes to use service role for admin checks** - 4 files

### Priority 2: HIGH (Security Best Practices)
3. **Add server-side input validation to all API routes**
4. **Standardize error handling across API routes**
5. **Add rate limiting middleware**

### Priority 3: MEDIUM (Code Quality)
6. **Remove all debug console.log statements** (or use proper logging library)
7. **Add TypeScript strict mode** if not already enabled
8. **Audit for any `dangerouslySetInnerHTML` usage**

### Priority 4: LOW (Nice to Have)
9. **Add request logging middleware**
10. **Add performance monitoring (e.g., Vercel Analytics)**

---

## ✅ What's Already Good (Industry Standard)

1. ✅ **React Hook Form + Zod:** Industry standard for form validation
2. ✅ **Next.js 14 App Router:** Modern, recommended architecture
3. ✅ **Supabase RLS:** Row-level security enabled (good security practice)
4. ✅ **TypeScript:** Strong typing throughout codebase
5. ✅ **Stripe integration:** Proper webhook verification with signature
6. ✅ **Service role pattern:** Using `supabaseAdmin` for privileged operations (in some places)
7. ✅ **Password hashing:** Handled by Supabase Auth (bcrypt)
8. ✅ **HTTPS only:** Enforced by Vercel
9. ✅ **Environment variables:** Secrets stored in Vercel env vars, not in code

---

## 🔧 Implementation Plan

**Phase 1: Critical Security Fixes (DO NOW)**
- [ ] Fix all `getSession()` → `getUser()` (10 files)
- [ ] Fix admin API routes to use service role (4 files)
- [ ] Test all authentication flows

**Phase 2: Security Hardening (BEFORE PRODUCTION)**
- [ ] Add rate limiting
- [ ] Standardize error handling
- [ ] Server-side input validation audit

**Phase 3: Production Polish (AFTER LAUNCH)**
- [ ] Remove debug logs
- [ ] Add proper logging infrastructure
- [ ] Performance monitoring

---

## 📚 References

- [Supabase: getUser() vs getSession()](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Next Step:** Fix Priority 1 issues immediately (all auth patterns).
