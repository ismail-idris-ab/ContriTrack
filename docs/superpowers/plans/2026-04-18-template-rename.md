# Template Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PATCH /api/templates/:id` endpoint and inline rename/edit UI to the MyTemplatesSection in GroupsPage.

**Architecture:** Server gets a new PATCH route in `templates.js` following the same owner-check pattern as the existing DELETE route. Frontend adds 4 state variables to `MyTemplatesSection` and renders either a normal card or an edit form depending on `editingId`.

**Tech Stack:** Express + Mongoose (server), React 18 + inline styles (frontend).

---

## File Map

| File | Action |
|------|--------|
| `server/routes/templates.js` | Add `PATCH /:id` route after the existing DELETE route |
| `client/src/pages/GroupsPage.jsx` | Add edit state + handlers + inline edit UI in `MyTemplatesSection` |

---

## Task 1: Server — PATCH /api/templates/:id

**Files:**
- Modify: `server/routes/templates.js`

- [ ] **Step 1: Add PATCH route after the DELETE route**

Open `server/routes/templates.js`. After the closing of the `router.delete('/:id', ...)` block and before `module.exports = router;`, add:

```js
// PATCH /api/templates/:id — rename/re-describe a saved template (owner only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.isPreset)
      return res.status(403).json({ message: 'System templates cannot be edited' });
    if (String(template.createdBy) !== String(req.user._id))
      return res.status(403).json({ message: 'You can only edit your own templates' });

    const name        = String(req.body.name        || '').replace(/<[^>]*>/g, '').trim();
    const description = String(req.body.description ?? template.description).replace(/<[^>]*>/g, '').trim();

    if (!name) return res.status(400).json({ message: 'Template name is required' });
    if (name.length > 80)
      return res.status(400).json({ message: 'Name must be 80 characters or fewer' });
    if (description.length > 200)
      return res.status(400).json({ message: 'Description must be 200 characters or fewer' });

    template.name        = name;
    template.description = description;
    await template.save();

    res.json(template);
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/templates.js
git commit -m "feat: add PATCH /api/templates/:id for renaming saved templates"
```

---

## Task 2: Frontend — inline edit in MyTemplatesSection

**Files:**
- Modify: `client/src/pages/GroupsPage.jsx`

- [ ] **Step 1: Add edit state variables to MyTemplatesSection**

`MyTemplatesSection` currently starts with:
```js
function MyTemplatesSection() {
  const [mine, setMine] = useState([]);
  const { user } = useAuth();
  const toast = useToast();
```

Add 4 new state variables after `const toast = useToast();`:
```js
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [saving,    setSaving]    = useState(false);
```

- [ ] **Step 2: Add startEdit, cancelEdit, and handleSave handlers**

After the existing `handleDelete` function (which ends around `};`), add these three handlers:

```js
  const startEdit = (t) => {
    setEditingId(t._id);
    setEditName(t.name);
    setEditDesc(t.description || '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/templates/${id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setMine(prev => prev.map(t => t._id === id ? data : t));
      setEditingId(null);
      toast.success(`Template "${data.name}" updated.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update template');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Replace each template card with conditional normal/edit render**

Inside the `mine.map(t => (...))` block, the current card JSX is:

```jsx
<div key={t._id} style={{
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', borderRadius: 10,
  background: '#fff', border: '1.5px solid var(--ct-border-2)',
  boxShadow: 'var(--ct-shadow)',
}}>
  <span style={{ fontSize: 20 }}>{t.icon || '◎'}</span>
  <div>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)' }}>{t.name}</div>
    <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>
      ₦{Number(t.settings?.contributionAmount || 0).toLocaleString('en-NG')} · Due {t.settings?.dueDay}th
    </div>
  </div>
  <button
    onClick={() => handleDelete(t._id, t.name)}
    aria-label={`Delete template ${t.name}`}
    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', fontSize: 18, padding: '2px 6px', marginLeft: 4, lineHeight: 1 }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-rose)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
  >
    ×
  </button>
</div>
```

