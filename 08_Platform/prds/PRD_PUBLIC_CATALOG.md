# PRD: Public Catalog
## Browse Rights Verified Films, Request Licensing

**Version:** 1.0
**Date:** March 2026
**Technical Architecture:** `08_Platform/architecture/TECHNICAL_ARCHITECTURE.md`
**Business Context:** BUSINESS_PLAN_v4.md (CaaS model, Gear B = Showcase marketplace with 20% commission)

---

## Executive Summary

**Purpose:** Public-facing catalog where buyers (brands, agencies, platforms) can browse Rights Verified AI films and request licensing.

**User roles:** Buyers (anonymous visitors, no account required in Year 1)

**Core user journey:**
1. Land on catalog page (superimmersive8.com/catalog)
2. Browse verified films (grid view with thumbnails)
3. Filter by genre, style, use case
4. Click film → view details (video embed, creator bio, Rights Verified badge)
5. Request licensing → fills form → SI8 admin contacts buyer

**Success metrics:**
- 1,000+ monthly catalog visitors by Month 6
- 10+ licensing requests by Month 6
- 20%+ click-through rate (catalog grid → film detail page)
- 10%+ conversion rate (film detail view → licensing request)

---

## User Stories

### 1. Browse Catalog Grid

**As a buyer, I want to:**
- See all Rights Verified films in one place
- Quickly scan thumbnails and titles
- Filter by genre, style, or use case
- Sort by newest, most popular, or featured

**Catalog Grid Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Rights Verified Catalog                                     │
│  20 AI films ready for licensing                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Genre: All ▼]  [Style: All ▼]  [Use Case: All ▼]          │
│  [Sort: Newest ▼]                            [Search: ...]  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   [IMG]     │  │   [IMG]     │  │   [IMG]     │        │
│  │             │  │             │  │             │        │
│  │ Neon Dreams │  │ Time Passing│  │ Cyberpunk   │        │
│  │ Commercial  │  │ Documentary │  │ City        │        │
│  │ 2:30        │  │ 1:45        │  │ Commercial  │        │
│  │ ✓ Rights    │  │ ✓ Rights    │  │ 3:10        │        │
│  │   Verified  │  │   Verified  │  │ ✓ Rights    │        │
│  └─────────────┘  └─────────────┘  │   Verified  │        │
│                                     └─────────────┘        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   [IMG]     │  │   [IMG]     │  │   [IMG]     │        │
│  │ ... (more)  │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  [Load More]                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Film Card (Hover State):**
- Thumbnail image (16:9 aspect ratio, 1280×720px)
- Film title (max 2 lines, ellipsis if longer)
- Genre badge (e.g., "Commercial", "Narrative", "Experimental")
- Runtime (mm:ss)
- Rights Verified badge (green checkmark ✓)
- Hover: Overlay with "View Details" button + play icon

**Acceptance criteria:**
- [ ] Catalog page at `/catalog` route
- [ ] Grid layout: 3 columns desktop, 2 columns tablet, 1 column mobile
- [ ] Thumbnail images from Supabase Storage (`catalog-thumbnails/` bucket)
- [ ] Rights Verified badge visible on all cards
- [ ] Hover state: Overlay with "View Details" button
- [ ] Click anywhere on card → navigate to film detail page (`/catalog/[catalog-id]`)
- [ ] Empty state (if no films yet): "Catalog coming soon. We're currently curating our first Rights Verified films."
- [ ] Pagination or infinite scroll (load 20 films at a time)

---

### 2. Filter & Search

**As a buyer, I want to:**
- Filter by genre (Narrative, Documentary, Commercial, etc.)
- Filter by style/tags (Cyberpunk, Nature, Abstract, etc.)
- Filter by use case (Brand-safe, Editorial, Social Media)
- Search by keyword (film title, creator name, description)
- Sort by newest, featured, or most licensed

**Filter Dropdowns:**

**Genre:**
- All Genres
- Narrative
- Documentary
- Commercial
- Experimental
- Music Video
- Abstract

**Style/Tags:**
- All Styles
- Cyberpunk
- Nature
- Abstract
- Fashion
- Urban
- Minimalist
- (Dynamic: pulls from tags in database)

**Use Case:**
- All Use Cases
- Brand-Safe (no controversial content)
- Editorial (news, blogs, articles)
- Social Media (vertical format available)
- Streaming (longer runtime)

