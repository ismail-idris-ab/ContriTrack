# Admin Verify Loading State — Design Spec
**Date:** 2026-04-18
**Scope:** Disable Verify button during in-flight API call in AdminPage ContributionsTab

## Problem
`handleVerify` in AdminPage has no loading guard — both Verify buttons (pending section and all-submissions table) can be clicked multiple times before the API responds, causing duplicate PATCH requests.

## Fix

**File:** `client/src/pages/AdminPage.jsx`

Add `verifying` state (tracks which contribution `_id` is being verified):
```js
const [verifying, setVerifying] = useState(null);
```

Update `handleVerify`:
```js
const handleVerify = async (id) => {
  if (verifying) return;
  setVerifying(id);
  try {
    const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
    setContributions(prev => prev.map(c => c._id === id ? data : c));
  } catch (err) {
    // existing error handling unchanged
  } finally {
    setVerifying(null);
  }
};
```

Disable Verify buttons at both render sites:
- Pending section (line ~184): `disabled={verifying === c._id}`
- All-submissions table (line ~236): `disabled={verifying === c._id}`

Both buttons get `cursor: verifying === c._id ? 'not-allowed' : 'pointer'` and `opacity: verifying === c._id ? 0.6 : 1`.
