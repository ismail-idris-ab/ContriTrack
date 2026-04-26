# ContriTrack React Native MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 10-screen React Native mobile app for ContriTrack (Android) using Expo Router + NativeWind v4, connected to the existing deployed Express backend.

**Architecture:** New `mobile-rn/` folder at project root — completely separate from the web `client/`. Shares only the backend API. Expo Router provides file-based routing with a bottom tab layout for authenticated screens and a stack layout for auth screens. NativeWind v4 applies Dark Ledger Tailwind tokens to all components.

**Tech Stack:** Expo 52, Expo Router 4, NativeWind v4, TailwindCSS 3, TypeScript, Axios, AsyncStorage, expo-image-picker, @testing-library/react-native

---

## File Map

| File | Responsibility |
|------|---------------|
| `mobile-rn/app/_layout.tsx` | Root layout — loads fonts, wraps providers, guards auth |
| `mobile-rn/app/(auth)/_layout.tsx` | Auth stack navigator |
| `mobile-rn/app/(auth)/login.tsx` | Login screen |
| `mobile-rn/app/(auth)/register.tsx` | Register screen |
| `mobile-rn/app/(auth)/forgot-password.tsx` | Forgot password screen |
| `mobile-rn/app/(tabs)/_layout.tsx` | Bottom tab navigator with custom Upload button |
| `mobile-rn/app/(tabs)/index.tsx` | Dashboard screen |
| `mobile-rn/app/(tabs)/groups.tsx` | Circles screen |
| `mobile-rn/app/(tabs)/upload.tsx` | Upload proof screen |
| `mobile-rn/app/(tabs)/members.tsx` | Members screen |
| `mobile-rn/app/(tabs)/more.tsx` | More menu screen |
| `mobile-rn/app/my-payments.tsx` | My Payments screen (pushed from More) |
| `mobile-rn/app/notifications.tsx` | Notifications screen (pushed from More) |
| `mobile-rn/app/profile.tsx` | Profile screen (pushed from More) |
| `mobile-rn/api/axios.ts` | Axios instance with JWT interceptor and 401 handler |
| `mobile-rn/constants/theme.ts` | Dark Ledger color tokens |
| `mobile-rn/context/AuthContext.tsx` | Auth state — user, login, logout (AsyncStorage) |
| `mobile-rn/context/GroupContext.tsx` | Groups state — groups, activeGroup, selectGroup |
| `mobile-rn/context/ToastContext.tsx` | Toast notification state |
| `mobile-rn/components/Card.tsx` | Dark surface container |
| `mobile-rn/components/GoldButton.tsx` | Primary gold CTA button |
| `mobile-rn/components/OutlineButton.tsx` | Secondary outline button |
| `mobile-rn/components/StatusBadge.tsx` | Paid/Pending/Late pill badge |
| `mobile-rn/components/Avatar.tsx` | Initials circle avatar |
| `mobile-rn/components/LoadingSpinner.tsx` | Gold spinning ring |
| `mobile-rn/components/EmptyState.tsx` | Empty list placeholder |
| `mobile-rn/components/TopBar.tsx` | Screen header with back button |
| `mobile-rn/components/ToastMessage.tsx` | Slide-in notification |
| `mobile-rn/global.css` | Tailwind entry point |
| `mobile-rn/tailwind.config.js` | Tailwind config with Dark Ledger tokens |
| `mobile-rn/babel.config.js` | Babel config for NativeWind |
| `mobile-rn/metro.config.js` | Metro config for NativeWind |
| `mobile-rn/nativewind-env.d.ts` | NativeWind TypeScript types |
| `mobile-rn/.env` | EXPO_PUBLIC_API_URL |
| `mobile-rn/__tests__/AuthContext.test.tsx` | Auth context unit tests |
| `mobile-rn/__tests__/GroupContext.test.tsx` | Group context unit tests |

---

## Task 1: Scaffold Expo Project

**Files:**
- Create: `mobile-rn/` (entire project scaffold)

- [ ] **Step 1: Create the Expo app**

Run from `contritrack/` root:
```bash
npx create-expo-app@latest mobile-rn --template blank-typescript
cd mobile-rn
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install expo-router nativewind tailwindcss axios \
  @react-native-async-storage/async-storage \
  expo-image-picker \
  @expo-google-fonts/plus-jakarta-sans \
  @expo-google-fonts/playfair-display \
  @expo-google-fonts/ibm-plex-mono \
  expo-font expo-status-bar react-native-safe-area-context \
  react-native-screens
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev @testing-library/react-native \
  @testing-library/jest-native \
  @react-native-async-storage/async-storage \
  jest-expo
```

- [ ] **Step 4: Verify scaffold runs**

```bash
npx expo start
```

Expected: QR code appears in terminal. Scan with Expo Go on your Android phone. You should see a blank screen with "Open up App.tsx to start working on your app!". Kill the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add mobile-rn/
git commit -m "feat(mobile): scaffold Expo blank TypeScript project"
```

---

## Task 2: Configure NativeWind + Expo Router

**Files:**
- Modify: `mobile-rn/package.json`
- Create: `mobile-rn/babel.config.js`
- Create: `mobile-rn/metro.config.js`
- Create: `mobile-rn/tailwind.config.js`
- Create: `mobile-rn/global.css`
- Create: `mobile-rn/nativewind-env.d.ts`
- Modify: `mobile-rn/app.json`

- [ ] **Step 1: Set Expo Router as entry point**

Edit `mobile-rn/package.json` — change the `"main"` field:
```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Step 2: Configure app.json for Expo Router**

Replace `mobile-rn/app.json` with:
```json
{
  "expo": {
    "name": "ContriTrack",
    "slug": "contritrack",
    "version": "1.0.0",
    "scheme": "contritrack",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f0e0a"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f0e0a"
      },
      "package": "com.contritrack.app"
    },
    "plugins": [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "ContriTrack needs access to your photos to upload payment proof.",
          "cameraPermission": "ContriTrack needs camera access to photograph payment proof."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 3: Configure Babel for NativeWind**

Replace `mobile-rn/babel.config.js` with:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **Step 4: Configure Metro for NativeWind**

Create `mobile-rn/metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 5: Configure Tailwind with Dark Ledger tokens**

