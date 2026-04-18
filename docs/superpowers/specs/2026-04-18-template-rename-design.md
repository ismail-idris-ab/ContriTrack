# Template Rename — Design Spec
**Date:** 2026-04-18
**Scope:** Add PATCH endpoint for template rename + inline edit UI in MyTemplatesSection

---

## Problem
Users can save and delete templates but cannot rename them or edit their description after saving.

## Solution
One new server route + inline edit mode in the existing `MyTemplatesSection` component.

---

## 1. Server: `PATCH /api/templates/:id`

**File:** `server/routes/templates.js`

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

---

## 2. Frontend: Inline edit in `MyTemplatesSection`

**File:** `client/src/pages/GroupsPage.jsx`

### State added per template card
`editingId` — the `_id` of the template currently being edited (or `null`).
`editName` — current value of the name input while editing.
`editDesc` — current value of the description input while editing.
`saving` — boolean, true while PATCH request is in flight.

```js
const [editingId, setEditingId] = useState(null);
const [editName,  setEditName]  = useState('');
const [editDesc,  setEditDesc]  = useState('');
const [saving,    setSaving]    = useState(false);
```

### Enter edit mode
```js
const startEdit = (t) => {
  setEditingId(t._id);
  setEditName(t.name);
  setEditDesc(t.description || '');
};
const cancelEdit = () => setEditingId(null);
```

### Save handler
```js
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

### Per-card render: normal vs edit mode

**Normal mode** (existing layout + pencil icon added):
- Keep existing icon, name, amount/due line
- Add a pencil button after the name text (before the delete ×)

**Edit mode** (replaces name/desc with inputs):
- `<input>` for name (pre-filled, autofocused)
- `<input>` for description (pre-filled, optional)
- Save button (disabled while `saving` or `editName.trim() === ''`)
- Cancel button

---

## Files Changed

| File | Change |
|------|--------|
| `server/routes/templates.js` | Add `PATCH /:id` route |
| `client/src/pages/GroupsPage.jsx` | Add edit state + startEdit/cancelEdit/handleSave + inline edit UI in `MyTemplatesSection` |
