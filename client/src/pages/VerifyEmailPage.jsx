import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useDocumentTitle from '../utils/useDocumentTitle';

const EXPIRY_SECONDS = 10 * 60; // 10 minutes

function pad(n) { return String(n).padStart(2, '0'); }

export default function VerifyEmailPage() {
  useDocumentTitle('Verify Email — ROTARA');
  const [searchParams] = useSearchParams();
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [error, setError]         = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const inputRefs = useRef([]);
  const timerRef  = useRef(null);

  const isNew = searchParams.get('new') === '1';

  const startTimer = useCallback(() => {
    setSecondsLeft(EXPIRY_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (isNew) resendOtp();
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resendOtp = async () => {
    setResending(true);
    setError('');
    setResent(false);
    try {
      await api.post('/auth/send-verification');
      setResent(true);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setResending(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && index === 5) {
      const fullOtp = next.join('');
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
      setDigits(pasted.split(''));
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
      clearInterval(timerRef.current);
      login({ ...user, emailVerified: true });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2200);
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

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerUrgent = secondsLeft > 0 && secondsLeft <= 120;
  const timerExpired = secondsLeft === 0;
  const filled = digits.join('').length;

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ct-sidebar)', fontFamily: 'var(--font-sans)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,160,23,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: '0 20px', position: 'relative' }}>
          {/* Animated checkmark */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05))',
            border: '2px solid rgba(212,160,23,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(212,160,23,0.15)',
            animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="var(--ct-gold)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: 'checkDraw 0.4s ease 0.2s both' }}>
              <path d="M20 6L9 17l-5-5" strokeDasharray="24" strokeDashoffset="0" />
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
            color: '#f5f2ec', letterSpacing: '-0.02em', marginBottom: 10,
          }}>
            You're verified!
          </h2>
          <p style={{ color: '#52526e', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Taking you to your dashboard…
          </p>
          {/* Progress bar */}
          <div style={{
            width: 200, height: 3, background: 'rgba(255,255,255,0.06)',
            borderRadius: 2, margin: '0 auto', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light))',
              borderRadius: 2,
              animation: 'progressFill 2s linear forwards',
            }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Main verify screen ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ct-sidebar)', padding: 20,
      position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-100px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.018,
        backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />

      <div className="animate-fade-up" style={{
        position: 'relative', width: '100%', maxWidth: 440,
        background: 'var(--ct-card)', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Gold top border */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light), var(--ct-gold))' }} />

        <div style={{ padding: '36px 40px 40px' }}>
          {/* Animated envelope icon */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(212,160,23,0.12), rgba(212,160,23,0.05))',
              border: '1.5px solid rgba(212,160,23,0.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              animation: 'float 3s ease-in-out infinite',
              boxShadow: '0 8px 24px rgba(212,160,23,0.1)',
            }}>
              <svg width={30} height={30} viewBox="0 0 24 24" fill="none"
                stroke="var(--ct-gold)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
            color: 'var(--ct-text-1)', textAlign: 'center', letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            {isNew ? 'Almost there!' : 'Verify your email'}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
            We sent a 6-digit code to{' '}
            <strong style={{ color: 'var(--ct-text-2)', fontWeight: 600 }}>{user?.email}</strong>.
            <br />Enter it below to continue.
          </p>

          <form onSubmit={handleSubmit}>
            {/* OTP inputs */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
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
                    width: 50, height: 58,
                    textAlign: 'center',
                    fontSize: 24, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: 12,
                    border: error
                      ? '2px solid rgba(225,29,72,0.55)'
                      : d
                        ? '2px solid var(--ct-gold)'
                        : '1.5px solid #e2e0da',
                    background: error
                      ? 'rgba(225,29,72,0.04)'
                      : d
                        ? 'rgba(212,160,23,0.05)'
                        : '#faf9f6',
                    color: error ? '#be123c' : 'var(--ct-text-1)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: d && !error ? '0 0 0 4px rgba(212,160,23,0.08)' : 'none',
                    cursor: verifying ? 'not-allowed' : 'text',
                  }}
                />
              ))}
            </div>

            {/* Timer */}
            {secondsLeft > 0 && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600,
                  color: timerUrgent ? '#e11d48' : 'var(--ct-text-3)',
                  fontFamily: 'var(--font-mono)',
                  transition: 'color 0.3s',
                }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Code expires in {pad(mins)}:{pad(secs)}
                </span>
              </div>
            )}
            {timerExpired && (
              <div style={{
                textAlign: 'center', marginBottom: 16,
                fontSize: 12.5, color: '#e11d48', fontWeight: 600,
              }}>
                Code expired — request a new one below
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 14px', borderRadius: 10, marginBottom: 16,
                background: '#fff1f2', border: '1px solid #fecdd3',
                color: '#be123c', fontSize: 13,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Resent confirmation */}
            {resent && !error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 14px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)',
                color: '#047857', fontSize: 13,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                New code sent — check your inbox.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={verifying || filled !== 6}
              className={filled === 6 && !verifying ? 'btn-gold' : ''}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 10, border: 'none',
                background: filled === 6 && !verifying
                  ? 'var(--ct-gold)'
                  : '#f0ede8',
                color: filled === 6 && !verifying ? '#0f0e0a' : '#b0aca4',
                fontSize: 15, fontWeight: 700,
                cursor: filled === 6 && !verifying ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
                letterSpacing: '-0.01em',
              }}
            >
              {verifying ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: 'spin 0.7s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25}/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Verifying…
                </span>
              ) : 'Confirm Code'}
            </button>
          </form>

          {/* Footer actions */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: 0 }}>
              Didn't receive it?{' '}
              <button
                onClick={resendOtp}
                disabled={resending}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: resending ? 'var(--ct-text-3)' : 'var(--ct-gold)',
                  fontWeight: 700, fontSize: 13,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  textDecoration: 'none',
                }}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </p>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#8888a0', fontSize: 12.5,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Wrong email? Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
