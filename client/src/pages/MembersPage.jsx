import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { downloadCsv } from '../utils/exportDownload';
import Skeleton from '../components/Skeleton';
import useDocumentTitle from '../utils/useDocumentTitle';

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
  useDocumentTitle('Members — ContriTrack');
  const now = new Date();
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab]         = useState('members');
  const [exporting, setExporting] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState(null); // { member, newRole }
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const qMonth = now.getMonth() + 1;
  const qYear  = now.getFullYear();
  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['members', activeGroup?._id, qMonth, qYear],
    queryFn: () => {
      const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
      return api.get(`/members?month=${qMonth}&year=${qYear}${groupParam}`).then(r => r.data);
    },
  });

  const { data: trustScores = [], isLoading: trustLoading, isError: trustError, error: trustErr } = useQuery({
    queryKey: ['trust-scores', activeGroup?._id],
    queryFn: () => api.get(`/exports/trust-scores?groupId=${activeGroup._id}`).then(r => r.data),
    enabled: tab === 'trust' && !!activeGroup,
    retry: (count, err) => err?.response?.status !== 403 && count < 1,
  });
  const trustLocked = trustError && trustErr?.response?.status === 403;

  // Am I a group admin?
  const isGroupAdmin = members.some(m => m._id === user?._id && m.role === 'admin');

  const roleMutation = useMutation({
    mutationFn: ({ memberId, newRole }) =>
      api.patch(`/groups/${activeGroup._id}/members/${memberId}/role`, { role: newRole }),
    onSuccess: (_, { newRole }) => {
      queryClient.invalidateQueries({ queryKey: ['members', activeGroup?._id] });
      showToast(
        newRole === 'admin'
          ? `${roleConfirm.member.name} is now an admin`
          : `${roleConfirm.member.name} is now a member`,
        'success'
      );
      setRoleConfirm(null);
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to update role', 'error'),
  });
  const handleRoleChange = () => {
    if (!roleConfirm || !activeGroup) return;
    roleMutation.mutate({ memberId: roleConfirm.member._id, newRole: roleConfirm.newRole });
  };
  const roleChanging = roleMutation.isPending;

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

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Skeleton width={44} height={44} borderRadius={22} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={13} width={140} style={{ marginBottom: 8 }} />
                    <Skeleton height={10} width={100} />
                  </div>
                  <Skeleton height={24} width={70} borderRadius={12} />
                </div>
              ))}
            </div>
          )}
          {!loading && (
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
                        {isGroupAdmin && <th style={{ width: 48 }} />}
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

                            {/* Role action (admins only, can't change own role) */}
                            {isGroupAdmin && (
                              <td>
                                {m._id !== user?._id && (
                                  <button
                                    onClick={() => setRoleConfirm({
                                      member: m,
                                      newRole: m.role === 'admin' ? 'member' : 'admin',
                                    })}
                                    title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                                    style={{
                                      width: 30, height: 30, borderRadius: 8,
                                      border: '1.5px solid rgba(0,0,0,0.08)',
                                      background: '#faf9f6',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', color: 'var(--ct-text-3)',
                                      transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.borderColor = m.role === 'admin' ? 'rgba(225,29,72,0.3)' : 'rgba(212,160,23,0.4)';
                                      e.currentTarget.style.background = m.role === 'admin' ? 'rgba(225,29,72,0.06)' : 'rgba(212,160,23,0.08)';
                                      e.currentTarget.style.color = m.role === 'admin' ? 'var(--ct-rose)' : 'var(--ct-gold)';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                                      e.currentTarget.style.background = '#faf9f6';
                                      e.currentTarget.style.color = 'var(--ct-text-3)';
                                    }}
                                  >
                                    {m.role === 'admin' ? (
                                      /* shield-minus */
                                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <line x1="9" y1="12" x2="15" y2="12"/>
                                      </svg>
                                    ) : (
                                      /* shield-plus */
                                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <line x1="12" y1="9" x2="12" y2="15"/>
                                        <line x1="9" y1="12" x2="15" y2="12"/>
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </td>
                            )}
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

      {/* ─── Role Change Confirmation Modal ─── */}
      {roleConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(10,10,16,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => !roleChanging && setRoleConfirm(null)}
        >
          <div
            className="animate-fade-up"
            style={{
              background: '#fff', borderRadius: 18, padding: '32px 32px 28px',
              maxWidth: 380, width: '100%',
              boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: roleConfirm.newRole === 'admin'
                ? 'rgba(212,160,23,0.10)' : 'rgba(225,29,72,0.08)',
              color: roleConfirm.newRole === 'admin' ? 'var(--ct-gold)' : 'var(--ct-rose)',
            }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
              color: 'var(--ct-text-1)', textAlign: 'center', marginBottom: 10,
              letterSpacing: '-0.01em',
            }}>
              {roleConfirm.newRole === 'admin' ? 'Make Admin?' : 'Remove Admin?'}
            </h3>
            <p style={{
              fontSize: 13.5, color: 'var(--ct-text-3)', textAlign: 'center',
              lineHeight: 1.65, marginBottom: 26,
            }}>
              {roleConfirm.newRole === 'admin' ? (
                <><strong style={{ color: 'var(--ct-text-2)' }}>{roleConfirm.member.name}</strong> will be able to verify contributions, manage members, and edit this circle.</>
              ) : (
                <><strong style={{ color: 'var(--ct-text-2)' }}>{roleConfirm.member.name}</strong> will lose admin access and return to a regular member.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setRoleConfirm(null)}
                disabled={roleChanging}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,0.1)', background: '#faf9f6',
                  color: 'var(--ct-text-2)', fontSize: 13.5, fontWeight: 600,
                  cursor: roleChanging ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={roleChanging}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: roleConfirm.newRole === 'admin' ? 'var(--ct-gold)' : 'var(--ct-rose)',
                  color: roleConfirm.newRole === 'admin' ? '#0f0e0a' : '#fff',
                  fontSize: 13.5, fontWeight: 700,
                  cursor: roleChanging ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  opacity: roleChanging ? 0.7 : 1,
                }}
              >
                {roleChanging ? 'Saving…' : roleConfirm.newRole === 'admin' ? 'Make Admin' : 'Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
