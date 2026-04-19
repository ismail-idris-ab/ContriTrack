# Payment Resubmission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a member whose payment proof was rejected to upload a new proof, resetting the contribution back to pending while preserving a history of prior rejections.

**Architecture:** Extend the existing `Contribution` document in-place — add a `rejectionHistory` array so the current rejection is archived before a resubmission resets the status. Add a `PATCH /:id/resubmit` backend endpoint guarded to the owning member only. On the frontend, show the rejection reason on the `MyPaymentsPage` timeline row and open a `ResubmitModal` (reuses the compress-image logic from `UploadPage`) that POSTs multipart to the new endpoint.

**Tech Stack:** Node/Express, Mongoose, Cloudinary (multer), React (no extra deps)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `server/models/Contribution.js` | Add `rejectionHistory` sub-array |
| Modify | `server/routes/contributions.js` | Add `PATCH /:id/resubmit` route |
| Create | `client/src/components/ResubmitModal.jsx` | Upload modal for resubmission |
| Modify | `client/src/pages/MyPaymentsPage.jsx` | Show rejection reason + Resubmit button; update state on success |
| Modify | `client/src/pages/AdminPage.jsx` | Show rejection history panel when viewing a resubmitted proof |

---

### Task 1: Extend Contribution model with rejectionHistory

**Files:**
- Modify: `server/models/Contribution.js`

- [ ] **Step 1: Add `rejectionHistory` array to the schema**

Open `server/models/Contribution.js`. After the `rejectionNote` field, add:

```js
rejectionHistory: [
  {
    proofImage:    { type: String, required: true },
    rejectionNote: { type: String, default: '' },
    rejectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:    { type: Date },
    _id: false,
  }
],
```

Full schema after the change (only showing changed section for brevity — keep everything else):

