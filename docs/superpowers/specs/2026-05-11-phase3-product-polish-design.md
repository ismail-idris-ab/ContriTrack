# Phase 3: Product Polish — Design Spec
**Date:** 2026-05-11
**Status:** Approved

## Goal

Improve UX, onboarding, empty states, loading states, and mobile usability without changing core backend logic or visual identity.

## Decisions

| Question | Decision |
|----------|----------|
| Onboarding checklist persistence | Derived from real data — no new storage |
| Checklist placement | Persistent dashboard widget, auto-hides when all steps complete |
| Styling approach | CSS classes in `index.css` — no Tailwind install |
| Implementation approach | Targeted patch + selective extraction (Approach A) |

---

## Section 1 — Shared Utility Extraction

### `client/src/utils/avatarUtils.js` (new)
Exports:
- `AVATAR_COLORS` — color palette array
- `getAvatarGradient(name)` — deterministic gradient from name char code
- `getInitials(name)` — first 2 initials, uppercase

Currently duplicated verbatim in `DashboardPage.jsx`, `AdminPage.jsx`, `GroupsPage.jsx`. Remove from all three, import from util.

### `client/src/utils/dateUtils.js` (new)
Exports:
- `MONTHS` — full month names array (Jan–Dec)
- `MONTHS_SHORT` — abbreviated names

Currently duplicated in `DashboardPage.jsx`, `AdminPage.jsx`.

**No behaviour change.** Pure dedup.

---

## Section 2 — OnboardingChecklist Component

### `client/src/components/OnboardingChecklist.jsx` (new)

Collapsible card widget rendered on the Dashboard for circle admins only.

#### Steps (all derived — no backend calls inside component)

| # | Label | Completion signal |
|---|-------|------------------|
| 1 | Create first circle | `groups.length > 0` |
| 2 | Invite members | `activeGroup?.members?.length > 1` |
| 3 | Upload first proof | `hasUploaded` prop (bool from dashboard query) |
| 4 | Verify first contribution | `hasVerified` prop (bool from dashboard members data) |
| 5 | View report | `localStorage.getItem('rotara_viewed_report') === '1'` |

#### Data sourcing
- Steps 1–2: already in `GroupContext` (`groups`, `activeGroup`)
- Steps 3–4: derived from existing `members` query on `DashboardPage` (any contribution with proof = step 3 done; any `status === 'verified'` = step 4 done)
- Step 5: set `localStorage` key on first visit to `/report`

#### Behaviour
- Shown to group admins only (`isGroupAdmin(activeGroup, user._id)`)
- Collapsible — expanded by default until first dismiss
- Manual dismiss via X button → `localStorage.setItem('rotara_checklist_dismissed', '1')`
- Auto-hides when all 5 steps complete — shows "Setup complete ✓" for 3 seconds, then unmounts
- Does NOT re-appear after dismiss even if steps are incomplete
- Position: below stat cards, above referral banner

#### Visual style
Matches existing card style: white background, `var(--ct-radius)`, `var(--ct-shadow)`, gold accent for incomplete steps, emerald checkmark for complete steps.

---

## Section 3 — Loading, Error & Empty State Improvements

### AdminPage (`AdminPage.jsx`)

**Loading:**
- Replace `<div>Loading…</div>` with `<Skeleton>` rows (3–5 rows matching the contribution card shape)
- Pattern: same as `DashboardPage` stat card skeletons

**Error:**
- Add "Try again" button to `fetchError` display (currently text-only)

**Empty — pending submissions:**
- Already has "All caught up!" state — keep as-is, it's good

**Mobile submissions table:**
- Wrap `<table>` in `<div className="ct-table-wrap">`
- Add `className="ct-table-stack"` to `<table>`
- CSS handles stacking below 640px (see Section 4)

### MembersPage (`MembersPage.jsx`)

**Loading:**
- Replace plain loading spinner/text with `<Skeleton>` rows

