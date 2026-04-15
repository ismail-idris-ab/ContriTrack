import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ newPassword: '', confirmPassword: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #e2e0da', borderRadius: 10,
    fontSize: 13.5, fontFamily: 'var(--font-sans)',
    background: '#faf9f6', color: 'var(--ct-text-1)',
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0c0c12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff',
        borderRadius: 18,
        borderTop: '3px solid var(--ct-gold)',
        padding: '36px 32px 32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(140deg, #2a2010, #1a1608)',
            border: '1px solid rgba(212,160,23,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>C</span>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ct-text-1)' }}>
            ContriTrack
          </span>
        </div>

        {!success ? (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Set new password
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: '0 0 24px', lineHeight: 1.55 }}>
              Choose a strong password of at least 6 characters.
            </p>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 16, fontSize: 13, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.22)', color: '#e11d48' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  placeholder="Min. 6 characters"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  placeholder="Repeat new password"
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                  background: loading ? '#e8e4dc' : 'var(--ct-gold)',
                  color: loading ? 'var(--ct-text-3)' : '#0f0f14',
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(5,150,105,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--ct-emerald)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>
              Password reset!
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', lineHeight: 1.6, margin: '0 0 6px' }}>
              Your password has been updated. Redirecting to sign in…
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ct-text-3)' }}>
          <Link to="/login" style={{ color: 'var(--ct-indigo)', fontWeight: 600, textDecoration: 'none' }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
