import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import ResubmitModal from '../components/ResubmitModal';
import { useGroup } from '../context/GroupContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_DOT = {
  verified: '#059669',
  pending:  '#d97706',
  rejected: '#e11d48',
};

const CYCLE_STATUS = {
  verified: { label: 'Verified',     color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)'   },
  pending:  { label: 'Pending',      color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.2)'   },
  rejected: { label: 'Rejected',     color: '#e11d48', bg: 'rgba(225,29,72,0.08)',   border: 'rgba(225,29,72,0.2)'   },
  missing:  { label: 'Not uploaded', color: 'var(--ct-text-3)', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.08)' },
};

export default function MyPaymentsPage() {
  const navigate = useNavigate();
  const { groups, selectGroup } = useGroup();
  const [payments, setPayments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  useEffect(() => {
    api.get('/contributions/mine')
      .then(({ data }) => setPayments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openModal = (p) => {
    if (!p.proofImage) return;
    setModal({
      proofUrl: p.proofImage,
      month: p.month, year: p.year,
      submittedDate: p.createdAt,
      status: p.status,
    });
  };

  const onResubmitSuccess = (updated) => {
    setPayments(prev => prev.map(p => p._id === updated._id ? updated : p));
  };

  const handleUploadForGroup = (group) => {
    selectGroup(group);
    navigate('/upload');
  };

  const totalVerified = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

  // Build per-group status for this month
  const thisMonthByGroup = groups.map(g => {
    const match = payments.find(
      p => String(p.group?._id || p.group) === String(g._id)
        && p.month === thisMonth && p.year === thisYear
    );
    return { group: g, payment: match || null, status: match ? match.status : 'missing' };
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>
          Loading…
        </div>
      ) : payments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 40px',
          background: '#fff', borderRadius: 18,
          boxShadow: 'var(--ct-shadow)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#faf9f6', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
            No payments yet
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)', marginBottom: 24 }}>
            Your contribution history will appear here once you make your first upload.
          </p>
          <Link
            to="/upload"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 10,
              background: 'var(--ct-gold)', color: '#0f0f14',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Upload first proof
          </Link>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div style={{
            background: 'var(--ct-sidebar)', borderRadius: 16,
            padding: '22px 24px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                Total Verified
              </p>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: '#f5f2ec', letterSpacing: '-0.02em' }}>
                ₦{totalVerified.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 4 }}>
                across {payments.filter(p => p.status === 'verified').length} verified payments
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 600, color: 'var(--ct-gold)', lineHeight: 1 }}>
                {payments.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 4 }}>total submissions</div>
            </div>
          </div>

          {/* This Month status bar — only shown when member belongs to groups */}
          {thisMonthByGroup.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
                {MONTHS[thisMonth - 1]} {thisYear} — Circle Status
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {thisMonthByGroup.map(({ group, status }) => {
                  const cfg = CYCLE_STATUS[status];
                  const isMissing = status === 'missing';
                  return (
                    <div
                      key={group._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 12,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                          {group.name}
                        </div>
                        <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginTop: 2 }}>
                          {cfg.label}
                        </div>
                      </div>
                      {isMissing && (
                        <button
                          onClick={() => handleUploadForGroup(group)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 7,
                            background: 'var(--ct-gold)', border: 'none',
                            color: '#0f0f14', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                          </svg>
                          Upload
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 23, top: 22, bottom: 22,
              width: 2,
              background: 'linear-gradient(to bottom, var(--ct-gold-dim), rgba(212,160,23,0.04))',
              zIndex: 0,
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payments.map((p, i) => (
                <div
                  key={p._id}
                  className="animate-fade-up"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: '#fff', borderRadius: 14,
                    padding: '16px 20px',
                    boxShadow: 'var(--ct-shadow)',
                    position: 'relative', zIndex: 1,
                    border: '1px solid rgba(0,0,0,0.04)',
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: STATUS_DOT[p.status] || '#c8c8d8',
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${STATUS_DOT[p.status] || '#c8c8d8'}33`,
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 15, fontWeight: 700,
                        color: 'var(--ct-text-1)',
                        letterSpacing: '-0.01em',
                      }}>
                        {MONTHS[p.month - 1]} {p.year}
                      </div>
                      {/* Group name pill */}
                      {p.group?.name && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: 'var(--ct-gold)',
                          background: 'rgba(212,160,23,0.1)',
                          border: '1px solid rgba(212,160,23,0.2)',
                          borderRadius: 5, padding: '2px 7px',
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap',
                        }}>
                          {p.group.name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 3 }}>
                      Submitted {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {p.status === 'rejected' && p.rejectionNote && (
                      <div style={{ fontSize: 11, color: '#e11d48', marginTop: 5, lineHeight: 1.4, maxWidth: 280 }}>
                        <span style={{ fontWeight: 700 }}>Reason: </span>{p.rejectionNote}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--ct-emerald)',
                    minWidth: 90, textAlign: 'right',
                  }}>
                    ₦{p.amount.toLocaleString()}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <StatusBadge status={p.status} />
                    {p.proofImage && (
                      <button
                        onClick={() => openModal(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.09)',
                          background: '#faf9f6', color: 'var(--ct-text-2)',
                          fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z"/>
                        </svg>
                        View
                      </button>
                    )}
                    {p.status === 'pending' && (
                      <button
                        onClick={() => setResubmitTarget({ ...p, _mode: 'replace' })}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(212,160,23,0.3)',
                          background: 'rgba(212,160,23,0.07)', color: 'var(--ct-gold)',
                          fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Replace
                      </button>
                    )}
                    {p.status === 'rejected' && (
                      <button
                        onClick={() => setResubmitTarget(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(225,29,72,0.25)',
                          background: 'rgba(225,29,72,0.06)', color: '#e11d48',
                          fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {modal && <ProofModal {...modal} onClose={() => setModal(null)} />}
      {resubmitTarget && (
        <ResubmitModal
          contribution={resubmitTarget}
          mode={resubmitTarget._mode || 'resubmit'}
          onClose={() => setResubmitTarget(null)}
          onSuccess={onResubmitSuccess}
        />
      )}
    </div>
  );
}
