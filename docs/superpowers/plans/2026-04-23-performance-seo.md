# Performance, SEO & Code Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all page-level useEffect data fetching with React Query for caching/parallel fetches, add skeleton loaders, fix font loading, split LandingPage, and add per-page SEO titles.

**Architecture:** Install @tanstack/react-query, wrap app in QueryClientProvider with 5-min stale time, migrate each data-heavy page to useQuery, use consistent query keys for precise invalidation. LandingPage split into 8 focused section components.

**Tech Stack:** @tanstack/react-query v5, React 18, Vite, existing axios instance

---

## File Map

**New files:**
- `client/src/components/Skeleton.jsx` — reusable shimmer skeleton
- `client/src/utils/useDocumentTitle.js` — per-page SEO title hook
- `client/src/components/landing/LandingNavbar.jsx`
- `client/src/components/landing/HeroSection.jsx`
- `client/src/components/landing/HowItWorksSection.jsx`
- `client/src/components/landing/FeaturesSection.jsx`
- `client/src/components/landing/TestimonialsSection.jsx`
- `client/src/components/landing/PricingSection.jsx`
- `client/src/components/landing/FinalCTASection.jsx`
- `client/src/components/landing/LandingFooter.jsx`

**Modified files:**
- `client/package.json` — add @tanstack/react-query
- `client/src/main.jsx` — add QueryClientProvider
- `client/index.html` — non-blocking fonts, dns-prefetch
- `client/src/pages/DashboardPage.jsx` — useQuery migration
- `client/src/pages/MembersPage.jsx` — useQuery migration
- `client/src/pages/MyPaymentsPage.jsx` — useQuery migration
- `client/src/pages/NotificationsPage.jsx` — useQuery migration
- `client/src/pages/PenaltyPage.jsx` — useQuery migration
- `client/src/pages/LandingPage.jsx` — thin orchestrator after split

---

## Task 1: Install React Query and configure QueryClient

**Files:**
- Modify: `client/package.json`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: Install the package**

```bash
cd client && npm install @tanstack/react-query@5
```

Expected output: `added 1 package` (or similar, no errors)

- [ ] **Step 2: Update main.jsx to wrap the app in QueryClientProvider**

Replace the entire contents of `client/src/main.jsx` with:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Verify the app still starts**

```bash
npm run dev
```

Expected: App loads at http://localhost:3000 with no console errors.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/src/main.jsx
git commit -m "feat: install react-query and configure QueryClient"
```

---

## Task 2: Create reusable Skeleton component

**Files:**
- Create: `client/src/components/Skeleton.jsx`

- [ ] **Step 1: Create the Skeleton component**

Create `client/src/components/Skeleton.jsx`:

```jsx
export default function Skeleton({ width = '100%', height = 18, borderRadius = 8, count = 1, gap = 10, style = {} }) {
  const base = {
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.4s ease infinite',
    flexShrink: 0,
    ...style,
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap, width }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={base} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Skeleton.jsx
git commit -m "feat: add reusable Skeleton shimmer component"
```

---

## Task 3: Create useDocumentTitle hook

**Files:**
- Create: `client/src/utils/useDocumentTitle.js`

- [ ] **Step 1: Create the hook**

Create `client/src/utils/useDocumentTitle.js`:

```js
import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/useDocumentTitle.js
git commit -m "feat: add useDocumentTitle hook for per-page SEO titles"
```

---

## Task 4: Fix index.html — non-blocking fonts and DNS prefetch

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Replace blocking font link with non-blocking pattern**

In `client/index.html`, replace these three lines:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

With:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'" />
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" /></noscript>
```

- [ ] **Step 2: Add DNS prefetch for the API domain**

Add this line after the `<meta name="theme-color">` tag. Replace `your-api.onrender.com` with your actual production API domain:

```html
    <link rel="dns-prefetch" href="//your-api.onrender.com" />
```

- [ ] **Step 3: Verify fonts still load**

Run `npm run dev`, visit http://localhost:3000. Fonts (Playfair Display headings, Plus Jakarta Sans body) should look identical to before.

- [ ] **Step 4: Commit**

```bash
git add client/index.html
git commit -m "perf: non-blocking font loading and DNS prefetch"
```

---

## Task 5: Migrate DashboardPage to React Query

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

The dashboard fetches `/members?month=X&year=Y&groupId=Z`. The query key must include `month`, `year`, and `activeGroup._id` so React Query re-fetches automatically when the month navigator changes.

- [ ] **Step 1: Add useQuery import and replace the fetch logic**

At the top of `DashboardPage.jsx`, change the imports from:

```js
import { useEffect, useState } from 'react';
```

To:

```js
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
```

- [ ] **Step 2: Replace the fetchMembers function and useEffect**

Find and remove these lines in the `DashboardPage` component:

```js
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchMembers = async () => {
    if (!activeGroup) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/members?month=${month}&year=${year}&groupId=${activeGroup._id}`);
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingGroups) fetchMembers();
  }, [month, year, activeGroup, loadingGroups]);
