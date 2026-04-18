import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const ROTATION_OPTIONS = [
  { value: 'fixed',      label: 'Fixed',       desc: 'You assign payout order manually' },
  { value: 'join-order', label: 'Join Order',   desc: 'First to join gets paid first' },
  { value: 'random',     label: 'Random',       desc: 'Rotation is shuffled at cycle start' },
  { value: 'bid',        label: 'Bid / Pledge', desc: 'Members request payout via Pledge' },
];

const GRACE_OPTIONS = [0, 1, 2, 3, 5, 7];

function dueSentence(dueDay, graceDays) {
  if (!dueDay) return '';
  const d = Number(dueDay), g = Number(graceDays || 0);
  const suffix = n => n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  const triggerDay = d + 1 + g;
  if (g === 0) {
    return `Contributions are due on the ${d}${suffix(d)}. The full due day is on-time.`;
  }
  return `Due on the ${d}${suffix(d)}. Members have ${g} extra day${g > 1 ? 's' : ''} — penalty applies from the ${triggerDay}${suffix(triggerDay)}.`;
}

export default function CircleSettingsDrawer({ group, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name:               group?.name || '',
    description:        group?.description || '',
    contributionAmount: String(group?.contributionAmount || ''),
    dueDay:             String(group?.dueDay ?? 25),
    graceDays:          String(group?.graceDays ?? 3),
    rotationType:       group?.rotationType || 'fixed',
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [tplName, setTplName]     = useState('');
  const [savingTpl, setSavingTpl] = useState(false);

  useEffect(() => {
    if (group) {
      setForm({
        name:               group.name || '',
        description:        group.description || '',
        contributionAmount: String(group.contributionAmount || ''),
        dueDay:             String(group.dueDay ?? 25),
        graceDays:          String(group.graceDays ?? 3),
        rotationType:       group.rotationType || 'fixed',
      });
    }
  }, [group?._id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) return setError('Circle name is required');
    setSaving(true);
    try {
      const { data: updated } = await api.patch(`/groups/${group._id}/settings`, {
        name:               form.name.trim(),
        description:        form.description,
        contributionAmount: Number(form.contributionAmount) || 0,
        dueDay:             Number(form.dueDay),
        graceDays:          Number(form.graceDays),
        rotationType:       form.rotationType,
      });
      toast.success('Settings saved.');
      onSaved(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) return;
    setSavingTpl(true);
    try {
      await api.post(`/groups/${group._id}/save-template`, { name: tplName.trim() });
      toast.success(`Template "${tplName.trim()}" saved.`);
      setTplName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save template');
    } finally {
      setSavingTpl(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--ct-border)', borderRadius: 8,
    fontSize: 13.5, fontFamily: 'var(--font-sans)',
    background: '#fff', color: 'var(--ct-text-1)',
    boxSizing: 'border-box',
  };
  const lbl = { fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 6, display: 'block' };
  const sec = { fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 440,
        background: '#fff', zIndex: 301,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideDown 0.22s ease both',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--ct-border-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)' }}>Circle Settings</div>
            <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>{group?.name}</div>
          </div>
          <button onClick={onClose} aria-label="Close settings" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-3)', fontSize: 22, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* General */}
          <div style={{ marginBottom: 28 }}>
            <div style={sec}>General</div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Circle name</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} maxLength={100} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => set('description', e.target.value)} maxLength={500} />
            </div>
            <div>
              <label style={lbl}>Monthly contribution (₦)</label>
              <input style={inp} type="number" min="0" value={form.contributionAmount} onChange={e => set('contributionAmount', e.target.value)} />
            </div>
          </div>

          {/* Schedule */}
          <div style={{ marginBottom: 28 }}>
            <div style={sec}>Schedule</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Due day <span style={{ fontWeight: 400, color: 'var(--ct-text-3)' }}>(1–28)</span></label>
                <input style={{ ...inp, width: '100%' }} type="number" min="1" max="28" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Grace period</label>
                <select style={inp} value={form.graceDays} onChange={e => set('graceDays', e.target.value)}>
                  {GRACE_OPTIONS.map(d => (
                    <option key={d} value={d}>{d === 0 ? 'None' : `${d} day${d > 1 ? 's' : ''}`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.18)', fontSize: 12.5, color: '#92700f', lineHeight: 1.5 }}>
              {dueSentence(form.dueDay, form.graceDays)}
            </div>
          </div>

          {/* Rotation */}
          <div style={{ marginBottom: 28 }}>
            <div style={sec}>Rotation type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROTATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('rotationType', opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: form.rotationType === opt.value ? '2px solid var(--ct-gold)' : '1.5px solid var(--ct-border)',
                    background: form.rotationType === opt.value ? 'rgba(212,160,23,0.06)' : '#faf9f6',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${form.rotationType === opt.value ? 'var(--ct-gold)' : 'var(--ct-border)'}`,
                    background: form.rotationType === opt.value ? 'var(--ct-gold)' : 'transparent',
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save as Template */}
          <div style={{ marginBottom: 28, padding: 16, borderRadius: 12, background: '#faf9f6', border: '1.5px solid var(--ct-border-2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 10 }}>Save as template</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Template name…" value={tplName} onChange={e => setTplName(e.target.value)} maxLength={80} />
              <button onClick={handleSaveTemplate} disabled={!tplName.trim() || savingTpl} className="btn-gold" style={{ flexShrink: 0, opacity: !tplName.trim() ? 0.5 : 1 }}>
                {savingTpl ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Danger zone placeholder */}
          <div style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.07)', opacity: 0.45 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Coming in Phase 3</div>
            <div style={{ fontSize: 12.5, color: 'var(--ct-text-3)', display: 'flex', gap: 16 }}>
              <span>🗄 Archive circle</span>
              <span>📋 Clone circle</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {error && (
          <div style={{ padding: '8px 24px', background: 'rgba(225,29,72,0.07)', borderTop: '1px solid rgba(225,29,72,0.15)', fontSize: 12.5, color: '#be123c' }}>
            {error}
          </div>
        )}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ct-border-2)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </>
  );
}
