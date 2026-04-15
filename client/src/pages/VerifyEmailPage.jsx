import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const success = searchParams.get('success') === '1';

  const sendVerification = async () => {
    setSending(true);
    setError('');
    try {
      await api.post('/auth/send-verification');
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ct-page)', fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#ede8de', marginBottom: 12 }}>
            Email Verified!
          </h2>
          <p style={{ color: '#52526e', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Your email address has been verified successfully. You can now access all ContriTrack features.
          </p>
          <Link to="/dashboard" style={{
            display: 'inline-block', padding: '11px 28px',
            background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
            color: '#1a1206', borderRadius: 10, fontWeight: 700,
            textDecoration: 'none', fontSize: 14,
          }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ct-page)', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        maxWidth: 440, width: '100%', padding: '40px 32px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, textAlign: 'center',
        margin: '0 20px',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#ede8de', marginBottom: 8 }}>
          Verify your email
        </h2>
        <p style={{ color: '#52526e', fontSize: 13.5, lineHeight: 1.65, marginBottom: 24 }}>
          We'll send a verification link to <strong style={{ color: '#a8a8c0' }}>{user?.email}</strong>.
          Click the link in the email to verify your account.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
            color: '#f87171', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {sent ? (
          <div style={{
            padding: '14px 18px', borderRadius: 10,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#4ade80', fontSize: 13.5, fontWeight: 600, marginBottom: 20,
          }}>
            Verification email sent! Check your inbox (and spam folder).
          </div>
        ) : (
          <button
            onClick={sendVerification}
            disabled={sending}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 10, border: 'none',
              background: sending
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              color: sending ? '#52526e' : '#1a1206',
              fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              marginBottom: 16,
            }}
          >
            {sending ? 'Sending…' : 'Send Verification Email'}
          </button>
        )}

        <Link to="/dashboard" style={{ color: '#52526e', fontSize: 12.5, textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