```js
const contributionSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    month:      { type: Number, required: true, min: 1, max: 12 },
    year:       { type: Number, required: true, min: 2020, max: 2100 },
    amount:     { type: Number, required: true, min: 1 },
    proofImage: { type: String, required: true },
    note:       { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt:    { type: Date, default: null },
    rejectionNote: { type: String, default: '', maxlength: 500 },
    rejectionHistory: [
      {
        proofImage:    { type: String, required: true },
        rejectionNote: { type: String, default: '' },
        rejectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectedAt:    { type: Date },
        _id: false,
      }
    ],
    isLate:        { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

- [ ] **Step 2: Commit**

```bash
git add server/models/Contribution.js
git commit -m "feat: add rejectionHistory array to Contribution model"
```

---

### Task 2: Add PATCH /:id/resubmit backend endpoint

**Files:**
- Modify: `server/routes/contributions.js`

- [ ] **Step 1: Add the resubmit route before `module.exports`**

Insert the following block in `server/routes/contributions.js` right before the final `module.exports = router;` line:

```js
// PATCH /api/contributions/:id/resubmit — member uploads new proof after rejection
router.patch('/:id/resubmit', protect, uploadLimiter, upload.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'New proof image is required' });

  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });

    // Only the owning member can resubmit
    if (String(contribution.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only resubmit your own contributions' });
    }

    if (contribution.status !== 'rejected') {
      return res.status(400).json({ message: 'Only rejected contributions can be resubmitted' });
    }

    // Archive current rejection into history
    const historyEntry = {
      proofImage:    contribution.proofImage,
      rejectionNote: contribution.rejectionNote || '',
      rejectedBy:    contribution.verifiedBy,
      rejectedAt:    contribution.verifiedAt,
    };

    const safeNote = req.body.note
      ? String(req.body.note).replace(/<[^>]*>/g, '').trim().slice(0, 500)
      : contribution.note;

    const updated = await Contribution.findByIdAndUpdate(
      req.params.id,
      {
        $push:  { rejectionHistory: historyEntry },
        $set: {
          proofImage:    req.file.path,
          note:          safeNote,
          status:        'pending',
          verifiedBy:    null,
          verifiedAt:    null,
          rejectionNote: '',
        },
      },
      { new: true }
    ).populate('user', 'name email');

    logAudit({
      action:       'contribution.resubmitted',
      adminId:      req.user._id,
      groupId:      contribution.group || null,
      entityType:   'Contribution',
      entityId:     contribution._id,
      targetUserId: req.user._id,
      meta: {
        month: contribution.month,
        year:  contribution.year,
        resubmissionCount: updated.rejectionHistory.length,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[contributions/resubmit]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 2: Verify the server starts without errors**

```bash
cd server && node -e "require('./routes/contributions')" && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/routes/contributions.js
git commit -m "feat: add PATCH /contributions/:id/resubmit endpoint"
```

---

### Task 3: Create ResubmitModal component

**Files:**
- Create: `client/src/components/ResubmitModal.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import api from '../api/axios';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Same compress logic as UploadPage — keeps file size down before hitting Cloudinary
function compressImage(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size < 300 * 1024) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) { resolve(file); return; }
      if (width > height) { height = Math.round((height / width) * maxDimension); width = maxDimension; }
      else { width = Math.round((width / height) * maxDimension); height = maxDimension; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })),
        'image/jpeg', quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function ResubmitModal({ contribution, onClose, onSuccess }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [note, setNote]           = useState(contribution.note || '');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragging, setDragging]   = useState(false);

  const applyFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only image files and PDFs are allowed');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }
    setError('');
    setCompressing(true);
    const compressed = await compressImage(f);
    setCompressing(false);
    setFile(compressed);
    setPreview(compressed.type.startsWith('image/') ? URL.createObjectURL(compressed) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a new proof image'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('note', note);
      const { data } = await api.patch(`/contributions/${contribution._id}/resubmit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,10,16,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        backdropFilter: 'blur(6px)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        className="animate-fade-up"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20,
          maxWidth: 460, width: '100%',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Red top bar — signals rejected state */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #e11d48, #fb7185, #e11d48)' }} />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em',
            }}>
              Resubmit Proof
            </h3>
            <p style={{ fontSize: 12, color: 'var(--ct-text-3)', margin: '3px 0 0' }}>
              {MONTHS[contribution.month - 1]} {contribution.year}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)', background: '#f5f2ec',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ct-text-2)', fontSize: 16,
            }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Rejection reason banner */}
          {contribution.rejectionNote && (
            <div style={{
              background: 'rgba(225,29,72,0.06)', borderRadius: 10,
              border: '1px solid rgba(225,29,72,0.15)',
              padding: '12px 14px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                Rejection reason
              </p>
              <p style={{ fontSize: 13, color: 'var(--ct-text-1)', margin: 0, lineHeight: 1.5 }}>
                {contribution.rejectionNote}
              </p>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); applyFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('resubmit-file-input').click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--ct-gold)' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: 12, padding: '20px 16px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(212,160,23,0.04)' : '#faf9f6',
              transition: 'all 0.15s', marginBottom: 16,
            }}
          >
            <input
              id="resubmit-file-input"
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => applyFile(e.target.files[0])}
            />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: 0 }}>
                  {compressing ? 'Compressing…' : 'Click or drag & drop your new proof'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--ct-text-3)', margin: '4px 0 0', opacity: 0.7 }}>
                  JPG, PNG, PDF — max 5 MB
                </p>
              </>
            )}
          </div>

          {file && (
            <p style={{ fontSize: 12, color: 'var(--ct-text-3)', marginBottom: 16, textAlign: 'center' }}>
              {file.name}
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                style={{ marginLeft: 8, fontSize: 11, color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Remove
              </button>
            </p>
          )}

          {/* Note */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            maxLength={500}
            rows={2}
            style={{
              width: '100%', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '10px 12px', fontSize: 13,
              fontFamily: 'var(--font-sans)', resize: 'vertical',
              color: 'var(--ct-text-1)', background: '#faf9f6',
              boxSizing: 'border-box', marginBottom: 16,
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#e11d48', marginBottom: 12, textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || compressing || !file}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none',
              background: loading || compressing || !file ? '#c8c8d8' : 'var(--ct-gold)',
              color: '#0f0f14', fontWeight: 700, fontSize: 14,
              cursor: loading || compressing || !file ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
            }}
          >
            {loading ? 'Uploading…' : 'Resubmit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ResubmitModal.jsx
git commit -m "feat: add ResubmitModal component for rejected payment resubmission"
```

---

### Task 4: Update MyPaymentsPage to show rejection info and Resubmit button

**Files:**
- Modify: `client/src/pages/MyPaymentsPage.jsx`

- [ ] **Step 1: Import ResubmitModal and wire up state**

Replace the import block and state section at the top of `MyPaymentsPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import ResubmitModal from '../components/ResubmitModal';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_DOT = {
  verified: '#059669',
  pending:  '#d97706',
  rejected: '#e11d48',
};

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null); // contribution object
```

- [ ] **Step 2: Add the onResubmitSuccess handler right after `openModal`**

```jsx
  const onResubmitSuccess = (updated) => {
    setPayments(prev => prev.map(p => p._id === updated._id ? updated : p));
  };
```

- [ ] **Step 3: Replace the Actions block inside the payments.map to add rejection reason and Resubmit button**

Find the `{/* Actions */}` div (around line 175 in the original). Replace it and the content block with:

```jsx
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15, fontWeight: 700,
                      color: 'var(--ct-text-1)',
                      letterSpacing: '-0.01em',
                    }}>
                      {MONTHS[p.month - 1]} {p.year}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 3 }}>
                      Submitted {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {p.status === 'rejected' && p.rejectionNote && (
                      <div style={{
                        fontSize: 11, color: '#e11d48',
                        marginTop: 5, lineHeight: 1.4,
                        maxWidth: 280,
                      }}>
                        <span style={{ fontWeight: 700 }}>Reason: </span>{p.rejectionNote}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--ct-emerald)',
                    minWidth: 90, textAlign: 'right',
                  }}>
                    ₦{p.amount.toLocaleString()}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <StatusBadge status={p.status} />
                    {p.proofImage && (
                      <button
                        onClick={() => openModal(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.09)',
                          background: '#faf9f6',
                          color: 'var(--ct-text-2)',
                          fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z"/>
                        </svg>
                        View
                      </button>
                    )}
                    {p.status === 'rejected' && (
                      <button
                        onClick={() => setResubmitTarget(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(225,29,72,0.25)',
                          background: 'rgba(225,29,72,0.06)',
                          color: '#e11d48',
                          fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Resubmit
                      </button>
                    )}
                  </div>
```

- [ ] **Step 4: Add ResubmitModal at the bottom (alongside ProofModal)**

At the bottom of the component's return, replace:

```jsx
      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}
```

with:

```jsx
      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}
      {resubmitTarget && (
        <ResubmitModal
          contribution={resubmitTarget}
          onClose={() => setResubmitTarget(null)}
          onSuccess={onResubmitSuccess}
        />
      )}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/MyPaymentsPage.jsx
git commit -m "feat: show rejection reason and Resubmit button on MyPaymentsPage"
```

---

### Task 5: Show rejection history in AdminPage proof modal

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`

- [ ] **Step 1: Pass `rejectionHistory` to the ProofModal open handler**

In `ContributionsTab`, find the `openModal` call site (the "View" button onClick). Change it to also pass `rejectionHistory`:

```jsx
onClick={() => setModal({
  proofUrl: c.proofImage,
  memberName: c.user?.name,
  month: c.month, year: c.year,
  submittedDate: c.createdAt,
  status: c.status,
  rejectionHistory: c.rejectionHistory || [],
})}
```

- [ ] **Step 2: Update ProofModal to render rejectionHistory when present**

In `client/src/components/ProofModal.jsx`, add a `rejectionHistory` prop. After the info rows block (the `rows.map` section, before the "Open full size" link), add:

```jsx
          {/* Rejection history — only shown in admin view when there were prior rejections */}
          {rejectionHistory && rejectionHistory.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px',
              }}>
                Prior rejections ({rejectionHistory.length})
              </p>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                maxHeight: 200, overflowY: 'auto',
              }}>
                {rejectionHistory.map((h, i) => (
                  <div key={i} style={{
                    background: 'rgba(225,29,72,0.05)',
                    border: '1px solid rgba(225,29,72,0.12)',
                    borderRadius: 10, padding: '10px 12px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <a
                      href={h.proofImage}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flexShrink: 0, width: 44, height: 44,
                        borderRadius: 8, overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)',
                        display: 'block',
                      }}
                    >
                      <img
                        src={h.proofImage}
                        alt={`Rejected proof ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </a>
                    <div style={{ flex: 1 }}>
                      {h.rejectionNote && (
                        <p style={{ fontSize: 12, color: 'var(--ct-text-1)', margin: '0 0 3px', lineHeight: 1.4 }}>
                          {h.rejectionNote}
                        </p>
                      )}
                      {h.rejectedAt && (
                        <p style={{ fontSize: 11, color: 'var(--ct-text-3)', margin: 0 }}>
                          {new Date(h.rejectedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
```

Also update the function signature of `ProofModal` to destructure `rejectionHistory`:

```jsx
export default function ProofModal({ proofUrl, memberName, month, year, submittedDate, status, rejectionHistory, onClose }) {
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AdminPage.jsx client/src/components/ProofModal.jsx
git commit -m "feat: show rejection history in admin proof modal"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Member can upload new proof after rejection → Task 3 (ResubmitModal) + Task 4 (button in MyPaymentsPage)
- ✅ Status resets to pending → Task 2 (`$set: { status: 'pending' }`)
- ✅ Rejection reason shown to member → Task 4 (inline on timeline row + in ResubmitModal banner)
- ✅ Rejection history preserved → Task 1 (schema) + Task 2 (`$push: { rejectionHistory }`)
- ✅ Admin sees history → Task 5
- ✅ Audit trail → Task 2 (`logAudit` call)
- ✅ Unique index stays intact → in-place update, no new documents

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:** `rejectionHistory` array name used consistently across model, route, ProofModal prop, and AdminPage. `resubmitTarget` state used consistently in MyPaymentsPage.
