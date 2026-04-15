import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import { useGroup } from '../context/GroupContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const STATUS_RING = {
  verified: '#10b981',
  pending:  '#f59e0b',
  rejected: '#f43f5e',
  unpaid:   '#d0cce0',
};

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'],
  ['#059669','#0d9488'],
  ['#d97706','#b45309'],
  ['#e11d48','#be123c'],
  ['#0ea5e9','#0284c7'],
];

function getAvatarGradient(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}

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
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
      className={hasProof ? 'card-hover' : ''}
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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
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

      <div style={{
        fontSize: 13.5, fontWeight: 700,
        color: 'var(--ct-text-1)',
        marginBottom: 5, letterSpacing: '-0.01em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {m.name}
      </div>

      {m.contribution ? (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13.5, fontWeight: 600,
          color: 'var(--ct-emerald)',
          marginBottom: 10,
        }}>
          ₦{m.contribution.amount.toLocaleString()}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ct-text-4)', marginBottom: 10 }}>—</div>
      )}

      <StatusBadge status={status} />

      {hasProof && (
        <button
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');
  const { activeGroup } = useGroup();

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
      const { data } = await api.get(`/members?month=${month}&year=${year}${groupParam}`);
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [month, year, activeGroup]);

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
      proofUrl: `/uploads/${m.contribution.proofImage}`,
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

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Page header row */}
      <div style={{
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

        <MonthNav
          month={month} year={year}
          onPrev={prevMonth} onNext={nextMonth}
          isCurrentMonth={month === now.getMonth() + 1 && year === now.getFullYear()}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 120, borderRadius: 'var(--ct-radius)', background: '#f0ede6', animation: 'shimmer 1.4s ease infinite', backgroundSize: '400px 100%', backgroundImage: 'linear-gradient(90deg, #f0ede6 0%, #e8e5de 50%, #f0ede6 100%)' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{error}</div>
          <button onClick={fetchMembers} style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14, marginBottom: 18 }}>
            {statCards.map(card => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* Progress card */}
          <div style={{
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
            {filteredMembers.map((m, idx) => (
              <div key={m._id} className="animate-fade-up" style={{ animationDelay: `${idx * 0.035}s` }}>
                <MemberCard m={m} onView={openModal} />
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div style={{
                gridColumn: '1/-1', textAlign: 'center',
                color: 'var(--ct-text-3)', padding: '60px 0', fontSize: 14,
              }}>
                No members match this filter.
              </div>
            )}
          </div>
        </>
      )}

      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
