import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import useDocumentTitle from '../utils/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Sign In — ROTARA');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ct-sidebar)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025,
        backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Gold glow */}
      <div style={{
        position: 'absolute', bottom: '-120px', right: '-120px',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: 380, height: 380,
        background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div
        className="animate-fade-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'var(--ct-card)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Gold top border */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light), var(--ct-gold))' }} />

        {/* Header */}
        <div style={{ padding: '36px 40px 28px', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--ct-sidebar)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            border: '1px solid var(--ct-sidebar-border)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: '#0f0f14',
            }}>C</div>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--ct-text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)' }}>Sign in to ROTARA</p>
        </div>

        {/* Form */}
        <div style={{ padding: '0 40px 40px' }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff1f2', color: '#be123c',
              padding: '12px 16px', borderRadius: 10,
              fontSize: 13, marginBottom: 20,
              border: '1px solid #fecdd3',
            }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ct-text-2)', marginBottom: 7 }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #e2e0da',
                  borderRadius: 10, fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  background: '#faf9f6',
                  boxSizing: 'border-box',
                  color: 'var(--ct-text-1)',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ct-text-2)', marginBottom: 7 }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1.5px solid #e2e0da',
                  borderRadius: 10, fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  background: '#faf9f6',
                  boxSizing: 'border-box',
                  color: 'var(--ct-text-1)',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold"
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#b8891a' : 'var(--ct-gold)',
                color: '#0f0f14',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <GoogleSignInButton intent={intent} onError={setError} />

          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--ct-text-3)', marginTop: 16 }}>
            <Link to="/forgot-password" style={{ color: 'var(--ct-text-3)', textDecoration: 'none' }}>
              Forgot your password?
            </Link>
          </p>

          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--ct-text-3)', marginTop: 8 }}>
            Don&apos;t have an account?{' '}
            <Link
              to={intent ? `/register?intent=${intent}` : '/register'}
              style={{ color: 'var(--ct-gold)', fontWeight: 700, textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
