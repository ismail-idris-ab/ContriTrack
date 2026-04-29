# Referral Credit System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user gets a unique referral code; when a referred user upgrades to a paid plan, the referrer earns 30 days free added to their subscription.

**Architecture:** Referral code is stored on the User model and generated lazily. `referredBy` is captured at registration from a `?ref=` URL param. Credit is awarded inside the existing `verify/:reference` endpoint when the payer has `referredBy` set and `referralCredits === 0` (first upgrade only). Frontend surfaces the link + stats on the Profile page and a small invite banner on the Dashboard.

**Tech Stack:** Node.js/Express, Mongoose, React, React Query, Vite

---

## File Map

| Action   | File                                          | Responsibility                                      |
|----------|-----------------------------------------------|-----------------------------------------------------|
| Modify   | `server/models/User.js`                       | Add `referralCode`, `referredBy`, `referralCredits` |
| Create   | `server/routes/referral.js`                   | `GET /api/referral/me`                              |
| Modify   | `server/server.js`                            | Mount referral route                                |
| Modify   | `server/routes/auth.js`                       | Accept `referralCode` on `/register`                |
| Modify   | `server/routes/subscription.js`               | Award credit in `verify/:reference`                 |
| Modify   | `client/src/pages/RegisterPage.jsx`           | Read `?ref=` param, send to API                     |
| Modify   | `client/src/pages/ProfilePage.jsx`            | Add "Refer & Earn" section                          |
| Modify   | `client/src/pages/DashboardPage.jsx`          | Add small invite banner                             |

---

## Task 1 — Add referral fields to User model

**Files:**
- Modify: `server/models/User.js`

- [ ] **Step 1: Add the three referral fields to `userSchema`**

In `server/models/User.js`, add these fields inside `userSchema` after `emailOtpExpires`:

```js
referralCode:    { type: String, default: null },
referredBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
referralCredits: { type: Number, default: 0 },
```

- [ ] **Step 2: Add a sparse unique index for `referralCode` after the existing index**

After the `resetPasswordToken` index line, add:

```js
userSchema.index({ referralCode: 1 }, { sparse: true, unique: true });
```

- [ ] **Step 3: Verify the server starts without errors**

```bash
cd server && node server.js
```
Expected: server starts, no Mongoose schema errors in console.

- [ ] **Step 4: Commit**

```bash
git add server/models/User.js
git commit -m "feat: add referralCode, referredBy, referralCredits to User model"
```

---

## Task 2 — Create the referral route

**Files:**
- Create: `server/routes/referral.js`
- Modify: `server/server.js`

- [ ] **Step 1: Create `server/routes/referral.js`**

```js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

function generateCode() {
  return 'ROT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET /api/referral/me
// Returns the user's referral code (generates one if missing), link, and stats.
router.get('/me', protect, async (req, res) => {
  try {
    let user = req.user;

    if (!user.referralCode) {
      let code;
      let attempts = 0;
      while (attempts < 5) {
        code = generateCode();
        const taken = await User.exists({ referralCode: code });
        if (!taken) break;
        attempts++;
      }
      user = await User.findByIdAndUpdate(
        user._id,
        { referralCode: code },
        { new: true }
      );
    }

    const baseUrl = process.env.CLIENT_URL || 'https://contri-track.vercel.app';
    const link    = `${baseUrl}/register?ref=${user.referralCode}`;

    const [totalReferred, convertedReferrals] = await Promise.all([
      User.countDocuments({ referredBy: user._id }),
      User.countDocuments({ referredBy: user._id, 'subscription.plan': { $ne: 'free' } }),
    ]);

    res.json({
      code:               user.referralCode,
      link,
      totalReferred,
      convertedReferrals,
      creditsEarned:      user.referralCredits,
    });
  } catch (err) {
    console.error('[referral/me]', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount the route in `server/server.js`**

Add after the existing route registrations (e.g. after the `templates` line):

```js
app.use('/api/referral', require('./routes/referral'));
```

- [ ] **Step 3: Verify the endpoint works**

Start the server, then in a terminal (replace TOKEN with a valid JWT):

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/referral/me
```

Expected response shape:
```json
{
  "code": "ROT-A1B2C3",
  "link": "http://localhost:5173/register?ref=ROT-A1B2C3",
  "totalReferred": 0,
  "convertedReferrals": 0,
  "creditsEarned": 0
}
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/referral.js server/server.js
git commit -m "feat: add GET /api/referral/me endpoint"
```

---

## Task 3 — Capture referral code at registration