```

Replace with:

```js
  const { data: members = [], isLoading: loading, isError, error: fetchError } = useQuery({
    queryKey: ['members', activeGroup?._id, month, year],
    queryFn: () =>
      api.get(`/members?month=${month}&year=${year}&groupId=${activeGroup._id}`)
         .then(r => r.data),
    enabled: !!activeGroup && !loadingGroups,
  });

  const error = isError ? (fetchError?.response?.data?.message || 'Failed to load members.') : '';
```

- [ ] **Step 3: Add Skeleton to the loading state**

Find where the dashboard renders the loading spinner/state. Import `Skeleton` at the top:

```js
import Skeleton from '../components/Skeleton';
```

Then find the loading block that renders while `loading` is true and replace its content with:

```jsx
{loading && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, marginBottom: 24 }}>
    {[1,2,3,4].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: 'var(--ct-shadow)' }}>
        <Skeleton height={10} width={80} style={{ marginBottom: 16 }} />
        <Skeleton height={28} width={120} style={{ marginBottom: 8 }} />
        <Skeleton height={10} width={100} />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Add useDocumentTitle**

Add at the top of the `DashboardPage` component function body:

```js
import useDocumentTitle from '../utils/useDocumentTitle';
// ...inside component:
useDocumentTitle('Dashboard — ContriTrack');
```

- [ ] **Step 5: Verify dashboard loads and month navigation still triggers refetch**

Visit http://localhost:3000/dashboard. Click the month navigator arrows — data should update. Navigate away to another page and back — data should appear instantly from cache.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "perf: migrate DashboardPage to React Query with skeleton loader"
```

---

## Task 6: Migrate MembersPage to React Query

**Files:**
- Modify: `client/src/pages/MembersPage.jsx`

MembersPage has two fetches: the members list (depends on `activeGroup`) and trust scores (depends on `activeGroup` + `tab === 'trust'`).

- [ ] **Step 1: Update imports**

Change:
```js
import { useEffect, useState } from 'react';
```
To:
```js
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Also add at the top:
```js
import Skeleton from '../components/Skeleton';
import useDocumentTitle from '../utils/useDocumentTitle';
```

- [ ] **Step 2: Replace members fetch useEffect**

Remove:
```js
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
    api.get(`/members?month=${month}&year=${year}${groupParam}`)
      .then(({ data }) => setMembers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeGroup]);
```

Replace with:
```js
  const qMonth = now.getMonth() + 1;
  const qYear  = now.getFullYear();
  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['members', activeGroup?._id, qMonth, qYear],
    queryFn: () => {
      const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
      return api.get(`/members?month=${qMonth}&year=${qYear}${groupParam}`).then(r => r.data);
    },
    enabled: true,
  });
```

- [ ] **Step 3: Replace trust scores fetch useEffect**

Remove:
```js
  const [trustScores, setTrustScores] = useState([]);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustLocked, setTrustLocked] = useState(false);

  useEffect(() => {
    if (tab !== 'trust' || !activeGroup) return;
    setTrustLoading(true);
    setTrustLocked(false);
    api.get(`/exports/trust-scores?groupId=${activeGroup._id}`)
      .then(({ data }) => setTrustScores(data))
      .catch(err => {
        if (err.response?.status === 403) setTrustLocked(true);
      })
      .finally(() => setTrustLoading(false));
  }, [tab, activeGroup]);
```

