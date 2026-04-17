import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Only render when Google OAuth is configured
const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ intent, onError }) {
  if (!googleConfigured) return null;
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const { data } = await api.post('/auth/google', { accessToken: tokenResponse.access_token });
        login(data);
        navigate('/dashboard');
      } catch (err) {
        const msg = err.response?.data?.message || 'Google sign-in failed. Please try again.';
        if (onError) onError(msg);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      if (onError) onError('Google sign-in was cancelled or failed.');
    },
    flow: 'implicit',
  });

  return (
    <>
      {/* Or divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '20px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: '#e2e0da' }} />
        <span style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 600, letterSpacing: '0.04em' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#e2e0da' }} />
      </div>

      {/* Google button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => handleGoogleLogin()}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: loading ? '#f0ede8' : '#fff',
          border: '1.5px solid #e2e0da',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          color: '#2d2d3d',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.borderColor = '#c8c4bc';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e2e0da';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }}
      >
        {loading ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#a0a0b8"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
            <path d="M21 12a9 9 0 00-9-9" />
          </svg>
        ) : (
          /* Google "G" logo SVG */
          <svg width={18} height={18} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>
    </>
  );
}
