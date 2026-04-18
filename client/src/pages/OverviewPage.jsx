import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/planUtils';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const avatarGradients = [
  'linear-gradient(135deg,#4338ca,#7c3aed)',
  'linear-gradient(135deg,#0369a1,#0891b2)',
  'linear-gradient(135deg,#15803d,#4ade80)',
  'linear-gradient(135deg,#b45309,#f59e0b)',
  'linear-gradient(135deg,#9d174d,#ec4899)',
];
const avatarGrad = (name = '') => avatarGradients[name.charCodeAt(0) % 5];
const initials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// ─── Group Card ───────────────────────────────────────────────────────────────
function GroupCard({ group, month, year, onSelect }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    api.get(`/reports/monthly?groupId=${group._id}&month=${month}&year=${year}`)
      .then(({ data }) => setStats(data.summary))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group._id, month, year]);

  const progress = stats?.progressPct || 0;

  return (
    <div
      onClick={() => onSelect(group)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 'var(--ct-radius)',
        padding: '22px 24px',
        cursor: 'pointer',
        border: `1.5px solid ${hovered ? 'rgba(212,160,23,0.30)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: hovered
          ? '0 8px 28px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)'
          : 'var(--ct-shadow)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Subtle gold top accent on hover */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light))',
        opacity: hovered ? 0.7 : 0,
        transition: 'opacity 0.2s ease',
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: avatarGrad(group.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {initials(group.name)}
          </div>
          <div>
            <h3 style={{
              margin: 0, fontSize: 15.5, fontWeight: 700,
              color: 'var(--ct-text-1)', lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}>
              {group.name}
            </h3>
            <p style={{
              margin: '3px 0 0', fontSize: 12,
              color: 'var(--ct-text-3)',
            }}>
              {group.members?.length || 0} members
            </p>
          </div>
        </div>

        <div style={{
          padding: '5px 11px', borderRadius: 20,
          background: 'rgba(212,160,23,0.10)',
          border: '1.5px solid rgba(212,160,23,0.22)',
          fontSize: 12, fontWeight: 700, color: '#a07010',
          fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
        }}>
          ₦{(group.contributionAmount || 0).toLocaleString()}/mo
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[80, 60, 40].map((w, i) => (
            <div key={i} style={{
              height: 40, width: w, borderRadius: 8,
              background: 'linear-gradient(90deg, #f0ede6 0%, #e8e5de 50%, #f0ede6 100%)',
              backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease infinite',
            }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Metric pills */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 80,
              background: 'rgba(5,150,105,0.07)',
              border: '1px solid rgba(5,150,105,0.15)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: '#059669', lineHeight: 1 }}>
                ₦{stats.collected.toLocaleString()}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                collected
              </div>
            </div>
            <div style={{
              flex: 1, minWidth: 70,
              background: 'rgba(79,70,229,0.07)',
              border: '1px solid rgba(79,70,229,0.14)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: 'var(--ct-indigo)', lineHeight: 1 }}>
                {stats.verifiedCount}/{stats.totalMembers}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                verified
              </div>
            </div>
            {stats.unpaidCount > 0 && (
              <div style={{
                flex: 1, minWidth: 50,
                background: 'rgba(225,29,72,0.07)',
                border: '1px solid rgba(225,29,72,0.14)',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: 'var(--ct-rose)', lineHeight: 1 }}>
                  {stats.unpaidCount}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  unpaid
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div style={{
              height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4,
              overflow: 'hidden', marginBottom: 6,
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                borderRadius: 4,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #059669, #34d399)'
                  : 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light))',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, color: 'var(--ct-text-3)', fontWeight: 600 }}>
                {progress}% collected
              </span>
              <span style={{ fontSize: 11, color: 'var(--ct-text-4)' }}>
                Expected ₦{stats.expected.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div style={{
          fontSize: 12.5, color: 'var(--ct-text-3)', textAlign: 'center',
          padding: '12px 0',
          background: 'rgba(0,0,0,0.03)', borderRadius: 8,
        }}>
          Upgrade to Pro to see circle stats
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 16, paddingTop: 14,
        borderTop: '1px solid rgba(0,0,0,0.055)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--ct-text-4)' }}>
          Click to select circle
        </span>
        <span style={{
          fontSize: 12, color: 'var(--ct-gold)', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Select
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { groups, selectGroup } = useGroup();
  const { user } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const isFreePlan = !canAccess(user, 'pro');

  if (groups.length === 0) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(212,160,23,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 32,
        }}>
          🏦
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--ct-text-1)', marginBottom: 10,
          fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
        }}>
          No circles yet
        </h2>
        <p style={{ color: 'var(--ct-text-3)', marginBottom: 28, lineHeight: 1.7, fontSize: 14 }}>
          Create or join a savings circle to see your multi-group overview.
        </p>
        <Link to="/groups" className="btn-gold" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Go to My Circles
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14, marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26, fontWeight: 700, color: 'var(--ct-text-1)',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            Multi-Circle Overview
          </h1>
          <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5, margin: '4px 0 0' }}>
            {groups.length} circle{groups.length > 1 ? 's' : ''} · click a card to set as active
          </p>
        </div>

        {/* Month navigator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#fff',
          border: '1.5px solid rgba(0,0,0,0.07)',
          borderRadius: 11, padding: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
            style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ct-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
            color: 'var(--ct-text-1)', minWidth: 130, textAlign: 'center', padding: '0 6px',
          }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
            style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ct-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Aggregate stats strip */}
      <div style={{
        display: 'flex', gap: 0,
        background: '#fff',
        borderRadius: 'var(--ct-radius)',
        border: '1.5px solid rgba(212,160,23,0.18)',
        boxShadow: 'var(--ct-shadow)',
        marginBottom: 24,
        overflow: 'hidden',
      }}>
        {[
          {
            label: 'Total Circles',
            value: groups.length,
            color: 'var(--ct-gold)',
            icon: (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            ),
          },
          {
            label: 'Total Members',
            value: groups.reduce((s, g) => s + (g.members?.length || 0), 0),
            color: 'var(--ct-indigo)',
            icon: (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            ),
          },
          {
            label: 'Viewing Period',
            value: `${MONTHS[month - 1]} ${year}`,
            color: 'var(--ct-emerald)',
            isText: true,
            icon: (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ),
          },
        ].map((stat, idx, arr) => (
          <div key={stat.label} style={{
            flex: 1, padding: '18px 22px',
            borderRight: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.color,
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{
                fontFamily: stat.isText ? 'var(--font-display)' : 'var(--font-mono)',
                fontSize: stat.isText ? 16 : 22, fontWeight: 700,
                color: stat.color, lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ct-text-3)', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade banner */}
      {isFreePlan && (
        <div style={{
          background: 'rgba(212,160,23,0.07)',
          border: '1.5px solid rgba(212,160,23,0.22)',
          borderRadius: 'var(--ct-radius)', padding: '14px 20px',
          marginBottom: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(212,160,23,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              🔒
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 2 }}>
                Per-circle stats require a Pro or Coordinator plan
              </div>
              <div style={{ fontSize: 12, color: 'var(--ct-text-3)' }}>
                Upgrade to see collected amounts and progress for each circle.
              </div>
            </div>
          </div>
          <Link to="/subscription" className="btn-gold" style={{ textDecoration: 'none', display: 'inline-flex', fontSize: 12.5, padding: '8px 18px' }}>
            Upgrade now
          </Link>
        </div>
      )}

      {/* Group cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
        {groups.map((group, idx) => (
          <div key={group._id} className="animate-fade-up" style={{ animationDelay: `${idx * 0.07}s` }}>
            <GroupCard
              group={group}
              month={month}
              year={year}
              onSelect={selectGroup}
            />
          </div>
        ))}
      </div>

      {isFreePlan && (
        <p style={{ marginTop: 28, fontSize: 12, color: 'var(--ct-text-4)', textAlign: 'center' }}>
          Circle stats require Pro or Coordinator plan.
          <Link to="/subscription" style={{ color: 'var(--ct-gold)', marginLeft: 6, textDecoration: 'none', fontWeight: 600 }}>
            Upgrade →
          </Link>
        </p>
      )}
    </div>
  );
}
