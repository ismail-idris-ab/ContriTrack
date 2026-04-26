# ContriTrack React Native MVP — Design Spec

**Date:** 2026-04-26
**Stack:** Expo (Expo Router) + NativeWind v4 + TypeScript
**Platform:** Android (first)
**Backend:** Existing deployed Express + MongoDB server (no changes)

---

## 1. Scope

Build a React Native MVP mobile app for ContriTrack with 10 screens. The web app (`client/`) is untouched. Both web and mobile share the same deployed backend API.

### Screens in scope

**Auth (stack navigator):**
- Login
- Register
- Forgot Password

**App (bottom tab navigator):**
- Dashboard (Home tab)
- Groups / Circles (Circles tab)
- Upload Proof (Upload tab — primary action)
- Members (Members tab)
- More menu → My Payments, Notifications, Profile

---

## 2. Project Structure

New folder `mobile-rn/` at project root:

```
contritrack/
├── client/           ← web app, untouched
├── server/           ← backend, shared, untouched
├── mobile-rn/
│   ├── app/
│   │   ├── _layout.tsx           ← root layout, auth guard
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       ← bottom tab bar config
│   │   │   ├── index.tsx         ← Dashboard
│   │   │   ├── groups.tsx
│   │   │   ├── upload.tsx
│   │   │   ├── members.tsx
│   │   │   └── more.tsx
│   │   ├── my-payments.tsx       ← pushed from More (no tab bar)
│   │   ├── notifications.tsx     ← pushed from More (no tab bar)
│   │   └── profile.tsx           ← pushed from More (no tab bar)
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── GoldButton.tsx
│   │   ├── OutlineButton.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Avatar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── TopBar.tsx
│   │   └── ToastMessage.tsx
│   ├── context/
│   │   ├── AuthContext.tsx       ← ported from web, AsyncStorage instead of localStorage
│   │   ├── GroupContext.tsx      ← ported from web
│   │   └── ToastContext.tsx
│   ├── api/
│   │   └── axios.ts              ← axios instance with JWT interceptor
│   ├── constants/
│   │   └── theme.ts              ← Dark Ledger color tokens
│   ├── tailwind.config.js
│   ├── app.json
│   ├── babel.config.js
│   └── package.json
```

---

## 3. Navigation

### Auth guard (`app/_layout.tsx`)
On app launch, checks `AsyncStorage` for a JWT token:
- Token found → redirect to `/(tabs)`
- No token → redirect to `/(auth)/login`

### Auth stack (`app/(auth)/`)
Linear stack: Login → Register or Login → Forgot Password. No tab bar visible.

### App tabs (`app/(tabs)/`)

| Tab | File | Label | Icon |
|-----|------|-------|------|
| 1 | `index.tsx` | Home | Grid |
| 2 | `groups.tsx` | Circles | People |
| 3 | `upload.tsx` | Upload | Upload arrow (gold, center) |
| 4 | `members.tsx` | Members | Person |
| 5 | `more.tsx` | More | Hamburger |

The Upload tab button uses a raised gold circle to visually emphasize it as the primary action, matching the web app's bottom nav style.

The More screen is a simple menu listing: My Payments, Notifications, Profile, and Logout.

---

## 4. Styling

### NativeWind v4 + Custom Tailwind Tokens

`tailwind.config.js` extends the default theme with Dark Ledger tokens:

```js
theme: {
  extend: {
    colors: {
      'ct-obsidian': '#0f0e0a',
      'ct-surface':  '#1a1916',
      'ct-card':     '#211f1b',
      'ct-gold':     '#d4a017',
      'ct-muted':    '#9898b8',
      'ct-border':   '#2e2c26',
      'ct-page':     '#131210',
    },
    fontFamily: {
      sans:  ['PlusJakartaSans_400Regular'],
      bold:  ['PlusJakartaSans_700Bold'],
      serif: ['PlayfairDisplay_700Bold'],
      mono:  ['IBMPlexMono_400Regular'],
    },
  },
}
```

### Fonts
Loaded via `expo-google-fonts`:
- `@expo-google-fonts/plus-jakarta-sans`
- `@expo-google-fonts/playfair-display`
- `@expo-google-fonts/ibm-plex-mono`