**Sort Options:**
- Newest (default)
- Featured (admin-curated)
- Most Popular (most licensing requests)

**Acceptance criteria:**
- [ ] Filter dropdowns update URL params (`?genre=commercial&style=cyberpunk`)
- [ ] Filters update grid in real-time (no page reload)
- [ ] Search input filters by title, creator name, or description keywords
- [ ] Sort dropdown changes order instantly
- [ ] Filter + search can be combined (e.g., "commercial + cyberpunk + search 'neon'")
- [ ] Clear filters button (resets to default view)
- [ ] URL shareable (buyer can share filtered view: `/catalog?genre=commercial`)

---

### 3. Film Detail Page

**As a buyer, I want to:**
- Watch the film (embedded video player)
- Read film description and creator bio
- See Rights Verified badge and understand what it means
- Request licensing with one click

**Film Detail Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Catalog                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │            [VIDEO PLAYER]                               ││
│  │         (YouTube/Vimeo embed)                           ││
│  │                                                         ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌────────────────────────┐  ┌──────────────────────────┐ │
│  │ Neon Dreams            │  │ [Request Licensing]      │ │
│  │ Genre: Commercial      │  │                          │ │
│  │ Runtime: 2:30          │  │ ✓ Rights Verified        │ │
│  │ Created by: John Doe   │  │                          │ │
│  └────────────────────────┘  │ Non-exclusive, starting  │ │
│                               │ at $2,000                │ │
│  Description:                 │                          │ │
│  A cyberpunk cityscape...     └──────────────────────────┘ │
│  (up to 500 characters)                                    │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  What is "Rights Verified"?                                 │
│  ✓ AI tool provenance documented                            │
│  ✓ Commercial use authorized                                │
│  ✓ No real person likeness                                  │
│  ✓ No copyrighted IP imitation                              │
│  ✓ Chain of Title documentation available                   │
│                                                              │
│  Learn more about our Rights Verified process               │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  About the Creator: John Doe                                │
│  [Profile image]                                             │
│  [Bio: 200 characters]                                       │
│  Website: [johndoe.com]                                      │
│  More by John Doe: [Film 2] [Film 3]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] Film detail page at `/catalog/[catalog-id]` route (e.g., `/catalog/SI8-2026-0001`)
- [ ] Video player: YouTube or Vimeo embed (autoplay off, controls enabled)
- [ ] Film metadata: Title, Genre, Runtime, Creator Name (clickable to creator profile)
- [ ] Description: Up to 500 characters (from opt-in form)
- [ ] Tags: Genre, style tags as badges
- [ ] Rights Verified badge prominently displayed
- [ ] "What is Rights Verified?" expandable section (explains 5 key points)
- [ ] Request Licensing button (primary CTA, above the fold)
- [ ] Creator bio section with profile image, bio text, website link
- [ ] "More by [Creator]" section: Shows other films by same creator (if any)
- [ ] Social share buttons: LinkedIn, Twitter (optional, Year 2)
- [ ] Open Graph meta tags for social sharing (thumbnail, title, description)

---

### 4. Request Licensing Form

**As a buyer, I want to:**
- Request licensing for a specific film
- Provide my contact info and use case
- Understand pricing and timeline
- Receive confirmation that SI8 will contact me

**Request Licensing Flow:**
1. Buyer clicks "Request Licensing" button on film detail page
2. Modal opens with form:

