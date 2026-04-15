import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { downloadCsv } from '../utils/exportDownload';

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'],
  ['#059669','#0d9488'],
  ['#d97706','#b45309'],
  ['#e11d48','#be123c'],
  ['#0ea5e9','#0284c7'],
  ['#d4a017','#b8891a'],
];

function getAvatarGradient(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}

const STATUS_CONFIG = {
  verified: { color: '#047857', bg: 'rgba(5,150,105,0.10)',  border: 'rgba(5,150,105,0.22)',  label: 'Verified',  dot: '#10b981' },
  pending:  { color: '#92650a', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.22)',  label: 'Pending',   dot: '#f59e0b' },
  rejected: { color: '#be123c', bg: 'rgba(225,29,72,0.10)',  border: 'rgba(225,29,72,0.22)',  label: 'Rejected',  dot: '#f43f5e' },
  unpaid:   { color: '#5a5a80', bg: 'rgba(100,100,140,0.07)', border: 'rgba(100,100,140,0.15)', label: 'Not Paid', dot: '#8888a8' },
};

const GRADE_COLORS = {
  'A+': '#4ade80', 'A': '#86efac', 'B': '#a3e635',
  'C': '#facc15', 'D': '#fb923c', 'F': '#f87171',
};

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 600,
      background: sc.bg, color: sc.color,
      border: `1.5px solid ${sc.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, boxShadow: `0 0 4px ${sc.dot}80` }} />
      {sc.label}
    </span>
  );
}

export default function MembersPage() {
  const now = new Date();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab]         = useState('members');
  const [trustScores, setTrustScores] = useState([]);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustLocked, setTrustLocked] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
    api.get(`/members?month=${month}&year=${year}${groupParam}`)
      .then(({ data }) => setMembers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeGroup]);

  useEffect(() => {
    if (tab !== 'trust' || !activeGroup) return;
    setTrustLoading(true);
    setTrustLocked(false);
    api.get(`/exports/trust-scores?groupId=${activeGroup._id}`)
      .then(({ data }) => setTrustScores(data))
      .catch(err => {
        if (err.response?.status === 403) setTrustLocked(true);
      })
      .finally(() => setTrustLoading(false));
  }, [tab, activeGroup]);

  const verified = members.filter(m => m.contribution?.status === 'verified').length;
  const pending  = members.filter(m => m.contribution?.status === 'pending').length;
  const unpaid   = members.filter(m => !m.paid).length;

  const filtered = members.filter(m => {
    const status = m.paid ? (m.contribution?.status || 'pending') : 'unpaid';
    const matchSearch = !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Tabs */}
      {activeGroup && (
        <div style={{ marginBottom: 20 }}>
          <div className="ct-tabs">
            {[
              { key: 'members', label: 'Members' },
              { key: 'trust',   label: 'Trust Scores' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`ct-tab${tab === t.key ? ' active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Trust Scores Tab ─── */}
      {tab === 'trust' && (
        <div>
          {!activeGroup && (
            <div className="ct-empty">
              <p style={{ fontSize: 13.5 }}>Select a circle to view trust scores.</p>
            </div>
          )}
          {trustLocked && (
            <div style={{
              background: '#fff', borderRadius: 'var(--ct-radius)', padding: '48px 24px',
              boxShadow: 'var(--ct-shadow)', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(212,160,23,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 24,
              }}>🔒</div>
              <p style={{ fontSize: 14, color: 'var(--ct-text-2)', marginBottom: 20 }}>
                Trust scores require the <strong>Coordinator</strong> plan.
              </p>
              <a href="/subscription" style={{
                padding: '10px 24px', borderRadius: 10,
                background: 'var(--ct-gold)', color: '#0f0e0a',
                fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
                display: 'inline-block',
              }}>
                Upgrade Plan
              </a>
            </div>
          )}
          {trustLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height: 72, borderRadius: 'var(--ct-radius)', background: 'linear-gradient(90deg, #f0ede6 0%, #e8e5de 50%, #f0ede6 100%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease infinite' }} />
              ))}
            </div>
          )}
          {!trustLoading && !trustLocked && trustScores.length > 0 && (
            <div>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button
                  onClick={async () => {
                    if (!activeGroup || exporting) return;
                    setExporting(true);
                    try {
                      await downloadCsv(
                        `/api/exports/members?groupId=${activeGroup._id}&includeScore=true`,
                        `${activeGroup.name.replace(/\s+/g,'_')}_TrustScores.csv`
                      );
                    } catch (err) {
                      showToast(err.message || 'Export failed', 'error');
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 9,
                    background: 'rgba(79,70,229,0.08)',
                    border: '1.5px solid rgba(79,70,229,0.18)',
                    color: '#6366f1', fontSize: 12.5, fontWeight: 600,
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.16s ease',
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
              </div>

              {/* Trust score table */}
              <div className="ct-table-wrap">
                <table className="ct-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Member</th>
                      <th>Record</th>
                      <th>Score</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trustScores.map((m, idx) => (
                      <tr key={m._id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ct-text-4)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: getAvatarGradient(m.name),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {getInitials(m.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)' }}>{m.name}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>Streak: {m.consecutiveStreak} months</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12.5, color: 'var(--ct-text-2)' }}>
                            {m.verifiedCount}/{m.totalMonths} paid
                            {m.penaltyCount > 0 && (
                              <span style={{ color: 'var(--ct-rose)', marginLeft: 8, fontWeight: 600 }}>
                                · {m.penaltyCount} penalty
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{
                              height: '100%', width: `${m.score}%`,
                              background: GRADE_COLORS[m.grade] || '#a8a8c0',
                              borderRadius: 3, transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)' }}>{m.score}/100 — {m.gradeLabel}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 9,
                            background: `${GRADE_COLORS[m.grade] || '#a8a8c0'}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto',
                          }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                              color: GRADE_COLORS[m.grade] || '#a8a8c0',
                            }}>
                              {m.grade}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Members Tab ─── */}
      {tab === 'members' && (
        <>
          {/* Toolbar */}
          {!loading && members.length > 0 && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'center',
              marginBottom: 16, flexWrap: 'wrap',
            }}>
              {/* Search */}
              <div className="ct-search" style={{ maxWidth: 320 }}>
                <svg className="ct-search-icon" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ct-text-3)', padding: 4, fontSize: 16, lineHeight: 1,
                    }}
                  >×</button>
                )}
              </div>

              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'all',      label: `All (${members.length})` },
                  { key: 'verified', label: `Verified (${verified})` },
                  { key: 'pending',  label: `Pending (${pending})` },
                  { key: 'unpaid',   label: `Unpaid (${unpaid})` },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`filter-pill${statusFilter === f.key ? ' active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height: 68, borderRadius: 'var(--ct-radius)', background: 'linear-gradient(90deg, #f0ede6 0%, #e8e5de 50%, #f0ede6 100%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease infinite', animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : (
            <>
              {/* Summary strip */}
              {members.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 24,
                  background: '#fff', borderRadius: 'var(--ct-radius-sm)',
                  padding: '12px 18px', marginBottom: 10,
                  boxShadow: 'var(--ct-shadow)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ct-text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ct-text-1)' }}>{members.length}</span>
                    <span style={{ marginLeft: 4 }}>members</span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, color: 'var(--ct-text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ct-emerald)' }}>{verified}</span>
                    <span style={{ marginLeft: 4 }}>paid this month</span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, color: 'var(--ct-text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ct-amber)' }}>{pending}</span>
                    <span style={{ marginLeft: 4 }}>pending review</span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, color: 'var(--ct-text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ct-rose)' }}>{unpaid}</span>
                    <span style={{ marginLeft: 4 }}>unpaid</span>
                  </div>
                </div>
              )}

              {/* Table */}
              {filtered.length === 0 ? (
                <div className="ct-empty">
                  {search
                    ? <p>No members match "<strong>{search}</strong>"</p>
                    : <p>No members found.</p>
                  }
                </div>
              ) : (
                <div className="ct-table-wrap">
                  <table className="ct-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Member</th>
                        <th className="hidden sm:table-cell">Email Address</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th className="hidden md:table-cell">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m, idx) => {
                        const status = m.paid ? (m.contribution?.status || 'pending') : 'unpaid';
                        return (
                          <tr key={m._id} className="animate-fade-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                            {/* Rank */}
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ct-text-4)' }}>
                              {String(idx + 1).padStart(2, '0')}
                            </td>

                            {/* Member */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <div style={{
                                  width: 38, height: 38, borderRadius: 11,
                                  background: getAvatarGradient(m.name),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 12.5, fontWeight: 700, color: '#fff', flexShrink: 0,
                                }}>
                                  {getInitials(m.name)}
                                </div>
                                <span style={{
                                  fontSize: 13.5, fontWeight: 700,
                                  color: 'var(--ct-text-1)',
                                  letterSpacing: '-0.01em',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {m.name}
                                </span>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="hidden sm:table-cell" style={{ color: 'var(--ct-text-3)', fontSize: 13 }}>
                              {m.email}
                            </td>

                            {/* Status */}
                            <td>
                              <StatusPill status={status} />
                            </td>

                            {/* Amount */}
                            <td style={{ textAlign: 'right' }}>
                              {m.contribution ? (
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 14, fontWeight: 600,
                                  color: 'var(--ct-emerald)',
                                }}>
                                  ₦{m.contribution.amount.toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--ct-text-4)', fontSize: 14 }}>—</span>
                              )}
                            </td>

                            {/* Role */}
                            <td className="hidden md:table-cell">
                              {m.role === 'admin' ? (
                                <span style={{
                                  padding: '3px 9px', borderRadius: 6,
                                  background: 'rgba(212,160,23,0.10)',
                                  border: '1px solid rgba(212,160,23,0.20)',
                                  color: '#a07010', fontSize: 10.5, fontWeight: 700,
                                  letterSpacing: '0.04em', textTransform: 'uppercase',
                                }}>
                                  Admin
                                </span>
                              ) : (
                                <span style={{ fontSize: 12.5, color: 'var(--ct-text-4)' }}>Member</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
