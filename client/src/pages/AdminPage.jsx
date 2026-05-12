import { useEffect, useState } from 'react';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import { useToast } from '../context/ToastContext';
import { useGroup } from '../context/GroupContext';
import { MONTHS } from '../utils/dateUtils';
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';

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
  const [verifying,    setVerifying]    = useState(null);

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
    if (verifying) return;
    setVerifying(id);
    try {
      const { data } = await api.patch(`/contributions/${id}/status`, { status: 'verified' });
      setContributions(prev => prev.map(c => c._id === id ? data : c));
      toast.success('Contribution verified.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
      console.error('[admin verify]', err.message);
    } finally {
      setVerifying(null);
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
      rejectionHistory: c.rejectionHistory || [],
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Skeleton width={44} height={44} borderRadius={12} />
              <div style={{ flex: 1 }}>
                <Skeleton height={13} width={140} style={{ marginBottom: 8 }} />
                <Skeleton height={10} width={100} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Skeleton width={56} height={30} borderRadius={8} />
                <Skeleton width={56} height={30} borderRadius={8} />
              </div>
            </div>
          ))}
        </div>
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
                      <button
                        onClick={() => handleVerify(c._id)}
                        disabled={verifying === c._id}
                        style={{
                          ...actionBtnStyle('rgba(5,150,105,0.08)', 'rgba(5,150,105,0.25)', '#047857'),
                          opacity: verifying === c._id ? 0.6 : 1,
                          cursor: verifying === c._id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {verifying === c._id ? 'Verifying…' : 'Verify'}
                      </button>
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
              <div className="ct-table-wrap">
              <table className="ct-table-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 580 }}>
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
                      <td data-label="Member" style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: getAvatarGradient(c.user?.name), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(c.user?.name)}</div>
                          <span style={{ fontWeight: 600 }}>{c.user?.name}</span>
                        </div>
                      </td>
                      <td data-label="Amount" style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ct-emerald)' }}>₦{c.amount.toLocaleString()}</td>
                      <td data-label="Date" style={{ ...tdStyle, color: 'var(--ct-text-3)' }}>{new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td data-label="Status" style={tdStyle}><StatusBadge status={c.status} />{c.isLate && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(217,119,6,0.10)', color: '#d97706',
                            fontSize: 11, fontWeight: 700, marginLeft: 6,
                            border: '1px solid rgba(217,119,6,0.2)',
                          }}>
                            Late{c.lateDaysOverdue > 0 ? ` +${c.lateDaysOverdue}d` : ''}
                          </span>
                        )}</td>
                      <td data-label="Actions" style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {c.proofImage && <button onClick={() => openModal(c)} style={smallBtnStyle('#faf9f6','rgba(0,0,0,0.09)','var(--ct-text-2)')}>View</button>}
                          {c.status !== 'verified' && (
                            <button
                              onClick={() => handleVerify(c._id)}
                              disabled={verifying === c._id}
                              style={{
                                ...smallBtnStyle('rgba(5,150,105,0.1)', 'none', '#047857'),
                                opacity: verifying === c._id ? 0.6 : 1,
                                cursor: verifying === c._id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {verifying === c._id ? 'Verifying…' : 'Verify'}
                            </button>
                          )}
                          {c.status !== 'rejected'  && <button onClick={() => openRejectModal(c._id)}      style={smallBtnStyle('rgba(225,29,72,0.1)','none','#be123c')}>Reject</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={40} height={40} borderRadius={10} />
            <div>
              <Skeleton height={13} width={120} style={{ marginBottom: 6 }} />
              <Skeleton height={10} width={160} />
            </div>
          </div>
          <Skeleton width={80} height={30} borderRadius={8} />
        </div>
      ))}
    </div>
  );
  if (fetchError) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{fetchError}</div>
      <button
        onClick={() => { setFetchError(''); setLoading(true); api.get('/members').then(({ data }) => setUsers(data)).catch(err => setFetchError(err.response?.data?.message || 'Failed to load members.')).finally(() => setLoading(false)); }}
        style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}
      >
        Try again
      </button>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', marginTop: 0, marginBottom: 20 }}>
        Promote members to admin or demote admins to member. Admins can verify and reject contributions.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div
            key={u._id}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '14px 18px',
              boxShadow: 'var(--ct-shadow)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: avatar + name + email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: getAvatarGradient(u.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(u.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ct-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.email}
                </div>
              </div>
            </div>

            {/* Right: role badge + action button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: u.role === 'admin' ? 'rgba(212,160,23,0.1)' : 'rgba(79,70,229,0.07)',
                border: `1px solid ${u.role === 'admin' ? 'rgba(212,160,23,0.25)' : 'rgba(79,70,229,0.15)'}`,
                color: u.role === 'admin' ? '#b8860a' : 'var(--ct-indigo)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}>
                {u.role === 'admin' && (
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                )}
                {u.role}
              </span>

              <button
                onClick={() => toggleRole(u)}
                disabled={updating === u._id}
                style={{
                  padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
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
                  whiteSpace: 'nowrap',
                }}
              >
                {updating === u._id
                  ? 'Saving…'
                  : u.role === 'admin' ? 'Demote' : 'Promote'}
              </button>
            </div>
          </div>
        ))}
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

// ── Audit Log tab ─────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  'contribution.verified':      { icon: '✅', color: '#059669', bg: 'rgba(5,150,105,0.10)',  label: 'verified contribution'      },
  'contribution.rejected':      { icon: '❌', color: '#e11d48', bg: 'rgba(225,29,72,0.10)',  label: 'rejected contribution'      },
  'contribution.resubmitted':   { icon: '🔄', color: '#0284c7', bg: 'rgba(2,132,199,0.10)',  label: 'resubmitted contribution'   },
  'contribution.proof_replaced':{ icon: '📎', color: '#0284c7', bg: 'rgba(2,132,199,0.10)',  label: 'replaced proof'             },
  'member.added':               { icon: '👤', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', label: 'joined the circle'          },
  'member.removed':             { icon: '🚪', color: '#64748b', bg: 'rgba(100,116,139,0.10)',label: 'was removed from circle'    },
  'member.role_changed':        { icon: '🛡️', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)',  label: 'changed member role'        },
  'penalty.issued':             { icon: '⚠️', color: '#d97706', bg: 'rgba(217,119,6,0.10)',  label: 'issued a penalty'           },
  'penalty.status_changed':     { icon: '📋', color: '#d97706', bg: 'rgba(217,119,6,0.10)',  label: 'updated penalty status'     },
  'group.settings_changed':     { icon: '⚙️', color: '#d4a017', bg: 'rgba(212,160,23,0.10)', label: 'changed circle settings'    },
  'payout.paid':                { icon: '💸', color: '#059669', bg: 'rgba(5,150,105,0.10)',  label: 'marked payout as paid'      },
};

function timeAgoAudit(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function metaSummary(action, meta) {
  if (!meta) return null;
  if (action === 'contribution.verified' || action === 'contribution.rejected') {
    const parts = [];
    if (meta.amount) parts.push(`₦${Number(meta.amount).toLocaleString('en-NG')}`);
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.rejectionNote) parts.push(`"${meta.rejectionNote}"`);
    return parts.join(' · ') || null;
  }
  if (action === 'contribution.resubmitted') {
    const parts = [];
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.resubmissionCount) parts.push(`attempt #${meta.resubmissionCount + 1}`);
    return parts.join(' · ') || null;
  }
  if (action === 'member.added') {
    return meta.via === 'invite_code' ? 'via invite code' : null;
  }
  if (action === 'member.removed') {
    return meta.removedBy === 'self' ? 'left the circle' : 'removed by admin';
  }
  if (action === 'member.role_changed') {
    return `${meta.oldRole} → ${meta.newRole}`;
  }
  if (action === 'penalty.issued') {
    return `₦${Number(meta.amount || 0).toLocaleString('en-NG')} · ${meta.reason || ''}`;
  }
  if (action === 'penalty.status_changed') {
    return `${meta.oldStatus} → ${meta.newStatus}${meta.note ? ` · "${meta.note}"` : ''}`;
  }
  if (action === 'group.settings_changed') {
    return meta.fields?.length ? `Changed: ${meta.fields.join(', ')}` : null;
  }
  if (action === 'payout.paid') {
    const parts = [];
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.amount) parts.push(`₦${Number(meta.amount).toLocaleString('en-NG')}`);
    return parts.join(' · ') || null;
  }
  return null;
}

const AUDIT_ACTION_GROUPS = [
  { value: '', label: 'All events' },
  { value: 'contribution.verified', label: 'Verified' },
  { value: 'contribution.rejected', label: 'Rejected' },
  { value: 'contribution.resubmitted', label: 'Resubmitted' },
  { value: 'member.added', label: 'Member joined' },
  { value: 'member.removed', label: 'Member removed' },
  { value: 'member.role_changed', label: 'Role changed' },
  { value: 'penalty.issued', label: 'Penalty issued' },
  { value: 'penalty.status_changed', label: 'Penalty updated' },
  { value: 'payout.paid', label: 'Payout paid' },
  { value: 'group.settings_changed', label: 'Settings changed' },
];

function AuditTab({ groupId }) {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [total,      setTotal]      = useState(0);
  const [error,      setError]      = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');

  const fetchLogs = (p = 1, action = actionFilter, from = fromDate, to = toDate) => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    let url = `/audit?groupId=${groupId}&page=${p}&limit=20`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (from)   url += `&from=${encodeURIComponent(from)}`;
    if (to)     url += `&to=${encodeURIComponent(to)}`;
    api.get(url)
      .then(({ data }) => {
        setLogs(data.logs || []);
        setPages(data.pages || 1);
        setTotal(data.total || 0);
        setPage(p);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(1); }, [groupId]);

  const applyFilters = () => { fetchLogs(1, actionFilter, fromDate, toDate); };
  const clearFilters = () => {
    setActionFilter(''); setFromDate(''); setToDate('');
    fetchLogs(1, '', '', '');
  };

  const hasFilters = actionFilter || fromDate || toDate;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Skeleton width={38} height={38} borderRadius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton height={13} width={220} style={{ marginBottom: 8 }} />
            <Skeleton height={10} width={140} />
          </div>
          <Skeleton height={11} width={48} />
        </div>
      ))}
    </div>
  );
  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{error}</div>
      <button onClick={() => fetchLogs(1)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>Try again</button>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Event type</label>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff', cursor: 'pointer' }}
          >
            {AUDIT_ACTION_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff' }} />
        </div>
        <button onClick={applyFilters}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--ct-gold)', color: '#0f0f14', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', alignSelf: 'flex-end' }}>
          Filter
        </button>
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'var(--ct-text-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', alignSelf: 'flex-end' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
          {total} event{total !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
        </p>
      </div>

      {!logs.length ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 6 }}>No activity yet</h3>
          <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5 }}>Admin actions on this circle will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] || { icon: '📝', color: '#52526e', bg: 'rgba(82,82,110,0.1)', label: log.action };
            const summary = metaSummary(log.action, log.meta);
            return (
              <div key={log._id} style={{
                background: '#fff', borderRadius: 12, padding: '14px 18px',
                border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--ct-shadow)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ct-text-1)', lineHeight: 1.4 }}>
                    <span style={{ color: cfg.color }}>{log.adminId?.name || 'Member'}</span>
                    {' '}{cfg.label}
                    {log.targetUserId?.name && (
                      <span style={{ color: 'var(--ct-text-2)' }}> — {log.targetUserId.name}</span>
                    )}
                  </div>
                  {summary && (
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                      {summary}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ct-text-4)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                  {timeAgoAudit(log.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => fetchLogs(page - 1, actionFilter, fromDate, toDate)} disabled={page <= 1}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            ← Prev
          </button>
          <span style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--ct-text-3)' }}>{page} / {pages}</span>
          <button onClick={() => fetchLogs(page + 1, actionFilter, fromDate, toDate)} disabled={page >= pages}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1, fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'contributions', label: 'Contributions' },
  { id: 'roles',         label: 'Role Management' },
  { id: 'audit',         label: 'Audit Log' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('contributions');
  const { activeGroup } = useGroup();

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
      {activeTab === 'audit'         && <AuditTab groupId={activeGroup?._id} />}
    </div>
  );
}