Create `mobile-rn/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "ct-obsidian": "#0f0e0a",
        "ct-surface":  "#1a1916",
        "ct-card":     "#211f1b",
        "ct-gold":     "#d4a017",
        "ct-gold-dim": "rgba(212,160,23,0.15)",
        "ct-muted":    "#9898b8",
        "ct-border":   "#2e2c26",
        "ct-page":     "#131210",
        "ct-paid":     "#22c55e",
        "ct-pending":  "#f59e0b",
        "ct-late":     "#ef4444",
      },
      fontFamily: {
        sans:  ["PlusJakartaSans_400Regular"],
        bold:  ["PlusJakartaSans_700Bold"],
        serif: ["PlayfairDisplay_700Bold"],
        mono:  ["IBMPlexMono_400Regular"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create Tailwind CSS entry point**

Create `mobile-rn/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Add NativeWind TypeScript types**

Create `mobile-rn/nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 8: Verify NativeWind works**

Create a temporary `mobile-rn/app/index.tsx`:
```tsx
import "../global.css";
import { Text, View } from "react-native";

export default function TestScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-ct-obsidian">
      <Text className="text-ct-gold text-2xl font-bold">ContriTrack</Text>
    </View>
  );
}
```

Run `npx expo start`, scan QR with Expo Go. Expected: dark background with gold "ContriTrack" text.

Delete this temporary file after confirming.

- [ ] **Step 9: Commit**

```bash
git add mobile-rn/
git commit -m "feat(mobile): configure NativeWind v4 + Expo Router"
```

---

## Task 3: Constants, Theme, and Environment

**Files:**
- Create: `mobile-rn/constants/theme.ts`
- Create: `mobile-rn/.env`

- [ ] **Step 1: Create theme constants**

Create `mobile-rn/constants/theme.ts`:
```ts
export const colors = {
  obsidian: "#0f0e0a",
  surface:  "#1a1916",
  card:     "#211f1b",
  gold:     "#d4a017",
  goldDim:  "rgba(212,160,23,0.15)",
  muted:    "#9898b8",
  border:   "#2e2c26",
  page:     "#131210",
  paid:     "#22c55e",
  pending:  "#f59e0b",
  late:     "#ef4444",
  white:    "#f5f4f0",
} as const;

export const fonts = {
  sans:  "PlusJakartaSans_400Regular",
  bold:  "PlusJakartaSans_700Bold",
  serif: "PlayfairDisplay_700Bold",
  mono:  "IBMPlexMono_400Regular",
} as const;
```

- [ ] **Step 2: Create environment file**

Create `mobile-rn/.env`:
```
EXPO_PUBLIC_API_URL=https://your-deployed-server.com/api
```

Replace `https://your-deployed-server.com/api` with your actual deployed backend URL.

- [ ] **Step 3: Add .env to .gitignore**

Edit `mobile-rn/.gitignore` and add:
```
.env
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add mobile-rn/constants/ mobile-rn/.gitignore
git commit -m "feat(mobile): add theme constants and env config"
```

---

## Task 4: API Layer

**Files:**
- Create: `mobile-rn/api/axios.ts`
- Test: `mobile-rn/__tests__/api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile-rn/__tests__/api.test.ts`:
```ts
import MockAdapter from "axios-mock-adapter";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));

import api from "../api/axios";
const mock = new MockAdapter(api);

describe("api interceptor", () => {
  beforeEach(() => {
    mock.reset();
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
  });

  it("attaches Bearer token from AsyncStorage when user is stored", async () => {
    const user = { _id: "1", token: "test-jwt" };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(user));
    mock.onGet("/test").reply(200, { ok: true });

    const res = await api.get("/test");

    expect(res.config.headers?.Authorization).toBe("Bearer test-jwt");
  });

  it("sends no Authorization header when no user in storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mock.onGet("/test").reply(200, { ok: true });

    const res = await api.get("/test");

    expect(res.config.headers?.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Install axios-mock-adapter**

```bash
npm install --save-dev axios-mock-adapter
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/api.test.ts
```

Expected: FAIL — `Cannot find module '../api/axios'`

- [ ] **Step 4: Implement api/axios.ts**

Create `mobile-rn/api/axios.ts`:
```ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const raw = await AsyncStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("activeGroup");
      router.replace("/(auth)/login");
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/api.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add mobile-rn/api/ mobile-rn/__tests__/api.test.ts
git commit -m "feat(mobile): add axios API layer with JWT interceptor"
```

---

## Task 5: Auth Context

**Files:**
- Create: `mobile-rn/context/AuthContext.tsx`
- Test: `mobile-rn/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile-rn/__tests__/AuthContext.test.tsx`:
```tsx
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../context/AuthContext";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("starts with null user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it("login saves user to AsyncStorage and sets state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const userData = { _id: "1", name: "Ismail", token: "abc123", emailVerified: true };
    await act(async () => {
      await result.current.login(userData);
    });
    expect(result.current.user).toEqual(userData);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify(userData));
  });

  it("logout clears user from AsyncStorage and state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login({ _id: "1", name: "Ismail", token: "abc123", emailVerified: true });
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/AuthContext.test.tsx
```

Expected: FAIL — `Cannot find module '../context/AuthContext'`

- [ ] **Step 3: Implement AuthContext.tsx**

Create `mobile-rn/context/AuthContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/axios";

type User = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  token: string;
  emailVerified?: boolean;
  role?: string;
  subscription?: { plan: string; status: string; trialEndsAt?: string | null };
};

