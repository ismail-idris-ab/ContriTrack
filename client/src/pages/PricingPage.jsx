import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    tagline: 'Get your circle started',
    color: '#52526e',
    border: 'rgba(82,82,110,0.3)',
    badge: null,
    features: [
      { label: '1 savings circle',         included: true  },
      { label: 'Up to 10 members',          included: true  },
      { label: 'Payout rotation tracking',  included: true  },
      { label: 'Basic dashboard',           included: true  },
      { label: '6 months payment history',  included: true  },
      { label: 'Penalty tracking',          included: false },
      { label: 'WhatsApp reminders',        included: false },
      { label: 'Monthly reports',           included: false },
      { label: 'CSV / PDF exports',         included: false },
      { label: 'Member trust scoring',      included: false },
      { label: 'Priority support',          included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: { monthly: 3500, annual: 35000 },
    tagline: 'For growing circles',
    color: '#d4a017',
    border: 'rgba(212,160,23,0.4)',
    badge: 'Most Popular',
    features: [
      { label: '1 savings circle',          included: true  },
      { label: 'Unlimited members',         included: true  },
      { label: 'Payout rotation tracking',  included: true  },
      { label: 'Full payment history',      included: true  },
      { label: 'Penalty tracking',          included: true  },
      { label: 'WhatsApp reminders',        included: true  },
      { label: 'Monthly reports',           included: true  },
      { label: 'CSV / PDF exports',         included: false },
      { label: 'Member trust scoring',      included: false },
      { label: 'Priority support',          included: false },
    ],
  },
  {
    key: 'coordinator',
    name: 'Coordinator',
    price: { monthly: 10000, annual: 100000 },
    tagline: 'For serious coordinators',
    color: '#4f46e5',
    border: 'rgba(79,70,229,0.4)',
    badge: 'Best Value',
    features: [
      { label: 'Up to 10 circles',          included: true  },
      { label: 'Unlimited members',         included: true  },
      { label: 'Payout rotation tracking',  included: true  },
      { label: 'Full payment history',      included: true  },
      { label: 'Penalty tracking',          included: true  },
      { label: 'WhatsApp reminders',        included: true  },
      { label: 'Monthly reports',           included: true  },
      { label: 'CSV / PDF exports',         included: true  },
      { label: 'Member trust scoring',      included: true  },
      { label: 'Priority support',          included: true  },
    ],
  },
];

function formatPrice(amount, cycle) {
  if (amount === 0) return '₦0';
  return `₦${amount.toLocaleString()}`;
}

