import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ProofModal from '../components/ProofModal';
import ResubmitModal from '../components/ResubmitModal';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_DOT = {
  verified: '#059669',
  pending:  '#d97706',
  rejected: '#e11d48',
};

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);

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

  const totalVerified = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

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
            padding: '22px 24px', marginBottom: 20,
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
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 40, fontWeight: 600,
                color: 'var(--ct-gold)', lineHeight: 1,
              }}>
                {payments.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 4 }}>total submissions</div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
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
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15, fontWeight: 700,
                      color: 'var(--ct-text-1)',
                      letterSpacing: '-0.01em',
                    }}>
                      {MONTHS[p.month - 1]} {p.year}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 3 }}>
                      Submitted {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {p.status === 'rejected' && p.rejectionNote && (
                      <div style={{
                        fontSize: 11, color: '#e11d48',
                        marginTop: 5, lineHeight: 1.4,
                        maxWidth: 280,
                      }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={p.status} />
                    {p.proofImage && (
                      <button
                        onClick={() => openModal(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.09)',
                          background: '#faf9f6',
                          color: 'var(--ct-text-2)',
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
                    {p.status === 'rejected' && (
                      <button
                        onClick={() => setResubmitTarget(p)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(225,29,72,0.25)',
                          background: 'rgba(225,29,72,0.06)',
                          color: '#e11d48',
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
          onClose={() => setResubmitTarget(null)}
          onSuccess={onResubmitSuccess}
        />
      )}
    </div>
  );
}
