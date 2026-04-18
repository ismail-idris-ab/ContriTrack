# Profile Avatar Upload — Design Spec
**Date:** 2026-04-18
**Scope:** PATCH /api/auth/avatar endpoint + clickable avatar with upload UI in ProfilePage

---

## Problem
User model has an `avatar` field but there is no way to set it. ProfilePage always shows initials-based gradient.

---

## Solution

### 1. Server: `PATCH /api/auth/avatar`

**File:** `server/routes/auth.js`

New multer instance for avatars (separate from contributions):
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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});
```

Route:
```js
router.patch('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar) {
      const publicId = user.avatar.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
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

Multer errors (file type, file size) are caught by an error-handling middleware added after the route — but since auth.js doesn't have a global error handler, handle multer errors inline by checking `err` in the route handler using `avatarUpload.single('avatar')` as middleware called manually, OR just let the existing Express error handler catch it. The simplest approach: wrap `avatarUpload.single('avatar')` as middleware in the route signature and let multer's built-in error propagation surface a 400-level error.

---

### 2. Frontend: ProfilePage avatar upload

**File:** `client/src/pages/ProfilePage.jsx`

#### State
```js
const fileInputRef = useRef(null);
const [uploadingAvatar, setUploadingAvatar] = useState(false);
const [avatarError, setAvatarError] = useState('');
```

#### Handler
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

#### Avatar circle UI (replaces existing static circle)
```jsx
{/* Clickable avatar */}
<div
  onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
  style={{
    width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
    position: 'relative', cursor: uploadingAvatar ? 'default' : 'pointer',
    boxShadow: '0 0 0 4px #fff, 0 0 0 6px rgba(212,160,23,0.25)',
  }}
>
  {/* Avatar image or initials */}
  {user?.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <div style={{
      width: '100%', height: '100%', borderRadius: '50%',
      background: getAvatarGradient(user?.name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 24, fontWeight: 700, color: '#fff',
    }}>
      {getInitials(user?.name)}
    </div>
  )}

  {/* Uploading spinner overlay */}
  {uploadingAvatar && (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: 'rgba(0,0,0,0.45)',
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
    <div className="avatar-hover-overlay" style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: 0, transition: 'opacity 0.18s ease',
    }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, marginTop: 3, letterSpacing: '0.05em' }}>CHANGE</span>
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

#### CSS for hover overlay
Add to `index.css`:
```css
.avatar-hero:hover .avatar-hover-overlay { opacity: 1; }
```
Or use inline `onMouseEnter`/`onMouseLeave` on the outer div — no CSS class needed.

Use `onMouseEnter`/`onMouseLeave` on the clickable div:
```jsx
onMouseEnter={e => { if (!uploadingAvatar) e.currentTarget.querySelector('.avatar-hover-overlay').style.opacity = '1'; }}
onMouseLeave={e => { e.currentTarget.querySelector('.avatar-hover-overlay').style.opacity = '0'; }}
```

#### Error display
Below the avatar circle (or below the hero card), add:
```jsx
{avatarError && (
  <div style={{ fontSize: 12, color: '#e11d48', marginTop: 6 }}>{avatarError}</div>
)}
```

---

## Files Changed

| File | Change |
|------|--------|
| `server/routes/auth.js` | Add multer avatar storage config + `PATCH /avatar` route |
| `client/src/pages/ProfilePage.jsx` | Add `useRef`, upload state, handler, clickable avatar UI |
