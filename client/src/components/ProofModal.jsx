import StatusBadge from './StatusBadge';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ProofModal({ proofUrl, memberName, month, year, submittedDate, status, rejectionHistory, onClose, trustGrade, trustGradeColor, trustVerifiedCount, trustTotalMonths }) {
  if (!proofUrl) return null;

  const rows = [
    memberName && { label: 'Member',    value: memberName },
    month && year && { label: 'Period',  value: `${MONTHS[month - 1]} ${year}` },
    submittedDate && { label: 'Submitted', value: new Date(submittedDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) },
  ].filter(Boolean);

  return (
    <div
      className="animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,10,16,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        backdropFilter: 'blur(6px)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        className="animate-fade-up"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 440, width: '100%',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Gold top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light), var(--ct-gold))' }} />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18, fontWeight: 700,
              color: 'var(--ct-text-1)', margin: 0,
              letterSpacing: '-0.01em',
            }}>
              Payment Proof
            </h3>
            {memberName && (
              <p style={{ fontSize: 12, color: 'var(--ct-text-3)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                {memberName}
                {trustGrade && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 8px', borderRadius: 12,
                    background: `${trustGradeColor}22`, color: trustGradeColor,
                    fontSize: 11, fontWeight: 700,
                    border: `1px solid ${trustGradeColor}44`,
                  }}>
                    {trustGrade}
                    {trustVerifiedCount != null && trustTotalMonths != null && (
                      <span style={{ marginLeft: 4, fontWeight: 400, opacity: 0.8 }}>
                        · {trustVerifiedCount}/{trustTotalMonths}
                      </span>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#f5f2ec',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ct-text-2)', fontSize: 16, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Proof image */}
          <div style={{
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.07)',
            marginBottom: 20, background: '#faf9f6',
          }}>
            <img
              src={proofUrl}
              alt="Proof of payment"
              style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Info rows */}
          <div style={{
            background: '#faf9f6', borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden', marginBottom: 16,
          }}>
            {rows.map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ct-text-3)', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ct-text-1)' }}>{row.value}</span>
              </div>
            ))}
            {status && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 16px',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ct-text-3)', fontWeight: 500 }}>Status</span>
                <StatusBadge status={status} />
              </div>
            )}
          </div>

          {rejectionHistory && rejectionHistory.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px',
              }}>
                Prior rejections ({rejectionHistory.length})
              </p>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                maxHeight: 200, overflowY: 'auto',
              }}>
                {rejectionHistory.map((h, i) => (
                  <div key={i} style={{
                    background: 'rgba(225,29,72,0.05)',
                    border: '1px solid rgba(225,29,72,0.12)',
                    borderRadius: 10, padding: '10px 12px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <a
                      href={h.proofImage}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flexShrink: 0, width: 44, height: 44,
                        borderRadius: 8, overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)',
                        display: 'block',
                      }}
                    >
                      <img
                        src={h.proofImage}
                        alt={`Rejected proof ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </a>
                    <div style={{ flex: 1 }}>
                      {h.rejectionNote && (
                        <p style={{ fontSize: 12, color: 'var(--ct-text-1)', margin: '0 0 3px', lineHeight: 1.4 }}>
                          {h.rejectionNote}
                        </p>
                      )}
                      {h.rejectedAt && (
                        <p style={{ fontSize: 11, color: 'var(--ct-text-3)', margin: 0 }}>
                          {new Date(h.rejectedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px',
              borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
              fontSize: 13, color: 'var(--ct-text-2)', textDecoration: 'none',
              fontWeight: 600, transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Open full size
          </a>
        </div>
      </div>
    </div>
  );
}
