import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6.168 18.849A4 4 0 0 1 10 17h4a4 4 0 0 1 3.834 2.855" />
      </svg>
    ),
    title: 'Full Transparency',
    body: 'Every member sees who has paid and can view proof — no more he-said-she-said arguments.',
  },
  {
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Verified Proof',
    body: 'Upload receipts or screenshots. Admins review and verify each submission before it counts.',
  },
  {
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Group Management',
    body: 'Invite members with a single code. Track everyone\'s monthly status in one clean dashboard.',
  },
  {
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Payment History',
    body: 'A personal timeline of every contribution you\'ve made — always accessible, always accurate.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>

      {/* Split hero */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '55% 45%', minHeight: '100vh' }}
        className="landing-grid">
        <style>{`
          @media (max-width: 768px) {
            .landing-grid { grid-template-columns: 1fr !important; }
            .landing-right { display: none !important; }
            .landing-left  { min-height: 100vh !important; padding: 48px 32px !important; }
            .landing-hero-title { font-size: 52px !important; line-height: 1.05 !important; }
            .landing-mobile-features { display: block !important; }
          }
        `}</style>

        {/* LEFT — dark hero */}
        <div
          className="landing-left"
          style={{
            background: 'var(--ct-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px 72px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle dot pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.035,
            backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }} />

          {/* Gold glow blob */}
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }} className="animate-fade-up">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#0f0f14',
            }}>C</div>
            <span style={{ color: '#f5f2ec', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>ContriTrack</span>
          </div>

          {/* Headline */}
          <div className="animate-fade-up" style={{ animationDelay: '0.08s' }}>
            <h1
              className="landing-hero-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                color: '#f5f2ec',
                marginBottom: 8,
              }}
            >
              Stop arguing
            </h1>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                color: 'var(--ct-gold)',
                marginBottom: 32,
              }}
              className="landing-hero-title"
            >
              about who paid.
            </h1>
            <p style={{ color: '#8888a4', fontSize: 17, lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
              Upload proof of payment, track monthly contributions, and keep your entire savings circle accountable — all in one place.
            </p>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', animationDelay: '0.16s' }}>
            <button
              onClick={() => navigate('/register')}
              className="btn-gold"
              style={{
                padding: '14px 32px',
                background: 'var(--ct-gold)',
                color: '#0f0f14',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
                letterSpacing: '-0.01em',
              }}
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 32px',
                background: 'transparent',
                color: '#c8c8d8',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#c8c8d8'; }}
            >
              Log In
            </button>
          </div>

          {/* Social proof line */}
          <div className="animate-fade-up" style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 16, animationDelay: '0.24s' }}>
            <div style={{ display: 'flex' }}>
              {['#4f46e5','#059669','#d97706','#e11d48'].map((c, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c}cc, ${c})`,
                  border: '2px solid #0f0f14',
                  marginLeft: i === 0 ? 0 : -8,
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} />
              ))}
            </div>
            <span style={{ color: '#6868808', fontSize: 13 }}>
              <span style={{ color: '#9898b4' }}>Trusted by savings circles</span>
              <span style={{ color: 'var(--ct-gold)', fontWeight: 600 }}> across Nigeria</span>
            </span>
          </div>

          {/* Mobile features */}
          <div className="landing-mobile-features" style={{ display: 'none', marginTop: 64 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ct-gold-bg)', border: '1px solid var(--ct-gold-dim)', color: 'var(--ct-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ color: '#f5f2ec', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ color: '#6868808', fontSize: 13, lineHeight: 1.6, color: '#8888a4' }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — warm cream features panel */}
        <div
          className="landing-right"
          style={{
            background: 'var(--ct-page)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px 64px',
            borderLeft: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div className="animate-fade-up" style={{ animationDelay: '0.12s' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ct-gold)', marginBottom: 12 }}>
              Everything you need
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--ct-text-1)',
              lineHeight: 1.25,
              marginBottom: 48,
              letterSpacing: '-0.01em',
            }}>
              Built for accountability.<br />Designed for trust.
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {features.map((f, i) => (
              <div
                key={i}
                className="animate-fade-up"
                style={{ display: 'flex', gap: 18, animationDelay: `${0.18 + i * 0.08}s` }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ct-gold)',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ct-text-1)', marginBottom: 6, letterSpacing: '-0.01em' }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--ct-text-2)', lineHeight: 1.65 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom decoration */}
          <div style={{ marginTop: 56, padding: '20px 24px', borderRadius: 14, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: 'var(--ct-shadow)' }}>
            <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              This month's collection
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '-0.02em' }}>₦240,000</div>
                <div style={{ fontSize: 13, color: 'var(--ct-emerald)', fontWeight: 600 }}>12 of 15 members verified</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--ct-emerald)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                </svg>
              </div>
            </div>
            {/* Mini progress */}
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '80%', borderRadius: 3, background: 'linear-gradient(90deg, var(--ct-emerald), #10b981)' }} className="progress-bar" />
            </div>
          </div>
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '18px 24px',
        fontSize: 13,
        color: 'var(--ct-text-3)',
        background: 'var(--ct-sidebar)',
        borderTop: '1px solid var(--ct-sidebar-border)',
      }}>
        ContriTrack &mdash; Built to keep groups accountable.
      </footer>
    </div>
  );
}
