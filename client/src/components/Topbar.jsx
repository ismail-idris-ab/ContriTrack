import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const avatarGradients = [
  'linear-gradient(135deg,#4338ca,#7c3aed)',
  'linear-gradient(135deg,#0369a1,#0891b2)',
  'linear-gradient(135deg,#15803d,#4ade80)',
  'linear-gradient(135deg,#b45309,#f59e0b)',
  'linear-gradient(135deg,#9d174d,#ec4899)',
];
const circleGrad = (name = '') => avatarGradients[name.charCodeAt(0) % 5];

const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard',         sub: 'Monitor contributions this month' },
  '/upload':        { title: 'Upload Proof',       sub: 'Submit your payment receipt' },
  '/members':       { title: 'Members',            sub: 'Everyone in your savings circle' },
  '/my-payments':   { title: 'Payment History',    sub: 'Your personal contribution timeline' },
  '/groups':        { title: 'My Circles',         sub: 'Manage your savings circles' },
  '/pledges':       { title: 'Pledges',            sub: 'Schedule upcoming contributions' },
  '/subscription':  { title: 'Subscription',       sub: 'Manage your plan and billing' },
  '/payouts':       { title: 'Payout Rotation',    sub: 'Track who receives the pot' },
  '/profile':       { title: 'My Profile',         sub: 'Account details and password' },
  '/reports':       { title: 'Reports',            sub: 'Monthly and yearly analytics' },
  '/penalties':     { title: 'Penalties',          sub: 'Track and manage member penalties' },
  '/whatsapp':      { title: 'Reminders',          sub: 'Send payment reminders via WhatsApp' },
  '/overview':      { title: 'Circle Overview',    sub: 'All your savings circles at a glance' },
  '/notifications': { title: 'Notifications',      sub: 'Recent alerts and activity' },
  '/verify-email':  { title: 'Verify Email',       sub: 'Confirm your email address' },
  '/admin':         { title: 'Admin Panel',        sub: 'Review member payment submissions' },
};

const GROUP_SCOPED = new Set([
  '/dashboard', '/upload', '/members', '/my-payments',
  '/pledges', '/payouts', '/penalties', '/reports', '/whatsapp',
]);

