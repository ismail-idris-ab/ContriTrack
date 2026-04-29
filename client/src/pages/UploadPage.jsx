import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function compressImage(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size < 300 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) { resolve(file); return; }
      if (width > height) { height = Math.round((height / width) * maxDimension); width = maxDimension; }
      else { width = Math.round((width / height) * maxDimension); height = maxDimension; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })),
        'image/jpeg', quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function UploadPage() {
  const { groups, activeGroup: selectedGroup } = useGroup();
  const now = new Date();
  const [form, setForm] = useState({
    amount: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    cycleNumber: 1,
    note: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [myContributions, setMyContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  const selectedGroupId = selectedGroup?._id ?? null;

  useEffect(() => {
    api.get('/contributions/mine')
      .then(({ data }) => setMyContributions(data))
      .catch(() => {})
      .finally(() => setLoadingContributions(false));
  }, []);

  const cyclesPerMonth = selectedGroup?.cyclesPerMonth ?? 1;

  useEffect(() => {
    if (loadingContributions) return;
    for (let n = 1; n <= cyclesPerMonth; n++) {
      const taken = myContributions.some(c =>
        c.month === Number(form.month) &&
        c.year  === Number(form.year)  &&
        (c.cycleNumber ?? 1) === n &&
        String(c.group?._id ?? c.group ?? null) === String(selectedGroupId ?? null)
      );
      if (!taken) { setForm(prev => ({ ...prev, cycleNumber: n })); return; }
    }
    setForm(prev => ({ ...prev, cycleNumber: cyclesPerMonth }));
  }, [selectedGroupId, form.month, form.year, myContributions, loadingContributions, cyclesPerMonth]);

  const matchesSelected = (c) =>
    c.month === Number(form.month) &&
    c.year  === Number(form.year)  &&
    (c.cycleNumber ?? 1) === Number(form.cycleNumber) &&
    String(c.group?._id ?? c.group ?? null) === String(selectedGroupId ?? null);

  const rejectedContribution = !loadingContributions
    ? myContributions.find(c => matchesSelected(c) && c.status === 'rejected')
    : null;

  const alreadySubmitted = !loadingContributions && myContributions.some(c =>
    matchesSelected(c) && c.status !== 'rejected'
  );

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const applyFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only image files and PDFs are allowed');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
      return;
    }
    setError('');
    setCompressing(true);
    const compressed = await compressImage(f);
    setCompressing(false);
    setFile(compressed);
    setPreview(compressed.type.startsWith('image/') ? URL.createObjectURL(compressed) : null);
  };

  const handleFileChange = (e) => applyFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); applyFile(e.dataTransfer.files[0]); };
  const removeFile = () => { setFile(null); setPreview(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedGroupId) return setError('Please select a circle before submitting.');
    if (rejectedContribution) return setError('This payment was rejected. Go to My Payments to resubmit your proof.');
    if (alreadySubmitted) return setError(`Already submitted for ${MONTHS[Number(form.month) - 1]} ${form.year}${selectedGroup ? ` — ${selectedGroup.name}` : ''}.`);
    if (!file) return setError('Please select a proof of payment image');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');

    const formData = new FormData();
    formData.append('proof', file);
    formData.append('amount', form.amount);
    formData.append('month', form.month);
    formData.append('year', form.year);
    formData.append('cycleNumber', form.cycleNumber);
    formData.append('note', form.note);
    if (selectedGroupId) formData.append('groupId', selectedGroupId);

    setLoading(true);
    try {
      const { data: newContribution } = await api.post('/contributions', formData);
      setMyContributions(prev => [...prev, newContribution]);
      setSuccess('Proof submitted! Awaiting admin review.');
      const today = new Date();
      setForm({ amount: '', month: today.getMonth() + 1, year: today.getFullYear(), cycleNumber: 1, note: '' });
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = file && !loading && !compressing && !alreadySubmitted && !rejectedContribution && !!selectedGroupId;

  return (
    <>
      <style>{`
        .up-root {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 0 32px;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
        }

        /* ── Hero header ─────────────────────────────── */
        .up-hero {
          padding: 4px 20px 24px;
          position: relative;
        }
        .up-hero::after {
          content: '';
          position: absolute;
          bottom: 0; left: 20px; right: 20px;
          height: 1px;
          background: linear-gradient(90deg, rgba(212,160,23,0.4) 0%, rgba(212,160,23,0.08) 60%, transparent 100%);
        }

        .up-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(212,160,23,0.3);
          background: rgba(212,160,23,0.08);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--ct-gold, #d4a017);
          margin-bottom: 16px;
        }
        .up-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--ct-gold, #d4a017);
          animation: up-pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes up-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.7); }
        }

        .up-title {
          font-family: var(--font-display, 'Playfair Display', serif);
          font-size: 34px;
          font-weight: 700;
          line-height: 1.12;
          color: #f5f0e8;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .up-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.36);
          margin: 0;
          line-height: 1.55;
        }

        /* ── Alerts ──────────────────────────────────── */
        .up-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.45;
          margin: 16px 20px 0;
        }
        .up-alert svg { flex-shrink: 0; margin-top: 1px; }
        .up-alert--error {
          background: rgba(225,29,72,0.07);
          border: 1px solid rgba(225,29,72,0.22);
          color: #fb7185;
        }
        .up-alert--success {
          background: rgba(5,150,105,0.07);
          border: 1px solid rgba(5,150,105,0.22);
          color: #34d399;
        }

        /* ── Section blocks ──────────────────────────── */
        .up-body {
          padding: 20px 20px 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .up-section {
          padding: 20px 0;
          border-bottom: 1px solid rgba(255,255,255,0.055);
        }
        .up-section:last-child { border-bottom: none; }

        .up-field-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 10px;
        }
        .up-optional {
          text-transform: none;
          letter-spacing: 0;
          font-size: 10px;
          font-weight: 400;
          color: rgba(255,255,255,0.2);
        }
        .up-field-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .up-field-header .up-field-label { margin-bottom: 0; }
        .up-char-count {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 10px;
          color: rgba(255,255,255,0.22);
        }

        /* ── Amount input ────────────────────────────── */
        .up-amount-wrap {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.2s, background 0.2s;
        }
        .up-amount-wrap:focus-within {
          border-color: rgba(212,160,23,0.5);
          background: rgba(212,160,23,0.035);
        }
        .up-amount-prefix {
          padding: 0 4px 0 18px;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 22px;
          font-weight: 500;
          color: rgba(255,255,255,0.28);
          user-select: none;
          pointer-events: none;
          line-height: 1;
        }
        .up-amount-input {
          flex: 1;
          padding: 17px 18px 17px 6px;
          border: none;
          background: transparent;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 26px;
          font-weight: 600;
          color: #f0ede6;
          outline: none;
          min-width: 0;
          -moz-appearance: textfield;
        }
        .up-amount-input::-webkit-outer-spin-button,
        .up-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .up-amount-input::placeholder { color: rgba(255,255,255,0.15); }

        /* ── Period row ──────────────────────────────── */
        .up-period-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .up-select-wrap {
          position: relative;
        }
        .up-select-wrap svg {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(255,255,255,0.28);
        }
        .up-select,
        .up-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          font-size: 14px;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          background: rgba(255,255,255,0.04);
          color: #f0ede6;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .up-select { padding-right: 38px; cursor: pointer; }
        .up-select:focus,
        .up-input:focus {
          border-color: rgba(212,160,23,0.5);
          background: rgba(212,160,23,0.035);
        }
        .up-select option { background: #1e1e2e; color: #f0ede6; }

        /* ── Summary strip ───────────────────────────── */
        .up-summary {
          display: flex;
          align-items: stretch;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          margin-top: 18px;
        }
        .up-summary-tag {
          padding: 12px 13px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--ct-gold, #d4a017);
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          writing-mode: horizontal-tb;
          white-space: nowrap;
        }
        .up-summary-item {
          flex: 1;
          padding: 10px 12px;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .up-summary-item:last-child { border-right: none; }
        .up-summary-lbl {
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
        }
        .up-summary-val {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 12px;
          font-weight: 600;
          color: #f0ede6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Note textarea ───────────────────────────── */
        .up-textarea {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          font-size: 13.5px;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
          background: rgba(255,255,255,0.04);
          color: #f0ede6;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
          resize: none;
          line-height: 1.5;
        }
        .up-textarea::placeholder { color: rgba(255,255,255,0.18); }
        .up-textarea:focus {
          border-color: rgba(212,160,23,0.5);
          background: rgba(212,160,23,0.035);
        }

        /* ── Upload zone ─────────────────────────────── */
        .up-dropzone {
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }
        .up-dropzone--drag,
        .up-dropzone:active {
          border-color: rgba(212,160,23,0.55);
          background: rgba(212,160,23,0.045);
        }
        .up-dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          gap: 10px;
        }
        .up-upload-icon {
          width: 58px; height: 58px;
          border-radius: 50%;
          background: var(--ct-gold, #d4a017);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f0f14;
          box-shadow: 0 6px 24px rgba(212,160,23,0.32);
          transition: transform 0.2s, box-shadow 0.2s;
          margin-bottom: 4px;
        }
        .up-dropzone:active .up-upload-icon {
          transform: scale(0.94);
          box-shadow: 0 3px 14px rgba(212,160,23,0.28);
        }
        .up-dropzone-text {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.55);
          margin: 0;
          text-align: center;
        }
        .up-dropzone-text span { color: var(--ct-gold, #d4a017); font-weight: 700; }
        .up-dropzone-hint {
          font-size: 11.5px;
          color: rgba(255,255,255,0.2);
          margin: 0;
          text-align: center;
        }
        .up-preview-img {
          width: 100%;
          max-height: 260px;
          object-fit: contain;
          display: block;
        }

        /* ── File pill ───────────────────────────────── */
        .up-file-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(5,150,105,0.07);
          border: 1px solid rgba(5,150,105,0.2);
          border-radius: 12px;
          margin-top: 10px;
        }
        .up-file-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 600;
          color: #f0ede6;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .up-file-size {
          font-size: 11px;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          color: rgba(255,255,255,0.28);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .up-remove-btn {
          width: 26px; height: 26px;
          border-radius: 7px;
          border: none;
          background: rgba(225,29,72,0.12);
          color: #fb7185;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          transition: background 0.15s;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .up-remove-btn:active { background: rgba(225,29,72,0.25); }

        /* ── Submit area ─────────────────────────────── */
        .up-submit-area {
          padding: 20px 20px 0;
        }
        .up-submit-btn {
          width: 100%;
          padding: 17px;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: all 0.22s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          -webkit-tap-highlight-color: transparent;
        }
        .up-submit-btn--active {
          background: linear-gradient(135deg, #e8b94f 0%, var(--ct-gold, #d4a017) 50%, #c49012 100%);
          color: #0f0f14;
          box-shadow: 0 6px 28px rgba(212,160,23,0.38);
        }
        .up-submit-btn--active:active {
          transform: scale(0.98);
          box-shadow: 0 3px 16px rgba(212,160,23,0.3);
        }
        .up-submit-btn:not(.up-submit-btn--active) {
          background: rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.2);
          cursor: not-allowed;
        }
        .up-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 11.5px;
          color: rgba(255,255,255,0.2);
        }

        /* ── Spinner ─────────────────────────────────── */
        .up-spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2.5px solid rgba(15,15,20,0.25);
          border-top-color: #0f0f14;
          border-radius: 50%;
          animation: up-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        .up-spinner--gold {
          border-color: rgba(212,160,23,0.25);
          border-top-color: var(--ct-gold, #d4a017);
        }
        @keyframes up-spin { to { transform: rotate(360deg); } }
      `}</style>

      <form onSubmit={handleSubmit} className="up-root">

        {/* ── Hero ─── */}
        <div className="up-hero">
          <div className="up-badge">
            <span className="up-badge-dot" />
            Payment Verification
          </div>
          <h1 className="up-title">Submit<br />Payment Proof</h1>
          <p className="up-subtitle">Upload your proof of payment to confirm your<br />transaction securely.</p>
        </div>

        {/* ── Alerts ─── */}
        {error && (
          <div className="up-alert up-alert--error">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="up-alert up-alert--success">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
            <span><strong>Submitted!</strong> {success}</span>
          </div>
        )}

        {/* ── Rejected contribution banner ─── */}
        {rejectedContribution && (
          <div style={{
            margin: '16px 20px 0',
            padding: '14px 16px',
            borderRadius: 14,
            background: 'rgba(225,29,72,0.07)',
            border: '1px solid rgba(225,29,72,0.22)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#fb7185', fontWeight: 700, lineHeight: 1.4 }}>
                  Your previous proof was rejected
                </p>
                {rejectedContribution.rejectionNote && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(251,113,133,0.8)', lineHeight: 1.45 }}>
                    Reason: {rejectedContribution.rejectionNote}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/payments"
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9,
                background: 'rgba(225,29,72,0.12)',
                border: '1px solid rgba(225,29,72,0.25)',
                color: '#fb7185', fontSize: 12, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Go to My Payments to resubmit
            </a>
          </div>
        )}

        {/* ── Form body ─── */}
        <div className="up-body">

          {/* Amount */}
          <div className="up-section">
            <label className="up-field-label">Amount Paid</label>
            <div className="up-amount-wrap">
              <span className="up-amount-prefix">₦</span>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
                min="1"
                placeholder="0"
                className="up-amount-input"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Period */}
          <div className="up-section">
            <label className="up-field-label">Period</label>
            <div className="up-period-grid">
              <div className="up-select-wrap">
                <select name="month" value={form.month} onChange={handleChange} className="up-select">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <input
                type="number"
                name="year"
                value={form.year}
                onChange={handleChange}
                min="2020"
                max="2100"
                className="up-input"
                inputMode="numeric"
              />
            </div>

            {/* Summary */}
            <div className="up-summary">
              <div className="up-summary-tag">Summary</div>
              <div className="up-summary-item">
                <span className="up-summary-lbl">Period</span>
                <span className="up-summary-val">{MONTHS[form.month - 1].slice(0, 3)} {form.year}</span>
              </div>
              <div className="up-summary-item">
                <span className="up-summary-lbl">Amount</span>
                <span className="up-summary-val" style={{ color: form.amount ? '#34d399' : 'rgba(255,255,255,0.22)' }}>
                  {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
                </span>
              </div>
              {selectedGroup && (
                <div className="up-summary-item">
                  <span className="up-summary-lbl">Circle</span>
                  <span className="up-summary-val" style={{ color: 'var(--ct-gold)', fontSize: 11 }}>{selectedGroup.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="up-section">
            <div className="up-field-header">
              <label className="up-field-label" style={{ margin: 0 }}>
                Note <span className="up-optional">(optional)</span>
              </label>
              <span className="up-char-count" style={{ color: form.note.length > 450 ? '#fb7185' : undefined }}>
                {form.note.length}/500
              </span>
            </div>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              placeholder="e.g. Paid via bank transfer, reference #XYZ123"
              className="up-textarea"
            />
          </div>

          {/* Upload */}
          <div className="up-section">
            <label className="up-field-label">Proof of Payment</label>
            <div
              className={`up-dropzone${dragging ? ' up-dropzone--drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('up-proof-file').click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="up-preview-img" />
              ) : (
                <div className="up-dropzone-inner">
                  <div className="up-upload-icon">
                    {compressing ? (
                      <span className="up-spinner up-spinner--gold" style={{ borderTopColor: '#0f0f14', borderColor: 'rgba(15,15,20,0.25)' }} />
                    ) : (
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                  </div>
                  <p className="up-dropzone-text">
                    {compressing ? 'Compressing image…' : <>Tap to select, or <span>browse</span></>}
                  </p>
                  <p className="up-dropzone-hint">JPG · PNG · WebP · PDF &nbsp;—&nbsp; Max 5 MB</p>
                </div>
              )}
              <input id="up-proof-file" type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {file && (
              <div className="up-file-pill">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
                </svg>
                <span className="up-file-name">{file.name}</span>
                <span className="up-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={removeFile} className="up-remove-btn">×</button>
              </div>
            )}
          </div>

        </div>{/* /up-body */}

        {/* ── Submit ─── */}
        <div className="up-submit-area">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`up-submit-btn${canSubmit ? ' up-submit-btn--active' : ''}`}
          >
            {(loading || compressing) && <span className="up-spinner" />}
            {compressing ? 'Compressing image…' : loading ? 'Uploading to cloud…' : 'Submit Payment Proof'}
          </button>
          <div className="up-secure">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Secure &amp; encrypted submission
          </div>
        </div>

      </form>
    </>
  );
}
