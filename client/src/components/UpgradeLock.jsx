import { Link } from 'react-router-dom';

const PLAN_META = {
  pro:         { label: 'Pro',         color: '#d4a017', bg: 'rgba(212,160,23,0.10)'  },
  coordinator: { label: 'Coordinator', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)'   },
};

export default function UpgradeLock({ feature, requiredPlan = 'pro', description }) {
  const meta = PLAN_META[requiredPlan] ?? PLAN_META.pro;

  return (
    <div style={{
      maxWidth: 480,
      margin: '80px auto',
      textAlign: 'center',
      padding: '0 24px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        margin: '0 auto 20px',
        background: 'rgba(225,29,72,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>
        🔒
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20,
        background: meta.bg,
        color: meta.color,
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        {meta.label} feature
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 700,
        color: 'var(--ct-text-1)',
        margin: '0 0 10px',
      }}>
        {feature} requires {meta.label}
      </h2>

      {description && (
        <p style={{
          color: 'var(--ct-text-3)',
          fontSize: 14,
          lineHeight: 1.6,
          margin: '0 0 24px',
        }}>
          {description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to={`/subscription?upgrade=${requiredPlan}`}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: requiredPlan === 'coordinator'
              ? 'linear-gradient(135deg, #4f46e5, #6d28d9)'
              : 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
            color: requiredPlan === 'coordinator' ? '#fff' : '#1a1206',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 14,
            boxShadow: requiredPlan === 'coordinator'
              ? '0 4px 14px rgba(79,70,229,0.30)'
              : '0 4px 14px rgba(212,160,23,0.30)',
          }}
        >
          Upgrade to {meta.label}
        </Link>

        <Link
          to="/pricing"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.12)',
            color: 'var(--ct-text-2)',
            borderRadius: 10,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 13.5,
          }}
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}
