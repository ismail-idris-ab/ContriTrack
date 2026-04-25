import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const fields = [
  { label: 'Full Name',      name: 'name',     type: 'text',     placeholder: 'John Doe' },
  { label: 'Email Address',  name: 'email',    type: 'email',    placeholder: 'you@example.com' },
  { label: 'Password',       name: 'password', type: 'password', placeholder: 'Min 6 characters' },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent');

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data);
      navigate('/verify-email?new=1');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 65%)',
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
          }}>Join ROTARA</h1>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)' }}>Create your account in seconds</p>
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
            {fields.map((field, i) => (
              <div key={field.name} style={{ marginBottom: i === fields.length - 1 ? 28 : 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ct-text-2)', marginBottom: 7 }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  required
                  placeholder={field.placeholder}
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
            ))}

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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <GoogleSignInButton intent={intent} onError={setError} />

          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--ct-text-3)', marginTop: 16 }}>
            Already have an account?{' '}
            <Link
              to={intent ? `/login?intent=${intent}` : '/login'}
              style={{ color: 'var(--ct-gold)', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
