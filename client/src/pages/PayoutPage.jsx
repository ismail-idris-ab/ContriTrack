import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'], ['#059669','#0d9488'],
  ['#d97706','#b45309'], ['#e11d48','#be123c'], ['#0ea5e9','#0284c7'],
];
const getAvatarGradient = (name = '') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
};
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#4f46e5', bg: 'rgba(79,70,229,0.09)',  border: 'rgba(79,70,229,0.22)'  },
  paid:      { label: 'Paid',      color: '#059669', bg: 'rgba(5,150,105,0.09)',  border: 'rgba(5,150,105,0.22)'  },
  skipped:   { label: 'Skipped',   color: '#8888a4', bg: 'rgba(100,100,130,0.07)', border: 'rgba(100,100,130,0.15)' },
};

const now = new Date();

export default function PayoutPage() {
  const { activeGroup } = useGroup();
  const { user } = useAuth();

  const [year,     setYear]     = useState(now.getFullYear());
  const [payouts,  setPayouts]  = useState([]);
  const [groupMeta, setGroupMeta] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Generate rotation modal
  const [showGenerate, setShowGenerate]   = useState(false);
  const [genStartMonth, setGenStartMonth] = useState(now.getMonth() + 1);
  const [generating,   setGenerating]    = useState(false);
  const [genError,     setGenError]      = useState('');

  // Mark paid modal
  const [markingPaid, setMarkingPaid] = useState(null); // payout object
  const [actualAmt,   setActualAmt]   = useState('');
  const [markNote,    setMarkNote]    = useState('');
  const [savingMark,  setSavingMark]  = useState(false);

  const isGroupAdmin = () => {
    if (!activeGroup || !user) return false;
    const m = activeGroup.members?.find(
      m => (m.user?._id || m.user) === user._id
    );
    return m?.role === 'admin';
  };

  const fetchPayouts = async () => {
    if (!activeGroup) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/payouts?groupId=${activeGroup._id}&year=${year}`);
      setPayouts(data.payouts || []);
      setGroupMeta(data.group || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payout rotation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, [activeGroup, year]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenError('');
    setGenerating(true);
    try {
      await api.post('/payouts/generate', {
        groupId:    activeGroup._id,
        year,
        startMonth: genStartMonth,
      });
      await fetchPayouts();
      setShowGenerate(false);
    } catch (err) {
      setGenError(err.response?.data?.message || 'Failed to generate rotation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markingPaid) return;
    setSavingMark(true);
    try {
      const { data } = await api.patch(`/payouts/${markingPaid._id}/status`, {
        status: 'paid',
        actualAmount: actualAmt ? Number(actualAmt) : undefined,
        note: markNote,
      });
      setPayouts(prev => prev.map(p => p._id === data._id ? data : p));
      setMarkingPaid(null);
      setActualAmt('');
      setMarkNote('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as paid.');
    } finally {
      setSavingMark(false);
    }
  };

  const handleRevert = async (payout) => {
    if (!window.confirm(`Revert "${MONTHS[payout.month - 1]}" back to scheduled?`)) return;
    try {
      const { data } = await api.patch(`/payouts/${payout._id}/status`, { status: 'scheduled' });
      setPayouts(prev => prev.map(p => p._id === data._id ? data : p));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revert.');
    }
  };

  const paid      = payouts.filter(p => p.status === 'paid');
  const totalPaid = paid.reduce((s, p) => s + (p.actualAmount || 0), 0);

  if (!activeGroup) {
    return (
      <div style={{
        textAlign: 'center', padding: '80px 40px',
        background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(212,160,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>
          No circle selected
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ct-text-3)', marginBottom: 20 }}>
          Select an active circle from My Circles to view its payout rotation.
        </p>
        <Link to="/groups" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--ct-gold)', color: '#0f0f14',
          fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
        }}>
          Go to My Circles
        </Link>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #e2e0da', borderRadius: 9,
    fontSize: 13.5, fontFamily: 'var(--font-sans)',
    background: '#faf9f6', color: 'var(--ct-text-1)',
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Payout Rotation
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
            Who receives the pot each month — <strong style={{ color: 'var(--ct-text-2)' }}>{activeGroup.name}</strong>
          </p>
        </div>

        {/* Year selector */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setYear(y => y - 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ct-text-2)' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--ct-text-1)', minWidth: 48, textAlign: 'center' }}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ct-text-2)' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
          </button>

          {isGroupAdmin() && (
            <button
              onClick={() => setShowGenerate(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: 'var(--ct-gold)', color: '#0f0f14',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M16.24 7.76A6 6 0 005.76 16.24M12 8v4l3 3"/>
              </svg>
              Auto-generate
            </button>
          )}
        </div>
      </div>

      {/* Generate rotation panel */}
      {showGenerate && isGroupAdmin() && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(212,160,23,0.12)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 4px' }}>
            Auto-generate Round-Robin
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: '0 0 16px' }}>
            Assigns each member one month in order, starting from the selected month. Existing scheduled (unpaid) slots will be replaced.
          </p>
          {genError && (
            <div style={{ padding: '9px 13px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.22)', color: '#e11d48' }}>
              {genError}
            </div>
          )}
          <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Start Month</label>
              <select
                value={genStartMonth}
                onChange={e => setGenStartMonth(Number(e.target.value))}
                style={{ ...inputStyle, width: 160, cursor: 'pointer' }}
              >
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={generating}
              style={{
                padding: '10px 20px', borderRadius: 9, border: 'none',
                background: generating ? '#e8e4dc' : 'var(--ct-gold)',
                color: generating ? 'var(--ct-text-3)' : '#0f0f14',
                fontSize: 13.5, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {generating ? 'Generating…' : `Generate for ${year}`}
            </button>
            <button
              type="button"
              onClick={() => setShowGenerate(false)}
              style={{ padding: '10px 16px', borderRadius: 9, border: '1px solid #e2e0da', background: 'transparent', color: 'var(--ct-text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Summary stats */}
      {payouts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Slots',   value: payouts.length,   color: 'var(--ct-indigo)' },
            { label: 'Paid Out',      value: paid.length,      color: 'var(--ct-emerald)' },
            { label: 'Remaining',     value: payouts.filter(p => p.status === 'scheduled').length, color: '#d97706' },
            { label: 'Total Disbursed', value: `₦${totalPaid.toLocaleString()}`, color: 'var(--ct-emerald)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--ct-shadow)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.22)', color: '#e11d48', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>
      ) : payouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 40px', background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(212,160,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>
            No rotation set for {year}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)', margin: 0 }}>
            {isGroupAdmin()
              ? 'Use "Auto-generate" to create a round-robin rotation for this year.'
              : 'The group admin hasn\'t set up a payout rotation yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payouts.map((payout, i) => {
            const sc = STATUS_CONFIG[payout.status] || STATUS_CONFIG.scheduled;
            const isCurrentMonth = payout.month === now.getMonth() + 1 && year === now.getFullYear();

            return (
              <div
                key={payout._id}
                style={{
                  background: '#fff', borderRadius: 14,
                  padding: '16px 20px',
                  boxShadow: isCurrentMonth ? `0 0 0 2px var(--ct-gold), var(--ct-shadow)` : 'var(--ct-shadow)',
                  border: isCurrentMonth ? '1px solid rgba(212,160,23,0.3)' : '1px solid rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 12,
                  position: 'relative',
                }}
              >
                {isCurrentMonth && (
                  <div style={{
                    position: 'absolute', top: -10, left: 18,
                    padding: '2px 8px', borderRadius: 20,
                    background: 'var(--ct-gold)', color: '#0f0f14',
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}>
                    This Month
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
                  {/* Position badge */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: sc.color,
                  }}>
                    #{payout.position}
                  </div>

                  {/* Month label */}
                  <div style={{ minWidth: 80 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.01em' }}>
                      {MONTHS[payout.month - 1]} {payout.year}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ct-text-3)', marginTop: 1 }}>
                      Month {payout.month}
                    </div>
                  </div>

                  {/* Recipient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: getAvatarGradient(payout.recipient?.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff',
                    }}>
                      {getInitials(payout.recipient?.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)' }}>
                        {payout.recipient?.name || 'Unknown'}
                      </div>
                      {payout.actualAmount > 0 && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ct-emerald)', fontWeight: 600 }}>
                          ₦{payout.actualAmount.toLocaleString()} paid
                        </div>
                      )}
                      {payout.expectedAmount > 0 && payout.status === 'scheduled' && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ct-text-3)' }}>
                          Expected: ₦{payout.expectedAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Status badge */}
                  <span style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    color: sc.color, fontSize: 11.5, fontWeight: 700,
                  }}>
                    {sc.label}
                  </span>

                  {/* Admin actions */}
                  {isGroupAdmin() && payout.status === 'scheduled' && (
                    <button
                      onClick={() => { setMarkingPaid(payout); setActualAmt(String(payout.expectedAmount || '')); setMarkNote(''); }}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: '1px solid rgba(5,150,105,0.25)',
                        background: 'rgba(5,150,105,0.07)',
                        color: '#047857', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Mark Paid
                    </button>
                  )}
                  {isGroupAdmin() && payout.status === 'paid' && (
                    <button
                      onClick={() => handleRevert(payout)}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'transparent',
                        color: 'var(--ct-text-3)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Revert
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mark Paid modal */}
      {markingPaid && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 4px' }}>
              Confirm Payout
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: '0 0 18px' }}>
              Mark {MONTHS[markingPaid.month - 1]} {markingPaid.year} payout to <strong>{markingPaid.recipient?.name}</strong> as paid.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Actual Amount (₦)
              </label>
              <input
                type="number"
                value={actualAmt}
                onChange={e => setActualAmt(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                placeholder="e.g. 50000"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Note <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={markNote}
                onChange={e => setMarkNote(e.target.value)}
                rows={2}
                placeholder="e.g. Paid via bank transfer"
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setMarkingPaid(null)}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={savingMark}
                style={{
                  padding: '9px 20px', borderRadius: 9, border: 'none',
                  background: savingMark ? '#e8e4dc' : 'var(--ct-emerald)',
                  color: savingMark ? 'var(--ct-text-3)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: savingMark ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {savingMark ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
