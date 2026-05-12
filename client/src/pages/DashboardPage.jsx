import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import Skeleton from '../components/Skeleton';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { MONTHS, MONTHS_SHORT } from '../utils/dateUtils';
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';

const STATUS_RING = {
  verified: '#10b981',
  pending:  '#f59e0b',
  rejected: '#f43f5e',
  unpaid:   '#d0cce0',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, bg, icon, trend }) {
  return (
    <div className="ct-stat-card" style={{ background: '#fff' }}>
      {/* Top colored accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: '14px 14px 0 0',
        opacity: 0.7,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)',
          textTransform: 'uppercase', letterSpacing: '0.09em',
        }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28, fontWeight: 700,
        color: 'var(--ct-text-1)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        marginBottom: 7,
      }}>
        {value}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>{sub}</div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700,
            color: trend >= 0 ? '#059669' : '#e11d48',
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              {trend >= 0
                ? <path d="M18 15l-6-6-6 6"/>
                : <path d="M6 9l6 6 6-6"/>}
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Month Navigator ──────────────────────────────────────────────────────────
function MonthNav({ month, year, onPrev, onNext, isCurrentMonth }) {

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: '#fff',
      border: '1.5px solid rgba(0,0,0,0.07)',
      borderRadius: 11,
      padding: 4,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <button
        onClick={onPrev}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--ct-text-3)',
          transition: 'all 0.14s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0 10px',
        minWidth: 140, justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15, fontWeight: 700,
          color: 'var(--ct-text-1)',
          letterSpacing: '-0.01em',
        }}>
          {MONTHS[month - 1]} {year}
        </span>
        {isCurrentMonth && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            background: 'rgba(212,160,23,0.12)',
            color: '#a07010',
            padding: '2px 8px', borderRadius: 10,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            border: '1px solid rgba(212,160,23,0.22)',
          }}>
            Now
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--ct-text-3)',
          transition: 'all 0.14s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ m, onView }) {
  const status = m.paid ? (m.contribution?.status || 'pending') : 'unpaid';
  const hasProof = !!m.contribution?.proofImage;
  const ringColor = STATUS_RING[status] || STATUS_RING.unpaid;

  return (
    <div
      onClick={() => hasProof && onView(m)}
      className={`dash-member-card${hasProof ? ' card-hover' : ''}`}
      style={{
        background: '#fff',
        borderRadius: 'var(--ct-radius)',
        padding: '20px 16px',
        textAlign: 'center',
        cursor: hasProof ? 'pointer' : 'default',
        boxShadow: 'var(--ct-shadow)',
        position: 'relative',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      {/* Admin chip */}
      {m.role === 'admin' && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '2px 7px', borderRadius: 6,
          background: 'rgba(212,160,23,0.10)',
          border: '1px solid rgba(212,160,23,0.20)',
          color: '#a07010', fontSize: 8.5, fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          ADMIN
        </div>
      )}

      {/* Avatar with status ring */}
      <div className="dm-avatar-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: getAvatarGradient(m.name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
          boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${ringColor}`,
          transition: 'box-shadow 0.3s ease',
        }}>
          {getInitials(m.name)}
        </div>
      </div>

      <div className="dm-name" style={{
        fontSize: 13.5, fontWeight: 700,
        color: 'var(--ct-text-1)',
        marginBottom: 5, letterSpacing: '-0.01em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {m.name}
      </div>

      {m.contribution ? (
        <div className="dm-amount" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13.5, fontWeight: 600,
          color: 'var(--ct-emerald)',
          marginBottom: 10,
        }}>
          ₦{m.contribution.amount.toLocaleString()}
        </div>
      ) : (
        <div className="dm-amount" style={{ fontSize: 13, color: 'var(--ct-text-4)', marginBottom: 10 }}>—</div>
      )}

      <div className="dm-status">
        <StatusBadge status={status} />
      </div>

      {hasProof && (
        <button
          className="dm-proof-btn"
          onClick={e => { e.stopPropagation(); onView(m); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 12, padding: '6px 12px',
            borderRadius: 8,
            border: '1.5px solid rgba(0,0,0,0.08)',
            background: '#faf9f6',
            color: 'var(--ct-text-2)',
            fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
            width: '100%', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'; e.currentTarget.style.background = '#f5f3ee'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.background = '#faf9f6'; }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z"/>
          </svg>
          View Proof
        </button>
      )}
    </div>
  );
}

// ─── No Groups Empty State ─────────────────────────────────────────────────────
function NoGroupsState({ userName, navigate }) {
  const steps = [
    {
      n: '01', color: 'var(--ct-gold)', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.2)',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      ),
      title: 'Create a Circle',
      body: 'Set up your Ajo, Esusu, or contribution group with a name and monthly target.',
    },
    {
      n: '02', color: 'var(--ct-indigo)', bg: 'rgba(79,70,229,0.08)', border: 'rgba(79,70,229,0.2)',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      ),
      title: 'Invite Members',
      body: 'Share your unique invite code — members join in seconds from any device.',
    },
    {
      n: '03', color: 'var(--ct-emerald)', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)',
      icon: (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      title: 'Track Contributions',
      body: 'Members upload payment proof. You verify, penalise late payers, and manage payouts.',
    },
  ];

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Welcome header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ct-sidebar) 0%, #12121e 100%)',
        borderRadius: 20, padding: 'clamp(24px, 5vw, 48px) clamp(20px, 5vw, 48px)', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '30%', width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ct-gold)' }} />
            <span style={{ fontSize: 12, color: 'var(--ct-gold)', fontWeight: 700, letterSpacing: '0.05em' }}>
              GETTING STARTED
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800,
            color: '#f5f2ec', letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.2,
          }}>
            Welcome, {firstName}! 👋
          </h1>
          <p style={{ fontSize: 15, color: '#7a7a96', lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
            Your dashboard is ready — you just need a circle. Create one in under a minute
            and start tracking contributions with full transparency.
          </p>

          <button
            onClick={() => navigate('/groups?action=create')}
            className="btn-gold btn-gold-pulse"
            style={{ padding: '13px 28px', fontSize: 14.5 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Create Your First Circle
            </span>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={i} className="animate-fade-up" style={{
              background: '#fff', borderRadius: 16, padding: '22px 24px',
              border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--ct-shadow)',
              animationDelay: `${i * 0.08}s`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: s.bg, border: `1px solid ${s.border}`,
                  color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  color: s.color, letterSpacing: '0.06em',
                }}>STEP {s.n}</span>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 7, letterSpacing: '-0.01em' }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ct-text-3)', lineHeight: 1.65 }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview stats (greyed out teaser) */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Your dashboard will show
        </div>
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
          {[
            { label: 'Total Collected', value: '₦—', color: 'var(--ct-emerald)', bg: 'rgba(5,150,105,0.08)' },
            { label: 'Pending Review', value: '—', color: 'var(--ct-amber)', bg: 'rgba(217,119,6,0.08)' },
            { label: 'Outstanding', value: '—', color: 'var(--ct-rose)', bg: 'rgba(225,29,72,0.08)' },
            { label: 'Total Members', value: '—', color: 'var(--ct-indigo)', bg: 'rgba(79,70,229,0.08)' },
          ].map(c => (
            <div key={c.label} className="ct-stat-card" style={{ background: '#fff' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color, borderRadius: '14px 14px 0 0', opacity: 0.5 }} />
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 16 }}>{c.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.03em' }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── No Members Empty State ────────────────────────────────────────────────────
function NoMembersState({ groupName, navigate }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: '#fff', borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: 'var(--ct-shadow)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        color: 'var(--ct-gold)',
      }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
        color: 'var(--ct-text-1)', letterSpacing: '-0.01em', marginBottom: 8,
      }}>
        No contributions this month
      </h3>
      <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
        {groupName
          ? <><strong style={{ color: 'var(--ct-text-2)' }}>{groupName}</strong> has no submissions for this month yet. Share the invite code so members can start uploading proof.</>
          : 'No submissions for this month yet. Share the invite code so members can start uploading proof.'
        }
      </p>
      <button
        onClick={() => navigate('/members')}
        style={{
          padding: '10px 22px', borderRadius: 10,
          border: '1.5px solid rgba(0,0,0,0.1)',
          background: '#faf9f6', color: 'var(--ct-text-2)',
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.background = '#f5f3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.background = '#faf9f6'; }}
      >
        View Members
      </button>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  useDocumentTitle('Dashboard — ROTARA');
  const now = new Date();
  const navigate = useNavigate();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');
  const { activeGroup, groups, loadingGroups } = useGroup();
  const { user } = useAuth();

  const { data: members = [], isLoading: loading, isError, error: fetchError, refetch } = useQuery({
    queryKey: ['members', activeGroup?._id, month, year],
    queryFn: () =>
      api.get(`/members?month=${month}&year=${year}&groupId=${activeGroup._id}`)
         .then(r => r.data),
    enabled: !!activeGroup && !loadingGroups,
  });

  const error = isError ? (fetchError?.response?.data?.message || 'Failed to load members.') : '';

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const verified    = members.filter(m => m.contribution?.status === 'verified');
  const pending     = members.filter(m => m.contribution?.status === 'pending');
  const outstanding = members.filter(m => !m.paid);
  const collected   = verified.reduce((sum, m) => sum + (m.contribution?.amount || 0), 0);
  const progress    = members.length ? Math.round((verified.length / members.length) * 100) : 0;
  const pendingPct  = members.length ? Math.round((pending.length  / members.length) * 100) : 0;
  const verifiedPct = members.length ? Math.round((verified.length / members.length) * 100) : 0;

  const openModal = (m) => {
    if (!m.contribution?.proofImage) return;
    setModal({
      proofUrl: m.contribution.proofImage,
      memberName: m.name,
      month, year,
      submittedDate: m.contribution.createdAt,
      status: m.contribution.status,
    });
  };

  const filteredMembers = filter === 'all'
    ? members
    : filter === 'verified'
    ? members.filter(m => m.contribution?.status === 'verified')
    : filter === 'pending'
    ? members.filter(m => m.contribution?.status === 'pending')
    : members.filter(m => !m.paid);

  const statCards = [
    {
      label: 'Total Collected',
      value: `₦${collected.toLocaleString()}`,
      sub: `${verified.length} verified payments`,
      color: 'var(--ct-emerald)',
      bg: 'rgba(5,150,105,0.08)',
      icon: (
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          <path d="M15 9H9a1 1 0 000 2h6a1 1 0 010 2H9m3-6v1m0 8v1"/>
        </svg>
      ),
    },
    {
      label: 'Pending Review',
      value: pending.length,
      sub: 'Awaiting verification',
      color: 'var(--ct-amber)',
      bg: 'rgba(217,119,6,0.08)',
      icon: (
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      label: 'Outstanding',
      value: outstanding.length,
      sub: 'No submission yet',
      color: 'var(--ct-rose)',
      bg: 'rgba(225,29,72,0.08)',
      icon: (
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      label: 'Total Members',
      value: members.length,
      sub: 'In this circle',
      color: 'var(--ct-indigo)',
      bg: 'rgba(79,70,229,0.08)',
      icon: (
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z"/>
        </svg>
      ),
    },
  ];

  // No groups at all — show full onboarding
  if (!loadingGroups && groups.length === 0) {
    return <NoGroupsState userName={user?.name} navigate={navigate} />;
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Page header row */}
      <div className="dash-header-row" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, gap: 12, flexWrap: 'wrap',
      }}>
        {/* Active group banner */}
        {activeGroup ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 9,
            background: 'rgba(212,160,23,0.08)',
            border: '1.5px solid rgba(212,160,23,0.2)',
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#d4a017" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 12.5, color: 'var(--ct-text-2)', fontWeight: 500 }}>
              <strong style={{ color: 'var(--ct-text-1)', fontWeight: 700 }}>{activeGroup.name}</strong>
            </span>
          </div>
        ) : (
          <div />
        )}

        <div className="dash-month-nav-center">
          <MonthNav
            month={month} year={year}
            onPrev={prevMonth} onNext={nextMonth}
            isCurrentMonth={month === now.getMonth() + 1 && year === now.getFullYear()}
          />
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: 'var(--ct-shadow)', position: 'relative' }}>
              <Skeleton height={10} width={80} style={{ marginBottom: 16 }} />
              <Skeleton height={28} width={120} style={{ marginBottom: 8 }} />
              <Skeleton height={10} width={100} />
            </div>
          ))}
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{error}</div>
          <button onClick={() => refetch()} style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          {/* Stat cards */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, marginBottom: 18 }}>
            {statCards.map(card => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* Referral invite banner */}
          <div
            onClick={() => navigate('/profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 20px', borderRadius: 12,
              background: 'rgba(212,160,23,0.06)',
              border: '1px solid rgba(212,160,23,0.18)',
              cursor: 'pointer', marginBottom: 18,
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(212,160,23,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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

          {/* Progress card */}
          <div className="dash-progress-card" style={{
            background: '#fff',
            borderRadius: 'var(--ct-radius)',
            padding: '20px 24px',
            marginBottom: 24,
            boxShadow: 'var(--ct-shadow)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.01em' }}>
                  Collection Progress
                </div>
                <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>
                  {verified.length} verified · {pending.length} pending · {outstanding.length} unpaid
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 24, fontWeight: 700,
                  color: progress >= 80 ? 'var(--ct-emerald)' : progress >= 50 ? 'var(--ct-amber)' : 'var(--ct-rose)',
                  letterSpacing: '-0.02em',
                }}>
                  {progress}%
                </span>
                <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', marginTop: 1 }}>of target</div>
              </div>
            </div>

            {/* Stacked progress bar */}
            <div style={{ height: 10, borderRadius: 5, background: '#f0ede6', overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
              <div className="progress-bar" style={{
                height: '100%', width: `${verifiedPct}%`,
                background: 'linear-gradient(90deg, #059669, #34d399)',
                borderRadius: pendingPct === 0 ? 5 : '5px 0 0 5px',
                flexShrink: 0,
                transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
              {pendingPct > 0 && (
                <div style={{
                  height: '100%', width: `${pendingPct}%`,
                  background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                  borderRadius: verifiedPct === 0 ? '5px 0 0 5px' : 0,
                  flexShrink: 0,
                  transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {[
                { color: '#059669', label: `${verified.length} Verified` },
                ...(pending.length > 0 ? [{ color: '#d97706', label: `${pending.length} Pending` }] : []),
                ...(outstanding.length > 0 ? [{ color: '#c8c4d8', label: `${outstanding.length} Unpaid` }] : []),
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Members section */}
          <div className="ct-section-header">
            <h3 className="ct-section-title">Member Contributions</h3>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'all',      label: `All (${members.length})` },
                { key: 'verified', label: `Verified (${verified.length})` },
                { key: 'pending',  label: `Pending (${pending.length})` },
                { key: 'unpaid',   label: `Unpaid (${outstanding.length})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`filter-pill${filter === f.key ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Member grid */}
          {members.length === 0 ? (
            <NoMembersState groupName={activeGroup?.name} navigate={navigate} />
          ) : (
            <div className="dash-member-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              {filteredMembers.map((m, idx) => (
                <div key={m._id} className="animate-fade-up" style={{ animationDelay: `${idx * 0.035}s` }}>
                  <MemberCard m={m} onView={openModal} />
                </div>
              ))}

              {filteredMembers.length === 0 && members.length > 0 && (
                <div style={{
                  gridColumn: '1/-1', textAlign: 'center',
                  color: 'var(--ct-text-3)', padding: '60px 0', fontSize: 14,
                }}>
                  No members match this filter.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
