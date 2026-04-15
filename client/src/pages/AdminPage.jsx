import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import { useToast } from '../context/ToastContext';
import { useGroup } from '../context/GroupContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'], ['#059669','#0d9488'],
  ['#d97706','#b45309'], ['#e11d48','#be123c'], ['#0ea5e9','#0284c7'],
];
function getAvatarGradient(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}

// ── Contributions tab ─────────────────────────────────────────────────────────

function ContributionsTab() {
  const now   = new Date();
  const toast = useToast();
  const { activeGroup } = useGroup();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modal, setModal] = useState(null);
  // Rejection note modal
  const [rejectTarget, setRejectTarget] = useState(null); // { id }
  const [rejectNote,   setRejectNote]   = useState('');
  const [rejecting,    setRejecting]    = useState(false);

  // pagination
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchContributions = async (p = page) => {
    setLoading(true);
    setFetchError('');
    try {
      const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
      const { data } = await api.get(
        `/contributions?month=${month}&year=${year}&page=${p}&limit=${LIMIT}${groupParam}`
      );
      setContributions(data.docs);
      setTotal(data.total);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load contributions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); fetchContributions(1); }, [month, year, activeGroup]);

  const goPage = (p) => { setPage(p); fetchContributions(p); };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleVerify = async (id) => {
    try {
      const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
      setContributions(prev => prev.map(c => c._id === id ? data : c));
      toast.success('Contribution verified.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    }
  };

  const openRejectModal = (id) => { setRejectTarget({ id }); setRejectNote(''); };
  const closeRejectModal = () => { setRejectTarget(null); setRejectNote(''); };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const { data } = await api.patch(`/contributions/${rejectTarget.id}/status`, {
        status: 'rejected',
        rejectionNote: rejectNote.trim(),
      });
      setContributions(prev => prev.map(c => c._id === rejectTarget.id ? data : c));
      toast.success('Contribution rejected and member notified.');
      closeRejectModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setRejecting(false);
    }
  };

  const openModal = (c) => {
    if (!c.proofImage) return;
    setModal({
      proofUrl: c.proofImage,
      memberName: c.user?.name,
      month, year,
      submittedDate: c.createdAt,
      status: c.status,
    });
  };

  const pending   = contributions.filter(c => c.status === 'pending');
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      {/* Active group banner */}
      {activeGroup && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(212,160,23,0.08)',
          border: '1px solid rgba(212,160,23,0.2)',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--ct-text-2)' }}>
            Viewing circle: <strong style={{ color: 'var(--ct-text-1)' }}>{activeGroup.name}</strong>
          </span>
        </div>
      )}

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={prevMonth} style={navBtnStyle}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ct-text-1)', minWidth: 200, textAlign: 'center', margin: 0, letterSpacing: '-0.01em' }}>
          {MONTHS[month - 1]} {year}
        </h2>
        <button onClick={nextMonth} style={navBtnStyle}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>
      ) : fetchError ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{fetchError}</div>
          <button onClick={() => fetchContributions()} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>Try again</button>
        </div>
      ) : (
        <>
          {/* Pending section */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em' }}>Pending Review</h3>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', color: 'var(--ct-amber)', fontSize: 12, fontWeight: 700 }}>{pending.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map(c => (
                  <div key={c._id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: getAvatarGradient(c.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {getInitials(c.user?.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.01em' }}>{c.user?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ct-emerald)' }}>₦{c.amount.toLocaleString()}</span>
                          {' '}· Submitted {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.proofImage && <button onClick={() => openModal(c)} style={actionBtnStyle('#faf9f6','rgba(0,0,0,0.09)','var(--ct-text-2)')}>View</button>}
                      <button onClick={() => handleVerify(c._id)} style={actionBtnStyle('rgba(5,150,105,0.08)','rgba(5,150,105,0.25)','#047857')}>Verify</button>
                      <button onClick={() => openRejectModal(c._id)} style={actionBtnStyle('rgba(225,29,72,0.08)','rgba(225,29,72,0.25)','#be123c')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 40px', background: '#fff', borderRadius: 18, boxShadow: 'var(--ct-shadow)', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--ct-emerald)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-emerald)', marginBottom: 6, letterSpacing: '-0.01em' }}>All caught up!</h3>
              <p style={{ fontSize: 14, color: 'var(--ct-text-3)' }}>No pending payments to review for this month.</p>
            </div>
          )}

          {/* All submissions table */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em' }}>All Submissions</h3>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)', color: 'var(--ct-indigo)', fontSize: 12, fontWeight: 700 }}>{total}</span>
          </div>

          {contributions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '48px 0', background: '#fff', borderRadius: 14, boxShadow: 'var(--ct-shadow)', fontSize: 14 }}>No submissions for this month.</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--ct-shadow)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#faf9f6' }}>
                    {['Member','Amount','Date','Status','Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--ct-text-3)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c, i) => (
                    <tr key={c._id} style={{ background: i % 2 === 0 ? '#fff' : '#fdfcfa' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: getAvatarGradient(c.user?.name), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(c.user?.name)}</div>
                          <span style={{ fontWeight: 600 }}>{c.user?.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ct-emerald)' }}>₦{c.amount.toLocaleString()}</td>
                      <td style={{ ...tdStyle, color: 'var(--ct-text-3)' }}>{new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={tdStyle}><StatusBadge status={c.status} /></td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {c.proofImage && <button onClick={() => openModal(c)} style={smallBtnStyle('#faf9f6','rgba(0,0,0,0.09)','var(--ct-text-2)')}>View</button>}
                          {c.status !== 'verified'  && <button onClick={() => handleVerify(c._id)}         style={smallBtnStyle('rgba(5,150,105,0.1)','none','#047857')}>Verify</button>}
                          {c.status !== 'rejected'  && <button onClick={() => openRejectModal(c._id)}      style={smallBtnStyle('rgba(225,29,72,0.1)','none','#be123c')}>Reject</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 18px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <button onClick={() => goPage(page - 1)} disabled={page === 1} style={pageBtnStyle(page === 1)}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => goPage(p)} style={{ ...pageBtnStyle(false), background: p === page ? 'var(--ct-gold)' : '#faf9f6', color: p === page ? '#0f0f14' : 'var(--ct-text-2)', fontWeight: p === page ? 700 : 500 }}>{p}</button>
                  ))}
                  <button onClick={() => goPage(page + 1)} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>→</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}

      {/* Rejection note modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 6px' }}>Reject contribution</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: '0 0 18px' }}>
              Provide a reason so the member knows what to fix. This will be included in the notification email.
            </p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Proof image is blurry, please re-upload a clearer photo."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                fontSize: 13.5, fontFamily: 'var(--font-sans)',
                color: 'var(--ct-text-1)',
                resize: 'vertical', outline: 'none',
                background: '#faf9f6',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--ct-text-3)', marginTop: 4, marginBottom: 18 }}>
              {rejectNote.length}/500
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeRejectModal} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>Cancel</button>
              <button onClick={handleReject} disabled={rejecting} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#e11d48', color: '#fff', cursor: rejecting ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', opacity: rejecting ? 0.7 : 1 }}>
                {rejecting ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Role management tab ───────────────────────────────────────────────────────

function RolesTab() {
  const toast = useToast();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    api.get('/members')
      .then(({ data }) => setUsers(data))
      .catch(err => setFetchError(err.response?.data?.message || 'Failed to load members.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin';
    setUpdating(user._id);
    try {
      const { data } = await api.patch(`/members/${user._id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === data._id ? { ...u, role: data.role } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>;
  if (fetchError) return <div style={{ textAlign: 'center', color: 'var(--ct-rose)', padding: '60px 0', fontSize: 13.5 }}>{fetchError}</div>;

  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', marginTop: 0, marginBottom: 20 }}>
        Promote members to admin or demote admins to member. Admins can verify and reject contributions.
      </p>

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--ct-shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#faf9f6' }}>
              {['Member', 'Email', 'Current Role', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--ct-text-3)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u._id} style={{ background: i % 2 === 0 ? '#fff' : '#fdfcfa' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: getAvatarGradient(u.name), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(u.name)}</div>
                    <span style={{ fontWeight: 600, color: 'var(--ct-text-1)' }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--ct-text-3)' }}>{u.email}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20,
                    background: u.role === 'admin' ? 'rgba(212,160,23,0.1)' : 'rgba(79,70,229,0.07)',
                    border: `1px solid ${u.role === 'admin' ? 'rgba(212,160,23,0.25)' : 'rgba(79,70,229,0.15)'}`,
                    color: u.role === 'admin' ? '#b8860a' : 'var(--ct-indigo)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'capitalize',
                  }}>
                    {u.role === 'admin' && (
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    )}
                    {u.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={updating === u._id}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: updating === u._id ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                      border: u.role === 'admin'
                        ? '1px solid rgba(225,29,72,0.25)'
                        : '1px solid rgba(5,150,105,0.25)',
                      background: u.role === 'admin'
                        ? 'rgba(225,29,72,0.07)'
                        : 'rgba(5,150,105,0.07)',
                      color: u.role === 'admin' ? '#be123c' : '#047857',
                      opacity: updating === u._id ? 0.5 : 1,
                    }}
                  >
                    {updating === u._id
                      ? 'Saving…'
                      : u.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shared style helpers ──────────────────────────────────────────────────────

const navBtnStyle = {
  width: 36, height: 36, borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.09)',
  background: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--ct-text-2)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const actionBtnStyle = (bg, border, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '8px 14px', borderRadius: 9,
  border: `1px solid ${border}`,
  background: bg, color,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
});

const smallBtnStyle = (bg, border, color) => ({
  padding: '5px 10px', borderRadius: 6,
  border: border === 'none' ? 'none' : `1px solid ${border}`,
  background: bg, fontSize: 11,
  cursor: 'pointer', fontFamily: 'var(--font-sans)',
  color, fontWeight: 600,
});

const pageBtnStyle = (disabled) => ({
  padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.09)',
  background: '#faf9f6', color: 'var(--ct-text-2)',
  fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

const tdStyle = {
  padding: '14px 18px',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
  color: 'var(--ct-text-1)',
};

// ── Main AdminPage ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'contributions', label: 'Contributions' },
  { id: 'roles',         label: 'Role Management' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('contributions');

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#fff', borderRadius: 12, padding: 4, boxShadow: 'var(--ct-shadow)', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none',
              background: activeTab === tab.id ? 'var(--ct-gold)' : 'transparent',
              color: activeTab === tab.id ? '#0f0f14' : 'var(--ct-text-3)',
              fontSize: 13.5, fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.18s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contributions' && <ContributionsTab />}
      {activeTab === 'roles'         && <RolesTab />}
    </div>
  );
}