**Files:**
- Modify: `server/routes/auth.js`
- Modify: `client/src/pages/RegisterPage.jsx`

### Backend

- [ ] **Step 1: Accept `referralCode` in the register handler**

In `server/routes/auth.js`, change the destructure on line 51 from:

```js
const { name, email, password } = req.body;
```

to:

```js
const { name, email, password, referralCode } = req.body;
```

- [ ] **Step 2: Look up the referrer before creating the user**

Add this block just before `const user = await User.create(...)`:

```js
let referredById = null;
if (referralCode && typeof referralCode === 'string') {
  const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select('_id');
  if (referrer) referredById = referrer._id;
  // silently ignore invalid codes — never block registration
}
```

- [ ] **Step 3: Pass `referredBy` into `User.create`**

Change the `User.create` call to include the new field:

```js
const user = await User.create({
  name: trimmedName, email, password, role,
  emailOtp:        hashedOtp,
  emailOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
  ...(referredById && { referredBy: referredById }),
});
```

### Frontend

- [ ] **Step 4: Read `?ref=` from the URL in `RegisterPage.jsx`**

`useSearchParams` is already imported. Add this after the `intent` line:

```js
const refCode = searchParams.get('ref') || '';
```

- [ ] **Step 5: Include `referralCode` in the API call**

Change the `api.post` call in `handleSubmit`:

```js
const { data } = await api.post('/auth/register', {
  ...form,
  ...(refCode && { referralCode: refCode }),
});
```

- [ ] **Step 6: Verify end-to-end**

1. Get your referral code from `GET /api/referral/me`
2. Open `http://localhost:5173/register?ref=ROT-YOURCODE` in an incognito window
3. Register a new account
4. In MongoDB (or via the API), check the new user has `referredBy` set to your user's `_id`
5. Call `GET /api/referral/me` as the referrer — `totalReferred` should be `1`

- [ ] **Step 7: Commit**

```bash
git add server/routes/auth.js client/src/pages/RegisterPage.jsx
git commit -m "feat: capture referral code at registration, link referredBy"
```

---

## Task 4 — Award credit on first paid plan upgrade

**Files:**
- Modify: `server/routes/subscription.js`

- [ ] **Step 1: Add the credit logic inside `verify/:reference`**

In `server/routes/subscription.js`, after `await user.save();` (line ~160) and before the `res.json(...)` call, add:

```js
// Award 1 month credit to referrer on first upgrade (fire-and-forget)
if (user.referredBy && user.referralCredits === 0) {
  User.findById(user.referredBy).then(async (referrer) => {
    if (!referrer) return;
    const now = new Date();
    const currentEnd = referrer.subscription?.currentPeriodEnd;
    const base = currentEnd && currentEnd > now ? currentEnd : now;
    const newEnd = new Date(base);
    newEnd.setDate(newEnd.getDate() + 30);

    await User.findByIdAndUpdate(referrer._id, {
      'subscription.currentPeriodEnd': newEnd,
      $inc: { referralCredits: 1 },
    });

    // Also mark the new user so credit isn't awarded again
    await User.findByIdAndUpdate(user._id, { referralCredits: -1 });

    // Notify referrer
    const Notification = require('../models/Notification');
    Notification.create({
      user:  referrer._id,
      type:  'system',
      title: 'You earned 1 free month!',
      body:  `Someone you referred just upgraded. Your subscription has been extended by 30 days.`,
      link:  '/profile',
    }).catch(() => {});
  }).catch((err) => console.error('[referral credit]', err.message));
}
```

> Note: `referralCredits === 0` on the new user guards against double-awarding. After credit is awarded, the new user's `referralCredits` is set to `-1` (sentinel) so this block never fires again for them.

- [ ] **Step 2: Verify the logic path**

Manually trace the code:
- User A has `referralCode = "ROT-ABC123"`
- User B registered with `referredBy = A._id`, `referralCredits = 0`
- User B pays and `verify/:reference` runs
- The block fires: A gets +30 days, A.`referralCredits` increments, B.`referralCredits` = -1
- Second upgrade by B: `referralCredits === 0` is false → block does not fire again ✓

- [ ] **Step 3: Commit**

```bash
git add server/routes/subscription.js
git commit -m "feat: award 30-day credit to referrer on referred user's first upgrade"
```

---

## Task 5 — Profile page "Refer & Earn" section

**Files:**
- Modify: `client/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Add React Query fetch for referral data**

At the top of `ProfilePage`, add the import (React Query is already used in the project):

```js
import { useQuery } from '@tanstack/react-query';
```

Inside `ProfilePage()`, add after the existing state declarations:

```js
const [copied, setCopied] = useState(false);

