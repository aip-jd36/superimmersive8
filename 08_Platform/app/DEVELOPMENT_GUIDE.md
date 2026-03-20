# Development & Debugging Guide

**Last Updated:** March 20, 2026
**Purpose:** Industry-standard practices for debugging and development

---

## Core Principle: Debug First, Fix Second

**Never guess at problems. Always debug with logs to find the actual error.**

---

## Debugging Protocol (MANDATORY)

When any error occurs in production:

### 1. Add Debug Logging IMMEDIATELY

```typescript
console.log('🔍 Step description:', { relevant, data, here })
console.log('📊 Query result:', { success, error, data })
console.log('❌ Error occurred:', error?.message)
console.log('✅ Success:', successMessage)
```

**Emoji guide for logs:**
- 🔍 = Fetching/searching
- 📊 = Query results
- ❌ = Errors
- ✅ = Success
- 🔐 = Auth/permissions

### 2. Deploy Logging

```bash
git add -A
git commit -m "Debug: Add logging for [issue]"
git push origin main
```

### 3. Check Vercel Logs

- Go to Vercel Dashboard → Logs tab
- Reproduce the error
- Read the **actual error message**
- Don't proceed until you see the logs

### 4. Fix the Root Cause

Only after you have the actual error message, write the fix.

### 5. Remove or Keep Debug Logs

- Keep logs for critical paths (auth, payments)
- Remove verbose logs after fixing

---

## Supabase Best Practices

### 1. Explicit Foreign Keys (CRITICAL)

**Problem:** When a table has multiple foreign keys to the same table, Supabase throws:
```
"Could not embed because more than one relationship was found"
```

**Solution:** Always use explicit foreign key syntax:

```typescript
// ❌ WRONG - Ambiguous
const { data } = await supabase
  .from('submissions')
  .select(`
    *,
    user:users (email, name)
  `)

// ✅ CORRECT - Explicit
const { data } = await supabase
  .from('submissions')
  .select(`
    *,
    user:users!user_id (email, name)
  `)
```

The `!user_id` tells Supabase which foreign key column to use.

### 2. Check Schema First

Before writing queries with relationships:
1. Check which foreign keys exist
2. Use explicit syntax if multiple FKs to same table
3. Test query in Supabase SQL editor first

### 3. Handle Errors Properly

```typescript
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.log('❌ Supabase error:', error.message)
  // Handle error appropriately
}

if (!data) {
  console.log('❌ No data returned')
  // Handle empty result
}
```

---

## Testing Before Deployment

### 1. Local Testing

```bash
# Build locally to catch errors
npm run build

# Check for build errors before deploying
```

### 2. Environment Variables

Always verify env vars are set:
- Locally: `.env.local` file
- Vercel: Dashboard → Settings → Environment Variables

### 3. Test in Incognito

Before declaring something "fixed":
1. Hard refresh (`Cmd+Shift+R`)
2. Test in incognito/private window
3. Check Vercel logs for actual request

---

## Common Mistakes to Avoid

### ❌ Don't Do This:

1. **Guessing at problems**
   - "Maybe it's the directory structure"
   - "Probably a routing issue"
   - Multiple random fixes without logs

2. **Deploying without testing**
   - No local build check
   - No error handling
   - No logging

3. **Ambiguous Supabase queries**
   - Using `users` instead of `users!user_id`
   - Not checking schema first

4. **Ignoring actual errors**
   - Making assumptions
   - Not reading logs
   - Fixing symptoms, not root cause

### ✅ Do This Instead:

1. **Add logging immediately**
2. **Read actual error messages**
3. **Fix root cause**
4. **Test before deploying**
5. **Use explicit Supabase syntax**

---

## Code Review Checklist

Before pushing any code:

- [ ] Added error handling for all async operations
- [ ] Used explicit foreign key syntax in Supabase queries
- [ ] Added appropriate console.log debugging
- [ ] Tested locally with `npm run build`
- [ ] Checked environment variables are set
- [ ] No hardcoded values (use env vars)
- [ ] No ambiguous database queries

---

## Incident Report: Admin 404 Issue (March 20, 2026)

**What happened:**
- Admin submission detail pages returned 404
- Multiple incorrect fixes attempted (directory structure changes)
- Root cause not identified until debug logging added

**Actual root cause:**
```
Error: "Could not embed because more than one relationship was found"
```

**What should have been done:**
1. Add debug logging immediately (not after 3 failed attempts)
2. Check Vercel logs to see actual error
3. Fix the ambiguous Supabase query with explicit FK syntax

**Fix:**
```typescript
// Changed from:
user:users (email, name)

// To:
user:users!user_id (email, name)
```

**Lesson:** Always debug with logs first. Never guess.

---

## Quick Reference

### Add Debug Logging Pattern

```typescript
export default async function MyPage({ params }: Props) {
  console.log('🔍 Starting process:', params.id)

  const { data, error } = await supabase.from('table').select('*')

  console.log('📊 Result:', { found: !!data, error: error?.message })

  if (error) {
    console.log('❌ Error details:', error)
    // Handle error
  }

  console.log('✅ Success:', data.id)
}
```

### Check Vercel Logs

1. Vercel Dashboard → Logs tab
2. Set filter to last 30 minutes
3. Reproduce error
4. Read actual error message
5. Fix based on actual error (not guesses)

---

**Remember: Industry-standard development means debugging properly, not guessing quickly.**
