import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { downloadCsv } from '../utils/exportDownload';
import { canAccess } from '../utils/planUtils';

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

function StatCard({ label, value, sub, color = 'var(--ct-gold)' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#52526e', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11.5, color: '#52526e', marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

// Simple inline bar chart for yearly data
function YearlyChart({ months: monthlyData }) {
  if (!monthlyData) return null;
  const maxCollected = Math.max(...monthlyData.map(m => m.collected), 1);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '22px 24px',
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
        12-Month Collection Overview
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {monthlyData.map((m, i) => {
          const pct = m.collected / maxCollected;
          const now = new Date();
          const isCurrent = m.month === now.getMonth() + 1;
          return (
            <div
              key={i}
              title={`${MONTHS[m.month - 1]}: ₦${m.collected.toLocaleString()} collected / ₦${m.expected.toLocaleString()} expected`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              {/* Bar */}
              <div style={{ width: '100%', height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(pct * 100, m.collected > 0 ? 6 : 2)}%`,
                  borderRadius: '3px 3px 0 0',
                  background: isCurrent
                    ? 'linear-gradient(180deg, var(--ct-gold), rgba(212,160,23,0.5))'
                    : m.collected >= m.expected && m.expected > 0
                    ? 'rgba(34,197,94,0.55)'
                    : m.collected > 0
                    ? 'rgba(212,160,23,0.38)'
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: isCurrent ? '0 0 8px rgba(212,160,23,0.35)' : 'none',
                  transition: 'height 0.4s ease',
                }} />
              </div>
              {/* Month label */}
              <span style={{ fontSize: 9.5, color: isCurrent ? 'var(--ct-gold)' : '#3c3c52', fontWeight: isCurrent ? 700 : 500 }}>
                {MONTHS[m.month - 1].slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(34,197,94,0.55)', label: 'Fully collected' },
          { color: 'rgba(212,160,23,0.38)', label: 'Partial' },
          { color: 'rgba(255,255,255,0.05)', label: 'Nothing yet' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: '#52526e' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const planLocked = !canAccess(user, 'pro');
  const { showToast } = useToast();

  const now = new Date();
  const [tab, setTab] = useState('monthly'); // 'monthly' | 'yearly'
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());

  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [loading, setLoading] = useState(false);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // Reminder state
  const [reminding, setReminding] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportingMembers, setExportingMembers] = useState(false);

  const handleMembersExport = async () => {
    if (!activeGroup || exportingMembers) return;
    setExportingMembers(true);
    try {
      const fname = `${activeGroup.name.replace(/\s+/g, '_')}_Members.csv`;
      await downloadCsv(`/api/exports/members?groupId=${activeGroup._id}&includeScore=true`, fname);
    } catch (err) {
      showToast(err.message || 'Members export failed', 'error');
    } finally {
      setExportingMembers(false);
    }
  };

  const isCoordinator = canAccess(user, 'coordinator');

  const handleExport = async (type) => {
    if (!activeGroup || exporting) return;
    setExporting(true);
    try {
      if (type === 'monthly') {
        const fname = `${activeGroup.name.replace(/\s+/g,'_')}_${MONTHS[month-1]}_${year}.csv`;
        await downloadCsv(`/api/exports/monthly?groupId=${activeGroup._id}&month=${month}&year=${year}`, fname);
      } else {
        const fname = `${activeGroup.name.replace(/\s+/g,'_')}_${yearlyYear}_Yearly.csv`;
        await downloadCsv(`/api/exports/yearly?groupId=${activeGroup._id}&year=${yearlyYear}`, fname);
      }
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const isAdmin = (() => {
    if (!activeGroup || !user) return false;
    return activeGroup.members?.some(m =>
      (m.user?._id || m.user) === (user._id || user.id) && m.role === 'admin'
    );
  })();

  const fetchMonthly = useCallback(async () => {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/reports/monthly?groupId=${activeGroup._id}&month=${month}&year=${year}`
      );
      setMonthly(data);
    } catch (err) {
      // error handled silently; plan lock is computed synchronously
    } finally {
      setLoading(false);
    }
  }, [activeGroup, month, year]);

  const fetchYearly = useCallback(async () => {
    if (!activeGroup) return;
    setYearlyLoading(true);
    try {
      const { data } = await api.get(
        `/reports/yearly?groupId=${activeGroup._id}&year=${yearlyYear}`
      );
      setYearly(data);
    } catch (err) {
      // error handled silently; plan lock is computed synchronously
    } finally {
      setYearlyLoading(false);
    }
  }, [activeGroup, yearlyYear]);

  useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [fetchMonthly, tab]);
  useEffect(() => { if (tab === 'yearly') fetchYearly(); }, [fetchYearly, tab]);

  const sendReminders = async () => {
    if (!activeGroup) return;
    setReminding(true);
    try {
      const { data } = await api.post('/reports/remind', {
        groupId: activeGroup._id,
        month,
        year,
      });
      showToast(data.message, 'success');
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('WhatsApp reminders require the Pro or Coordinator plan. Upgrade to send reminders.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Failed to send reminders', 'error');
      }
    } finally {
      setReminding(false);
    }
  };

  // ── No circle guard ───────────────────────────────────────────────────────────
  if (!activeGroup) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: '#ede8de', marginBottom: 8 }}>
          No circle selected
        </h2>
        <p style={{ color: '#52526e', marginBottom: 24, lineHeight: 1.6 }}>
          Select a savings circle from My Circles to view its reports.
        </p>
        <Link to="/groups" style={{
          display: 'inline-block', padding: '10px 24px',
          background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
          color: '#1a1206', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
        }}>
          Go to My Circles
        </Link>
      </div>
    );
  }

  // ── Plan locked ───────────────────────────────────────────────────────────────
  if (planLocked) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: '#ede8de', marginBottom: 8 }}>
          Reports require Pro
        </h2>
        <p style={{ color: '#52526e', marginBottom: 24, lineHeight: 1.6 }}>
          Upgrade to the Pro or Coordinator plan to unlock monthly and yearly reports for your savings circles.
        </p>
        <Link to="/subscription" style={{
          display: 'inline-block', padding: '10px 24px',
          background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
          color: '#1a1206', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
        }}>
          Upgrade Plan
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#ede8de', margin: 0 }}>
            Reports
          </h1>
          <p style={{ color: '#52526e', fontSize: 13.5, margin: '4px 0 0' }}>
            {activeGroup.name} · Analytics &amp; collection overview
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, padding: 4,
        }}>
          {['monthly', 'yearly'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
              background: tab === t ? 'rgba(212,160,23,0.18)' : 'transparent',
              color: tab === t ? 'var(--ct-gold)' : '#52526e',
              transition: 'all 0.18s ease',
              textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════ MONTHLY TAB ══════════════════════════════ */}
      {tab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Month/year navigator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            background: 'rgba(255,255,255,0.028)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Prev month */}
              <button
                onClick={() => {
                  if (month === 1) { setMonth(12); setYear(y => y - 1); }
                  else setMonth(m => m - 1);
                }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a8a8c0' }}
              >
                ‹
              </button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: '#ede8de', minWidth: 160, textAlign: 'center' }}>
                {MONTHS[month - 1]} {year}
              </span>
              {/* Next month */}
              <button
                onClick={() => {
                  if (month === 12) { setMonth(1); setYear(y => y + 1); }
                  else setMonth(m => m + 1);
                }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a8a8c0' }}
              >
                ›
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={() => handleExport('monthly')}
              disabled={exporting || !monthly}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 9,
                background: 'rgba(79,70,229,0.10)',
                border: '1px solid rgba(79,70,229,0.22)',
                color: '#818cf8',
                fontSize: 12.5, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>

            {/* Members CSV — coordinator only */}
            <button
              onClick={isCoordinator ? handleMembersExport : undefined}
              disabled={!isCoordinator || exportingMembers}
              title={!isCoordinator ? 'Requires Coordinator plan' : 'Download member roster with trust scores'}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 9,
                background: isCoordinator ? 'rgba(79,70,229,0.10)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isCoordinator ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.07)'}`,
                color: isCoordinator ? '#818cf8' : '#38385a',
                fontSize: 12.5, fontWeight: 600,
                cursor: isCoordinator && !exportingMembers ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
              {exportingMembers ? 'Exporting…' : 'Members CSV'}
            </button>

            {/* Send reminders (admin only) */}
            {isAdmin && (
              <button
                onClick={sendReminders}
                disabled={reminding}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 9,
                  background: reminding ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.12)',
                  border: `1px solid ${reminding ? 'rgba(255,255,255,0.07)' : 'rgba(34,197,94,0.25)'}`,
                  color: reminding ? '#52526e' : '#4ade80',
                  fontSize: 12.5, fontWeight: 600, cursor: reminding ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease',
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.18 19.79 19.79 0 01.08 .47 2 2 0 012.08.47h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {reminding ? 'Sending…' : 'Send Reminders'}
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#52526e' }}>
              Loading report…
            </div>
          )}

          {monthly && !loading && (
            <>
              {/* Summary stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
                <StatCard
                  label="Expected"
                  value={`₦${monthly.summary.expected.toLocaleString()}`}
                  sub={`${monthly.summary.totalMembers} members`}
                />
                <StatCard
                  label="Collected"
                  value={`₦${monthly.summary.collected.toLocaleString()}`}
                  sub="verified contributions"
                  color="#4ade80"
                />
                <StatCard
                  label="Progress"
                  value={`${monthly.summary.progressPct}%`}
                  sub={`${monthly.summary.verifiedCount} / ${monthly.summary.totalMembers} verified`}
                  color={monthly.summary.progressPct >= 100 ? '#4ade80' : 'var(--ct-gold)'}
                />
                <StatCard
                  label="Pending"
                  value={monthly.summary.pendingCount}
                  sub="awaiting verification"
                  color="#f59e0b"
                />
                <StatCard
                  label="Unpaid"
                  value={monthly.summary.unpaidCount}
                  sub="no submission yet"
                  color={monthly.summary.unpaidCount > 0 ? 'var(--ct-rose)' : '#52526e'}
                />
                {monthly.summary.penaltyTotal > 0 && (
                  <StatCard
                    label="Penalties"
                    value={`₦${monthly.summary.penaltyTotal.toLocaleString()}`}
                    sub="this month"
                    color="var(--ct-rose)"
                  />
                )}
              </div>

              {/* Progress bar */}
              <div style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '18px 22px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#a8a8c0' }}>Collection Progress</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ct-gold)' }}>
                    {monthly.summary.progressPct}%
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(monthly.summary.progressPct, 100)}%`,
                    borderRadius: 4,
                    background: monthly.summary.progressPct >= 100
                      ? '#4ade80'
                      : 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light))',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Payout slot */}
              {monthly.payout && (
                <div style={{
                  background: 'rgba(212,160,23,0.06)',
                  border: '1px solid rgba(212,160,23,0.18)',
                  borderRadius: 14, padding: '16px 22px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#a8a8c0', fontSize: 12.5, fontWeight: 500 }}>Payout recipient this month: </span>
                    <span style={{ color: 'var(--ct-gold)', fontWeight: 700 }}>{monthly.payout.recipient?.name || '—'}</span>
                    <span style={{ color: '#52526e', fontSize: 12, marginLeft: 10 }}>
                      Status: <span style={{ color: monthly.payout.status === 'paid' ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
                        {monthly.payout.status}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Members table */}
              <div style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
                    Member Breakdown
                  </h3>
                </div>

                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px',
                  padding: '10px 22px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {['Member', 'Status', 'Amount', 'Penalties'].map(h => (
                    <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: '#3c3c52', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {monthly.members.map((m, i) => (
                  <div
                    key={m._id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px',
                      padding: '14px 22px', alignItems: 'center',
                      borderBottom: i < monthly.members.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      background: !m.paid ? 'rgba(225,29,72,0.03)' : 'transparent',
                    }}
                  >
                    {/* Member */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: avatarGrad(m.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#c8c4d8' }}>{m.name}</div>
                        {m.groupRole === 'admin' && (
                          <span style={{ fontSize: 9.5, color: '#c8960e', fontWeight: 700, letterSpacing: '0.06em' }}>ADMIN</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      {!m.paid ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-rose)', background: 'rgba(225,29,72,0.12)', padding: '3px 8px', borderRadius: 5 }}>Unpaid</span>
                      ) : m.contribution?.status === 'verified' ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', background: 'rgba(34,197,94,0.12)', padding: '3px 8px', borderRadius: 5 }}>Verified</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: 5 }}>Pending</span>
                      )}
                    </div>

                    {/* Amount */}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                      color: m.contribution ? '#c8c4d8' : '#3c3c52',
                    }}>
                      {m.contribution ? `₦${m.contribution.amount.toLocaleString()}` : '—'}
                    </span>

                    {/* Penalties */}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                      color: m.penaltyTotal > 0 ? 'var(--ct-rose)' : '#3c3c52',
                    }}>
                      {m.penaltyTotal > 0 ? `₦${m.penaltyTotal.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ YEARLY TAB ═══════════════════════════════ */}
      {tab === 'yearly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Year navigator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            background: 'rgba(255,255,255,0.028)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setYearlyYear(y => y - 1)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a8a8c0' }}
              >
                ‹
              </button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: '#ede8de', minWidth: 80, textAlign: 'center' }}>
                {yearlyYear}
              </span>
              <button
                onClick={() => setYearlyYear(y => y + 1)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a8a8c0' }}
              >
                ›
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={() => handleExport('yearly')}
              disabled={exporting || !yearly}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 9,
                background: 'rgba(79,70,229,0.10)',
                border: '1px solid rgba(79,70,229,0.22)',
                color: '#818cf8',
                fontSize: 12.5, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {yearlyLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#52526e' }}>Loading yearly data…</div>
          )}

          {yearly && !yearlyLoading && (
            <>
              {/* Yearly summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <StatCard
                  label="Total Collected"
                  value={`₦${yearly.summary.totalCollected.toLocaleString()}`}
                  sub={`in ${yearlyYear}`}
                  color="#4ade80"
                />
                <StatCard
                  label="Total Expected"
                  value={`₦${yearly.summary.totalExpected.toLocaleString()}`}
                  sub="across all months"
                />
                <StatCard
                  label="Collection Rate"
                  value={`${yearly.summary.collectionRate}%`}
                  sub="yearly average"
                  color={yearly.summary.collectionRate >= 80 ? '#4ade80' : yearly.summary.collectionRate >= 50 ? 'var(--ct-gold)' : 'var(--ct-rose)'}
                />
              </div>

              {/* Bar chart */}
              <YearlyChart months={yearly.months} />

              {/* Monthly table */}
              <div style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
                    Monthly Breakdown — {yearlyYear}
                  </h3>
                </div>

                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 140px',
                  padding: '10px 22px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {['Month', 'Collected', 'Expected', 'Verified', 'Payout'].map(h => (
                    <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: '#3c3c52', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {yearly.months.map((m, i) => {
                  const rate = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : 0;
                  const now2 = new Date();
                  const isCurrent = m.month === now2.getMonth() + 1 && yearlyYear === now2.getFullYear();
                  return (
                    <div
                      key={m.month}
                      style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 140px',
                        padding: '12px 22px', alignItems: 'center',
                        borderBottom: i < yearly.months.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: isCurrent ? 'rgba(212,160,23,0.04)' : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? 'var(--ct-gold)' : '#c8c4d8' }}>
                        {MONTHS[m.month - 1]}
                        {isCurrent && <span style={{ fontSize: 9, color: 'var(--ct-gold)', marginLeft: 6, fontWeight: 700 }}>NOW</span>}
                      </span>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c8c4d8' }}>
                          ₦{m.collected.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 11, color: '#52526e', marginLeft: 8 }}>({rate}%)</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#52526e' }}>
                        ₦{m.expected.toLocaleString()}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c8c4d8' }}>
                        {m.verified}
                      </span>
                      {m.payout ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#c8c4d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.payout.recipient}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: m.payout.status === 'paid' ? '#4ade80' : m.payout.status === 'skipped' ? 'var(--ct-rose)' : '#f59e0b',
                          }}>
                            {m.payout.status?.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#3c3c52', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