const { data: referral } = useQuery({
  queryKey: ['referral', 'me'],
  queryFn:  () => api.get('/referral/me').then(r => r.data),
  staleTime: 60_000,
});

const copyLink = () => {
  if (!referral?.link) return;
  navigator.clipboard.writeText(referral.link).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
};

const whatsappShare = () => {
  if (!referral?.link) return;
  const text = encodeURIComponent(
    `Join me on Rotata — the easiest way to manage your Ajo or savings circle! Sign up here: ${referral.link}`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
};
```

- [ ] **Step 2: Render the Refer & Earn card**

Find the closing `</div>` of the last `<Section>` block in the ProfilePage JSX return and add this new `<Section>` after it:

```jsx
<Section title="Refer & Earn">
  <p style={{ fontSize: 13.5, color: 'var(--ct-text-2)', margin: '0 0 20px', lineHeight: 1.6 }}>
    Share your link. Earn <strong>1 free month</strong> for every friend who upgrades to a paid plan.
  </p>

  {referral ? (
    <>
      {/* Link row */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'stretch',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1.5px solid #e2e0da',
          background: '#faf9f6',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          color: 'var(--ct-text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {referral.link}
        </div>
        <button
          onClick={copyLink}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1.5px solid #e2e0da',
            background: copied ? 'rgba(5,150,105,0.08)' : '#faf9f6',
            color: copied ? '#059669' : 'var(--ct-text-2)',
            fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={whatsappShare}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            background: '#25D366',
            color: '#fff',
            fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Referred',   value: referral.totalReferred },
          { label: 'Converted',  value: referral.convertedReferrals },
          { label: 'Months earned', value: referral.creditsEarned },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: '1 1 80px',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1.5px solid #e2e0da',
            background: '#faf9f6',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24, fontWeight: 700,
              color: 'var(--ct-gold)',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ct-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </>
  ) : (
    <div style={{ fontSize: 13, color: 'var(--ct-text-3)' }}>Loading referral link…</div>
  )}
</Section>
```

- [ ] **Step 3: Verify in browser**

Navigate to `/profile`. The "Refer & Earn" section should appear at the bottom with:
- A read-only link field showing `https://...register?ref=ROT-XXXXXX`
- A "Copy Link" button that flashes "Copied!" for 2 seconds
- A green WhatsApp button that opens `wa.me` with pre-filled text
- Three stat boxes: Referred / Converted / Months earned

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProfilePage.jsx
git commit -m "feat: add Refer & Earn section to Profile page"
```

---

## Task 6 — Dashboard invite banner

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Find where to insert the banner**

In `DashboardPage.jsx`, find the stat cards grid (`ct-stat-card` or similar). The banner goes just below the stat cards, before the contributions table.

Search for the first `<div` after the StatCard grid closes. Add the banner there:

```jsx
{/* Refer & Earn invite banner */}
<div
  onClick={() => navigate('/profile#referral')}
  style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 20px',
    borderRadius: 12,
    background: 'rgba(212,160,23,0.06)',
    border: '1px solid rgba(212,160,23,0.18)',
    cursor: 'pointer',
    marginBottom: 24,
    transition: 'background 0.15s',
  }}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && navigate('/profile#referral')}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: 'rgba(212,160,23,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    </div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)' }}>
        Invite friends · Earn free months
      </div>
      <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>
        Share your referral link and earn 1 free month per upgrade
      </div>
    </div>
  </div>
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 5l7 7-7 7"/>
  </svg>
</div>
```

- [ ] **Step 2: Verify in browser**

Navigate to `/dashboard`. The gold banner should appear below the stat cards. Clicking it navigates to `/profile#referral`.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "feat: add referral invite banner to Dashboard"
```

---

## Task 7 — Final commit with all changes

- [ ] **Step 1: Verify all features together**

1. Open `/register?ref=ROT-YOURCODE` in incognito — register a new user
2. Log in as the new user, upgrade plan (or simulate via DB update: set `subscription.plan = 'pro'`)
3. Trigger `verify/:reference` (or simulate via DB: set referrer's `currentPeriodEnd` +30 days manually to confirm the logic path)
4. Log in as the referrer, go to `/profile` — `creditsEarned` should be `1`, `convertedReferrals` should be `1`
5. Check the Dashboard — invite banner appears

- [ ] **Step 2: Clean up the `.worktrees` folder left from earlier**

```bash
rm -rf .worktrees
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete referral credit system (code gen, registration capture, profile UI, dashboard banner)"
```
