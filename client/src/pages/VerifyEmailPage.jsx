import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const inputRefs = useRef([]);

  const isNew = searchParams.get('new') === '1';

  // Auto-send OTP when arriving from registration
  useEffect(() => {
    if (isNew) resendOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resendOtp = async () => {
    setResending(true);
    setError('');
    setResent(false);
    try {
      await api.post('/auth/send-verification');
      setResent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setResending(false);
    }
  };

  const handleDigitChange = (index, value) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === 5) {
      const fullOtp = [...next].join('');
      if (fullOtp.length === 6) submitOtp(fullOtp);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputRefs.current[5]?.focus();
      submitOtp(pasted);
    }
    e.preventDefault();
  };

  const submitOtp = async (otp) => {
    setVerifying(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { otp });
      // Update the stored user so emailVerified becomes true
      const updated = { ...user, emailVerified: true };
      login(updated);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) return setError('Enter all 6 digits');
    submitOtp(otp);
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
          <p style={{ color: '#52526e', fontSize: 14, lineHeight: 1.6 }}>
            Taking you to your dashboard…
          </p>
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
        maxWidth: 420, width: '100%', padding: '40px 32px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, textAlign: 'center',
        margin: '0 20px',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#ede8de', marginBottom: 8 }}>
          {isNew ? 'One last step!' : 'Verify your email'}
        </h2>
        <p style={{ color: '#52526e', fontSize: 13.5, lineHeight: 1.65, marginBottom: 28 }}>
          {isNew
            ? <>We sent a 6-digit code to <strong style={{ color: '#a8a8c0' }}>{user?.email}</strong>. Enter it below to activate your account.</>
            : <>Enter the 6-digit code sent to <strong style={{ color: '#a8a8c0' }}>{user?.email}</strong>.</>
          }
        </p>

        <form onSubmit={handleSubmit}>
          {/* OTP digit boxes */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={verifying}
                style={{
                  width: 46, height: 54,
                  textAlign: 'center',
                  fontSize: 22, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 10,
                  border: error
                    ? '2px solid rgba(225,29,72,0.6)'
                    : d
                      ? '2px solid var(--ct-gold)'
                      : '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ede8de',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
              color: '#f87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {resent && !error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80', fontSize: 13,
            }}>
              New code sent! Check your inbox.
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || digits.join('').length !== 6}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 10, border: 'none',
              background: verifying || digits.join('').length !== 6
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              color: verifying || digits.join('').length !== 6 ? '#52526e' : '#1a1206',
              fontSize: 14, fontWeight: 700,
              cursor: verifying || digits.join('').length !== 6 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              marginBottom: 16,
            }}
          >
            {verifying ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>

        <p style={{ color: '#52526e', fontSize: 13, marginBottom: 12 }}>
          Didn't get the code?{' '}
          <button
            onClick={resendOtp}
            disabled={resending}
            style={{
              background: 'none', border: 'none',
              color: resending ? '#52526e' : 'var(--ct-gold)',
              fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: 'var(--font-sans)', padding: 0,
            }}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </p>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{
            background: 'none', border: 'none',
            color: '#52526e', fontSize: 12.5,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Wrong email? Log out
        </button>
      </div>
    </div>
  );
}
