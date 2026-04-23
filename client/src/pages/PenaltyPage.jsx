import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'],['#059669','#0d9488'],
  ['#d97706','#b45309'],['#e11d48','#be123c'],['#0ea5e9','#0284c7'],
];
const getAvatarGradient = (name = '') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
};
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const STATUS_CFG = {
  pending: { label: 'Pending', color: '#d97706', bg: 'rgba(217,119,6,0.09)',  border: 'rgba(217,119,6,0.22)'  },
  paid:    { label: 'Paid',    color: '#059669', bg: 'rgba(5,150,105,0.09)',  border: 'rgba(5,150,105,0.22)'  },
  waived:  { label: 'Waived',  color: '#8888a4', bg: 'rgba(100,100,130,0.07)', border: 'rgba(100,100,130,0.15)' },
};

const inputStyle = {
  width: '100%', padding: '10px 13px',
  border: '1.5px solid #e2e0da', borderRadius: 9,
  fontSize: 13.5, fontFamily: 'var(--font-sans)',
  background: '#faf9f6', color: 'var(--ct-text-1)',
  boxSizing: 'border-box', outline: 'none',
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--ct-text-2)', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

export default function PenaltyPage() {
  useDocumentTitle('Penalties — ContriTrack');
  const { activeGroup } = useGroup();
  const { user }        = useAuth();
  const toast           = useToast();
  const queryClient     = useQueryClient();
  const now             = new Date();

  const { data: penalties = [], isLoading: loading } = useQuery({
    queryKey: ['penalties', activeGroup?._id],
    queryFn: () =>
      api.get(`/penalties?groupId=${activeGroup._id}`)
         .then(r => r.data)
         .catch(err => { if (err.response?.status === 403) return []; throw err; }),
    enabled: !!activeGroup,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', activeGroup?._id, now.getMonth() + 1, now.getFullYear()],
    queryFn: () =>
      api.get(`/members?month=${now.getMonth() + 1}&year=${now.getFullYear()}&groupId=${activeGroup._id}`)
         .then(r => r.data),
    enabled: !!activeGroup,
  });

  const [showForm,  setShowForm]  = useState(false);

  // Create form
  const [form, setForm] = useState({
    userId: '', amount: '', reason: '',
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
    note: '',
  });
  const [formError, setFormError] = useState('');

  const isAdmin = () => {
    if (!activeGroup || !user) return false;
    const m = activeGroup.members?.find(m => (m.user?._id || m.user) === user._id);
    return m?.role === 'admin';
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/penalties', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties', activeGroup?._id] });
      setShowForm(false);
      setForm({ userId: '', amount: '', reason: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), note: '' });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Failed to create penalty'),
  });
  const creating = createMutation.isPending;

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.userId) return setFormError('Select a member');
    if (!form.amount || Number(form.amount) <= 0) return setFormError('Enter a valid amount');
    if (!form.reason.trim()) return setFormError('Reason is required');
    createMutation.mutate({
      groupId: activeGroup._id,
      userId:  form.userId,
      amount:  form.amount,
      reason:  form.reason,
      month:   form.month,
      year:    form.year,
      note:    form.note,
    });
    toast.success('Penalty issued.');
  };

  const handleStatus = async (id, status) => {
    try {
      await api.patch(`/penalties/${id}/status`, { status });
      queryClient.invalidateQueries({ queryKey: ['penalties', activeGroup?._id] });
      toast.success(`Penalty marked as ${status}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update penalty.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this penalty?')) return;
    try {
      await api.delete(`/penalties/${id}`);
      queryClient.invalidateQueries({ queryKey: ['penalties', activeGroup?._id] });
      toast.success('Penalty deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete.');
    }
  };

  const pending = penalties.filter(p => p.status === 'pending');
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalAll     = penalties.reduce((s, p) => s + p.amount, 0);

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)', fontFamily: 'var(--font-sans)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>No circle selected</h3>
        <p style={{ fontSize: 14, color: 'var(--ct-text-3)', marginBottom: 20 }}>Select a circle from My Circles to view penalties.</p>
        <Link to="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, background: 'var(--ct-gold)', color: '#0f0f14', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
          Go to My Circles
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Penalties
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
            Fines and late-payment charges — <strong style={{ color: 'var(--ct-text-2)' }}>{activeGroup.name}</strong>
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'var(--ct-gold)', color: '#0f0f14',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Issue Penalty
          </button>
        )}
      </div>

      {/* Stats */}
      {penalties.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Issued',  value: penalties.length,  color: 'var(--ct-indigo)' },
            { label: 'Pending',       value: pending.length,    color: '#d97706' },
            { label: 'Pending (₦)',   value: `₦${totalPending.toLocaleString()}`, color: '#d97706' },
            { label: 'Total (₦)',     value: `₦${totalAll.toLocaleString()}`,     color: 'var(--ct-rose)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--ct-shadow)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && isAdmin() && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '22px 24px', marginBottom: 20, boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(225,29,72,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 16px' }}>Issue a Penalty</h3>
          {formError && (
            <div style={{ padding: '9px 13px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.22)', color: '#e11d48' }}>{formError}</div>
          )}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Member *</label>
                <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select member…</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount (₦) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" min="1" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Month</label>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} min="2020" max="2100" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Reason *</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Late payment — paid 5 days after deadline" style={inputStyle} required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Note <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0, fontSize: 10 }}>(optional)</span></label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={creating} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: creating ? '#e8e4dc' : '#e11d48', color: creating ? 'var(--ct-text-3)' : '#fff', fontSize: 13.5, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}>
                {creating ? 'Issuing…' : 'Issue Penalty'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #e2e0da', background: 'transparent', color: 'var(--ct-text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plan gate notice */}
      {!loading && penalties.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(225,29,72,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>No penalties yet</h3>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
            {isAdmin() ? 'Issue a penalty to a member using the button above.' : 'No penalties have been issued in this circle.'}
          </p>
        </div>
      )}

      {/* Penalty list */}
      {!loading && penalties.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {penalties.map(p => {
            const sc = STATUS_CFG[p.status] || STATUS_CFG.pending;
            return (
              <div key={p._id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: getAvatarGradient(p.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {getInitials(p.user?.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.01em' }}>{p.user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>
                      {p.reason}
                      {p.month && <span style={{ marginLeft: 8 }}>· {MONTHS[p.month - 1]} {p.year}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: p.status === 'pending' ? '#e11d48' : 'var(--ct-text-3)' }}>
                    ₦{p.amount.toLocaleString()}
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontSize: 11.5, fontWeight: 700 }}>
                    {sc.label}
                  </span>

                  {isAdmin() && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(p._id, 'paid')}   style={actionBtn('rgba(5,150,105,0.08)','rgba(5,150,105,0.25)','#047857')}>Paid</button>
                          <button onClick={() => handleStatus(p._id, 'waived')} style={actionBtn('rgba(100,100,130,0.07)','rgba(100,100,130,0.2)','var(--ct-text-3)')}>Waive</button>
                          <button onClick={() => handleDelete(p._id)}          style={actionBtn('rgba(225,29,72,0.07)','rgba(225,29,72,0.2)','#be123c')}>Delete</button>
                        </>
                      )}
                      {p.status !== 'pending' && (
                        <button onClick={() => handleStatus(p._id, 'pending')} style={actionBtn('#faf9f6','rgba(0,0,0,0.09)','var(--ct-text-2)')}>Revert</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const actionBtn = (bg, border, color) => ({
  padding: '5px 11px', borderRadius: 7,
  border: `1px solid ${border}`, background: bg,
  color, fontSize: 11.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font-sans)',
});
