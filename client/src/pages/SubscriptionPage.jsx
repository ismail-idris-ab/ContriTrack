import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const PLAN_META = {
  free:        { label: 'Free',        color: '#52526e', bg: 'rgba(82,82,110,0.10)'  },
  pro:         { label: 'Pro',         color: '#d4a017', bg: 'rgba(212,160,23,0.10)' },
  coordinator: { label: 'Coordinator', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)'  },
};

const UPGRADE_PRICES = {
  pro_monthly:         3500,
  pro_annual:          35000,
  coordinator_monthly: 10000,
  coordinator_annual:  100000,
};

export default function SubscriptionPage() {
  const { user, login } = useAuth();
  const navigate         = useNavigate();
  const [params]         = useSearchParams();

  const [status,    setStatus]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling,setCancelling]= useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [cycle,     setCycle]     = useState('monthly');

  const targetPlan = params.get('upgrade') || null;
  const refParam   = params.get('ref')     || null;

  // Load current subscription status
  useEffect(() => {
    async function loadStatus() {
      try {
        const { data } = await api.get('/subscription/status');
        setStatus(data);
      } catch {
        setError('Failed to load subscription status.');
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  // Handle Paystack callback — verify payment reference from URL
  useEffect(() => {
    if (!refParam) return;

    async function verify() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/subscription/verify/${refParam}`);
        setSuccess(`Payment confirmed! You are now on the ${data.plan} plan.`);
        setStatus(prev => ({ ...prev, plan: data.plan, status: 'active', currentPeriodEnd: data.currentPeriodEnd }));
        const stored = JSON.parse(localStorage.getItem('user') || 'null');
        if (stored) {
          stored.subscription = { plan: data.plan, status: 'active' };
          login(stored);
        }
        navigate('/subscription', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Payment verification failed. Contact support.');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [refParam]);

  async function handleUpgrade(plan) {
    setUpgrading(true);
    setError('');
    try {
      const { data } = await api.post('/subscription/initialize', { plan, billingCycle: cycle });
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to payment gateway.');
    } finally {
      setUpgrading(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel your subscription? Your plan stays active until the end of the billing period.')) return;
    setCancelling(true);
    setError('');
    try {
      const { data } = await api.post('/subscription/cancel');
      setSuccess(data.message);
      setStatus(prev => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation request failed.');
    } finally {
      setCancelling(false);
    }
  }

  const currentPlan = status?.plan || 'free';
  const meta        = PLAN_META[currentPlan];
  const periodEnd   = status?.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ color: 'var(--ct-text-3)', fontSize: 14 }}>Loading subscription…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px 0 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 30, fontWeight: 700,
          color: 'var(--ct-text-1)',
          margin: '0 0 6px',
        }}>
          Subscription
        </h1>
        <p style={{ color: 'var(--ct-text-3)', fontSize: 14, margin: 0 }}>
          Manage your plan and billing
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.20)',
          color: '#e11d48', fontSize: 13.5,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.20)',
          color: '#059669', fontSize: 13.5,
        }}>
          {success}
        </div>
      )}

      {/* Current plan card */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: `1px solid ${meta.bg}`,
        padding: '24px 26px',
        marginBottom: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ct-text-3)', marginBottom: 8 }}>
              Current Plan
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28, fontWeight: 700,
                color: meta.color,
              }}>
                {meta.label}
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: 6,
                background: meta.bg,
                color: meta.color,
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {status?.status || 'active'}
              </span>
            </div>
          </div>

          {currentPlan !== 'free' && periodEnd && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ct-text-3)', marginBottom: 4 }}>
                {status?.status === 'cancelled' ? 'Access until' : 'Renews on'}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15, fontWeight: 600,
                color: 'var(--ct-text-1)',
              }}>
                {periodEnd.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {currentPlan !== 'free' && status?.status === 'active' && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid rgba(225,29,72,0.25)',
                background: 'transparent',
                color: '#e11d48',
                fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.18s ease',
              }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade options */}
      {currentPlan !== 'coordinator' && (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.07)',
          padding: '24px 26px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 4 }}>
              Upgrade your plan
            </div>
            <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5, margin: 0 }}>
              Unlock more features for your savings circle.
            </p>
          </div>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex', gap: 0,
            background: '#f0ece4', borderRadius: 9, padding: 3,
            border: '1px solid rgba(0,0,0,0.07)',
            marginBottom: 20,
          }}>
            {['monthly', 'annual'].map(c => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                style={{
                  padding: '6px 16px', borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12.5, fontWeight: 600,
                  background: cycle === c ? '#fff' : 'transparent',
                  color: cycle === c ? 'var(--ct-text-1)' : 'var(--ct-text-3)',
                  boxShadow: cycle === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {c === 'annual' && (
                  <span style={{ marginLeft: 6, color: '#059669', fontSize: 10.5, fontWeight: 700 }}>
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Upgrade cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {currentPlan === 'free' && (
              <UpgradeCard
                plan="pro"
                cycle={cycle}
                price={UPGRADE_PRICES[`pro_${cycle}`]}
                color="#d4a017"
                features={['Unlimited members', 'WhatsApp reminders', 'Penalty tracking', 'Monthly reports']}
                onUpgrade={handleUpgrade}
                loading={upgrading}
                isTarget={targetPlan === 'pro'}
              />
            )}
            <UpgradeCard
              plan="coordinator"
              cycle={cycle}
              price={UPGRADE_PRICES[`coordinator_${cycle}`]}
              color="#4f46e5"
              features={['Up to 10 circles', 'CSV / PDF exports', 'Member trust scoring', 'Priority support']}
              onUpgrade={handleUpgrade}
              loading={upgrading}
              isTarget={targetPlan === 'coordinator'}
            />
          </div>

          <p style={{ color: 'var(--ct-text-3)', fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Payments are processed securely via Paystack. You can cancel at any time.
          </p>
        </div>
      )}

      {currentPlan === 'coordinator' && (
        <div style={{
          background: 'rgba(79,70,229,0.06)',
          borderRadius: 14,
          border: '1px solid rgba(79,70,229,0.18)',
          padding: '20px 24px',
          textAlign: 'center',
          color: '#4f46e5',
          fontSize: 14, fontWeight: 600,
        }}>
          You're on our highest plan. Thanks for supporting ContriTrack!
        </div>
      )}

      {/* View full pricing link */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button
          onClick={() => navigate('/pricing')}
          style={{
            background: 'none', border: 'none',
            color: 'var(--ct-text-3)', fontSize: 13,
            cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'var(--font-sans)',
          }}
        >
          View full pricing comparison
        </button>
      </div>
    </div>
  );
}

function UpgradeCard({ plan, cycle, price, color, features, onUpgrade, loading, isTarget }) {
  const label = plan === 'pro' ? 'Pro' : 'Coordinator';

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isTarget ? color + '66' : 'rgba(0,0,0,0.08)'}`,
      padding: '18px 20px',
      background: isTarget ? `rgba(${plan === 'pro' ? '212,160,23' : '79,70,229'},0.04)` : '#faf9f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 14,
      transition: 'border-color 0.2s ease',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 17, fontWeight: 700,
            color: 'var(--ct-text-1)',
          }}>
            ₦{price.toLocaleString()}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ct-text-3)', marginLeft: 3 }}>
              /{cycle === 'annual' ? 'yr' : 'mo'}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {features.map(f => (
            <span key={f} style={{ fontSize: 12, color: 'var(--ct-text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {f}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={loading}
        style={{
          padding: '10px 22px', borderRadius: 9,
          border: 'none',
          background: plan === 'pro'
            ? 'linear-gradient(135deg, #d4a017, #e8b820)'
            : 'linear-gradient(135deg, #4f46e5, #6d28d9)',
          color: '#fff',
          fontSize: 13, fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-sans)',
          whiteSpace: 'nowrap',
          boxShadow: plan === 'pro'
            ? '0 4px 14px rgba(212,160,23,0.30)'
            : '0 4px 14px rgba(79,70,229,0.30)',
          transition: 'opacity 0.18s ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Redirecting…' : `Upgrade to ${label}`}
      </button>
    </div>
  );
}