// ─── Circle Switcher ──────────────────────────────────────────────────────────
function CircleSwitcher() {
  const { groups, activeGroup, selectGroup } = useGroup();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!GROUP_SCOPED.has(location.pathname)) return null;
  if (groups.length === 0) return null;

  const name = activeGroup?.name || 'No circle selected';
  const hasMultiple = groups.length > 1;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => hasMultiple && setOpen(o => !o)}
        title={hasMultiple ? 'Switch active circle' : name}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 8px',
          borderRadius: 10,
          background: activeGroup ? 'rgba(212,160,23,0.07)' : 'rgba(0,0,0,0.04)',
          border: `1.5px solid ${activeGroup ? 'rgba(212,160,23,0.22)' : 'rgba(0,0,0,0.08)'}`,
          cursor: hasMultiple ? 'pointer' : 'default',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.16s ease',
        }}
        onMouseEnter={e => hasMultiple && (e.currentTarget.style.background = 'rgba(212,160,23,0.11)')}
        onMouseLeave={e => e.currentTarget.style.background = activeGroup ? 'rgba(212,160,23,0.07)' : 'rgba(0,0,0,0.04)'}
      >
        {activeGroup ? (
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: circleGrad(activeGroup.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 9, fontWeight: 700,
          }}>
            {getInitials(activeGroup.name)}
          </div>
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: 'rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
        )}
        <span style={{
          fontSize: 12.5, fontWeight: 600,
          color: activeGroup ? '#a07010' : '#888',
          maxWidth: 'min(130px, 30vw)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        {hasMultiple && (
          <svg
            width={11} height={11} viewBox="0 0 24 24" fill="none"
            stroke={activeGroup ? '#d4a017' : '#888'} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transition: 'transform 0.16s ease', transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="animate-slide-down" style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          minWidth: 230, zIndex: 300,
          background: '#fff',
          border: '1.5px solid rgba(0,0,0,0.08)',
          borderRadius: 13,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '9px 14px 6px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: '#aaa',
          }}>
            Switch circle
          </div>
          {groups.map(g => {
            const active = g._id === activeGroup?._id;
            return (
              <button
                key={g._id}
                onClick={() => { selectGroup(g); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  width: '100%', padding: '10px 14px',
                  background: active ? 'rgba(212,160,23,0.07)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-sans)',
                  transition: 'background 0.14s ease',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: circleGrad(g.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>
                  {getInitials(g.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#12121c' : '#3e3e52',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8888a4', marginTop: 1 }}>
                    {g.members?.length || 0} members · ₦{(g.contributionAmount || 0).toLocaleString()}/mo
                  </div>
                </div>
                {active && (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                    stroke="var(--ct-gold)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '6px 8px' }}>
            <Link
              to="/overview"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px', borderRadius: 8,
                fontSize: 12, color: 'var(--ct-gold)', fontWeight: 600,
                textDecoration: 'none', background: 'transparent',
                transition: 'background 0.14s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              View all circles
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const page = PAGE_TITLES[location.pathname] || { title: 'ContriTrack', sub: '' };

  const [unreadCount,   setUnreadCount]   = useState(0);
  const [bellHovered,   setBellHovered]   = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = () => {
      api.get('/notifications?limit=1')
        .then(({ data }) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    };
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 90_000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <div className="ct-topbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--ct-card)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      padding: '0 24px',
      height: 62,
      flexShrink: 0,
      fontFamily: 'var(--font-sans)',
      gap: 16,
    }}>

      {/* Left — hamburger + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 0' }}>
        <button
          onClick={onMenuClick}
          className="md:hidden"
          style={{
            display: 'flex', flexDirection: 'column', gap: 4.5,
            padding: 7, background: 'transparent', border: 0, cursor: 'pointer', flexShrink: 0,
            borderRadius: 8,
          }}
        >
          <span style={{ display: 'block', width: 18, height: 1.5, background: '#44445a', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 14, height: 1.5, background: '#44445a', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 1.5, background: '#44445a', borderRadius: 2 }} />
        </button>

        <div key={location.pathname} className="topbar-title" style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--ct-text-1)',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {page.title}
          </h1>
          {page.sub && (
            <p className="topbar-subtitle" style={{
              fontSize: 11.5,
              color: 'var(--ct-text-3)',
              margin: '2px 0 0',
              lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '-0.01em',
            }}>
              {page.sub}
            </p>
          )}
        </div>
      </div>

      {/* Centre — circle switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', flex: '0 1 auto' }}>
        <CircleSwitcher />
      </div>

      {/* Right — admin badge · bell · user section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flex: '1 1 0', justifyContent: 'flex-end' }}>

        {/* Admin badge */}
        {user?.role === 'admin' && (
          <span className="topbar-admin-badge" style={{
            background: 'rgba(212,160,23,0.10)',
            border: '1.5px solid rgba(212,160,23,0.22)',
            color: '#a07010',
            fontSize: 10, fontWeight: 700,
            padding: '4px 10px', borderRadius: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Admin
          </span>
        )}

        {/* Notification bell */}
        <Link
          to="/notifications"
          title="Notifications"
          onMouseEnter={() => setBellHovered(true)}
          onMouseLeave={() => setBellHovered(false)}
          style={{
            position: 'relative',
            width: 38, height: 38, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bellHovered ? 'rgba(0,0,0,0.04)' : 'transparent',
            border: `1.5px solid ${bellHovered ? 'rgba(0,0,0,0.09)' : 'transparent'}`,
            transition: 'all 0.16s ease',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <svg
            width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke={unreadCount > 0 ? '#d4a017' : 'var(--ct-text-3)'}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: 5, right: 5,
              minWidth: 16, height: 16, borderRadius: 8,
              background: '#e11d48', color: '#fff',
              fontSize: 8.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
              boxShadow: '0 0 0 2.5px var(--ct-card)',
              lineHeight: 1,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

        {/* User section — toggleable dropdown */}
        <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '5px 10px 5px 5px',
              borderRadius: 11, border: 'none', cursor: 'pointer',
              border: `1.5px solid ${profileOpen ? 'rgba(0,0,0,0.10)' : 'transparent'}`,
              background: profileOpen ? 'rgba(0,0,0,0.03)' : 'transparent',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.16s ease',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12.5, fontWeight: 700,
              letterSpacing: '-0.01em',
              boxShadow: profileOpen ? '0 0 0 3px rgba(79,70,229,0.18)' : '0 0 0 2px transparent',
              transition: 'box-shadow 0.16s ease',
            }}>
              {getInitials(user?.name)}
            </div>

            {/* Name + role */}
            <div className="hidden sm:block" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)', lineHeight: 1.2, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ct-text-3)', marginTop: 1, lineHeight: 1, whiteSpace: 'nowrap' }}>
                {user?.role === 'admin' ? 'Administrator' : 'Member'}
              </div>
            </div>

            {/* Chevron */}
            <svg
              className="hidden sm:block"
              width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke="var(--ct-text-3)" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.18s ease', transform: profileOpen ? 'rotate(180deg)' : 'none' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="animate-slide-down" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              minWidth: 200, zIndex: 300,
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.08)',
              borderRadius: 13,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07)',
              overflow: 'hidden',
            }}>
              {/* User info header */}
              <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)' }}>{user?.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)', marginTop: 2 }}>{user?.email}</div>
              </div>

              {/* Menu items */}
              <div style={{ padding: '6px 8px' }}>
                {[
                  { label: 'My Profile',    path: '/profile',      icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                  { label: 'Subscription', path: '/subscription', icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
                  { label: 'Notifications', path: '/notifications', icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> },
                ].map(item => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setProfileOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 10px',
                      borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--ct-text-2)', fontSize: 13, fontWeight: 500,
                      fontFamily: 'var(--font-sans)', textAlign: 'left',
                      transition: 'background 0.13s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: 'var(--ct-text-3)', display: 'flex' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Sign out */}
              <div style={{ padding: '6px 8px 8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button
                  onClick={() => { logout(); setProfileOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 10px',
                    borderRadius: 8, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    color: '#e11d48', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-sans)', textAlign: 'left',
                    transition: 'background 0.13s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(225,29,72,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
