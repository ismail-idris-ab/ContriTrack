import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { canAccess } from '../utils/planUtils';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const PLAN_BADGE = {
  free:        { label: 'Free',        color: '#6868a0', bg: 'rgba(104,104,160,0.12)'  },
  pro:         { label: 'Pro',         color: '#d4a017', bg: 'rgba(212,160,23,0.14)'   },
  coordinator: { label: 'Coordinator', color: '#818cf8', bg: 'rgba(129,140,248,0.14)'  },
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = {
  dashboard: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  overview: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  groups: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87"/>
    </svg>
  ),
  upload: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  members: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  ),
  history: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pledges: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  payouts: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  penalties: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  reports: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  whatsapp: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.18 19.79 19.79 0 01.08.47 2 2 0 012.08.47h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  ),
  subscription: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  admin: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" strokeWidth={2.2} />
    </svg>
  ),
};

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard',   path: '/dashboard',   icon: Icon.dashboard  },
      { id: 'overview',  label: 'Overview',    path: '/overview',    icon: Icon.overview   },
    ],
  },
  {
    label: 'Circle',
    items: [
      { id: 'groups',  label: 'My Circles',   path: '/groups',      icon: Icon.groups   },
      { id: 'upload',  label: 'Upload Proof', path: '/upload',      icon: Icon.upload   },
      { id: 'members', label: 'Members',      path: '/members',     icon: Icon.members  },
      { id: 'history', label: 'History',      path: '/my-payments', icon: Icon.history  },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'pledges',   label: 'Pledges',   path: '/pledges',   icon: Icon.pledges   },
      { id: 'payouts',   label: 'Payouts',   path: '/payouts',   icon: Icon.payouts   },
      { id: 'penalties', label: 'Penalties', path: '/penalties', icon: Icon.penalties },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'reports',      label: 'Reports',      path: '/reports',      icon: Icon.reports,      requires: 'pro' },
      { id: 'whatsapp',     label: 'Reminders',    path: '/whatsapp',     icon: Icon.whatsapp,     requires: 'pro' },
      { id: 'subscription', label: 'Subscription', path: '/subscription', icon: Icon.subscription },
    ],
  },
];

const ADMIN_ITEM = { id: 'admin', label: 'Admin Panel', path: '/admin', icon: Icon.admin };

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ item, active, locked, onNavigate }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 9,
        textDecoration: 'none',
        position: 'relative',
        transition: 'all 0.16s ease',
        background: active
          ? 'linear-gradient(90deg, rgba(212,160,23,0.16) 0%, rgba(212,160,23,0.04) 100%)'
          : hovered
          ? 'rgba(255,255,255,0.07)'
          : 'transparent',
        boxShadow: active ? 'inset 3px 0 0 var(--ct-gold)' : 'none',
        marginBottom: 1,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28,
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.16s ease',
        background: active
          ? 'rgba(212,160,23,0.18)'
          : hovered
          ? 'rgba(255,255,255,0.09)'
          : 'transparent',
        color: active
          ? 'var(--ct-gold)'
          : hovered
          ? '#c8c4d8'
          : '#8080a8',
      }}>
        {item.icon}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? '#ede8de' : hovered ? '#c8c4d8' : '#9898c0',
        letterSpacing: '-0.01em',
        transition: 'color 0.16s ease',
        flex: 1,
      }}>
        {item.label}
      </span>

      {/* Badge or locked pill or active dot */}
      {item.badge ? (
        <div style={{
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#e11d48',
          color: '#fff', fontSize: 9.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', flexShrink: 0,
          boxShadow: '0 2px 6px rgba(225,29,72,0.35)',
        }}>
          {item.badge > 99 ? '99+' : item.badge}
        </div>
      ) : locked ? (
        <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: 'rgba(212,160,23,0.14)',
          color: '#d4a017',
          fontSize: 8.5, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Pro
        </span>
      ) : active ? (
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--ct-gold)',
          boxShadow: '0 0 6px rgba(212,160,23,0.7)',
          flexShrink: 0,
        }} />
      ) : null}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function NavSection({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 10px 3px',
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#5e5e84',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)',
      }} />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ onNavigate, isMobile }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const now = new Date();
    const fetch = () => {
      api.get(`/contributions?month=${now.getMonth() + 1}&year=${now.getFullYear()}&limit=100`)
        .then(({ data }) => setPendingCount(data.docs?.filter(c => c.status === 'pending').length || 0))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [user?.role]);

  const isActive = (path) => location.pathname === path;
  const plan = user?.subscription?.plan || 'free';
  const planBadge = PLAN_BADGE[plan] || PLAN_BADGE.free;

  return (
    <div style={{
      width: 240,
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      background: '#09090f',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden',
    }}>

      {/* Atmospheric glows */}
      <div style={{
        position: 'absolute', top: -80, left: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 80, right: -100,
        width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.016,
        backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />

      {/* Brand */}
      <div style={{ padding: '22px 16px 16px', position: 'relative', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: 'linear-gradient(145deg, #26200e, #1a1608)',
              border: '1px solid rgba(212,160,23,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 22px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.16)',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20, fontWeight: 700,
                background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>C</span>
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              color: '#ede8de', fontWeight: 700,
              fontSize: 15.5, lineHeight: 1.2, letterSpacing: '-0.01em',
            }}>ContriTrack</div>
            <div style={{
              color: '#52527a', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2,
            }}>Savings Circle</div>
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 16, right: 16, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.16), transparent)',
        }} />
      </div>

      {/* Nav */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          padding: '2px 8px 4px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            <NavSection label={group.label} />
            {group.items.map(item => (
              <NavItem
                key={item.id}
                item={item}
                active={isActive(item.path)}
                locked={item.requires ? !canAccess(user, item.requires) : false}
                onNavigate={onNavigate}
              />
            ))}
            {gi < NAV_GROUPS.length - 1 && (
              <div style={{
                margin: '4px 8px 0',
                height: 1,
                background: 'rgba(255,255,255,0.06)',
              }} />
            )}
          </div>
        ))}

        {/* Admin item */}
        {user?.role === 'admin' && (
          <>
            <div style={{ margin: '4px 8px 0', height: 1, background: 'rgba(255,255,255,0.03)' }} />
            <NavSection label="System" />
            <NavItem
              item={{ ...ADMIN_ITEM, badge: pendingCount || null }}
              active={isActive(ADMIN_ITEM.path)}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      {/* Divider */}
      <div style={{
        margin: '0 16px', height: 1, flexShrink: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
      }} />

      {/* User card */}
      <div style={{ padding: '12px 10px 18px', flexShrink: 0 }}>
        <div style={{
          borderRadius: 12,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.055)',
          padding: '11px 12px',
        }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #4338ca, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11.5, fontWeight: 700, flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(99,102,241,0.22)',
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#c8c4d8', fontSize: 12.5, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {user?.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 4px rgba(34,197,94,0.6)',
                }} />
                <span style={{ color: '#7070a0', fontSize: 10, fontWeight: 500 }}>
                  {user?.role === 'admin' ? 'Admin' : 'Member'}
                </span>
                <span style={{
                  padding: '1px 6px', borderRadius: 4,
                  background: planBadge.bg,
                  color: planBadge.color,
                  fontSize: 8.5, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {planBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 12px',
              borderRadius: 8, width: '100%',
              border: `1px solid ${logoutHovered ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.06)'}`,
              background: logoutHovered ? 'rgba(225,29,72,0.09)' : 'rgba(255,255,255,0.03)',
              color: logoutHovered ? '#f87171' : '#7070a0',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.16s ease',
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