### Usage pattern
```tsx
<View className="bg-ct-surface rounded-xl p-4 border border-ct-border">
  <Text className="text-ct-gold font-bold text-lg">₦ 5,000</Text>
</View>
```

No CSS variables — React Native does not support them. All color values come from the Tailwind config.

---

## 5. Data Flow

### API (`api/axios.ts`)
```ts
const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL })

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('token')
      router.replace('/(auth)/login')
    }
    return Promise.reject(err)
  }
)
```

The base URL is set in `.env`: `EXPO_PUBLIC_API_URL=https://your-deployed-server.com/api`

### Auth (`context/AuthContext.tsx`)
Ported from web with one change: `localStorage` → `AsyncStorage` (async, so token reads are awaited).

Same shape as web:
```ts
{ user, login, logout, loading }
```

### Group (`context/GroupContext.tsx`)
Ported from web unchanged — `activeGroup`, `groups`, `setActiveGroup`.

### Upload flow
1. User taps Upload tab
2. `expo-image-picker` opens action sheet: Camera or Gallery
3. Selected image + amount + month sent as `multipart/form-data` to `POST /api/contributions`
4. Same endpoint used by web app — no backend changes needed

---

## 6. Shared Components

| Component | Description |
|-----------|-------------|
| `Card` | Dark `bg-ct-card` container with rounded corners and gold border |
| `GoldButton` | Primary CTA — gold background, dark text, full width |
| `OutlineButton` | Secondary — transparent background, gold border and text |
| `StatusBadge` | Paid / Pending / Late pill badge with color coding |
| `Avatar` | Initials circle with muted background |
| `LoadingSpinner` | Gold spinning ring, matches web loader |
| `EmptyState` | Icon + heading + subtext for empty lists |
| `TopBar` | Screen header with optional back button and title |
| `ToastMessage` | Slide-in success/error notification |

---

## 7. Screen Descriptions

### Dashboard (`index.tsx`)
- Active circle name + member count
- Contribution summary: total collected, members paid, members pending
- Trust score for the logged-in user
- Recent contributions list (last 5)

### Groups (`groups.tsx`)
- List of user's circles with member count and role badge
- Tap a circle to set it as active group
- Active group highlighted with gold border

### Upload (`upload.tsx`)
- Camera / Gallery picker (expo-image-picker)
- Amount input (₦ prefix)
- Month selector (dropdown/picker)
- Submit button → POST /api/contributions
- Success toast on completion

### Members (`members.tsx`)
- List of members in active circle
- Each row: Avatar, name, trust score badge, paid/pending status for current month

### More (`more.tsx`)
- Menu list: My Payments, Notifications, Profile, Logout
- Each item navigates to its own screen (pushed onto the stack above the tabs)

### My Payments (pushed from More)
- List of the logged-in user's own contribution history
- Status badge per entry

### Notifications (pushed from More)
- List of unread and read notifications
- Mark all as read button

### Profile (pushed from More)
- Display name, email, phone
- Edit profile form

---

## 8. Key Dependencies

```json
{
  "expo": "~51.x",
  "expo-router": "~3.x",
  "nativewind": "^4.x",
  "tailwindcss": "^3.x",
  "axios": "^1.x",
  "@react-native-async-storage/async-storage": "^2.x",
  "expo-image-picker": "~15.x",
  "expo-font": "~12.x",
  "@expo-google-fonts/plus-jakarta-sans": "*",
  "@expo-google-fonts/playfair-display": "*",
  "@expo-google-fonts/ibm-plex-mono": "*"
}
```

---

## 9. Out of Scope (MVP)

These web features are excluded from MVP and can be added later:

- Reports (monthly/yearly, CSV export)
- Payouts
- Penalties
- Pledges
- WhatsApp reminders
- Admin panel
- Overview (multi-group summary)
- Subscription / Pricing
- Email verification flow
- Google Sign-In

---

## 10. Success Criteria

- User can register, log in, and log out on Android
- User can view their dashboard and active circle data
- User can upload a proof-of-payment photo from camera or gallery
- User can browse circle members and their payment status
- User can switch between circles
- User can view their payment history and notifications
- App connects to the live backend with no server changes
- Dark Ledger theme is consistent throughout