Replace with:
```js
  const { data: trustScores = [], isLoading: trustLoading, isError: trustError, error: trustErr } = useQuery({
    queryKey: ['trust-scores', activeGroup?._id],
    queryFn: () => api.get(`/exports/trust-scores?groupId=${activeGroup._id}`).then(r => r.data),
    enabled: tab === 'trust' && !!activeGroup,
    retry: (count, err) => err?.response?.status !== 403 && count < 1,
  });
  const trustLocked = trustError && trustErr?.response?.status === 403;
```

- [ ] **Step 4: Migrate role change to useMutation**

Find `handleRoleChange` async function. Replace the manual `setMembers` update pattern with cache invalidation:

```js
  const queryClient = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: ({ memberId, newRole }) =>
      api.patch(`/groups/${activeGroup._id}/members/${memberId}/role`, { role: newRole }),
    onSuccess: (_, { newRole }) => {
      queryClient.invalidateQueries({ queryKey: ['members', activeGroup?._id] });
      showToast(
        newRole === 'admin'
          ? `${roleConfirm.member.name} is now an admin`
          : `${roleConfirm.member.name} is now a member`,
        'success'
      );
      setRoleConfirm(null);
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to update role', 'error'),
  });

  const handleRoleChange = () => {
    if (!roleConfirm || !activeGroup) return;
    roleMutation.mutate({ memberId: roleConfirm.member._id, newRole: roleConfirm.newRole });
  };

  const roleChanging = roleMutation.isPending;
```

- [ ] **Step 5: Add Skeleton to the members loading state**

Add Skeleton import (already added in Step 1). Find where members loading state renders and add before the members list:

```jsx
{loading && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <div style={{ flex: 1 }}>
          <Skeleton height={13} width={140} style={{ marginBottom: 8 }} />
          <Skeleton height={10} width={100} />
        </div>
        <Skeleton height={24} width={70} borderRadius={12} />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Add useDocumentTitle**

Inside the `MembersPage` component body, add:
```js
useDocumentTitle('Members — ContriTrack');
```

- [ ] **Step 7: Verify**

Visit http://localhost:3000/members. Data loads. Navigate away and back — instant from cache. Role change still works.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/MembersPage.jsx
git commit -m "perf: migrate MembersPage to React Query with skeleton loader"
```

---

## Task 7: Migrate MyPaymentsPage to React Query

**Files:**
- Modify: `client/src/pages/MyPaymentsPage.jsx`

- [ ] **Step 1: Update imports**

Change:
```js
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
```
To:
```js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

Also add:
```js
import Skeleton from '../components/Skeleton';
import useDocumentTitle from '../utils/useDocumentTitle';
```

- [ ] **Step 2: Replace useEffect fetch**

Remove:
```js
  const [payments, setPayments]       = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/contributions/mine')
      .then(({ data }) => setPayments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
```

Replace with:
```js
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading: loading } = useQuery({
    queryKey: ['contributions', 'mine'],
    queryFn: () => api.get('/contributions/mine').then(r => r.data),
  });
```

- [ ] **Step 3: Replace onResubmitSuccess manual state update with cache invalidation**

Find:
```js
  const onResubmitSuccess = (updated) => {
    setPayments(prev => prev.map(p => p._id === updated._id ? updated : p));
  };
```

Replace with:
```js
  const onResubmitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['contributions', 'mine'] });
  };
