# Admin Verify Loading State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent double-submission on the Verify button in AdminPage by adding a `verifying` state that disables both Verify buttons while the API call is in-flight.

**Architecture:** Single file change — add one state variable, guard `handleVerify`, and add `disabled` + visual feedback to both Verify button occurrences.

**Tech Stack:** React 18, inline styles.

---

## Task 1: Add verifying state and guard handleVerify

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`

- [ ] **Step 1: Add `verifying` state**

Read the file. Find where other state variables are declared near the top of `ContributionsTab` (or the main component — wherever `handleVerify` lives). After the nearest existing `useState` line, add:

```js
const [verifying, setVerifying] = useState(null);
```

- [ ] **Step 2: Update handleVerify to set/clear verifying**

Find the existing `handleVerify` function:
```js
const handleVerify = async (id) => {
  try {
    const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
    setContributions(prev => prev.map(c => c._id === id ? data : c));
```

Replace the entire `handleVerify` function with:
```js
const handleVerify = async (id) => {
  if (verifying) return;
  setVerifying(id);
  try {
    const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
    setContributions(prev => prev.map(c => c._id === id ? data : c));
```

Keep the existing `catch` and `} catch {` and closing `};` unchanged — just add the two new lines at the top and a `finally` block:

After the existing catch block closing `}`, add:
```js
  } finally {
    setVerifying(null);
  }
```

So the complete updated function is:
```js
const handleVerify = async (id) => {
  if (verifying) return;
  setVerifying(id);
  try {
    const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
    setContributions(prev => prev.map(c => c._id === id ? data : c));
  } catch (err) {
    console.error('[admin verify]', err.message);
  } finally {
    setVerifying(null);
  }
};
```

Note: preserve any existing catch body — if there is already error handling (alert, toast, etc.) keep it and just add the finally block.

- [ ] **Step 3: Disable Verify button in pending section**

Find the Verify button in the pending section (the one inside `pending.map`):
```jsx
<button onClick={() => handleVerify(c._id)} style={actionBtnStyle('rgba(5,150,105,0.08)','rgba(5,150,105,0.25)','#047857')}>Verify</button>
```

Replace with:
```jsx
<button
  onClick={() => handleVerify(c._id)}
  disabled={verifying === c._id}
  style={{
    ...actionBtnStyle('rgba(5,150,105,0.08)', 'rgba(5,150,105,0.25)', '#047857'),
    opacity: verifying === c._id ? 0.6 : 1,
    cursor: verifying === c._id ? 'not-allowed' : 'pointer',
  }}
>
  {verifying === c._id ? 'Verifying…' : 'Verify'}
</button>
```

- [ ] **Step 4: Disable Verify button in all-submissions table**

Find the Verify button in the all-submissions table (inside `contributions.map`, in a `<td>`):
```jsx
{c.status !== 'verified'  && <button onClick={() => handleVerify(c._id)}         style={smallBtnStyle('rgba(5,150,105,0.1)','none','#047857')}>Verify</button>}
```

Replace with:
```jsx
{c.status !== 'verified' && (
  <button
    onClick={() => handleVerify(c._id)}
    disabled={verifying === c._id}
    style={{
      ...smallBtnStyle('rgba(5,150,105,0.1)', 'none', '#047857'),
      opacity: verifying === c._id ? 0.6 : 1,
      cursor: verifying === c._id ? 'not-allowed' : 'pointer',
    }}
  >
    {verifying === c._id ? 'Verifying…' : 'Verify'}
  </button>
)}
```

- [ ] **Step 5: Commit and push**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "fix: disable Verify button during in-flight API call in AdminPage"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ `verifying` state — Step 1
- ✅ `if (verifying) return` guard — Step 2
- ✅ `setVerifying(id)` before try, `setVerifying(null)` in finally — Step 2
- ✅ Pending section button disabled + visual feedback — Step 3
- ✅ All-submissions button disabled + visual feedback — Step 4

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `verifying` holds `c._id` (string) or `null`. `verifying === c._id` comparison is consistent at both render sites.
