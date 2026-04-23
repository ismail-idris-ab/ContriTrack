# Performance, SEO & Code Quality Overhaul

**Date:** 2026-04-23
**Status:** Approved

## Problem

Dashboard and data-heavy pages (Groups, Members, Contributions) feel slow because:
- Every page fetches data fresh on every mount via `useEffect` — no cache
- Multiple API calls on a single page fire sequentially (waterfall)
- No shared data layer between pages
- Navigation back to a visited page triggers a full refetch

Users see the layout shell but empty data sections for 1–3 seconds on every visit.

## Solution

Replace all page-level `useEffect` data fetching with **React Query (TanStack Query)** for automatic caching, parallel fetching, and background refresh. Supplement with skeleton loaders for perceived performance, and fix SEO and font-loading gaps.

---

## Architecture

### QueryClient Configuration (`main.jsx`)

Wrap the app in `QueryClientProvider` with:
- `staleTime: 5 * 60 * 1000` — data stays fresh for 5 minutes, no refetch on revisit
- `gcTime: 10 * 60 * 1000` — cache held for 10 minutes after last use
- `retry: 1` — one retry on failure before showing error
- `refetchOnWindowFocus: false` — no surprise refetches when user tabs back

### Query Key Convention

Consistent keys across the app for precise cache invalidation:

| Key | Data |
|---|---|
| `['contributions', 'mine']` | Current user's contributions |
| `['contributions', groupId]` | Admin view of group contributions |
| `['members', groupId]` | Group member list |
| `['groups', 'mine']` | User's groups |
| `['dashboard']` | Dashboard summary stats |
| `['notifications']` | User notifications |
| `['penalties', groupId]` | Group penalties |

### Data Fetching Pattern

**Before:**
```js
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  api.get('/endpoint').then(r => setData(r.data)).finally(() => setLoading(false));
}, []);
```

**After:**
```js
const { data = [], isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: () => api.get('/endpoint').then(r => r.data),
});
```

### Mutation Pattern

Any action that modifies data uses `useMutation` with cache invalidation on success:

```js
const mutation = useMutation({
  mutationFn: (payload) => api.post('/endpoint', payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
});
```

This replaces manual `setState(prev => [...prev, newItem])` patterns.

---

## Pages to Migrate

| Page | Current fetches | Parallel after |
|---|---|---|
| `DashboardPage` | Sequential useEffects | All parallel via multiple useQuery |
| `GroupsPage` | 1–2 useEffects | useQuery |
| `MembersPage` | 1 useEffect | useQuery |
| `MyPaymentsPage` | 1 useEffect | useQuery |
| `AdminPage` | Multiple useEffects | Parallel useQuery calls |
| `PenaltyPage` | useEffect | useQuery |
| `NotificationsPage` | useEffect | useQuery |
| `PledgePage` | useEffect | useQuery |

---

## Skeleton Loaders

A single reusable `Skeleton` component at `client/src/components/Skeleton.jsx`:

```jsx
// Props: width, height, count, borderRadius
// Renders animated shimmer blocks matching content shape
```

Applied to:
- Dashboard stats cards (4 cards, fixed dimensions)
- Contribution list rows (5 rows, full width)
- Members table rows (5 rows, full width)
- Groups cards (2–3 cards, fixed dimensions)

Skeletons mirror exact dimensions of real content to prevent layout shift.

---

## LandingPage Split

LandingPage.jsx (3,504 lines) split into focused components at `client/src/components/landing/`:

| File | Content |
|---|---|
| `LandingNavbar.jsx` | Desktop + mobile navigation |
| `HeroSection.jsx` | Above-the-fold hero content |
| `HowItWorksSection.jsx` | Step-by-step section |
| `FeaturesSection.jsx` | Feature grid |
| `TestimonialsSection.jsx` | Testimonial cards |
| `PricingSection.jsx` | Pricing cards |
| `FinalCTASection.jsx` | Bottom call-to-action |
| `LandingFooter.jsx` | Footer with links |

`LandingPage.jsx` becomes a ~50-line orchestrator composing all sections.

---

## SEO Improvements

### Font Loading (`index.html`)

**Before:** Synchronous Google Fonts stylesheet blocks rendering.

**After:** Non-blocking font load pattern:
```html
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?...">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?..."
      media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="..."></noscript>
```

### DNS Prefetch

Add before first API call fires:
```html
<link rel="dns-prefetch" href="//contritrack-api.onrender.com">
```

### Per-Page Document Titles

A `useDocumentTitle(title)` hook at `client/src/utils/useDocumentTitle.js` sets unique `<title>` tags per page:

| Page | Title |
|---|---|
| LandingPage | `ContriTrack — Track Your Savings Circle` |
| DashboardPage | `Dashboard — ContriTrack` |
| UploadPage | `Submit Payment Proof — ContriTrack` |
| MembersPage | `Members — ContriTrack` |
| GroupsPage | `My Circles — ContriTrack` |

### Sitemap

Verify `/public/sitemap.xml` includes all public routes with correct priorities.

---

## Code Cleanup

- Remove unused imports across all migrated pages (loading state vars, setData, useEffect, useState that get replaced)
- Remove dead `useNavigate` imports where navigation was removed
- LandingPage: extract inline styles into the section components that own them

---

## Out of Scope

- Server-side rendering (SSR) — not warranted for this app type
- Service worker / PWA caching — separate concern
- Backend query optimization — separate concern
- Image optimization pipeline — separate concern
