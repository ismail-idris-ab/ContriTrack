import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ct-page)',
      fontFamily: 'var(--font-sans)',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        background: 'var(--ct-card)',
        borderRadius: 'var(--ct-radius)',
        border: '1px solid var(--ct-border-2)',
        boxShadow: 'var(--ct-shadow-lg)',
        padding: '48px 40px',
        maxWidth: 420,
        width: '100%',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 80,
          fontWeight: 900,
          color: 'var(--ct-gold)',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ct-text-1)',
          marginBottom: 10,
        }}>
          Page not found
        </h1>

        <p style={{ color: 'var(--ct-text-3)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn-outline"
          >
            ← Go back
          </button>
          <Link
            to={user ? '/dashboard' : '/'}
            className="btn-gold"
          >
            {user ? 'Go to dashboard' : 'Go home'}
          </Link>
        </div>
      </div>
    </main>
  );
}
