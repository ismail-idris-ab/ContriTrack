import { useState, useEffect } from 'react';
import api from '../api/axios';

const ROTATION_LABELS = {
  'fixed':      'Fixed rotation',
  'join-order': 'Join order',
  'random':     'Random draw',
  'bid':        'Bid / Pledge',
};

function fmt(n) {
  if (!n) return '—';
  return '₦' + Number(n).toLocaleString('en-NG');
}

function TemplateCard({ template, onSelect, selected }) {
  return (
    <button
      onClick={() => onSelect(template)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '16px', borderRadius: 12, cursor: 'pointer',
        border: selected ? '2px solid var(--ct-gold)' : '1.5px solid rgba(0,0,0,0.08)',
        background: selected ? 'rgba(212,160,23,0.06)' : '#fff',
        boxShadow: selected ? '0 0 0 3px rgba(212,160,23,0.15)' : 'var(--ct-shadow)',
        textAlign: 'left', width: '100%',
        transition: 'all 0.16s ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>{template.icon || '◎'}</div>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ct-text-1)' }}>
        {template.name}
      </div>
      {template.settings && (
        <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)', lineHeight: 1.5 }}>
          {fmt(template.settings.contributionAmount)} · Due {template.settings.dueDay}th
          · {ROTATION_LABELS[template.settings.rotationType] || template.settings.rotationType}
        </div>
      )}
      {template.description && (
        <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)', lineHeight: 1.4 }}>
          {template.description}
        </div>
      )}
    </button>
  );
}

export default function TemplatePickerStep({ onSelect, onSkip }) {
  const [presets, setPresets]   = useState([]);
  const [mine, setMine]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/templates')
      .then(({ data }) => {
        setPresets(data.presets || []);
        setMine(data.mine || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (template) => {
    setSelected(template._id);
    onSelect(template.settings || {});
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 4 }}>
          Start from a template
        </div>
        <div style={{ fontSize: 13, color: 'var(--ct-text-3)' }}>
          Pick a starting point — you can change everything after.
        </div>
      </div>

      <button
        onClick={onSkip}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          border: '1.5px dashed rgba(0,0,0,0.15)', background: '#faf9f6',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--font-sans)', transition: 'all 0.16s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ct-gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; }}
      >
        <span style={{ fontSize: 22 }}>✦</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ct-text-1)' }}>Start from scratch</div>
          <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>Fill in every detail yourself</div>
        </div>
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ct-text-3)', fontSize: 13 }}>
          Loading templates…
        </div>
      ) : (
        <>
          {presets.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {presets.map(t => (
                  <TemplateCard key={t._id} template={t} onSelect={handleSelect} selected={selected === t._id} />
                ))}
              </div>
            </>
          )}
          {mine.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                My saved templates
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {mine.map(t => (
                  <TemplateCard key={t._id} template={t} onSelect={handleSelect} selected={selected === t._id} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