```
┌─────────────────────────────────────────────────────────────┐
│  Request Licensing: Neon Dreams                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Information                                            │
│  Name *           [_______________________]                  │
│  Email *          [_______________________]                  │
│  Company          [_______________________]                  │
│  Phone (optional) [_______________________]                  │
│                                                              │
│  Licensing Details                                           │
│  Intended Use *   [Dropdown: Brand Campaign ▼]              │
│    • Brand Campaign                                          │
│    • Editorial / Content                                     │
│    • Streaming / Platform                                    │
│    • Social Media                                            │
│    • Other (specify)                                         │
│                                                              │
│  Territory *      [Dropdown: Global ▼]                       │
│  Duration *       [Dropdown: 12 months ▼]                    │
│                                                              │
│  Additional Details (optional)                               │
│  [____________________________________________]              │
│  [____________________________________________]              │
│                                                              │
│  Budget Range (optional)                                     │
│  [Dropdown: $2K-$5K ▼]                                       │
│    • Under $2K                                               │
│    • $2K-$5K                                                 │
│    • $5K-$10K                                                │
│    • $10K+                                                   │
│                                                              │
│  [Submit Request]  [Cancel]                                  │
│                                                              │
│  We'll respond within 1 business day with pricing and terms. │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

3. After submission:
   - Form data saved to `licensing_deals` table (status: "negotiating")
   - Confirmation message: "Thank you! We'll contact you within 1 business day with licensing details."
   - Email sent to admin: "New licensing request for [Film Title] from [Buyer Name]"
   - Email sent to creator: "Good news! A buyer has requested licensing for your film. View details in your dashboard."
   - Email sent to buyer: "Thank you for your interest in [Film Title]. We'll be in touch shortly."

**Acceptance criteria:**
- [ ] Request Licensing button opens modal form
- [ ] Form validation: Name, Email, Intended Use, Territory, Duration required
- [ ] Email format validation
- [ ] Form submission creates `licensing_deals` record with status = "negotiating"
- [ ] Confirmation message shown after submission
- [ ] Three emails sent: Admin notification, creator notification, buyer confirmation
- [ ] Modal can be closed (X button or click outside)
- [ ] Form data persists if modal accidentally closed (localStorage backup)

---

## UI/UX Design Specs

### Design System

**Colors:**
- Primary accent: `#C8900A` (golden amber) — CTA buttons, badges
- Text: `#1A1A1A` (dark gray) on `#FFFFFF` (white background)
- Borders: `#E5E5E5` (light gray)
- Rights Verified badge: `#10B981` (green) with white checkmark

**Typography:**
- Headings: Space Grotesk (600 weight)
- Body: Inter (400 weight)
- Badge text: Inter (500 weight)

**Spacing:**
- Card grid gap: 24px (desktop), 16px (mobile)
- Section padding: 80px vertical, 24px horizontal
- Card padding: 16px

---

### Catalog Grid Responsive Design

**Desktop (1280px+):**
- 3 columns
- Card size: ~400px width × 300px height

**Tablet (768px - 1279px):**
- 2 columns
- Card size: ~360px width × 270px height

**Mobile (<768px):**
- 1 column
- Card size: 100% width × auto height

**Thumbnail aspect ratio:** 16:9 (enforced with CSS `aspect-ratio`)

---

### Film Detail Page Responsive

**Desktop:**
- Video player: 1280×720px (16:9)
- Two-column layout: Film info (left 70%) + CTA card (right 30%)

**Mobile:**
- Single column
- Video player: 100% width, 16:9 aspect ratio
- CTA card: Full width below video

---

### Rights Verified Badge

**Visual design:**
```
┌────────────────────────┐
│ ✓ Rights Verified      │  (Green background #10B981, white text)
└────────────────────────┘
```

**Tooltip on hover:**
"This film has been verified by SI8 for commercial use. Tool provenance, IP clearance, and authorship are documented."

---

## Technical Implementation

### Tech Stack

- **Frontend:** Next.js 14 (App Router), React Server Components
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **Video Embeds:** React Player (supports YouTube, Vimeo)
- **Filtering:** URL params + client-side filtering (real-time updates)
- **SEO:** Next.js Metadata API (Open Graph tags for social sharing)

---

### Key Components

#### 1. `<CatalogGrid />` (`app/catalog/page.tsx`)

**Server Component (fetches data on server):**

```tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { FilmCard } from '@/components/FilmCard'

export default async function CatalogPage({ searchParams }) {
  const supabase = createServerComponentClient({ cookies })

  // Build query with filters from URL params
  let query = supabase
    .from('opt_ins')
    .select('*, submissions(*), users(*)')
    .eq('visible', true) // Only visible catalog entries

  if (searchParams.genre) {
    query = query.contains('tags', [searchParams.genre])
  }

  const { data: films } = await query.order('created_at', { ascending: false })

  return (
    <div>
      <h1>Rights Verified Catalog</h1>
      <p>{films?.length} AI films ready for licensing</p>

      <Filters />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {films?.map(film => (
          <FilmCard key={film.id} film={film} />
        ))}
      </div>
    </div>
  )
}
```

---