**Empty — no members:**
- Add `NoMembersEmpty` inline component: icon + "No members yet" heading + invite-code CTA button linking to the group's invite code

### UploadPage (`UploadPage.jsx`)

**Empty — no circles:**
- If `groups.length === 0` after loading: show "Join or create a circle first" empty state with CTA to `/groups`

**Inline upload error:**
- On failed submission: show inline error message below the submit button (in addition to existing toast)

### GroupsPage (`GroupsPage.jsx`)

**Loading:**
- Add `<Skeleton>` cards while groups are loading (currently may flash blank)

**Empty — no circles:**
- Confirm existing empty state exists; if not, add one with "Create your first circle" CTA

### ProfilePage, LandingPage, PricingPage
No loading/empty state changes needed.

---

## Section 4 — Mobile Responsiveness

All changes in `client/src/index.css`. Pages apply CSS classes — minimal inline style changes.

### New CSS classes

#### Table responsiveness
```css
.ct-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--ct-radius);
}

@media (max-width: 640px) {
  .ct-table-stack thead { display: none; }
  .ct-table-stack tr {
    display: block;
    margin-bottom: 12px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.06);
    padding: 12px 16px;
    background: #fff;
  }
  .ct-table-stack td {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    border: none;
  }
  .ct-table-stack td::before {
    content: attr(data-label);
    font-weight: 700;
    color: var(--ct-text-3);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
}
```

#### Stat grid
```css
@media (max-width: 480px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

#### Member card grid
```css
@media (max-width: 480px) {
  .dash-member-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

#### Form rows
```css
.ct-form-row { display: flex; gap: 12px; }
@media (max-width: 640px) {
  .ct-form-row { flex-direction: column; }
  .ct-form-row .ct-btn-group { width: 100%; }
}
```

#### Topbar group name truncation
```css
@media (max-width: 640px) {
  .topbar-group-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

### Pages that apply new classes

| Page | Change |
|------|--------|
| `AdminPage` | Wrap submissions `<table>` in `.ct-table-wrap`, add `.ct-table-stack`, add `data-label` to each `<td>` |
| `MembersPage` | Two `<table className="ct-table">` at lines 228 and 499 — wrap both in `.ct-table-wrap`, add `.ct-table-stack`, add `data-label` to each `<td>` |
| `Topbar` | Add `.topbar-group-name` to group name span |
| `DashboardPage` | `.stat-grid` already used — media query handles it automatically |

---

## Files Touched

| File | Type | Change |
|------|------|--------|
| `client/src/utils/avatarUtils.js` | New | Extract avatar helpers |
| `client/src/utils/dateUtils.js` | New | Extract MONTHS constants |
| `client/src/components/OnboardingChecklist.jsx` | New | Onboarding widget |
| `client/src/pages/DashboardPage.jsx` | Edit | Import shared utils, add checklist, set localStorage on report visit |
| `client/src/pages/AdminPage.jsx` | Edit | Skeleton loading, try-again error, table mobile classes |
| `client/src/pages/MembersPage.jsx` | Edit | Skeleton loading, no-members empty state |
| `client/src/pages/UploadPage.jsx` | Edit | No-circles empty state, inline upload error |
| `client/src/pages/GroupsPage.jsx` | Edit | Import shared utils, skeleton loading, confirm empty state |
| `client/src/pages/ReportPage.jsx` | Edit | `useEffect(() => localStorage.setItem('rotara_viewed_report','1'), [])` on mount |
| `client/src/components/Topbar.jsx` | Edit | Add `.topbar-group-name` class |
| `client/src/index.css` | Edit | New mobile utility classes |

**Not touched:** `ProfilePage`, `LandingPage`, `PricingPage`, all server files, all routes.

---

## Constraints

- No Tailwind install
- No backend API changes
- No route changes
- No visual identity changes (keep gold/indigo/emerald palette, dark sidebar, premium feel)
- Build must pass after changes
- Commit message: `"ui: improve onboarding and product polish"`