function CheckIcon({ color }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#3a3a52" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [cycle, setCycle] = useState('monthly');
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentPlan = user?.subscription?.plan || 'free';

  function handleCTA(planKey) {
    if (!user) {
      navigate('/register');
      return;
    }
    if (planKey === 'free' || planKey === currentPlan) return;
    navigate(`/subscription?upgrade=${planKey}&cycle=${cycle}`);
  }

  function ctaLabel(planKey) {
    if (!user)           return 'Get started free';
    if (planKey === currentPlan) return 'Current plan';
    if (planKey === 'free')      return 'Downgrade to Free';
    if (currentPlan === 'free')  return `Upgrade to ${planKey === 'pro' ? 'Pro' : 'Coordinator'}`;
    return `Switch to ${planKey === 'pro' ? 'Pro' : 'Coordinator'}`;
  }

  const annualSavings = {
    pro:         3500 * 12 - 35000,
    coordinator: 10000 * 12 - 100000,
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 0 60px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 20,
          background: 'rgba(212,160,23,0.12)',
          border: '1px solid rgba(212,160,23,0.25)',
          color: '#d4a017',
          fontSize: 11.5, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Pricing
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38, fontWeight: 700,
          color: 'var(--ct-text-1)',
          lineHeight: 1.15,
          margin: '0 0 12px',
        }}>
          Simple, transparent pricing
        </h1>
        <p style={{
          color: 'var(--ct-text-2)',
          fontSize: 15.5,
          maxWidth: 480,
          margin: '0 auto 28px',
          lineHeight: 1.6,
        }}>
          One admin pays for the whole group. No per-member fees, no hidden charges.
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0,
          background: '#f0ece4',
          borderRadius: 10,
          padding: 4,
          border: '1px solid rgba(0,0,0,0.07)',
        }}>
          {['monthly', 'annual'].map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.18s ease',
                background: cycle === c ? '#fff' : 'transparent',
                color: cycle === c ? 'var(--ct-text-1)' : 'var(--ct-text-3)',
                boxShadow: cycle === c ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
              {c === 'annual' && (
                <span style={{
                  marginLeft: 7,
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: 'rgba(5,150,105,0.12)',
                  color: '#059669',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  2 months free
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20,
        alignItems: 'start',
      }}>
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan;
          const isFeatured    = plan.key === 'pro';
          const price         = plan.price[cycle];
          const saving        = cycle === 'annual' && plan.key !== 'free' ? annualSavings[plan.key] : 0;

          return (
            <div
              key={plan.key}
              style={{
                background: '#fff',
                borderRadius: 16,
                border: `1px solid ${isCurrentPlan ? plan.border : 'rgba(0,0,0,0.07)'}`,
                padding: '28px 26px 26px',
                position: 'relative',
                boxShadow: isFeatured
                  ? '0 8px 32px rgba(212,160,23,0.12), 0 2px 8px rgba(0,0,0,0.06)'
                  : '0 2px 8px rgba(0,0,0,0.04)',
                transform: isFeatured ? 'translateY(-6px)' : 'none',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: -12, left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 14px',
                  borderRadius: 20,
                  background: plan.key === 'pro'
                    ? 'linear-gradient(90deg, #d4a017, #f0c842)'
                    : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                  color: '#fff',
                  fontSize: 10.5, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name + tagline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22, fontWeight: 700,
                    color: 'var(--ct-text-1)',
                  }}>
                    {plan.name}
                  </span>
                  {isCurrentPlan && (
                    <span style={{
                      padding: '2px 9px', borderRadius: 6,
                      background: 'rgba(5,150,105,0.10)',
                      border: '1px solid rgba(5,150,105,0.22)',
                      color: '#059669',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--ct-text-3)', fontSize: 13, margin: 0 }}>
                  {plan.tagline}
                </p>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 6 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 36, fontWeight: 700,
                  color: plan.key === 'free' ? 'var(--ct-text-2)' : plan.color,
                  letterSpacing: '-0.02em',
                }}>
                  {formatPrice(price, cycle)}
                </span>
                {price > 0 && (
                  <span style={{ color: 'var(--ct-text-3)', fontSize: 13, marginLeft: 4 }}>
                    / {cycle === 'annual' ? 'year' : 'month'}
                  </span>
                )}
              </div>

              {/* Annual savings */}
              {saving > 0 && (
                <div style={{
                  fontSize: 12, color: '#059669', fontWeight: 600,
                  marginBottom: 20,
                }}>
                  Save ₦{saving.toLocaleString()} vs monthly billing
                </div>
              )}
              {saving === 0 && <div style={{ marginBottom: 20 }} />}

              {/* CTA */}
              <button
                onClick={() => handleCTA(plan.key)}
                disabled={isCurrentPlan}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  borderRadius: 10,
                  border: plan.key === 'free'
                    ? '1px solid rgba(0,0,0,0.12)'
                    : 'none',
                  background: isCurrentPlan
                    ? 'rgba(0,0,0,0.04)'
                    : plan.key === 'free'
                    ? 'transparent'
                    : plan.key === 'pro'
                    ? 'linear-gradient(135deg, #d4a017, #e8b820)'
                    : 'linear-gradient(135deg, #4f46e5, #6d28d9)',
                  color: isCurrentPlan
                    ? 'var(--ct-text-3)'
                    : plan.key === 'free'
                    ? 'var(--ct-text-2)'
                    : '#fff',
                  fontSize: 13.5, fontWeight: 700,
                  cursor: isCurrentPlan ? 'default' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.01em',
                  transition: 'all 0.18s ease',
                  boxShadow: !isCurrentPlan && plan.key !== 'free'
                    ? plan.key === 'pro'
                      ? '0 4px 14px rgba(212,160,23,0.30)'
                      : '0 4px 14px rgba(79,70,229,0.30)'
                    : 'none',
                }}
              >
                {ctaLabel(plan.key)}
              </button>

              {/* Divider */}
              <div style={{
                margin: '22px 0 18px',
                height: 1,
                background: 'rgba(0,0,0,0.06)',
              }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f.label} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: f.included ? 1 : 0.4,
                  }}>
                    {f.included
                      ? <CheckIcon color={plan.color} />
                      : <XIcon />
                    }
                    <span style={{
                      fontSize: 13.5,
                      color: f.included ? 'var(--ct-text-1)' : 'var(--ct-text-3)',
                      fontWeight: f.included ? 500 : 400,
                    }}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p style={{
        textAlign: 'center',
        color: 'var(--ct-text-3)',
        fontSize: 13,
        marginTop: 40,
      }}>
        All prices in Nigerian Naira (₦). Payments processed securely via Paystack.
        Cancel anytime — your plan remains active until the end of the billing period.
      </p>
    </div>
  );
}