#### 2. `<FilmCard />` (`components/FilmCard.tsx`)

**Client Component (hover interactions):**

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'

export function FilmCard({ film }) {
  return (
    <Link href={`/catalog/${film.catalog_id}`}>
      <div className="group relative cursor-pointer rounded-lg overflow-hidden border">
        {/* Thumbnail */}
        <Image
          src={film.thumbnail_url}
          alt={film.submissions.title}
          width={400}
          height={225}
          className="aspect-video object-cover"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <button className="bg-white text-black px-4 py-2 rounded">
            View Details
          </button>
        </div>

        {/* Film Info */}
        <div className="p-4">
          <h3 className="font-semibold text-lg">{film.submissions.title}</h3>
          <p className="text-sm text-gray-600">{film.submissions.genre}</p>
          <p className="text-sm text-gray-600">{formatRuntime(film.submissions.runtime_seconds)}</p>
          <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-2">
            ✓ Rights Verified
          </span>
        </div>
      </div>
    </Link>
  )
}
```

---

#### 3. `<FilmDetailPage />` (`app/catalog/[catalog-id]/page.tsx`)

**Server Component with dynamic route:**

```tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import ReactPlayer from 'react-player'
import { RequestLicensingButton } from '@/components/RequestLicensingButton'

export async function generateMetadata({ params }) {
  // Fetch film for Open Graph meta tags
  const supabase = createServerComponentClient({ cookies })
  const { data: film } = await supabase
    .from('opt_ins')
    .select('*, submissions(*), users(*)')
    .eq('catalog_id', params['catalog-id'])
    .single()

  return {
    title: `${film.submissions.title} | SI8 Catalog`,
    description: film.catalog_description,
    openGraph: {
      images: [film.thumbnail_url]
    }
  }
}

