const config = {
  verified: {
    bg: 'rgba(5,150,105,0.10)', border: 'rgba(5,150,105,0.22)',
    color: '#047857', dot: '#10b981', label: 'Verified',
  },
  pending: {
    bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.22)',
    color: '#92650a', dot: '#f59e0b', label: 'Pending',
  },
  rejected: {
    bg: 'rgba(225,29,72,0.10)', border: 'rgba(225,29,72,0.22)',
    color: '#be123c', dot: '#f43f5e', label: 'Rejected',
  },
  unpaid: {
    bg: 'rgba(100,100,140,0.07)', border: 'rgba(100,100,140,0.15)',
    color: '#5a5a80', dot: '#8888a8', label: 'Not Paid',
  },
  late: {
    bg: 'rgba(225,29,72,0.10)', border: 'rgba(225,29,72,0.22)',
    color: '#be123c', dot: '#f43f5e', label: 'Late',
  },
};

export default function StatusBadge({ status, isLate }) {
  const resolvedStatus = (isLate && status === 'pending') ? 'late' : status;
  const c = config[resolvedStatus] || config.unpaid;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 20, fontSize: 11.5,
      fontWeight: 600, letterSpacing: '0.01em',
      background: c.bg, color: c.color,
      border: `1.5px solid ${c.border}`,
      fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot, flexShrink: 0,
        boxShadow: `0 0 4px ${c.dot}80`,
      }} />
      {c.label}
    </span>
  );
}
