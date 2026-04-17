import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import MyPaymentsPage from './pages/MyPaymentsPage';
import MembersPage from './pages/MembersPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';
import GroupsPage from './pages/GroupsPage';
import PledgePage from './pages/PledgePage';
import PricingPage from './pages/PricingPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ProfilePage from './pages/ProfilePage';
import PayoutPage from './pages/PayoutPage';
import PenaltyPage from './pages/PenaltyPage';
import ReportPage from './pages/ReportPage';
import WhatsAppPage from './pages/WhatsAppPage';
import OverviewPage from './pages/OverviewPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import NotificationsPage from './pages/NotificationsPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('evBannerDismissed') === '1'
  );

  const dismiss = () => {
    sessionStorage.setItem('evBannerDismissed', '1');
    setDismissed(true);
  };

  if (!user || user.emailVerified || dismissed) return null;

  return (
    <div style={{
      background: 'rgba(245,158,11,0.12)',
      borderBottom: '1px solid rgba(245,158,11,0.22)',
      padding: '9px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
      fontSize: 12.5, fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ color: '#f59e0b' }}>
        ⚠️ Your email address is not yet verified.
      </span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/verify-email" style={{
          color: 'var(--ct-gold)', fontWeight: 700, fontSize: 12.5, textDecoration: 'none',
        }}>
          Verify now →
        </Link>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', color: '#52526e', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Navigation (mobile only) ─────────────────────────────────────────
function BottomNav({ onMoreClick }) {
  const { pathname } = useLocation();

  const items = [
    {
      path: '/dashboard', label: 'Home',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
      ),
    },
    {
      path: '/groups', label: 'Circles',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
          <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87"/>
        </svg>
      ),
    },
    {
      path: '/upload', label: 'Upload', primary: true,
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
      ),
    },
    {
      path: '/members', label: 'Members',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z"/>
        </svg>
      ),
    },
    {
      label: 'More', action: true,
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden bottom-nav">
      {items.map((item) => {
        if (item.primary) {
          const active = pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="bottom-nav-item">
              <div className={`bottom-nav-upload${active ? ' active' : ''}`}>
                {item.icon}
              </div>
              <span className="bottom-nav-label" style={{ color: active ? 'var(--ct-gold)' : '#9898b8' }}>
                {item.label}
              </span>
            </Link>
          );
        }
        if (item.action) {
          return (
            <button key="more" onClick={onMoreClick} className="bottom-nav-item bottom-nav-btn">
              <div className="bottom-nav-icon">{item.icon}</div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        }
        const active = pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className="bottom-nav-item">
            <div className={`bottom-nav-icon${active ? ' active' : ''}`}>{item.icon}</div>
            <span className="bottom-nav-label" style={{ color: active ? 'var(--ct-gold)' : '#9898b8', fontWeight: active ? 700 : 500 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--ct-page)', fontFamily: 'var(--font-sans)' }}>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[200] md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-[240px] h-full" onClick={e => e.stopPropagation()}>
            <Sidebar onNavigate={() => setMobileOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:block w-[240px] shrink-0">
        <Sidebar />
      </div>

      {/* Right column: topbar + page content */}
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <EmailVerificationBanner />
        <main className="flex-1 overflow-y-auto main-content" style={{ background: 'var(--ct-page)' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav onMoreClick={() => setMobileOpen(true)} />
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                        element={<LandingPage />} />
        <Route path="/pricing"                 element={<PricingPage />} />
        <Route path="/login"                   element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"                element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password"         element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token"   element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/verify-email"            element={<VerifyEmailPage />} />

        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/upload"      element={<UploadPage />} />
          <Route path="/members"     element={<MembersPage />} />
          <Route path="/my-payments" element={<MyPaymentsPage />} />
          <Route path="/groups"       element={<GroupsPage />} />
          <Route path="/pledges"      element={<PledgePage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/payouts"      element={<PayoutPage />} />
          <Route path="/penalties"    element={<PenaltyPage />} />
          <Route path="/reports"      element={<ReportPage />} />
          <Route path="/whatsapp"     element={<WhatsAppPage />} />
          <Route path="/overview"       element={<OverviewPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin"        element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <GroupProvider>
          <AppRoutes />
        </GroupProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