```

- [ ] **Step 4: Add Skeleton to loading state**

Find where `loading` is checked and add a skeleton:

```jsx
{loading && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--ct-shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton height={13} width={120} style={{ marginBottom: 8 }} />
            <Skeleton height={10} width={80} />
          </div>
          <Skeleton height={28} width={90} borderRadius={12} />
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Add useDocumentTitle**

Inside `MyPaymentsPage` component body:
```js
useDocumentTitle('My Payments — ContriTrack');
```

- [ ] **Step 6: Verify**

Visit http://localhost:3000/payments. Data loads, resubmit modal still works, navigate away and back — instant.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/MyPaymentsPage.jsx
git commit -m "perf: migrate MyPaymentsPage to React Query"
```

---

## Task 8: Migrate NotificationsPage to React Query

**Files:**
- Modify: `client/src/pages/NotificationsPage.jsx`

- [ ] **Step 1: Update imports**

Change:
```js
import { useState, useEffect } from 'react';
```
To:
```js
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

Add:
```js
import useDocumentTitle from '../utils/useDocumentTitle';
```

- [ ] **Step 2: Replace fetch state and useEffect**

Remove:
```js
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = () => {
    setLoading(true);
    api.get('/notifications?limit=30')
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setHasMore(data.hasMore || false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);
```

Replace with:
```js
  const queryClient = useQueryClient();
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: notifData, isLoading: loading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=30').then(r => r.data),
  });

  const notifications = notifData?.notifications || [];
  const unreadCount   = notifData?.unreadCount   || 0;
  const hasMore       = notifData?.hasMore        || false;
```

- [ ] **Step 3: Replace markRead and markAllRead to use query invalidation**

Find:
```js
  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };
```

Replace with:
```js
  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
```

- [ ] **Step 4: Add useDocumentTitle**

Inside the `NotificationsPage` component body:
```js
useDocumentTitle('Notifications — ContriTrack');
```

- [ ] **Step 5: Verify**

Visit http://localhost:3000/notifications. Notifications load. Mark as read works. Navigate away and back — instant.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/NotificationsPage.jsx
git commit -m "perf: migrate NotificationsPage to React Query"
```

---

## Task 9: Migrate PenaltyPage to React Query

**Files:**
- Modify: `client/src/pages/PenaltyPage.jsx`

- [ ] **Step 1: Update imports**

Add to the imports:
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useDocumentTitle from '../utils/useDocumentTitle';
```

Remove `useEffect` and `useState` for loading/data (keep form-related useState).

- [ ] **Step 2: Replace fetchPenalties and fetchMembers with useQuery**

Remove the `fetchPenalties` and `fetchMembers` functions and their `useEffect` calls (find the `useEffect(() => { fetchPenalties(); fetchMembers(); }, [activeGroup])` block).

Replace the state declarations:
```js
  const [penalties, setPenalties] = useState([]);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(false);
```

With:
```js
  const queryClient = useQueryClient();
  const now = new Date();

  const { data: penalties = [], isLoading: loading } = useQuery({
    queryKey: ['penalties', activeGroup?._id],
    queryFn: () =>
      api.get(`/penalties?groupId=${activeGroup._id}`)
         .then(r => r.data)
         .catch(err => { if (err.response?.status === 403) return []; throw err; }),
    enabled: !!activeGroup,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', activeGroup?._id, now.getMonth() + 1, now.getFullYear()],
    queryFn: () =>
      api.get(`/members?month=${now.getMonth() + 1}&year=${now.getFullYear()}&groupId=${activeGroup._id}`)
         .then(r => r.data),
    enabled: !!activeGroup,
  });
```

- [ ] **Step 3: Convert penalty creation to useMutation**

Find the `handleCreate` or equivalent submit handler that calls `api.post('/penalties', ...)`. Replace the manual `setPenalties` update with:

```js
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/penalties', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties', activeGroup?._id] });
      setShowForm(false);
      setForm({ userId: '', amount: '', reason: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), note: '' });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Failed to create penalty'),
  });
  const creating = createMutation.isPending;
```

Update the submit handler to call `createMutation.mutate(payload)` instead of directly calling `api.post`.

- [ ] **Step 4: Add useDocumentTitle**

Inside `PenaltyPage` component body:
```js
useDocumentTitle('Penalties — ContriTrack');
```

- [ ] **Step 5: Verify**

Visit http://localhost:3000/penalties. Data loads. Create penalty still works and list updates.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/PenaltyPage.jsx
git commit -m "perf: migrate PenaltyPage to React Query"
```

---

## Task 10: Split LandingPage into section components

**Files:**
- Create: `client/src/components/landing/LandingNavbar.jsx`
- Create: `client/src/components/landing/HeroSection.jsx`
- Create: `client/src/components/landing/HowItWorksSection.jsx`
- Create: `client/src/components/landing/FeaturesSection.jsx`
- Create: `client/src/components/landing/TestimonialsSection.jsx`
- Create: `client/src/components/landing/PricingSection.jsx`
- Create: `client/src/components/landing/FinalCTASection.jsx`
- Create: `client/src/components/landing/LandingFooter.jsx`
- Modify: `client/src/pages/LandingPage.jsx`

- [ ] **Step 1: Identify section boundaries in LandingPage.jsx**

Open `client/src/pages/LandingPage.jsx`. The sections are separated by comments like:
```
{/* ── HERO ──── */}
{/* ── HOW IT WORKS ──── */}
{/* ── FEATURES ──── */}
{/* ── TESTIMONIALS ──── */}
{/* ── PRICING ──── */}
{/* ── FINAL CTA ──── */}
{/* ── FOOTER ──── */}
```
Find the line numbers for each section boundary.

- [ ] **Step 2: Extract LandingNavbar**

Create `client/src/components/landing/LandingNavbar.jsx`. Move the navbar JSX (desktop nav + mobile menu) and its related state (`mobileOpen`, `scrollTo`, `navLinks`) from `LandingPage.jsx` into this component. It receives `user` and `navigate` as props.

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LandingNavbar({ scrollTo }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // ... paste the full navbar + mobile menu JSX here
}
```

- [ ] **Step 3: Extract each content section**

For each section (Hero, HowItWorks, Features, Testimonials, Pricing, FinalCTA, Footer), create the corresponding file in `client/src/components/landing/`. Each component:
- Receives `navigate`, `user`, and `scrollTo` as props where needed
- Contains the full JSX and inline styles that belong to it
- Contains any data arrays (steps, features, testimonials, pricing tiers) that only it uses

Example pattern for each:
```jsx
export default function HeroSection({ navigate, scrollTo }) {
  // paste hero JSX here
}
```

- [ ] **Step 4: Rewrite LandingPage.jsx as thin orchestrator**

Replace the entire `LandingPage.jsx` content with:

```jsx
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import PricingSection from '../components/landing/PricingSection';
import FinalCTASection from '../components/landing/FinalCTASection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  useDocumentTitle('ContriTrack — Ajo & Savings Circle Manager for Nigeria');
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div>
      <LandingNavbar scrollTo={scrollTo} />
      <HeroSection navigate={navigate} scrollTo={scrollTo} user={user} />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection navigate={navigate} />
      <FinalCTASection navigate={navigate} />
      <LandingFooter navigate={navigate} scrollTo={scrollTo} />
    </div>
  );
}
```

- [ ] **Step 5: Move shared CSS/styles**

Any `<style>` blocks inside the old LandingPage that apply globally (`.btn-gold`, `.landing-footer`, etc.) should move to the first component that uses them, or to `index.css` if used across multiple sections.

- [ ] **Step 6: Verify landing page is pixel-perfect**

Visit http://localhost:3000/. All sections render identically to before. Mobile nav opens/closes. All buttons navigate to `/dashboard`. Scroll links work.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/landing/ client/src/pages/LandingPage.jsx
git commit -m "refactor: split LandingPage into focused section components"
```

---

## Task 11: Final cleanup and push

- [ ] **Step 1: Remove any remaining unused imports**

Grep for pages that still import `useEffect` or `useState` for data that's now handled by React Query:

```bash
grep -rn "useEffect\|useState" client/src/pages/ --include="*.jsx" | grep -v "//.*useEffect"
```

Review each result and remove imports/variables that are no longer used.

- [ ] **Step 2: Add useDocumentTitle to remaining public pages**

Add `useDocumentTitle` calls to pages that don't have it yet:

| Page | Title |
|---|---|
| `GroupsPage.jsx` | `'My Circles — ContriTrack'` |
| `UploadPage.jsx` | `'Submit Payment Proof — ContriTrack'` |
| `ProfilePage.jsx` | `'Profile — ContriTrack'` |
| `PricingPage.jsx` | `'Pricing — ContriTrack'` |

- [ ] **Step 3: Verify the full app**

Run through this checklist in the browser:
- [ ] Landing page loads and all sections visible
- [ ] Login → dashboard loads with skeleton then data
- [ ] Navigate away from dashboard and back → instant (no spinner)
- [ ] Month navigation on dashboard triggers data update
- [ ] Members page loads with skeleton then data
- [ ] Navigate away from members and back → instant
- [ ] My Payments page loads correctly
- [ ] Notifications mark-as-read works
- [ ] Penalty creation works and list updates
- [ ] No console errors

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "perf: complete React Query migration, SEO titles, font optimisation"
git push origin main
```