Replace the entire `mine.map(t => (...))` block with:

```jsx
{mine.map(t => (
  <div key={t._id} style={{
    padding: '10px 14px', borderRadius: 10,
    background: '#fff', border: '1.5px solid var(--ct-border-2)',
    boxShadow: 'var(--ct-shadow)',
    minWidth: 200,
  }}>
    {editingId === t._id ? (
      /* ── Edit mode ── */
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          autoFocus
          value={editName}
          onChange={e => setEditName(e.target.value)}
          maxLength={80}
          placeholder="Template name"
          style={{
            fontSize: 13, fontWeight: 600, padding: '6px 10px',
            borderRadius: 7, border: '1.5px solid var(--ct-border-2)',
            fontFamily: 'var(--font-sans)', outline: 'none',
            color: 'var(--ct-text-1)', background: 'var(--ct-page)',
            width: '100%', boxSizing: 'border-box',
          }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(t._id); if (e.key === 'Escape') cancelEdit(); }}
        />
        <input
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          maxLength={200}
          placeholder="Description (optional)"
          style={{
            fontSize: 12, padding: '5px 10px',
            borderRadius: 7, border: '1.5px solid var(--ct-border-2)',
            fontFamily: 'var(--font-sans)', outline: 'none',
            color: 'var(--ct-text-2)', background: 'var(--ct-page)',
            width: '100%', boxSizing: 'border-box',
          }}
          onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => handleSave(t._id)}
            disabled={saving || !editName.trim()}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 7, border: 'none',
              background: saving || !editName.trim() ? 'rgba(0,0,0,0.06)' : 'var(--ct-gold)',
              color: saving || !editName.trim() ? 'var(--ct-text-4)' : '#1a1206',
              fontSize: 12, fontWeight: 700, cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            style={{
              padding: '6px 10px', borderRadius: 7,
              border: '1.5px solid var(--ct-border-2)', background: 'none',
              color: 'var(--ct-text-3)', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      /* ── Normal mode ── */
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{t.icon || '◎'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>
            ₦{Number(t.settings?.contributionAmount || 0).toLocaleString('en-NG')} · Due {t.settings?.dueDay}th
          </div>
        </div>
        {/* Pencil / edit button */}
        <button
          onClick={() => startEdit(t)}
          aria-label={`Edit template ${t.name}`}
          title="Rename"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', padding: '2px 5px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        {/* Delete button */}
        <button
          onClick={() => handleDelete(t._id, t.name)}
          aria-label={`Delete template ${t.name}`}
          title="Delete"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', fontSize: 18, padding: '2px 5px', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-rose)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
        >
          ×
        </button>
      </div>
    )}
  </div>
))}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/GroupsPage.jsx
git commit -m "feat: inline rename/edit for saved templates in My Templates section"
```

---

## Task 3: Push

- [ ] **Step 1: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ `PATCH /api/templates/:id` — Task 1
- ✅ Owner-only check — Task 1 Step 1
- ✅ Preset protection — Task 1 Step 1
- ✅ Name/description validation (empty, length) with XSS strip — Task 1 Step 1
- ✅ `editingId`, `editName`, `editDesc`, `saving` state — Task 2 Step 1
- ✅ `startEdit`, `cancelEdit`, `handleSave` — Task 2 Step 2
- ✅ Inline edit form with name + description inputs — Task 2 Step 3
- ✅ Save disabled when empty or saving — Task 2 Step 3
- ✅ Pencil icon in normal mode — Task 2 Step 3
- ✅ Enter to save, Escape to cancel — Task 2 Step 3

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `editingId` compared to `t._id` — both `_id` strings, consistent
- `api.patch(\`/templates/${id}\`, ...)` — matches server route `PATCH /:id`
- `toast.success` / `toast.error` — matches existing `handleDelete` pattern