export default async function FilmDetailPage({ params }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: film } = await supabase
    .from('opt_ins')
    .select('*, submissions(*), users(*), rights_packages(*)')
    .eq('catalog_id', params['catalog-id'])
    .single()

  return (
    <div>
      <Link href="/catalog">← Back to Catalog</Link>

      {/* Video Player */}
      <div className="aspect-video">
        <ReactPlayer url={film.video_url} controls width="100%" height="100%" />
      </div>

      {/* Film Info + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          <h1>{film.submissions.title}</h1>
          <p>Genre: {film.submissions.genre} | Runtime: {formatRuntime(film.submissions.runtime_seconds)}</p>
          <p>Created by: <Link href={`/creators/${film.users.id}`}>{film.users.full_name}</Link></p>

          <p className="mt-4">{film.catalog_description}</p>

          {/* What is Rights Verified */}
          <details className="mt-8">
            <summary>What is "Rights Verified"?</summary>
            <ul>
              <li>✓ AI tool provenance documented</li>
              <li>✓ Commercial use authorized</li>
              <li>✓ No real person likeness</li>
              <li>✓ No copyrighted IP imitation</li>
              <li>✓ Chain of Title documentation available</li>
            </ul>
          </details>
        </div>

        {/* CTA Card */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <RequestLicensingButton filmId={film.id} catalogId={params['catalog-id']} />
          <p className="text-sm mt-4">✓ Rights Verified</p>
          <p className="text-sm">Non-exclusive, starting at $2,000</p>
        </div>
      </div>

      {/* Creator Bio */}
      <div className="mt-12">
        <h2>About the Creator: {film.users.full_name}</h2>
        <Image src={film.users.profile_image_url} alt={film.users.full_name} width={80} height={80} className="rounded-full" />
        <p>{film.users.bio}</p>
        <a href={film.users.website_url} target="_blank">Visit Website</a>
      </div>
    </div>
  )
}
```

---

#### 4. `<RequestLicensingButton />` + `<RequestLicensingModal />` (`components/RequestLicensingModal.tsx`)

**Client Component (modal interaction):**

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'

export function RequestLicensingButton({ filmId, catalogId }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="w-full bg-amber-600 text-white py-3 rounded">
        Request Licensing
      </button>
      <RequestLicensingModal isOpen={isOpen} onClose={() => setIsOpen(false)} filmId={filmId} catalogId={catalogId} />
    </>
  )
}

function RequestLicensingModal({ isOpen, onClose, filmId, catalogId }) {
  const { register, handleSubmit } = useForm()

  const onSubmit = async (data) => {
    await fetch('/api/catalog/request-license', {
      method: 'POST',
      body: JSON.stringify({ ...data, filmId, catalogId })
    })

    // Show success message
    alert('Thank you! We\'ll contact you within 1 business day.')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <h2>Request Licensing: [Film Title]</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <input {...register('name', { required: true })} placeholder="Name" />
          <input {...register('email', { required: true })} placeholder="Email" type="email" />
          <input {...register('company')} placeholder="Company (optional)" />
          <select {...register('intendedUse', { required: true })}>
            <option value="brand_campaign">Brand Campaign</option>
            <option value="editorial">Editorial / Content</option>
            <option value="streaming">Streaming / Platform</option>
            <option value="social_media">Social Media</option>
            <option value="other">Other</option>
          </select>
          <select {...register('territory', { required: true })}>
            <option value="global">Global</option>
            <option value="north_america">North America</option>
            <option value="europe">Europe</option>
            <option value="asia">Asia</option>
          </select>
          <textarea {...register('details')} placeholder="Additional details (optional)" />
          <button type="submit">Submit Request</button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## API Endpoints

### Public Catalog Endpoints

```
GET    /api/catalog                     Get all visible catalog entries (filterable, sortable)
GET    /api/catalog/[catalog-id]        Get single catalog entry by catalog ID
POST   /api/catalog/request-license     Submit licensing request (creates lead in licensing_deals table)
```

**Example: `/api/catalog/request-license`**

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { name, email, company, intendedUse, territory, details, filmId, catalogId } = await req.json()

  // Fetch film details
  const { data: film } = await supabase
    .from('opt_ins')
    .select('*, submissions(*), users(*)')
    .eq('catalog_id', catalogId)
    .single()

  // Create licensing deal record
  const { data: deal } = await supabase
    .from('licensing_deals')
    .insert({
      submission_id: film.submission_id,
      rights_package_id: film.rights_package_id,
      creator_id: film.user_id,
      buyer_name: name,
      buyer_email: email,
      buyer_company: company,
      license_type: 'non_exclusive_commercial', // Default
      territory,
      status: 'negotiating',
      // deal_value will be set by admin after negotiation
    })
    .select()
    .single()

  // Send emails
  await sendEmail({
    to: 'admin@superimmersive8.com',
    subject: `New licensing request: ${film.submissions.title}`,
    html: `Buyer: ${name} (${email}) from ${company || 'N/A'}. Intended use: ${intendedUse}. Territory: ${territory}. Details: ${details || 'None'}.`
  })

  await sendEmail({
    to: film.users.email,
    subject: `Good news! Licensing request for "${film.submissions.title}"`,
    html: `A buyer has requested licensing for your film. View details in your dashboard.`
  })

  await sendEmail({
    to: email,
    subject: `Thank you for your interest in "${film.submissions.title}"`,
    html: `We'll be in touch within 1 business day with licensing details.`
  })

  return Response.json({ success: true, dealId: deal.id })
}
```

---

## SEO & Metadata

### Open Graph Tags (Film Detail Pages)

**Generated dynamically per film:**

```html
<meta property="og:title" content="Neon Dreams | SI8 Catalog" />
<meta property="og:description" content="A cyberpunk cityscape with neon lights..." />
<meta property="og:image" content="https://supabase.co/.../thumbnail.jpg" />
<meta property="og:url" content="https://superimmersive8.com/catalog/SI8-2026-0001" />
<meta property="og:type" content="video.other" />
```

**Twitter Card:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Neon Dreams | SI8 Catalog" />
<meta name="twitter:description" content="A cyberpunk cityscape..." />
<meta name="twitter:image" content="https://supabase.co/.../thumbnail.jpg" />
```

---

### Sitemap (`sitemap.xml`)

**Auto-generated from catalog entries:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://superimmersive8.com/catalog</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://superimmersive8.com/catalog/SI8-2026-0001</loc>
    <priority>0.8</priority>
  </url>
  <!-- One entry per catalog film -->
</urlset>
```

**Submitted to Google Search Console for indexing**

---

## Analytics & Tracking

### Custom Events (Vercel Analytics)

**Track user interactions:**

```javascript
// Catalog page view
analytics.track('Catalog Viewed', { totalFilms: 20 })

