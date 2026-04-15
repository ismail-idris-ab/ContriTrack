import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
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
  return !user ? children : <Navigate to="/dashboard" replace />;
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
            <Sidebar onNavigate={() => setMobileOpen(false)} />
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
        <main className="flex-1 overflow-y-auto p-6 md:p-8" style={{ background: 'var(--ct-page)' }}>
          <Outlet />
        </main>
      </div>
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
