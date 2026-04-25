# Pro Plan Upgrade — Design Spec
**Date:** 2026-04-24

## Summary

Upgrade the Pro subscription tier to include up to 4 savings circles and CSV/PDF exports. Bump Coordinator to unlimited circles. Fix the landing page price inconsistency (₦4,500 → ₦3,500).

---

## Plan Tier Table (after change)

| Feature              | Free      | Pro (₦3,500/mo) | Coordinator (₦10,000/mo) |
|----------------------|-----------|-----------------|--------------------------|
| Circles              | 1         | 4               | Unlimited                |
| Members per circle   | 10        | Unlimited        | Unlimited                |
| Exports (CSV/PDF)    | ✗         | ✓               | ✓                        |
| Penalty tracking     | ✗         | ✓               | ✓                        |
| WhatsApp reminders   | ✗         | ✓               | ✓                        |
| Monthly reports      | ✗         | ✓               | ✓                        |
| Member trust scoring | ✗         | ✗               | ✓                        |
| Priority support     | ✗         | ✗               | ✓                        |

---

## Files to Change

### 1. `server/middleware/planGuard.js`

**LIMITS object:**
- `pro.groups`: `1` → `4`
- `coordinator.groups`: `10` → `Infinity`

**FEATURES object:**
- `pro.exports`: `false` → `true`

**Error message in `guardGroupCreate`:**
- Update the copy that says "Free plan allows 1 group. Upgrade to Pro to create more." to also reflect Pro's 4-group limit for the coordinator-hitting-limit case.

### 2. `client/src/pages/PricingPage.jsx`

**Pro plan features array:**
- Change `{ label: '1 savings circle', included: true }` → `{ label: 'Up to 4 savings circles', included: true }`
- Change `{ label: 'CSV / PDF exports', included: false }` → `{ label: 'CSV / PDF exports', included: true }`

**Coordinator plan features array:**
- Change `{ label: 'Up to 10 circles', included: true }` → `{ label: 'Unlimited circles', included: true }`

### 3. `client/src/components/landing/PricingSection.jsx`

- Fix Pro price display from ₦4,500 → ₦3,500
- Update `proFeatures` list to reflect 4 circles and exports

---

## What Does NOT Change

- Pricing amounts (Pro stays ₦3,500/month and ₦35,000/year, Coordinator stays ₦10,000/month)
- Database schema — limits are enforced at runtime in `planGuard.js`, not stored
- `planUtils.js` — tier level logic is unchanged
- Any payment or subscription flow logic

---

## Scope

This is a pure configuration and UI update. No new routes, no new models, no migrations.
