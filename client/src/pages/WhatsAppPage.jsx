import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
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
const initials   = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// ── WhatsApp icon ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 18, color = '#25D366' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function CoverageCard({ icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16, padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'fadeUp 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ct-text-3)', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function WhatsAppPage() {
  const { activeGroup } = useGroup();
  const { user }        = useAuth();
  const { showToast }   = useToast();
  const planLocked      = !canAccess(user, 'pro');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [reminding, setReminding] = useState(false);
  const [result,    setResult]    = useState(null);

  const isAdmin = (() => {
    if (!activeGroup || !user) return false;
    return activeGroup.members?.some(m =>
      String(m.user?._id || m.user) === String(user._id || user.id) && m.role === 'admin'
    );
  })();

  useEffect(() => {
    if (!activeGroup || planLocked) return;
    setLoading(true);
    api.get(`/members?groupId=${activeGroup._id}`)
      .then(({ data }) => setMembers(Array.isArray(data) ? data : data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeGroup, planLocked]);

  const sendReminders = async () => {
    if (!activeGroup) return;
    setReminding(true);
    setResult(null);
    try {
      const { data } = await api.post('/reports/remind', { groupId: activeGroup._id, month, year });
      setResult(data);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(
        err.response?.status === 403
          ? 'Reminders require a Pro or Coordinator plan.'
          : err.response?.data?.message || 'Failed to send reminders',
        'error'
      );
    } finally {
      setReminding(false);
    }
  };

  const membersWithPhone    = members.filter(m => m.phone);
  const membersWithoutPhone = members.filter(m => !m.phone);
  const coveragePct = members.length > 0 ? Math.round((membersWithPhone.length / members.length) * 100) : 0;

  // ── Guard: no circle ─────────────────────────────────────────────────────────
  if (!activeGroup) return (
    <div style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: 'rgba(37,211,102,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <WhatsAppIcon size={32} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>No circle selected</h2>
      <p style={{ color: 'var(--ct-text-3)', marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
        Select a savings circle to manage WhatsApp reminders.
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

  // ── Guard: plan locked ────────────────────────────────────────────────────────
  if (planLocked) return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: 'rgba(225,29,72,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>Reminders require Pro</h2>
      <p style={{ color: 'var(--ct-text-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Upgrade to Pro or Coordinator to send WhatsApp payment reminders to unpaid members.
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

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(37,211,102,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WhatsAppIcon size={18} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0 }}>
            Reminders
          </h1>
        </div>
        <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5, margin: 0, paddingLeft: 44 }}>
          {activeGroup.name} · Send WhatsApp payment reminders to unpaid members
        </p>
      </div>

      {/* ── How it works banner ── */}
      <div style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'rgba(37,211,102,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <WhatsAppIcon size={20} />
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)' }}>
            Automated WhatsApp Reminders via Termii
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ct-text-3)', lineHeight: 1.65 }}>
            ContriTrack checks who hasn't submitted a contribution for the selected month and sends a
            personalised WhatsApp message to each unpaid member with a phone number on file.
            Members without phone numbers are skipped.
          </p>
        </div>
      </div>

      {/* ── Non-admin notice ── */}
      {!isAdmin && (
        <div style={{
          background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.18)',
          borderRadius: 12, padding: '13px 18px', marginBottom: 20,
          fontSize: 13, color: '#a07010', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Only group admins can send WhatsApp reminders.
        </div>
      )}

      {/* ── Send panel (admin only) ── */}
      {isAdmin && (
        <div style={{
          background: '#fff',
          borderRadius: 16, padding: '22px 24px', marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 16, letterSpacing: '0.02em' }}>
            Select period to remind
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Month select */}
            <div style={{ flex: '1 1 160px' }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--ct-text-3)', marginBottom: 6,
                letterSpacing: '0.09em', textTransform: 'uppercase',
              }}>Month</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 36px 10px 14px',
                    borderRadius: 10,
                    background: '#faf9f6',
                    border: '1.5px solid rgba(0,0,0,0.08)',
                    color: 'var(--ct-text-1)', fontSize: 13.5,
                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                    outline: 'none', appearance: 'none',
                    fontWeight: 500,
                  }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-3)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* Year input */}
            <div style={{ flex: '0 0 110px' }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--ct-text-3)', marginBottom: 6,
                letterSpacing: '0.09em', textTransform: 'uppercase',
              }}>Year</label>
              <input
                type="number"
                value={year}
                min={2020} max={2099}
                onChange={e => setYear(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: 10,
                  background: '#faf9f6',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  color: 'var(--ct-text-1)', fontSize: 13.5,
                  fontFamily: 'var(--font-mono)', outline: 'none',
                  boxSizing: 'border-box', fontWeight: 600,
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={sendReminders}
              disabled={reminding}
              style={{
                flex: '0 0 auto',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '11px 24px', borderRadius: 10, border: 'none',
                background: reminding
                  ? '#e8e4dc'
                  : 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: reminding ? 'var(--ct-text-3)' : '#fff',
                fontSize: 13.5, fontWeight: 700,
                cursor: reminding ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: reminding ? 'none' : '0 4px 14px rgba(34,197,94,0.30)',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {reminding ? (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'rgba(255,255,255,0.8)',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
              {reminding ? 'Sending…' : 'Send Reminders'}
            </button>
          </div>

          {/* Result banner */}
          {result && (
            <div style={{
              marginTop: 18,
              padding: '16px 20px',
              borderRadius: 12,
              background: 'rgba(5,150,105,0.06)',
              border: '1px solid rgba(5,150,105,0.18)',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              animation: 'fadeUp 0.3s ease both',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(5,150,105,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ct-text-1)', marginBottom: 2 }}>
                  Reminders sent
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ct-text-3)' }}>{result.message}</div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#059669', lineHeight: 1 }}>{result.sent}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Sent</div>
                </div>
                <div style={{ width: 1, background: 'rgba(0,0,0,0.07)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#d97706', lineHeight: 1 }}>{result.skipped}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Skipped</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Coverage stat cards ── */}
      {!loading && members.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          <CoverageCard
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
            label="Total Members"
            value={members.length}
            sub="in this circle"
            accent="#059669"
            delay={0}
          />
          <CoverageCard
            icon={<WhatsAppIcon size={16} />}
            label="Can Receive"
            value={membersWithPhone.length}
            sub={`${coveragePct}% coverage`}
            accent="#25D366"
            delay={60}
          />
          <CoverageCard
            icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            label="Will Be Skipped"
            value={membersWithoutPhone.length}
            sub="no phone on file"
            accent="#d97706"
            delay={120}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2.5px solid rgba(212,160,23,0.2)',
            borderTopColor: 'var(--ct-gold)',
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ color: 'var(--ct-text-3)', fontSize: 14 }}>Loading members…</span>
        </div>
      )}

      {/* ── Member list ── */}
      {!loading && members.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {/* Table header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', fontFamily: 'var(--font-display)' }}>
              Member Coverage
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Coverage bar */}
              <div style={{ width: 80, height: 5, borderRadius: 3, background: '#f0ece4', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${coveragePct}%`, borderRadius: 3,
                  background: coveragePct === 100 ? '#059669' : 'linear-gradient(90deg, #25D366, #16a34a)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-3)' }}>{coveragePct}%</span>
            </div>
          </div>

          {/* Column labels */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 100px',
            padding: '9px 24px',
            background: '#faf9f6',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
            {['Member', 'Phone', 'Status'].map(h => (
              <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {/* Rows — with phone first, then without */}
          {[...membersWithPhone, ...membersWithoutPhone].map((m, i) => {
            const hasPhone = !!m.phone;
            const total = members.length;
            return (
              <div
                key={m._id || i}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 100px',
                  padding: '13px 24px', alignItems: 'center',
                  borderBottom: i < total - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  background: !hasPhone ? 'rgba(217,119,6,0.02)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                onMouseLeave={e => e.currentTarget.style.background = !hasPhone ? 'rgba(217,119,6,0.02)' : 'transparent'}
              >
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: avatarGrad(m.name || ''),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11.5, fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  }}>
                    {initials(m.name || '')}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ct-text-1)' }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>{m.email}</div>
                  </div>
                </div>

                {/* Phone number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {hasPhone ? (
                    <>
                      <WhatsAppIcon size={12} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ct-text-2)' }}>
                        {m.phone}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--ct-text-4)', fontStyle: 'italic' }}>—</span>
                  )}
                </div>

                {/* Status badge */}
                {hasPhone ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(37,211,102,0.10)',
                    color: '#16a34a',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
                    Will receive
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(217,119,6,0.10)',
                    color: '#d97706',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                    Skipped
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Profile CTA ── */}
      <div style={{
        background: '#fff',
        borderRadius: 16, padding: '18px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(212,160,23,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'rgba(212,160,23,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 2 }}>
              Missing your phone number?
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ct-text-3)' }}>
              Add your number in your profile to receive WhatsApp reminders.
            </div>
          </div>
        </div>
        <Link to="/profile" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 9,
          background: 'rgba(212,160,23,0.10)',
          border: '1px solid rgba(212,160,23,0.22)',
          color: 'var(--ct-gold)', fontSize: 12.5, fontWeight: 700,
          textDecoration: 'none', whiteSpace: 'nowrap',
          transition: 'all 0.18s ease',
        }}>
          Update Profile
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
