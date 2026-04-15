import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_CONFIG = {
  pending:   { color: '#d97706', bg: 'rgba(217,119,6,0.09)',   border: 'rgba(217,119,6,0.22)',   label: 'Pledged' },
  fulfilled: { color: '#059669', bg: 'rgba(5,150,105,0.09)',   border: 'rgba(5,150,105,0.22)',   label: 'Fulfilled' },
  missed:    { color: '#e11d48', bg: 'rgba(225,29,72,0.09)',   border: 'rgba(225,29,72,0.22)',   label: 'Missed' },
};

const now = new Date();
const THIS_YEAR  = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

function monthLabel(m, y) {
  return `${MONTHS[m - 1]} ${y}`;
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e2e0da', borderRadius: 10,
  fontSize: 13.5, fontFamily: 'var(--font-sans)',
  background: '#faf9f6', color: 'var(--ct-text-1)',
  boxSizing: 'border-box', outline: 'none',
};

const labelStyle = {
  display: 'block', fontSize: 11.5, fontWeight: 700,
  color: 'var(--ct-text-2)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

// Generate next 12 month options (current + future)
function futureMonths() {
  const opts = [];
  for (let i = 0; i < 12; i++) {
    let m = THIS_MONTH + i;
    let y = THIS_YEAR;
    if (m > 12) { m -= 12; y += 1; }
    opts.push({ month: m, year: y, label: monthLabel(m, y) });
  }
  return opts;
}

export default function PledgePage() {
  const { activeGroup } = useGroup();
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const monthOpts = futureMonths();

  const [form, setForm] = useState({
    month:    THIS_MONTH,
    year:     THIS_YEAR,
    amount:   '',
    note:     '',
    remindAt: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPledges = async () => {
    setLoading(true);
    try {
      const groupParam = activeGroup ? `?groupId=${activeGroup._id}` : '';
      const { data } = await api.get(`/pledges/mine${groupParam}`);
      setPledges(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPledges(); }, [activeGroup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || Number(form.amount) <= 0) return setFormError('Enter a valid amount');
    setSubmitting(true);
    try {
      const payload = {
        month:  form.month,
        year:   form.year,
        amount: form.amount,
        note:   form.note,
      };
      if (activeGroup) payload.groupId = activeGroup._id;
      if (form.remindAt) payload.remindAt = form.remindAt;

      await api.post('/pledges', payload);
      await fetchPledges();
      setShowForm(false);
      setForm({ month: THIS_MONTH, year: THIS_YEAR, amount: '', note: '', remindAt: '' });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create pledge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this pledge?')) return;
    setDeleting(id);
    try {
      await api.delete(`/pledges/${id}`);
      setPledges(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel pledge');
    } finally {
      setDeleting(null);
    }
  };

  const pending   = pledges.filter(p => p.status === 'pending');
  const fulfilled = pledges.filter(p => p.status === 'fulfilled');
  const missed    = pledges.filter(p => p.status === 'missed');

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Pledges
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
            Schedule your upcoming contributions and track your commitments.
            {activeGroup && <> — <strong style={{ color: 'var(--ct-text-2)' }}>{activeGroup.name}</strong></>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-gold"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'var(--ct-gold)', color: '#0f0f14',
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Pledge
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: 'var(--ct-shadow)', marginBottom: 24, border: '1px solid rgba(212,160,23,0.12)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Schedule a Contribution
          </h3>
          {formError && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9, color: '#be123c', fontSize: 13, marginBottom: 14 }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Month *</label>
                <select
                  value={`${form.month}-${form.year}`}
                  onChange={e => {
                    const [m, y] = e.target.value.split('-').map(Number);
                    setForm(f => ({ ...f, month: m, year: y }));
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {monthOpts.map(o => (
                    <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount (₦) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  min="1"
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Remind me on <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 11, color: 'var(--ct-text-3)', letterSpacing: 0 }}>(optional)</span></label>
              <input
                type="date"
                value={form.remindAt}
                onChange={e => setForm(f => ({ ...f, remindAt: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Note <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 11, color: 'var(--ct-text-3)', letterSpacing: 0 }}>(optional)</span></label>
              <textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Payday is the 25th, will pay then"
                rows={2}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit" disabled={submitting}
                style={{
                  padding: '11px 22px', borderRadius: 10, border: 'none',
                  background: submitting ? '#e8e4dc' : 'var(--ct-gold)',
                  color: submitting ? 'var(--ct-text-3)' : '#0f0f14',
                  fontSize: 13.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {submitting ? 'Saving…' : 'Create Pledge'}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                style={{
                  padding: '11px 18px', borderRadius: 10,
                  border: '1px solid #e2e0da', background: 'transparent',
                  color: 'var(--ct-text-2)', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>
      ) : pledges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 40px', background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,160,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>No pledges yet</h3>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)', margin: 0 }}>Create a pledge to schedule your upcoming contributions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[{ title: 'Upcoming', items: pending }, { title: 'Fulfilled', items: fulfilled }, { title: 'Missed', items: missed }]
            .filter(s => s.items.length > 0)
            .map(section => (
              <div key={section.title}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em' }}>
                    {section.title}
                  </h3>
                  <span style={{ padding: '2px 9px', borderRadius: 20, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', color: 'var(--ct-indigo)', fontSize: 11, fontWeight: 700 }}>
                    {section.items.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {section.items.map(p => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={p._id} style={{
                        background: '#fff', borderRadius: 14, padding: '18px 20px',
                        boxShadow: 'var(--ct-shadow)',
                        border: `1px solid ${p.status === 'pending' ? 'rgba(212,160,23,0.12)' : 'rgba(0,0,0,0.05)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 200 }}>
                          {/* Calendar icon */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                            background: sc.bg, border: `1px solid ${sc.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: sc.color, lineHeight: 1 }}>
                              {String(p.month).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, letterSpacing: '0.04em' }}>
                              {p.year}
                            </span>
                          </div>

                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.01em' }}>
                              {monthLabel(p.month, p.year)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ct-emerald)' }}>
                                ₦{Number(p.amount).toLocaleString()}
                              </span>
                              {p.remindAt && (
                                <span style={{ marginLeft: 8 }}>
                                  · Reminder: {new Date(p.remindAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {p.note && <span style={{ marginLeft: 8 }}>· {p.note}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: 20,
                            background: sc.bg, border: `1px solid ${sc.border}`,
                            color: sc.color, fontSize: 11.5, fontWeight: 700,
                          }}>
                            {sc.label}
                          </span>

                          {p.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(p._id)}
                              disabled={deleting === p._id}
                              style={{
                                padding: '6px 12px', borderRadius: 8,
                                border: '1px solid rgba(225,29,72,0.22)',
                                background: 'rgba(225,29,72,0.07)',
                                color: '#be123c', fontSize: 12, fontWeight: 600,
                                cursor: deleting === p._id ? 'not-allowed' : 'pointer',
                                fontFamily: 'var(--font-sans)',
                                opacity: deleting === p._id ? 0.5 : 1,
                              }}
                            >
                              {deleting === p._id ? '…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
