import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { downloadCsv } from '../utils/exportDownload';
import { canAccess } from '../utils/planUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const avatarGradients = [
  'linear-gradient(135deg,#4338ca,#7c3aed)',
  'linear-gradient(135deg,#0369a1,#0891b2)',
  'linear-gradient(135deg,#15803d,#4ade80)',
  'linear-gradient(135deg,#b45309,#f59e0b)',
  'linear-gradient(135deg,#9d174d,#ec4899)',
];
const avatarGrad = (name = '') => avatarGradients[name.charCodeAt(0) % 5];
const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor, accent = '#d4a017', delay = 0 }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
          color: 'var(--ct-text-1)', letterSpacing: '-0.02em', lineHeight: 1,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: subColor || 'var(--ct-text-3)', marginTop: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Yearly Bar Chart ─────────────────────────────────────────────────────────
function YearlyBarChart({ months: monthlyData }) {
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [monthlyData]);

  if (!monthlyData) return null;
  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.collected, m.expected)), 1);
  const now = new Date();

  return (
    <div ref={ref} style={{
      background: '#fff',
      borderRadius: 16,
      padding: '24px 26px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
    }}>
      {/* Chart header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ct-text-1)', fontFamily: 'var(--font-display)' }}>
            Monthly Collection Overview
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ct-text-3)' }}>
            Collected vs expected per month
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: 'var(--ct-gold)', label: 'Collected' },
            { color: '#e2ddd5', label: 'Expected' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span style={{ fontSize: 11.5, color: 'var(--ct-text-3)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, position: 'relative' }}>
        {/* Y-axis gridlines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <div key={pct} style={{
            position: 'absolute',
            left: 0, right: 0,
            bottom: `${pct}%`,
            borderTop: `1px ${pct === 0 ? 'solid rgba(0,0,0,0.1)' : 'dashed rgba(0,0,0,0.05)'}`,
            pointerEvents: 'none',
          }} />
        ))}

        {monthlyData.map((m, i) => {
          const collectedPct = animated ? (m.collected / maxVal) * 100 : 0;
          const expectedPct = animated ? (m.expected / maxVal) * 100 : 0;
          const isCurrent = m.month === now.getMonth() + 1;
          const isHovered = hovered === i;
          const rate = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : 0;

          return (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', position: 'relative', cursor: 'default' }}
            >
              {/* Tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--ct-text-1)',
                  color: '#fff',
                  fontSize: 11, fontWeight: 600,
                  padding: '6px 10px', borderRadius: 8,
                  whiteSpace: 'nowrap', zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}>
                  <div style={{ color: 'var(--ct-gold)' }}>₦{m.collected.toLocaleString()}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{rate}% of target</div>
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                    width: 8, height: 8, background: 'var(--ct-text-1)',
                    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  }} />
                </div>
              )}

              {/* Bar group */}
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, justifyContent: 'center' }}>
                {/* Expected (background bar) */}
                <div style={{
                  width: '45%',
                  height: `${Math.max(expectedPct, 2)}%`,
                  borderRadius: '3px 3px 0 0',
                  background: '#e8e4dc',
                  transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: `${i * 40}ms`,
                }} />
                {/* Collected bar */}
                <div style={{
                  width: '45%',
                  height: `${Math.max(collectedPct, m.collected > 0 ? 4 : 0)}%`,
                  borderRadius: '3px 3px 0 0',
                  background: isCurrent
                    ? 'linear-gradient(180deg, #f0c842, #d4a017)'
                    : m.collected >= m.expected && m.expected > 0
                    ? 'linear-gradient(180deg, #34d399, #059669)'
                    : m.collected > 0
                    ? 'linear-gradient(180deg, #d4a017, #a07810)'
                    : '#e8e4dc',
                  transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: `${i * 40 + 20}ms`,
                  boxShadow: isCurrent ? '0 0 8px rgba(212,160,23,0.4)' : 'none',
                }} />
              </div>

              {/* Month label */}
              <span style={{
                fontSize: 10, fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? 'var(--ct-gold)' : 'var(--ct-text-3)',
                letterSpacing: '0.02em',
              }}>
                {MONTHS_SHORT[m.month - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 100 ? '#059669' : pct >= 60 ? '#d4a017' : '#e11d48';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0ece4" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
    </svg>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, paid }) {
  const map = {
    verified: { label: 'Verified', bg: 'rgba(5,150,105,0.10)', color: '#059669' },
    pending:  { label: 'Pending',  bg: 'rgba(217,119,6,0.10)',  color: '#d97706' },
    unpaid:   { label: 'Unpaid',   bg: 'rgba(225,29,72,0.10)',  color: '#e11d48' },
  };
  const key = !paid ? 'unpaid' : (status || 'pending');
  const s = map[key] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const planLocked = !canAccess(user, 'pro');
  const { showToast } = useToast();

  const now = new Date();
  const [tab, setTab]               = useState('monthly');
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());

  const [monthly, setMonthly]           = useState(null);
  const [yearly, setYearly]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [reminding, setReminding]       = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [exportingMembers, setExportingMembers] = useState(false);

  const isCoordinator = canAccess(user, 'coordinator');

  const isAdmin = (() => {
    if (!activeGroup || !user) return false;
    return activeGroup.members?.some(m =>
      String(m.user?._id || m.user) === String(user._id || user.id) && m.role === 'admin'
    );
  })();

  const fetchMonthly = useCallback(async () => {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/monthly?groupId=${activeGroup._id}&month=${month}&year=${year}`);
      setMonthly(data);
    } catch {}
    finally { setLoading(false); }
  }, [activeGroup, month, year]);

  const fetchYearly = useCallback(async () => {
    if (!activeGroup) return;
    setYearlyLoading(true);
    try {
      const { data } = await api.get(`/reports/yearly?groupId=${activeGroup._id}&year=${yearlyYear}`);
      setYearly(data);
    } catch {}
    finally { setYearlyLoading(false); }
  }, [activeGroup, yearlyYear]);

  useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [fetchMonthly, tab]);
  useEffect(() => { if (tab === 'yearly')  fetchYearly();  }, [fetchYearly,  tab]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const sendReminders = async () => {
    if (!activeGroup) return;
    setReminding(true);
    try {
      const { data } = await api.post('/reports/remind', { groupId: activeGroup._id, month, year });
      showToast(data.message, 'success');
    } catch (err) {
      showToast(
        err.response?.status === 403
          ? 'WhatsApp reminders require Pro or Coordinator plan.'
          : err.response?.data?.message || 'Failed to send reminders',
        'error'
      );
    } finally { setReminding(false); }
  };

  const handleExport = async (type) => {
    if (!activeGroup || exporting) return;
    setExporting(true);
    try {
      if (type === 'monthly') {
        await downloadCsv(`/api/exports/monthly?groupId=${activeGroup._id}&month=${month}&year=${year}`,
          `${activeGroup.name.replace(/\s+/g,'_')}_${MONTHS[month-1]}_${year}.csv`);
      } else {
        await downloadCsv(`/api/exports/yearly?groupId=${activeGroup._id}&year=${yearlyYear}`,
          `${activeGroup.name.replace(/\s+/g,'_')}_${yearlyYear}_Yearly.csv`);
      }
    } catch (err) { showToast(err.message || 'Export failed', 'error'); }
    finally { setExporting(false); }
  };

  const handleMembersExport = async () => {
    if (!activeGroup || exportingMembers) return;
    setExportingMembers(true);
    try {
      await downloadCsv(`/api/exports/members?groupId=${activeGroup._id}&includeScore=true`,
        `${activeGroup.name.replace(/\s+/g,'_')}_Members.csv`);
    } catch (err) { showToast(err.message || 'Members export failed', 'error'); }
    finally { setExportingMembers(false); }
  };

  // ── Guard: no circle ──────────────────────────────────────────────────────
  if (!activeGroup) return (
    <div style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: 'rgba(212,160,23,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>📊</div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>No circle selected</h2>
      <p style={{ color: 'var(--ct-text-3)', marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
        Select a savings circle to view its reports.
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

  // ── Guard: plan locked ────────────────────────────────────────────────────
  if (planLocked) return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: 'rgba(225,29,72,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>Reports require Pro</h2>
      <p style={{ color: 'var(--ct-text-3)', marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
        Upgrade to unlock monthly and yearly reports for your savings circles.
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1a1206" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0 }}>
              Reports
            </h1>
          </div>
          <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5, margin: 0, paddingLeft: 44 }}>
            {activeGroup.name} · Analytics &amp; collection overview
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 3,
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 11, padding: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {['monthly', 'yearly'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
              background: tab === t ? 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))' : 'transparent',
              color: tab === t ? '#1a1206' : 'var(--ct-text-3)',
              transition: 'all 0.18s ease',
              textTransform: 'capitalize',
              boxShadow: tab === t ? '0 2px 6px rgba(212,160,23,0.25)' : 'none',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ MONTHLY TAB ══════════════════ */}
      {tab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Period nav + actions bar */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            {/* Period navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={prevMonth} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                background: '#faf9f6', cursor: 'pointer', color: 'var(--ct-text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
                transition: 'all 0.15s ease',
              }}>‹</button>

              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
                padding: '6px 16px', borderRadius: 9,
                background: 'rgba(212,160,23,0.07)',
                border: '1px solid rgba(212,160,23,0.18)',
                minWidth: 170, justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)' }}>
                  {MONTHS[month - 1]}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ct-text-3)', fontWeight: 500 }}>
                  {year}
                </span>
              </div>

              <button onClick={nextMonth} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                background: '#faf9f6', cursor: 'pointer', color: 'var(--ct-text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
                transition: 'all 0.15s ease',
              }}>›</button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && (
                <ActionBtn
                  onClick={sendReminders} disabled={reminding}
                  icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.18 19.79 19.79 0 010 .47 2 2 0 012 .47h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>}
                  label={reminding ? 'Sending…' : 'Remind Unpaid'}
                  accent="#059669"
                />
              )}
              <ActionBtn
                onClick={isCoordinator ? () => handleExport('monthly') : undefined}
                disabled={!isCoordinator || exporting || !monthly}
                icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
                label={exporting ? 'Exporting…' : 'Export CSV'}
                locked={!isCoordinator}
                title={!isCoordinator ? 'Requires Coordinator plan' : ''}
              />
              <ActionBtn
                onClick={isCoordinator ? handleMembersExport : undefined}
                disabled={!isCoordinator || exportingMembers}
                icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
                label={exportingMembers ? 'Exporting…' : 'Members CSV'}
                locked={!isCoordinator}
                title={!isCoordinator ? 'Requires Coordinator plan' : ''}
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2.5px solid rgba(212,160,23,0.2)',
                borderTopColor: 'var(--ct-gold)',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ color: 'var(--ct-text-3)', fontSize: 14 }}>Loading report…</span>
            </div>
          )}

          {monthly && !loading && (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                <StatCard
                  icon="💰" label="Expected"
                  value={`₦${monthly.summary.expected.toLocaleString()}`}
                  sub={`${monthly.summary.totalMembers} members`}
                  delay={0}
                />
                <StatCard
                  icon="✅" label="Collected"
                  value={`₦${monthly.summary.collected.toLocaleString()}`}
                  sub={
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        background: 'rgba(5,150,105,0.10)', color: '#059669',
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      }}>
                        ↑ verified
                      </span>
                      {monthly.summary.verifiedCount} of {monthly.summary.totalMembers}
                    </span>
                  }
                  accent="#059669" delay={60}
                />
                <StatCard
                  icon="⏳" label="Pending"
                  value={monthly.summary.pendingCount}
                  sub="awaiting verification"
                  accent="#d97706" delay={120}
                />
                <StatCard
                  icon="⚠️" label="Unpaid"
                  value={monthly.summary.unpaidCount}
                  sub={monthly.summary.unpaidCount === 0 ? 'All members paid!' : 'no submission yet'}
                  accent={monthly.summary.unpaidCount > 0 ? '#e11d48' : '#059669'} delay={180}
                />
                {monthly.summary.penaltyTotal > 0 && (
                  <StatCard
                    icon="🚨" label="Penalties"
                    value={`₦${monthly.summary.penaltyTotal.toLocaleString()}`}
                    sub="issued this month"
                    accent="#e11d48" delay={240}
                  />
                )}
              </div>

              {/* Progress + Payout row */}
              <div style={{ display: 'grid', gridTemplateColumns: monthly.payout ? '1fr 1fr' : '1fr', gap: 14 }}>

                {/* Progress card */}
                <div style={{
                  background: '#fff',
                  borderRadius: 16, padding: '22px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', gap: 20,
                }}>
                  <ProgressRing pct={monthly.summary.progressPct} size={80} stroke={7} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Collection Progress
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {monthly.summary.progressPct}
                      <span style={{ fontSize: 16, color: 'var(--ct-text-3)', fontWeight: 500 }}>%</span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 5, background: '#f0ece4', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(monthly.summary.progressPct, 100)}%`,
                          borderRadius: 3,
                          background: monthly.summary.progressPct >= 100 ? '#059669' : 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light))',
                          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 6 }}>
                        {monthly.summary.verifiedCount} of {monthly.summary.totalMembers} members verified
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payout card */}
                {monthly.payout && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212,160,23,0.05), rgba(240,200,66,0.08))',
                    borderRadius: 16, padding: '22px 24px',
                    border: '1px solid rgba(212,160,23,0.20)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a07010', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Payout Recipient
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: avatarGrad(monthly.payout.recipient?.name || ''),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 13, fontWeight: 700,
                      }}>
                        {initials(monthly.payout.recipient?.name || '?')}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ct-text-1)' }}>
                          {monthly.payout.recipient?.name || '—'}
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          marginTop: 3, padding: '2px 8px', borderRadius: 5,
                          background: monthly.payout.status === 'paid' ? 'rgba(5,150,105,0.12)' : 'rgba(212,160,23,0.15)',
                          color: monthly.payout.status === 'paid' ? '#059669' : '#a07010',
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {monthly.payout.status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {monthly.payout.expectedAmount > 0 && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--ct-gold)', marginTop: 4 }}>
                        ₦{(monthly.payout.actualAmount || monthly.payout.expectedAmount).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Member breakdown table */}
              <div style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}>
                {/* Table header */}
                <div style={{
                  padding: '18px 24px 14px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', fontFamily: 'var(--font-display)' }}>
                    Member Breakdown
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--ct-text-3)' }}>
                    {monthly.members.length} members
                  </span>
                </div>

                {/* Column labels */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px',
                  padding: '9px 24px',
                  background: '#faf9f6',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  {['Member', 'Status', 'Amount', 'Penalties'].map(h => (
                    <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {monthly.members.map((m, i) => (
                  <div
                    key={m._id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px',
                      padding: '13px 24px', alignItems: 'center',
                      borderBottom: i < monthly.members.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      background: !m.paid ? 'rgba(225,29,72,0.02)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                    onMouseLeave={e => e.currentTarget.style.background = !m.paid ? 'rgba(225,29,72,0.02)' : 'transparent'}
                  >
                    {/* Name + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: avatarGrad(m.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11.5, fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ct-text-1)' }}>{m.name}</div>
                        {m.groupRole === 'admin' && (
                          <span style={{ fontSize: 9.5, color: 'var(--ct-gold)', fontWeight: 700, letterSpacing: '0.07em' }}>ADMIN</span>
                        )}
                      </div>
                    </div>

                    <StatusBadge status={m.contribution?.status} paid={m.paid} />

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: m.contribution ? 'var(--ct-text-1)' : 'var(--ct-text-4)' }}>
                      {m.contribution ? `₦${m.contribution.amount.toLocaleString()}` : '—'}
                    </span>

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: m.penaltyTotal > 0 ? '#e11d48' : 'var(--ct-text-4)' }}>
                      {m.penaltyTotal > 0 ? `₦${m.penaltyTotal.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════ YEARLY TAB ══════════════════ */}
      {tab === 'yearly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Year nav + export */}
          <div style={{
            background: '#fff',
            borderRadius: 16, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setYearlyYear(y => y - 1)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                background: '#faf9f6', cursor: 'pointer', color: 'var(--ct-text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
              }}>‹</button>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
                padding: '6px 20px', borderRadius: 9,
                background: 'rgba(212,160,23,0.07)',
                border: '1px solid rgba(212,160,23,0.18)',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)' }}>
                  {yearlyYear}
                </span>
              </div>
              <button onClick={() => setYearlyYear(y => y + 1)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                background: '#faf9f6', cursor: 'pointer', color: 'var(--ct-text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
              }}>›</button>
            </div>
            <ActionBtn
              onClick={isCoordinator ? () => handleExport('yearly') : undefined}
              disabled={!isCoordinator || exporting}
              icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
              label={exporting ? 'Exporting…' : 'Export CSV'}
              locked={!isCoordinator}
              title={!isCoordinator ? 'Requires Coordinator plan' : ''}
            />
          </div>

          {yearlyLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2.5px solid rgba(212,160,23,0.2)',
                borderTopColor: 'var(--ct-gold)',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ color: 'var(--ct-text-3)', fontSize: 14 }}>Loading yearly data…</span>
            </div>
          )}

          {yearly && !yearlyLoading && (
            <>
              {/* Yearly stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
                <StatCard
                  icon="📈" label="Total Collected"
                  value={`₦${yearly.summary.totalCollected.toLocaleString()}`}
                  sub={`in ${yearlyYear}`}
                  accent="#059669" delay={0}
                />
                <StatCard
                  icon="🎯" label="Total Expected"
                  value={`₦${yearly.summary.totalExpected.toLocaleString()}`}
                  sub="across all months"
                  delay={60}
                />
                <StatCard
                  icon="📊" label="Collection Rate"
                  value={`${yearly.summary.collectionRate}%`}
                  sub={
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      color: yearly.summary.collectionRate >= 80 ? '#059669' : yearly.summary.collectionRate >= 50 ? '#d97706' : '#e11d48',
                    }}>
                      <span style={{
                        background: yearly.summary.collectionRate >= 80 ? 'rgba(5,150,105,0.10)' : yearly.summary.collectionRate >= 50 ? 'rgba(217,119,6,0.10)' : 'rgba(225,29,72,0.10)',
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        color: 'inherit',
                      }}>
                        {yearly.summary.collectionRate >= 80 ? 'Excellent' : yearly.summary.collectionRate >= 50 ? 'Fair' : 'Low'}
                      </span>
                      yearly average
                    </span>
                  }
                  accent={yearly.summary.collectionRate >= 80 ? '#059669' : yearly.summary.collectionRate >= 50 ? '#d97706' : '#e11d48'}
                  delay={120}
                />
              </div>

              {/* Bar chart */}
              <YearlyBarChart months={yearly.months} />

              {/* Monthly breakdown table */}
              <div style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', fontFamily: 'var(--font-display)' }}>
                    Monthly Breakdown — {yearlyYear}
                  </h3>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 160px',
                  padding: '9px 24px',
                  background: '#faf9f6',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  {['Month', 'Collected', 'Expected', 'Verified', 'Payout'].map(h => (
                    <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {yearly.months.map((m, i) => {
                  const rate = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : 0;
                  const isCurrent = m.month === now.getMonth() + 1 && yearlyYear === now.getFullYear();
                  return (
                    <div
                      key={m.month}
                      style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px 160px',
                        padding: '12px 24px', alignItems: 'center',
                        borderBottom: i < yearly.months.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        background: isCurrent ? 'rgba(212,160,23,0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#faf9f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? 'rgba(212,160,23,0.04)' : 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? 'var(--ct-gold)' : 'var(--ct-text-1)' }}>
                          {MONTHS[m.month - 1]}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(212,160,23,0.15)', color: 'var(--ct-gold)', letterSpacing: '0.06em' }}>
                            NOW
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ct-text-1)' }}>
                          ₦{m.collected.toLocaleString()}
                        </span>
                        {rate > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            background: rate >= 100 ? 'rgba(5,150,105,0.10)' : 'rgba(212,160,23,0.10)',
                            color: rate >= 100 ? '#059669' : '#a07010',
                          }}>
                            {rate}%
                          </span>
                        )}
                      </div>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ct-text-3)' }}>
                        ₦{m.expected.toLocaleString()}
                      </span>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ct-text-1)' }}>
                        {m.verified}
                      </span>

                      {m.payout ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ct-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.payout.recipient}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                            color: m.payout.status === 'paid' ? '#059669' : m.payout.status === 'skipped' ? '#e11d48' : '#d97706',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {m.payout.status?.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ct-text-4)', fontSize: 13 }}>—</span>
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

// ── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, disabled, icon, label, accent, locked, title }) {
  const col = locked ? 'var(--ct-text-4)' : accent || 'var(--ct-indigo)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 9,
        background: locked ? 'rgba(0,0,0,0.03)' : `${col}12`,
        border: `1px solid ${locked ? 'rgba(0,0,0,0.07)' : col + '30'}`,
        color: col,
        fontSize: 12.5, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.18s ease',
        opacity: disabled && !locked ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
      {locked && <span style={{ fontSize: 10 }}>🔒</span>}
    </button>
  );
}
