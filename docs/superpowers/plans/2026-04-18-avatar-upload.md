# Profile Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a profile photo — clicking their avatar opens a file picker, uploads to Cloudinary, and updates the UI instantly.

**Architecture:** Server gets a new multer+Cloudinary config for avatars and a `PATCH /api/auth/avatar` route in `auth.js`. Frontend adds a `useRef` file input, upload state, and a clickable avatar circle with hover overlay and spinner — all inside the existing `ProfilePage` hero section.

**Tech Stack:** Express + Multer + Cloudinary (server), React 18 + `useRef` + `FormData` (frontend).

---

## File Map

| File | Action |
|------|--------|
| `server/routes/auth.js` | Add avatar multer config + `PATCH /avatar` route |
| `client/src/pages/ProfilePage.jsx` | Add `useRef`, upload state + handler, clickable avatar UI |

---

## Task 1: Server — PATCH /api/auth/avatar

**Files:**
- Modify: `server/routes/auth.js`

- [ ] **Step 1: Add multer and avatar storage imports at the top of auth.js**

Read `server/routes/auth.js`. After the existing `require` statements at the top, add:

```js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../utils/cloudinary');

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'contritrack/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});
```

- [ ] **Step 2: Add PATCH /avatar route**

Before `module.exports = router;`, add:

```js
// PATCH /api/auth/avatar — upload or replace profile photo
router.patch('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete previous avatar from Cloudinary
    if (user.avatar) {
      const parts = user.avatar.split('/');
      const publicId = parts.slice(-2).join('/').replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    user.avatar = req.file.path;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error('[auth avatar]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.js
git commit -m "feat: add PATCH /api/auth/avatar for profile photo upload"
```

---

## Task 2: Frontend — clickable avatar with upload UI

**Files:**
- Modify: `client/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Add useRef import**

At the top of `ProfilePage.jsx`, find the existing React import:
```js
import { useState } from 'react';
```
Replace with:
```js
import { useState, useRef } from 'react';
```

- [ ] **Step 2: Add upload state and ref inside ProfilePage component**

After `const { user, login } = useAuth();`, add:

```js
const fileInputRef = useRef(null);
const [uploadingAvatar, setUploadingAvatar] = useState(false);
const [avatarError, setAvatarError] = useState('');
```

- [ ] **Step 3: Add handleAvatarChange handler**

After the `handlePasswordSave` function, add:

```js
const handleAvatarChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    setAvatarError('Image must be under 2 MB.');
    return;
  }

  setAvatarError('');
  setUploadingAvatar(true);
  try {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.patch('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updated = { ...user, avatar: data.avatar };
    login(updated);
  } catch (err) {
    setAvatarError(err.response?.data?.message || 'Upload failed. Try again.');
  } finally {
    setUploadingAvatar(false);
    e.target.value = '';
  }
};
```

- [ ] **Step 4: Replace the static avatar circle in the hero section**

Find the existing avatar circle in the return JSX (the `<div>` that shows initials):

```jsx
<div style={{
  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
  background: getAvatarGradient(user?.name),
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 24, fontWeight: 700, color: '#fff',
  boxShadow: '0 0 0 4px #fff, 0 0 0 6px rgba(212,160,23,0.25)',
}}>
  {getInitials(user?.name)}
</div>
```

Replace it with:

```jsx
{/* Clickable avatar */}
<div style={{ position: 'relative', flexShrink: 0 }}>
  <div
    onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
    onMouseEnter={e => {
      if (!uploadingAvatar) {
        const overlay = e.currentTarget.querySelector('[data-overlay]');
        if (overlay) overlay.style.opacity = '1';
      }
    }}
    onMouseLeave={e => {
      const overlay = e.currentTarget.querySelector('[data-overlay]');
      if (overlay) overlay.style.opacity = '0';
    }}
    style={{
      width: 72, height: 72, borderRadius: '50%',
      position: 'relative', cursor: uploadingAvatar ? 'default' : 'pointer',
      boxShadow: '0 0 0 4px #fff, 0 0 0 6px rgba(212,160,23,0.25)',
      overflow: 'hidden',
    }}
  >
    {/* Avatar image or initials */}
    {user?.avatar ? (
      <img
        src={user.avatar}
        alt={user?.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <div style={{
        width: '100%', height: '100%',
        background: getAvatarGradient(user?.name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700, color: '#fff',
      }}>
        {getInitials(user?.name)}
      </div>
    )}

    {/* Spinner overlay while uploading */}
    {uploadingAvatar && (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    )}

    {/* Camera hover overlay */}
    {!uploadingAvatar && (
      <div
        data-overlay
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.18s ease',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, marginTop: 3, letterSpacing: '0.05em' }}>CHANGE</span>
      </div>
    )}
  </div>

  {/* Error message */}
  {avatarError && (
    <div style={{
      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
      marginTop: 6, whiteSpace: 'nowrap',
      fontSize: 11, color: '#e11d48', fontWeight: 500,
    }}>
      {avatarError}
    </div>
  )}
</div>

{/* Hidden file input */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  style={{ display: 'none' }}
  onChange={handleAvatarChange}
/>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProfilePage.jsx
git commit -m "feat: clickable avatar upload with Cloudinary in ProfilePage"
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
- ✅ `avatarStorage` multer-cloudinary config with `contritrack/avatars` folder — Task 1 Step 1
- ✅ Image-only fileFilter (jpg/png/webp), 2MB limit — Task 1 Step 1
- ✅ `PATCH /api/auth/avatar` route with `protect` — Task 1 Step 2
- ✅ 400 if no file — Task 1 Step 2
- ✅ Deletes old Cloudinary avatar before saving new one — Task 1 Step 2
- ✅ Saves `req.file.path` to `user.avatar` — Task 1 Step 2
- ✅ Returns `{ avatar }` — Task 1 Step 2
- ✅ `useRef` + `uploadingAvatar` + `avatarError` state — Task 2 Steps 1–2
- ✅ `handleAvatarChange` with 2MB client-side check, FormData, `login(updated)` — Task 2 Step 3
- ✅ Clickable avatar div — Task 2 Step 4
- ✅ `<img>` when `user.avatar` set, initials fallback otherwise — Task 2 Step 4
- ✅ Spinner overlay while uploading — Task 2 Step 4
- ✅ Camera hover overlay with data-overlay attribute — Task 2 Step 4
- ✅ Error message below avatar — Task 2 Step 4
- ✅ Hidden file input with ref — Task 2 Step 4

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `fileInputRef` defined in Step 1, used in Step 3 (`fileInputRef.current?.click()`) and Step 4 (`ref={fileInputRef}`) — consistent
- `uploadingAvatar` used in handler (Step 3) and UI (Step 4) — consistent
- `data.avatar` from server response stored as `user.avatar` via `login(updated)` — matches server returning `{ avatar: user.avatar }`
