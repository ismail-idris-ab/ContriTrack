import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _idCounter = 0;

const ICONS = {
  success: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  error: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  info: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  warning: (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

const STYLES = {
  success: { bg: '#f0fdf4', border: 'rgba(5,150,105,0.25)', icon: '#059669', text: '#14532d' },
  error:   { bg: '#fff5f7', border: 'rgba(225,29,72,0.25)',  icon: '#e11d48', text: '#881337' },
  info:    { bg: '#eff6ff', border: 'rgba(59,130,246,0.25)', icon: '#2563eb', text: '#1e3a5f' },
  warning: { bg: '#fffbeb', border: 'rgba(217,119,6,0.25)',  icon: '#d97706', text: '#78350f' },
};

function ToastItem({ toast, onDismiss }) {
  const s = STYLES[toast.type] || STYLES.info;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        minWidth: 280, maxWidth: 380,
        animation: 'toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ color: s.icon, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>
      <span style={{ fontSize: 13.5, color: s.text, flex: 1, lineHeight: 1.45 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: s.icon, opacity: 0.6, padding: '0 2px', flexShrink: 0,
          fontSize: 16, lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  // Convenience aliases
  toast.success = (msg, dur)  => toast(msg, 'success', dur);
  toast.error   = (msg, dur)  => toast(msg, 'error',   dur ?? 6000);
  toast.warning = (msg, dur)  => toast(msg, 'warning', dur);
  toast.info    = (msg, dur)  => toast(msg, 'info',    dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
      `}</style>
      {/* Toast container — bottom-right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: toasts.length ? 'auto' : 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
