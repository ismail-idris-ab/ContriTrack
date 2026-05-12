import { useState, useEffect } from 'react';

const DISMISS_KEY = 'rotara_checklist_dismissed';

export default function OnboardingChecklist({ groups, activeGroup, members }) {
  const [collapsed, setCollapsed] = useState(false);
  const [done,      setDone]      = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  const hasUploaded  = members?.some(m => m.contribution?.proofImage) ?? false;
  const hasVerified  = members?.some(m => m.contribution?.status === 'verified') ?? false;
  const hasViewed    = localStorage.getItem('rotara_viewed_report') === '1';

  const steps = [
    {
      label: 'Create your first circle',
      done: groups.length > 0,
      link: '/groups?action=create',
    },
    {
      label: 'Invite at least one member',
      done: (activeGroup?.members?.length ?? 0) > 1,
      link: '/groups',
    },
    {
      label: 'Upload your first proof of payment',
      done: hasUploaded,
      link: '/upload',
    },
    {
      label: 'Verify a member contribution',
      done: hasVerified,
      link: '/admin',
    },
    {
      label: 'View your first report',
      done: hasViewed,
      link: '/reports',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (!allDone) return;
    setDone(true);
    const t = setTimeout(() => setDismissed(true), 3000);
    return () => clearTimeout(t);
  }, [allDone]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 'var(--ct-radius)',
      boxShadow: 'var(--ct-shadow)',
      border: '1px solid rgba(0,0,0,0.05)',
      marginBottom: 18,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(0,0,0,0.05)',
          background: done ? 'rgba(5,150,105,0.04)' : 'rgba(212,160,23,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: done ? 'rgba(5,150,105,0.12)' : 'rgba(212,160,23,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: done ? 'var(--ct-emerald)' : 'var(--ct-gold)',
          }}>
            {done ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            )}
          </div>
          <div>
            <span style={{
              fontSize: 13.5, fontWeight: 700,
              color: done ? 'var(--ct-emerald)' : 'var(--ct-text-1)',
              letterSpacing: '-0.01em',
            }}>
              {done ? 'Setup complete!' : 'Getting started'}
            </span>
            <span style={{
              fontSize: 11.5, color: 'var(--ct-text-3)', marginLeft: 10,
            }}>
              {completedCount}/{steps.length} steps
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Progress bar */}
          <div style={{ width: 80, height: 4, borderRadius: 2, background: '#f0ede6', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / steps.length) * 100}%`,
              background: done ? 'var(--ct-emerald)' : 'var(--ct-gold)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            title="Dismiss"
            style={{
              border: 'none', background: 'transparent', padding: 4,
              cursor: 'pointer', color: 'var(--ct-text-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <svg
            width={13} height={13} viewBox="0 0 24 24" fill="none"
            stroke="var(--ct-text-3)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <div style={{ padding: '8px 20px 16px' }}>
          {steps.map((step, i) => (
            <a
              key={i}
              href={step.done ? undefined : step.link}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0',
                borderBottom: i < steps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                textDecoration: 'none',
                cursor: step.done ? 'default' : 'pointer',
                opacity: step.done ? 0.7 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: step.done ? 'rgba(5,150,105,0.12)' : 'rgba(212,160,23,0.08)',
                border: step.done ? '1.5px solid rgba(5,150,105,0.25)' : '1.5px solid rgba(212,160,23,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step.done ? 'var(--ct-emerald)' : 'var(--ct-gold)',
              }}>
                {step.done ? (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 13, fontWeight: step.done ? 500 : 600,
                color: step.done ? 'var(--ct-text-3)' : 'var(--ct-text-1)',
                textDecoration: step.done ? 'line-through' : 'none',
              }}>
                {step.label}
              </span>
              {!step.done && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