// Film detail view
analytics.track('Film Viewed', { catalogId: 'SI8-2026-0001', filmTitle: 'Neon Dreams' })

// Licensing request
analytics.track('Licensing Requested', { catalogId: 'SI8-2026-0001', buyerEmail: 'buyer@example.com' })

// Filter applied
analytics.track('Catalog Filtered', { genre: 'commercial', style: 'cyberpunk' })
```

**Key metrics to monitor:**
- Catalog page views (total visitors)
- Film detail views (CTR from grid)
- Licensing requests (conversion rate)
- Filters most used (genre, style, use case)
- Top 10 most-viewed films

---

## Testing Plan

### Unit Tests

- [ ] Filter logic (genre, style, search)
- [ ] Sort logic (newest, featured)
- [ ] URL param parsing (`?genre=commercial` → filter applied)
- [ ] Email validation (licensing request form)

### Integration Tests (Playwright)

- [ ] End-to-end catalog browse (land on page → click film → view detail)
- [ ] End-to-end licensing request (view film → click Request Licensing → fill form → submit)
- [ ] Filter + search combination (apply genre filter + search keyword)
- [ ] Mobile responsive (catalog grid collapses to 1 column)

### Manual QA Checklist

- [ ] Catalog grid loads (all films visible, thumbnails load)
- [ ] Rights Verified badges appear on all cards
- [ ] Video player works (YouTube/Vimeo embed plays)
- [ ] Request Licensing modal opens and closes
- [ ] Form submission sends emails (admin, creator, buyer)
- [ ] Open Graph tags work (share link on LinkedIn/Twitter, correct thumbnail shows)
- [ ] Mobile responsive (iPhone 12, iPad, Desktop)

---

## Success Metrics

### Quantitative

- **Catalog traffic:** 1,000+ monthly visitors by Month 6
- **CTR (grid → detail):** >20% (1 in 5 visitors clicks into a film)
- **Licensing request conversion:** >10% of film detail views result in licensing request
- **Repeat visitors:** >30% return to catalog within 30 days
- **Average time on film detail page:** >2 minutes (indicates engagement)

### Qualitative

- Buyers report catalog is "easy to browse and professional" (user testing, N=5)
- Rights Verified badge is "clear and trustworthy" (buyer feedback)
- Video quality meets buyer expectations (no complaints about resolution/format)

---

## Open Questions

1. **Video hosting:** Should SI8 host videos on Supabase Storage or require YouTube/Vimeo embeds?
   - **Resolution:** Year 1 = YouTube/Vimeo embeds (zero hosting costs). Year 2 = Supabase Storage option (private videos).

2. **Pricing visibility:** Should catalog show "Starting at $2,000" or "Request Quote"?
   - **Resolution:** "Starting at $2,000" (sets expectations, filters out low-budget buyers).

3. **Buyer accounts:** Should buyers create accounts to track licensing requests?
   - **Resolution:** Year 1 = no accounts (guest checkout). Year 2 = buyer accounts with request history.

4. **Watermarks:** Should catalog videos have SI8 watermark to prevent unauthorized use?
   - **Resolution:** Year 1 = no watermark (trust-based, embeds only). Year 2 = add watermark if unauthorized use detected.

---

## Launch Checklist

**Pre-launch (Week 4):**
- [ ] Catalog grid implemented and tested (filters, search, sort)
- [ ] Film detail pages working (video embeds, Rights Verified badges)
- [ ] Request Licensing form functional (emails sent)
- [ ] Mobile responsive on iPhone, iPad, Android
- [ ] Open Graph tags working (test social sharing)

**Launch (Week 5):**
- [ ] Deploy with Creator Portal + Admin Panel
- [ ] Add 5-10 initial catalog entries (soft launch)
- [ ] Monitor analytics (track catalog views, licensing requests)
- [ ] Announce catalog launch (LinkedIn post, email to leads)

**Post-launch (Week 6):**
- [ ] Collect buyer feedback (email survey to first 5 licensing requesters)
- [ ] Optimize catalog based on data (which filters are used most, which films get most views)
- [ ] Plan catalog growth (target 20-30 films by Month 3)

---

**Document Status:** ✅ Complete — Ready for implementation
**Next:** `08_Platform/prds/PRD_CAAS_WEBSITE.md`