type AuthContextType = {
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (userData: User) => {
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("activeGroup");
    setUser(null);
  };

  const refreshSubscription = useCallback(async () => {
    if (!user?.token) return;
    try {
      const { data } = await api.get("/subscription/status");
      const updated = {
        ...user,
        subscription: { plan: data.plan, status: data.status, trialEndsAt: data.trialEndsAt ?? null },
      };
      await AsyncStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
    } catch {
      // silently ignore — stale subscription data is acceptable
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/AuthContext.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile-rn/context/AuthContext.tsx mobile-rn/__tests__/AuthContext.test.tsx
git commit -m "feat(mobile): add AuthContext with AsyncStorage persistence"
```

---

## Task 6: Group Context + Toast Context

**Files:**
- Create: `mobile-rn/context/GroupContext.tsx`
- Create: `mobile-rn/context/ToastContext.tsx`
- Test: `mobile-rn/__tests__/GroupContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile-rn/__tests__/GroupContext.test.tsx`:
```tsx
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GroupProvider, useGroup } from "../context/GroupContext";
import { AuthProvider } from "../context/AuthContext";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../api/axios");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider><GroupProvider>{children}</GroupProvider></AuthProvider>
);

describe("GroupContext", () => {
  it("starts with empty groups and null activeGroup", () => {
    const { result } = renderHook(() => useGroup(), { wrapper });
    expect(result.current.groups).toEqual([]);
    expect(result.current.activeGroup).toBeNull();
  });

  it("selectGroup sets activeGroup and saves to AsyncStorage", async () => {
    const { result } = renderHook(() => useGroup(), { wrapper });
    const group = { _id: "g1", name: "Family Circle", members: [] };
    await act(async () => {
      result.current.selectGroup(group as any);
    });
    expect(result.current.activeGroup).toEqual(group);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("activeGroup", JSON.stringify(group));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/GroupContext.test.tsx
```

Expected: FAIL — `Cannot find module '../context/GroupContext'`

- [ ] **Step 3: Implement GroupContext.tsx**

Create `mobile-rn/context/GroupContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

type Member = { user: any; role: string };
type Group = { _id: string; name: string; members: Member[]; [key: string]: any };

type GroupContextType = {
  groups: Group[];
  activeGroup: Group | null;
  selectGroup: (group: Group | null) => void;
  loadGroups: () => Promise<void>;
  loadingGroups: boolean;
};

const GroupContext = createContext<GroupContextType | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data } = await api.get("/groups/mine");
      setGroups(data);
      setActiveGroup((prev) => {
        const stillExists = prev && data.find((g: Group) => g._id === prev._id);
        if (stillExists) {
          const fresh = data.find((g: Group) => g._id === prev._id);
          AsyncStorage.setItem("activeGroup", JSON.stringify(fresh));
          return fresh;
        }
        if (data.length > 0) {
          AsyncStorage.setItem("activeGroup", JSON.stringify(data[0]));
          return data[0];
        }
        AsyncStorage.removeItem("activeGroup");
        return null;
      });
    } catch {
      // silently ignore — offline or network error
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadGroups();
    } else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [user, loadGroups]);

  const selectGroup = (group: Group | null) => {
    setActiveGroup(group);
    if (group) {
      AsyncStorage.setItem("activeGroup", JSON.stringify(group));
    } else {
      AsyncStorage.removeItem("activeGroup");
    }
  };

  return (
    <GroupContext.Provider value={{ groups, activeGroup, selectGroup, loadGroups, loadingGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

export const useGroup = () => {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within GroupProvider");
  return ctx;
};
```

- [ ] **Step 4: Implement ToastContext.tsx**

Create `mobile-rn/context/ToastContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/GroupContext.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add mobile-rn/context/
git commit -m "feat(mobile): add GroupContext and ToastContext"
```

---

## Task 7: Shared Components — Primitives

**Files:**
- Create: `mobile-rn/components/Card.tsx`
- Create: `mobile-rn/components/GoldButton.tsx`
- Create: `mobile-rn/components/OutlineButton.tsx`
- Create: `mobile-rn/components/StatusBadge.tsx`
- Create: `mobile-rn/components/Avatar.tsx`

- [ ] **Step 1: Create Card.tsx**

Create `mobile-rn/components/Card.tsx`:
```tsx
import { View, ViewProps } from "react-native";

export default function Card({ children, className = "", ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-ct-card rounded-2xl p-4 border border-ct-border ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Create GoldButton.tsx**

Create `mobile-rn/components/GoldButton.tsx`:
```tsx
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from "react-native";

type Props = TouchableOpacityProps & {
  label: string;
  loading?: boolean;
};

export default function GoldButton({ label, loading, disabled, className = "", ...props }: Props & { className?: string }) {
  return (
    <TouchableOpacity
      className={`bg-ct-gold rounded-xl py-3.5 items-center justify-center ${disabled || loading ? "opacity-60" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#0f0e0a" size="small" />
      ) : (
        <Text className="text-ct-obsidian font-bold text-base">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Create OutlineButton.tsx**

Create `mobile-rn/components/OutlineButton.tsx`:
```tsx
import { TouchableOpacity, Text, TouchableOpacityProps } from "react-native";

type Props = TouchableOpacityProps & {
  label: string;
  className?: string;
};

export default function OutlineButton({ label, className = "", ...props }: Props) {
  return (
    <TouchableOpacity
      className={`border border-ct-gold rounded-xl py-3.5 items-center justify-center ${className}`}
      {...props}
    >
      <Text className="text-ct-gold font-bold text-base">{label}</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Create StatusBadge.tsx**

Create `mobile-rn/components/StatusBadge.tsx`:
```tsx
import { View, Text } from "react-native";

type Status = "paid" | "pending" | "late" | string;

const config: Record<string, { bg: string; text: string; label: string }> = {
  paid:    { bg: "bg-green-900/40",  text: "text-ct-paid",    label: "Paid" },
  pending: { bg: "bg-yellow-900/40", text: "text-ct-pending",  label: "Pending" },
  late:    { bg: "bg-red-900/40",    text: "text-ct-late",     label: "Late" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const c = config[status] ?? { bg: "bg-ct-surface", text: "text-ct-muted", label: status };
  return (
    <View className={`${c.bg} px-2.5 py-0.5 rounded-full`}>
      <Text className={`${c.text} text-xs font-bold`}>{c.label}</Text>
    </View>
  );
}
```

- [ ] **Step 5: Create Avatar.tsx**

Create `mobile-rn/components/Avatar.tsx`:
```tsx
import { View, Text } from "react-native";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      className="bg-ct-surface border border-ct-border items-center justify-center rounded-full"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-ct-gold font-bold" style={{ fontSize: size * 0.35 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add mobile-rn/components/
git commit -m "feat(mobile): add Card, GoldButton, OutlineButton, StatusBadge, Avatar components"
```

---

## Task 8: Shared Components — Feedback

**Files:**
- Create: `mobile-rn/components/LoadingSpinner.tsx`
- Create: `mobile-rn/components/EmptyState.tsx`
- Create: `mobile-rn/components/TopBar.tsx`
- Create: `mobile-rn/components/ToastMessage.tsx`

- [ ] **Step 1: Create LoadingSpinner.tsx**

Create `mobile-rn/components/LoadingSpinner.tsx`:
```tsx
import { ActivityIndicator, View } from "react-native";
import { colors } from "../constants/theme";

export default function LoadingSpinner({ size = "large" }: { size?: "small" | "large" }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={colors.gold} size={size} />
    </View>
  );
}
```

- [ ] **Step 2: Create EmptyState.tsx**

Create `mobile-rn/components/EmptyState.tsx`:
```tsx
import { View, Text } from "react-native";

type Props = { heading: string; subtext?: string };

export default function EmptyState({ heading, subtext }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <Text className="text-4xl mb-3">📭</Text>
      <Text className="text-white font-bold text-lg text-center mb-1">{heading}</Text>
      {subtext && <Text className="text-ct-muted text-sm text-center">{subtext}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Create TopBar.tsx**

Create `mobile-rn/components/TopBar.tsx`:
```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { title: string; showBack?: boolean };

export default function TopBar({ title, showBack = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center px-4 pb-3 bg-ct-surface border-b border-ct-border"
      style={{ paddingTop: insets.top + 8 }}
    >
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-ct-gold text-2xl">←</Text>
        </TouchableOpacity>
      )}
      <Text className="text-white font-bold text-lg flex-1">{title}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Create ToastMessage.tsx**

Create `mobile-rn/components/ToastMessage.tsx`:
```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useToast } from "../context/ToastContext";

const typeColors: Record<string, string> = {
  success: "bg-green-900 border-green-700",
  error:   "bg-red-900 border-red-700",
  info:    "bg-ct-surface border-ct-border",
};

export default function ToastMessage() {
  const { toasts, dismissToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4 z-50 gap-2">
      {toasts.map((t) => (
        <TouchableOpacity
          key={t.id}
          onPress={() => dismissToast(t.id)}
          className={`${typeColors[t.type] ?? typeColors.info} border rounded-xl px-4 py-3 flex-row items-center justify-between`}
        >
          <Text className="text-white text-sm flex-1">{t.message}</Text>
          <Text className="text-ct-muted ml-2">×</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add mobile-rn/components/
git commit -m "feat(mobile): add LoadingSpinner, EmptyState, TopBar, ToastMessage components"
```

---

## Task 9: Root Layout + Auth Guard

**Files:**
- Create: `mobile-rn/app/_layout.tsx`

- [ ] **Step 1: Create root layout**

Create `mobile-rn/app/_layout.tsx`:
```tsx
import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  IBMPlexMono_400Regular,
} from "@expo-google-fonts/ibm-plex-mono";

import { AuthProvider } from "../context/AuthContext";
import { GroupProvider } from "../context/GroupContext";
import { ToastProvider } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_700Bold,
    PlayfairDisplay_700Bold,
    IBMPlexMono_400Regular,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      if (user?.token) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/login");
      }
      setChecking(false);
    })();
  }, []);

  if (!fontsLoaded || checking) return <LoadingSpinner />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <GroupProvider>
            <StatusBar style="light" backgroundColor="#0f0e0a" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131210" } }} />
          </GroupProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Test on device**

```bash
npx expo start
```

Scan QR with Expo Go. Expected: app loads, shows spinner briefly, then redirects to login screen (which doesn't exist yet — you'll see a "not found" screen). That confirms the auth guard runs correctly.

- [ ] **Step 3: Commit**

```bash
git add mobile-rn/app/_layout.tsx
git commit -m "feat(mobile): add root layout with font loading and auth guard"
```

---

## Task 10: Auth Stack Layout + Login Screen

**Files:**
- Create: `mobile-rn/app/(auth)/_layout.tsx`
- Create: `mobile-rn/app/(auth)/login.tsx`

- [ ] **Step 1: Create auth stack layout**

Create `mobile-rn/app/(auth)/_layout.tsx`:
```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131210" } }} />
  );
}
```

- [ ] **Step 2: Create Login screen**

Create `mobile-rn/app/(auth)/login.tsx`:
```tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import GoldButton from "../../components/GoldButton";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";

export default function LoginScreen() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showToast("Please enter email and password", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
      await login(data);
      router.replace("/(tabs)");
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-ct-page" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-ct-gold font-serif text-4xl mb-1">ContriTrack</Text>
          <Text className="text-ct-muted text-sm mb-10">Sign in to your account</Text>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Email</Text>
              <TextInput
                className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9898b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View>
              <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Password</Text>
              <TextInput
                className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9898b8"
                secureTextEntry
              />
            </View>
          </View>

          <GoldButton label="Sign In" loading={loading} onPress={handleLogin} className="mb-4" />

          <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} className="items-center mb-6">
            <Text className="text-ct-muted text-sm">Forgot password?</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-ct-muted text-sm">Don't have an account? </Text>
            <Link href="/(auth)/register">
              <Text className="text-ct-gold text-sm font-bold">Register</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
      <ToastMessage />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Test on device**

```bash
npx expo start
```

Scan QR. Expected: Login screen appears with dark background, gold "ContriTrack" heading, email/password inputs, gold Sign In button.

- [ ] **Step 4: Commit**

```bash
git add mobile-rn/app/(auth)/
git commit -m "feat(mobile): add auth stack layout and Login screen"
```

---

## Task 11: Register + Forgot Password Screens

**Files:**
- Create: `mobile-rn/app/(auth)/register.tsx`
- Create: `mobile-rn/app/(auth)/forgot-password.tsx`

- [ ] **Step 1: Create Register screen**

Create `mobile-rn/app/(auth)/register.tsx`:
```tsx
import { useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import GoldButton from "../../components/GoldButton";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";

export default function RegisterScreen() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      showToast("Name, email and password are required", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });
      await login(data);
      router.replace("/(tabs)");
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-ct-page" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-ct-gold font-serif text-4xl mb-1">ContriTrack</Text>
          <Text className="text-ct-muted text-sm mb-10">Create your account</Text>

          <View className="gap-4 mb-6">
            {[
              { label: "Full Name", value: name, setter: setName, placeholder: "Ismail Idris", keyboardType: "default" as const },
              { label: "Email", value: email, setter: setEmail, placeholder: "you@example.com", keyboardType: "email-address" as const },
              { label: "Phone (optional)", value: phone, setter: setPhone, placeholder: "+2348012345678", keyboardType: "phone-pad" as const },
              { label: "Password", value: password, setter: setPassword, placeholder: "••••••••", keyboardType: "default" as const },
            ].map(({ label, value, setter, placeholder, keyboardType }) => (
              <View key={label}>
                <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">{label}</Text>
                <TextInput
                  className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white"
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor="#9898b8"
                  keyboardType={keyboardType}
                  autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
                  secureTextEntry={label === "Password"}
                />
              </View>
            ))}
          </View>

          <GoldButton label="Create Account" loading={loading} onPress={handleRegister} className="mb-6" />

          <View className="flex-row justify-center">
            <Text className="text-ct-muted text-sm">Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text className="text-ct-gold text-sm font-bold">Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
      <ToastMessage />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Create Forgot Password screen**

Create `mobile-rn/app/(auth)/forgot-password.tsx`:
```tsx
import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useToast } from "../../context/ToastContext";
import GoldButton from "../../components/GoldButton";
import OutlineButton from "../../components/OutlineButton";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";

export default function ForgotPasswordScreen() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      showToast("Please enter your email address", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Failed to send reset email", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-ct-page justify-center px-6" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {sent ? (
        <View className="items-center">
          <Text className="text-4xl mb-4">📬</Text>
          <Text className="text-white font-bold text-xl mb-2 text-center">Check your email</Text>
          <Text className="text-ct-muted text-sm text-center mb-8">
            A password reset link has been sent to {email}
          </Text>
          <OutlineButton label="Back to Login" onPress={() => router.replace("/(auth)/login")} className="w-full" />
        </View>
      ) : (
        <View>
          <Text className="text-ct-gold font-serif text-3xl mb-1">Reset Password</Text>
          <Text className="text-ct-muted text-sm mb-8">We'll send a reset link to your email</Text>
          <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Email</Text>
          <TextInput
            className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white mb-6"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9898b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <GoldButton label="Send Reset Link" loading={loading} onPress={handleSend} className="mb-4" />
          <OutlineButton label="Back to Login" onPress={() => router.back()} />
        </View>
      )}
      <ToastMessage />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Test on device**

```bash
npx expo start
```

Tap "Register" on the login screen — confirm the register screen appears. Tap "Forgot password?" — confirm that screen appears with the email form and a back button.

- [ ] **Step 4: Commit**

```bash
git add mobile-rn/app/(auth)/register.tsx mobile-rn/app/(auth)/forgot-password.tsx
git commit -m "feat(mobile): add Register and Forgot Password screens"
```

---

## Task 12: Tab Layout with Custom Upload Button

**Files:**
- Create: `mobile-rn/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create the tab layout**

Create `mobile-rn/app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../../constants/theme";

function TabIcon({ focused, icon }: { focused: boolean; icon: string }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function UploadTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.gold,
        alignItems: "center", justifyContent: "center",
        marginBottom: 16,
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        opacity: focused ? 1 : 0.85,
      }}
    >
      <Text style={{ fontSize: 22, color: colors.obsidian }}>↑</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: colors.muted },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⊞" />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Circles",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◎" />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ focused }) => <UploadTabIcon focused={focused} />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👥" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="☰" />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens so tabs don't crash**

Create `mobile-rn/app/(tabs)/index.tsx` (temporary):
```tsx
import { View, Text } from "react-native";
export default function Dashboard() {
  return <View className="flex-1 bg-ct-page items-center justify-center"><Text className="text-white">Dashboard</Text></View>;
}
```

Create `mobile-rn/app/(tabs)/groups.tsx` (temporary):
```tsx
import { View, Text } from "react-native";
export default function Groups() {
  return <View className="flex-1 bg-ct-page items-center justify-center"><Text className="text-white">Circles</Text></View>;
}
```

Create `mobile-rn/app/(tabs)/upload.tsx` (temporary):
```tsx
import { View, Text } from "react-native";
export default function Upload() {
  return <View className="flex-1 bg-ct-page items-center justify-center"><Text className="text-white">Upload</Text></View>;
}
```

Create `mobile-rn/app/(tabs)/members.tsx` (temporary):
```tsx
import { View, Text } from "react-native";
export default function Members() {
  return <View className="flex-1 bg-ct-page items-center justify-center"><Text className="text-white">Members</Text></View>;
}
```

Create `mobile-rn/app/(tabs)/more.tsx` (temporary):
```tsx
import { View, Text } from "react-native";
export default function More() {
  return <View className="flex-1 bg-ct-page items-center justify-center"><Text className="text-white">More</Text></View>;
}
```

- [ ] **Step 3: Test login flow end-to-end on device**

```bash
npx expo start
```

1. App opens to Login screen
2. Enter valid credentials for your deployed backend
3. Tap Sign In
4. Expected: navigates to Dashboard tab with the bottom tab bar visible — 5 tabs, gold Upload button in center

- [ ] **Step 4: Commit**

```bash
git add mobile-rn/app/(tabs)/
git commit -m "feat(mobile): add bottom tab layout with gold Upload button and placeholder screens"
```

---

## Task 13: Dashboard Screen

**Files:**
- Modify: `mobile-rn/app/(tabs)/index.tsx` (replace placeholder)

- [ ] **Step 1: Replace Dashboard placeholder with full implementation**

Replace `mobile-rn/app/(tabs)/index.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useGroup } from "../../context/GroupContext";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Contribution = {
  _id: string;
  member?: { name?: string };
  amount: number;
  month: string;
  status: string;
};

type DashboardData = {
  totalCollected: number;
  membersPaid: number;
  membersPending: number;
  trustScore: number;
  recentContributions: Contribution[];
};

function formatNaira(amount: number) {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { activeGroup } = useGroup();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeGroup) { setLoading(false); return; }
    try {
      const [summaryRes, trustRes, recentRes] = await Promise.all([
        api.get(`/contributions/summary?groupId=${activeGroup._id}`),
        api.get(`/contributions/trust-score?groupId=${activeGroup._id}`),
        api.get(`/contributions?groupId=${activeGroup._id}&limit=5`),
      ]);
      setData({
        totalCollected: summaryRes.data.totalCollected ?? 0,
        membersPaid: summaryRes.data.membersPaid ?? 0,
        membersPending: summaryRes.data.membersPending ?? 0,
        trustScore: trustRes.data.score ?? 0,
        recentContributions: recentRes.data.contributions ?? recentRes.data ?? [],
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeGroup]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-ct-page">
      <View className="px-4 pb-3 pt-2 bg-ct-surface border-b border-ct-border" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-ct-muted text-xs uppercase tracking-wide">Welcome back</Text>
        <Text className="text-white font-bold text-xl">{user?.name}</Text>
        {activeGroup && (
          <Text className="text-ct-gold text-sm mt-0.5">{activeGroup.name}</Text>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4a017" />}
      >
        {!activeGroup ? (
          <EmptyState heading="No circle selected" subtext="Join or create a savings circle to get started" />
        ) : !data ? (
          <EmptyState heading="Could not load data" subtext="Pull down to refresh" />
        ) : (
          <>
            {/* Trust Score */}
            <Card className="items-center py-6">
              <Text className="text-ct-muted text-xs uppercase tracking-wide mb-1">Your Trust Score</Text>
              <Text className="text-ct-gold font-serif text-5xl font-bold">{data.trustScore}</Text>
              <Text className="text-ct-muted text-xs mt-1">out of 100</Text>
            </Card>

            {/* Summary Stats */}
            <View className="flex-row gap-3">
              <Card className="flex-1 items-center py-4">
                <Text className="text-ct-muted text-xs mb-1">Collected</Text>
                <Text className="text-white font-bold text-base">{formatNaira(data.totalCollected)}</Text>
              </Card>
              <Card className="flex-1 items-center py-4">
                <Text className="text-ct-muted text-xs mb-1">Paid</Text>
                <Text className="text-ct-paid font-bold text-base">{data.membersPaid}</Text>
              </Card>
              <Card className="flex-1 items-center py-4">
                <Text className="text-ct-muted text-xs mb-1">Pending</Text>
                <Text className="text-ct-pending font-bold text-base">{data.membersPending}</Text>
              </Card>
            </View>

            {/* Recent Contributions */}
            <Text className="text-ct-muted text-xs uppercase tracking-wide mt-2">Recent Activity</Text>
            {data.recentContributions.length === 0 ? (
              <EmptyState heading="No contributions yet" subtext="Upload your first proof of payment" />
            ) : (
              data.recentContributions.map((c) => (
                <Card key={c._id} className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-bold text-sm">{c.member?.name ?? "Member"}</Text>
                    <Text className="text-ct-muted text-xs">{c.month}</Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-white font-bold">{formatNaira(c.amount)}</Text>
                    <StatusBadge status={c.status} />
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
      <ToastMessage />
    </View>
  );
}
```

- [ ] **Step 2: Test on device**

```bash
npx expo start
```

Log in and land on Dashboard. Expected:
- Header shows user name and active circle name
- Trust score card with large gold number
- 3 stat cards (Collected, Paid, Pending)
- Recent contributions list (or empty state if none)
- Pull-to-refresh works

- [ ] **Step 3: Commit**

```bash
git add mobile-rn/app/(tabs)/index.tsx
git commit -m "feat(mobile): implement Dashboard screen"
```

---

## Task 14: Groups (Circles) Screen

**Files:**
- Modify: `mobile-rn/app/(tabs)/groups.tsx` (replace placeholder)

- [ ] **Step 1: Replace Groups placeholder**

Replace `mobile-rn/app/(tabs)/groups.tsx`:
```tsx
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useGroup } from "../../context/GroupContext";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ToastMessage from "../../components/ToastMessage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GroupsScreen() {
  const { groups, activeGroup, selectGroup, loadGroups, loadingGroups } = useGroup();
  const insets = useSafeAreaInsets();

  if (loadingGroups) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-ct-page">
      <View className="px-4 pb-3 bg-ct-surface border-b border-ct-border" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-white font-bold text-xl">My Circles</Text>
        <Text className="text-ct-muted text-xs">{groups.length} circle{groups.length !== 1 ? "s" : ""}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loadingGroups} onRefresh={loadGroups} tintColor="#d4a017" />}
      >
        {groups.length === 0 ? (
          <EmptyState heading="No circles yet" subtext="Ask an admin to add you to a savings circle" />
        ) : (
          groups.map((group) => {
            const isActive = activeGroup?._id === group._id;
            return (
              <TouchableOpacity key={group._id} onPress={() => selectGroup(group)} activeOpacity={0.8}>
                <Card className={isActive ? "border-ct-gold border-2" : ""}>
                  <View className="flex-row items-center gap-3">
                    <Avatar name={group.name} size={44} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white font-bold text-base flex-1">{group.name}</Text>
                        {isActive && (
                          <View className="bg-ct-gold-dim px-2 py-0.5 rounded-full">
                            <Text className="text-ct-gold text-xs font-bold">Active</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-ct-muted text-xs mt-0.5">
                        {group.members?.length ?? 0} member{(group.members?.length ?? 0) !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <ToastMessage />
    </View>
  );
}
```

- [ ] **Step 2: Test on device**

Tap Circles tab. Expected:
- List of user's circles with avatar, name, member count
- Active circle has gold border and "Active" badge
- Tapping a different circle switches it and updates the gold border
- Pull-to-refresh reloads circles

- [ ] **Step 3: Commit**

```bash
git add mobile-rn/app/(tabs)/groups.tsx
git commit -m "feat(mobile): implement Circles screen with active group switcher"
```

---

## Task 15: Upload Proof Screen

**Files:**
- Modify: `mobile-rn/app/(tabs)/upload.tsx` (replace placeholder)

- [ ] **Step 1: Replace Upload placeholder**

Replace `mobile-rn/app/(tabs)/upload.tsx`:
```tsx
import { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useGroup } from "../../context/GroupContext";
import { useToast } from "../../context/ToastContext";
import GoldButton from "../../components/GoldButton";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function UploadScreen() {
  const { activeGroup } = useGroup();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", `Please allow ${useCamera ? "camera" : "photo library"} access in settings.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const handlePickImage = () => {
    Alert.alert("Upload Proof", "Choose a source", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Gallery", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    if (!activeGroup) { showToast("Select a circle first", "error"); return; }
    if (!image) { showToast("Please select a proof image", "error"); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showToast("Please enter a valid amount", "error"); return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("groupId", activeGroup._id);
      formData.append("amount", amount);
      formData.append("month", month);
      formData.append("proof", {
        uri: image.uri,
        name: `proof-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);

      await api.post("/contributions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Proof submitted successfully!", "success");
      setImage(null);
      setAmount("");
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-ct-page" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View className="px-4 pb-3 bg-ct-surface border-b border-ct-border" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-white font-bold text-xl">Upload Proof</Text>
        <Text className="text-ct-muted text-xs">Submit payment evidence</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Image Picker */}
        <TouchableOpacity
          onPress={handlePickImage}
          className="bg-ct-card border-2 border-dashed border-ct-border rounded-2xl h-48 items-center justify-center"
        >
          {image ? (
            <Image source={{ uri: image.uri }} className="w-full h-full rounded-2xl" resizeMode="cover" />
          ) : (
            <View className="items-center gap-2">
              <Text className="text-3xl">📷</Text>
              <Text className="text-ct-gold font-bold text-sm">Tap to add photo</Text>
              <Text className="text-ct-muted text-xs">Camera or Gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Amount */}
        <View>
          <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Amount</Text>
          <View className="flex-row items-center bg-ct-surface border border-ct-border rounded-xl overflow-hidden">
            <View className="px-4 py-3.5 border-r border-ct-border">
              <Text className="text-ct-gold font-bold">₦</Text>
            </View>
            <TextInput
              className="flex-1 px-4 py-3.5 text-white"
              value={amount}
              onChangeText={setAmount}
              placeholder="5000"
              placeholderTextColor="#9898b8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Month Selector */}
        <View>
          <Text className="text-ct-muted text-xs mb-2 uppercase tracking-wide">Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {MONTHS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMonth(m)}
                  className={`px-3 py-2 rounded-xl border ${month === m ? "bg-ct-gold-dim border-ct-gold" : "border-ct-border bg-ct-surface"}`}
                >
                  <Text className={`text-xs font-bold ${month === m ? "text-ct-gold" : "text-ct-muted"}`}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Active Group */}
        {activeGroup && (
          <View className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3 flex-row items-center gap-2">
            <Text className="text-ct-muted text-xs">Circle:</Text>
            <Text className="text-ct-gold font-bold text-sm">{activeGroup.name}</Text>
          </View>
        )}

        <GoldButton label="Submit Proof" loading={loading} onPress={handleSubmit} />
      </ScrollView>
      <ToastMessage />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Test on device**

Tap Upload tab. Expected:
- Dashed image picker area
- Tap it → Alert appears: Camera / Gallery / Cancel
- Select an image → thumbnail shows in the picker area
- Amount field with ₦ prefix
- Month selector horizontal scroll — current month pre-selected
- Submit → success toast (or error if backend rejects)

- [ ] **Step 3: Commit**

```bash
git add mobile-rn/app/(tabs)/upload.tsx
git commit -m "feat(mobile): implement Upload Proof screen with camera and gallery support"
```

---

## Task 16: Members Screen

**Files:**
- Modify: `mobile-rn/app/(tabs)/members.tsx` (replace placeholder)

- [ ] **Step 1: Replace Members placeholder**

Replace `mobile-rn/app/(tabs)/members.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useGroup } from "../../context/GroupContext";
import Avatar from "../../components/Avatar";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ToastMessage from "../../components/ToastMessage";
import api from "../../api/axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MemberData = {
  _id: string;
  name: string;
  trustScore: number;
  grade: string;
  currentMonthStatus: string;
};

export default function MembersScreen() {
  const { activeGroup } = useGroup();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeGroup) { setLoading(false); return; }
    try {
      const { data } = await api.get(`/members?groupId=${activeGroup._id}`);
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeGroup]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-ct-page">
      <View className="px-4 pb-3 bg-ct-surface border-b border-ct-border" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-white font-bold text-xl">Members</Text>
        {activeGroup && <Text className="text-ct-muted text-xs">{activeGroup.name} · {members.length} members</Text>}
      </View>

      {!activeGroup ? (
        <EmptyState heading="No circle selected" subtext="Switch to a circle from the Circles tab" />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#d4a017" />}
          ListEmptyComponent={<EmptyState heading="No members found" subtext="Members will appear once added to the circle" />}
          renderItem={({ item }) => (
            <View className="bg-ct-card border border-ct-border rounded-2xl px-4 py-3 flex-row items-center gap-3">
              <Avatar name={item.name} size={42} />
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">{item.name}</Text>
                <Text className="text-ct-muted text-xs mt-0.5">Trust: {item.trustScore} · {item.grade}</Text>
              </View>
              <StatusBadge status={item.currentMonthStatus ?? "pending"} />
            </View>
          )}
        />
      )}
      <ToastMessage />
    </View>
  );
}
```

- [ ] **Step 2: Test on device**

Tap Members tab. Expected:
- List of members with avatar, name, trust score, grade
- StatusBadge showing Paid/Pending/Late per member
- Pull-to-refresh works
- Empty state if no members

- [ ] **Step 3: Commit**

```bash
git add mobile-rn/app/(tabs)/members.tsx
git commit -m "feat(mobile): implement Members screen"
```

---

## Task 17: More Screen + Sub-screens

**Files:**
- Modify: `mobile-rn/app/(tabs)/more.tsx` (replace placeholder)
- Create: `mobile-rn/app/my-payments.tsx`
- Create: `mobile-rn/app/notifications.tsx`
- Create: `mobile-rn/app/profile.tsx`

- [ ] **Step 1: Replace More placeholder**

Replace `mobile-rn/app/(tabs)/more.tsx`:
```tsx
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/Avatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuItem = { label: string; icon: string; route?: string; action?: () => void; danger?: boolean };

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);
  };

  const items: MenuItem[] = [
    { label: "My Payments", icon: "💳", route: "/my-payments" },
    { label: "Notifications", icon: "🔔", route: "/notifications" },
    { label: "Profile", icon: "👤", route: "/profile" },
    { label: "Sign Out", icon: "🚪", action: handleLogout, danger: true },
  ];

  return (
    <View className="flex-1 bg-ct-page">
      <View className="px-4 pb-4 bg-ct-surface border-b border-ct-border" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3">
          {user && <Avatar name={user.name} size={48} />}
          <View>
            <Text className="text-white font-bold text-base">{user?.name}</Text>
            <Text className="text-ct-muted text-xs">{user?.email}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8 }}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.action ?? (() => item.route && router.push(item.route as any))}
            className="bg-ct-card border border-ct-border rounded-2xl px-4 py-4 flex-row items-center gap-3"
            activeOpacity={0.75}
          >
            <Text className="text-xl">{item.icon}</Text>
            <Text className={`flex-1 font-bold text-base ${item.danger ? "text-ct-late" : "text-white"}`}>
              {item.label}
            </Text>
            {!item.danger && <Text className="text-ct-muted text-lg">›</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Create My Payments screen**

Create `mobile-rn/app/my-payments.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, FlatList, Text, RefreshControl } from "react-native";
import TopBar from "../components/TopBar";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";
import { useGroup } from "../context/GroupContext";

type Payment = { _id: string; amount: number; month: string; status: string; createdAt: string };

export default function MyPaymentsScreen() {
  const { activeGroup } = useGroup();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeGroup) { setLoading(false); return; }
    try {
      const { data } = await api.get(`/contributions/mine?groupId=${activeGroup._id}`);
      setPayments(data);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeGroup]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <><TopBar title="My Payments" showBack /><LoadingSpinner /></>;

  return (
    <View className="flex-1 bg-ct-page">
      <TopBar title="My Payments" showBack />
      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#d4a017" />}
        ListEmptyComponent={<EmptyState heading="No payments yet" subtext="Your contributions will appear here" />}
        renderItem={({ item }) => (
          <View className="bg-ct-card border border-ct-border rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <View>
              <Text className="text-white font-bold text-sm">{item.month}</Text>
              <Text className="text-ct-muted text-xs">{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <View className="items-end gap-1">
              <Text className="text-white font-bold">₦{Number(item.amount).toLocaleString("en-NG")}</Text>
              <StatusBadge status={item.status} />
            </View>
          </View>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: Create Notifications screen**

Create `mobile-rn/app/notifications.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import TopBar from "../components/TopBar";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import GoldButton from "../components/GoldButton";
import api from "../api/axios";

type Notification = { _id: string; message: string; read: boolean; createdAt: string };

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <><TopBar title="Notifications" showBack /><LoadingSpinner /></>;

  return (
    <View className="flex-1 bg-ct-page">
      <TopBar title="Notifications" showBack />
      {unreadCount > 0 && (
        <View className="px-4 pt-3">
          <GoldButton label={`Mark all read (${unreadCount})`} onPress={markAllRead} />
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#d4a017" />}
        ListEmptyComponent={<EmptyState heading="No notifications" subtext="You're all caught up" />}
        renderItem={({ item }) => (
          <View className={`rounded-2xl px-4 py-3 border ${item.read ? "bg-ct-card border-ct-border" : "bg-ct-gold-dim border-ct-gold"}`}>
            <Text className="text-white text-sm">{item.message}</Text>
            <Text className="text-ct-muted text-xs mt-1">{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 4: Create Profile screen**

Create `mobile-rn/app/profile.tsx`:
```tsx
import { useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import TopBar from "../components/TopBar";
import GoldButton from "../components/GoldButton";
import Avatar from "../components/Avatar";
import ToastMessage from "../components/ToastMessage";
import api from "../api/axios";

export default function ProfileScreen() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Name cannot be empty", "error"); return; }
    setLoading(true);
    try {
      const { data } = await api.put("/auth/profile", { name: name.trim(), phone: phone.trim() || undefined });
      await login({ ...user!, ...data });
      showToast("Profile updated", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-ct-page" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TopBar title="Profile" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View className="items-center py-4">
          {user && <Avatar name={user.name} size={72} />}
          <Text className="text-white font-bold text-lg mt-3">{user?.name}</Text>
          <Text className="text-ct-muted text-sm">{user?.email}</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Full Name</Text>
            <TextInput
              className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#9898b8"
            />
          </View>
          <View>
            <Text className="text-ct-muted text-xs mb-1.5 uppercase tracking-wide">Phone</Text>
            <TextInput
              className="bg-ct-surface border border-ct-border rounded-xl px-4 py-3.5 text-white"
              value={phone}
              onChangeText={setPhone}
              placeholder="+2348012345678"
              placeholderTextColor="#9898b8"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <GoldButton label="Save Changes" loading={loading} onPress={handleSave} />
      </ScrollView>
      <ToastMessage />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 5: Test all More tab flows on device**

```bash
npx expo start
```

Tap More tab. Expected:
- User avatar + name + email in header
- 4 menu items: My Payments, Notifications, Profile, Sign Out
- Tap My Payments → My Payments screen with back button
- Tap Notifications → Notifications screen, "Mark all read" button visible if unread
- Tap Profile → Profile screen with editable name/phone and Save button
- Tap Sign Out → confirmation alert → logs out and goes to Login

- [ ] **Step 6: Commit**

```bash
git add mobile-rn/app/(tabs)/more.tsx mobile-rn/app/my-payments.tsx mobile-rn/app/notifications.tsx mobile-rn/app/profile.tsx
git commit -m "feat(mobile): implement More menu, My Payments, Notifications, and Profile screens"
```

---

## Task 18: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd mobile-rn
npx jest --coverage
```

Expected: All tests pass. Coverage report shows AuthContext, GroupContext, and API interceptor covered.

- [ ] **Step 2: Full end-to-end smoke test on device**

Test each flow on your Android device with Expo Go:

| Flow | Steps | Expected |
|------|-------|----------|
| Register | Open app → Register → fill form → submit | Lands on Dashboard |
| Login | Logout → Login → credentials → submit | Lands on Dashboard |
| Dashboard | Land on Dashboard tab | Stats cards + trust score + recent activity |
| Switch Circle | Circles tab → tap different circle | Gold border moves, dashboard updates |
| Upload | Upload tab → tap picker → Camera or Gallery → fill amount + month → Submit | Success toast |
| Members | Members tab | List with avatars, status badges |
| My Payments | More → My Payments | List of own contributions |
| Notifications | More → Notifications | List, mark-all-read works |
| Profile | More → Profile → edit name → Save | Success toast, name updates in More header |
| Sign Out | More → Sign Out → confirm | Returns to Login screen |

- [ ] **Step 3: Final commit**

```bash
git add mobile-rn/
git commit -m "feat(mobile): complete React Native MVP — 10 screens, Expo Router, NativeWind"
```

---

## Success Criteria Checklist

- [ ] User can register and log in on Android via Expo Go
- [ ] JWT persists in AsyncStorage across app restarts
- [ ] Dashboard shows live data from deployed backend
- [ ] Circles tab lets user switch active group
- [ ] Upload tab opens camera or gallery, submits proof to `/api/contributions`
- [ ] Members tab shows all circle members with payment status
- [ ] More tab links to My Payments, Notifications, Profile, and Logout
- [ ] Dark Ledger theme (obsidian background, gold accents) is consistent throughout
- [ ] No changes were made to `client/` or `server/`
