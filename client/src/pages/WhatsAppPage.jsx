import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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

export default function WhatsAppPage() {
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const { showToast } = useToast();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [result, setResult] = useState(null); // { sent, skipped, unpaidCount }

  const isAdmin = (() => {
    if (!activeGroup || !user) return false;
    return activeGroup.members?.some(m =>
      (m.user?._id || m.user) === (user._id || user.id) && m.role === 'admin'
    );
  })();

  // Fetch group members (populate phone info via members route)
  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    api.get(`/members?groupId=${activeGroup._id}`)
      .then(({ data }) => setMembers(Array.isArray(data) ? data : data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeGroup]);

  const sendReminders = async () => {
    if (!activeGroup) return;
    setReminding(true);
    setResult(null);
    try {
      const { data } = await api.post('/reports/remind', {
        groupId: activeGroup._id,
        month,
        year,
      });
      setResult(data);
      showToast(data.message, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reminders';
      if (err.response?.status === 403) {
        showToast('Reminders require a Pro or Coordinator plan.', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setReminding(false);
    }
  };

  const membersWithPhone    = members.filter(m => m.phone);
  const membersWithoutPhone = members.filter(m => !m.phone);

  // ── No circle guard ───────────────────────────────────────────────────────────
  if (!activeGroup) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: '#ede8de', marginBottom: 8 }}>
          No circle selected
        </h2>
        <p style={{ color: '#52526e', marginBottom: 24, lineHeight: 1.6 }}>
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
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#ede8de', margin: 0 }}>
          WhatsApp Reminders
        </h1>
        <p style={{ color: '#52526e', fontSize: 13.5, margin: '4px 0 0' }}>
          {activeGroup.name} · Send payment reminders to unpaid members
        </p>
      </div>

      {/* ── How it works ── */}
      <div style={{
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.16)',
        borderRadius: 14, padding: '18px 22px', marginBottom: 22,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(34,197,94,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.18 19.79 19.79 0 01.08.47 2 2 0 012.08.47h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600, color: '#c8c4d8' }}>
              Automated WhatsApp Reminders via Termii
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#52526e', lineHeight: 1.65 }}>
              When you click <strong style={{ color: '#a8a8c0' }}>Send Reminders</strong>, ContriTrack checks who hasn't submitted their contribution for the selected month and sends a personalised WhatsApp message to each unpaid member with a phone number on file.
              Members without phone numbers are skipped — encourage them to add a number in their profile.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div style={{
          background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.16)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 22,
          fontSize: 13, color: '#c8960e',
        }}>
          Only group admins can send WhatsApp reminders.
        </div>
      )}

      {/* ── Month selector + send button ── */}
      {isAdmin && (
        <div style={{
          background: 'rgba(255,255,255,0.028)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '20px 22px', marginBottom: 22,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
            Select Period
          </h3>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Month */}
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#52526e', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Month</label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#c8c4d8', fontSize: 13.5,
                  fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1} style={{ background: '#1a1a2e' }}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div style={{ flex: '0 0 110px' }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#52526e', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Year</label>
              <input
                type="number"
                value={year}
                min={2020} max={2099}
                onChange={e => setYear(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#c8c4d8', fontSize: 13.5,
                  fontFamily: 'var(--font-mono)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Send button */}
            <div style={{ flex: '0 0 auto' }}>
              <button
                onClick={sendReminders}
                disabled={reminding}
                style={{
                  padding: '11px 24px', borderRadius: 10,
                  background: reminding
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  color: reminding ? '#52526e' : '#fff',
                  fontSize: 13.5, fontWeight: 700, cursor: reminding ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: reminding ? 'none' : '0 4px 14px rgba(34,197,94,0.28)',
                  transition: 'all 0.18s ease',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {reminding ? 'Sending…' : 'Send Reminders'}
              </button>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div style={{
              marginTop: 16,
              padding: '14px 18px',
              borderRadius: 10,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.20)',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5, color: '#c8c4d8' }}>{result.message}</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#4ade80' }}>{result.sent}</div>
                  <div style={{ fontSize: 10.5, color: '#52526e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sent</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{result.skipped}</div>
                  <div style={{ fontSize: 10.5, color: '#52526e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skipped</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phone number coverage ── */}
      <div style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, overflow: 'hidden', marginBottom: 22,
      }}>
        <div style={{
          padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
            Phone Number Coverage
          </h3>
          {!loading && (
            <span style={{ fontSize: 12.5, color: '#52526e' }}>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{membersWithPhone.length}</span>
              {' '}/ {members.length} members have phone numbers
            </span>
          )}
        </div>

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#52526e' }}>Loading members…</div>
        )}

        {!loading && membersWithoutPhone.length > 0 && (
          <div style={{ padding: '0 22px' }}>
            <div style={{
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#c8960e' }}>
                {membersWithoutPhone.length} member{membersWithoutPhone.length > 1 ? 's' : ''} missing phone number — will be skipped
              </span>
            </div>

            {membersWithoutPhone.map((m, i) => (
              <div key={m._id || i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: i < membersWithoutPhone.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: avatarGrad(m.name || ''),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(m.name || '')}
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c8c4d8' }}>{m.name}</span>
                    <div style={{ fontSize: 11.5, color: '#52526e' }}>{m.email}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#f59e0b',
                  background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 5,
                }}>
                  No Phone
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && membersWithoutPhone.length === 0 && members.length > 0 && (
          <div style={{ padding: '24px 22px', display: 'flex', alignItems: 'center', gap: 10, color: '#4ade80' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>All members have phone numbers on file</span>
          </div>
        )}
      </div>

      {/* ── Members with phones ── */}
      {!loading && membersWithPhone.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.028)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a8a8c0', fontFamily: 'var(--font-display)' }}>
              Members with Phone Numbers
            </h3>
          </div>
          {membersWithPhone.map((m, i) => (
            <div key={m._id || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 22px',
              borderBottom: i < membersWithPhone.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: avatarGrad(m.name || ''),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials(m.name || '')}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c8c4d8' }}>{m.name}</span>
                  <div style={{ fontSize: 11.5, color: '#52526e' }}>{m.email}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#4ade80' }}>
                {m.phone}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Profile CTA ── */}
      <div style={{
        marginTop: 22,
        background: 'rgba(212,160,23,0.06)',
        border: '1px solid rgba(212,160,23,0.14)',
        borderRadius: 14, padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#c8c4d8' }}>
            Missing your phone number?
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#52526e' }}>
            Add your Nigerian phone number in your profile to receive WhatsApp reminders.
          </p>
        </div>
        <Link to="/profile" style={{
          padding: '9px 20px', borderRadius: 9,
          background: 'rgba(212,160,23,0.14)',
          border: '1px solid rgba(212,160,23,0.24)',
          color: 'var(--ct-gold)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          Update Profile →
        </Link>
      </div>
    </div>
  );
}
