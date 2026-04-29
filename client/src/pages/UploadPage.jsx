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
        .up2-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 0 48px;
          font-family: var(--font-sans);
        }

        /* ── Page header ── */
        .up2-header {
          padding: 32px 24px 24px;
          border-bottom: 1px solid var(--ct-border);
          margin-bottom: 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .up2-header-left {}
        .up2-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ct-gold);
          margin-bottom: 10px;
        }
        .up2-eyebrow-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--ct-gold);
          animation: up2-pulse 2.2s ease-in-out infinite;
        }
        @keyframes up2-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.65); }
        }
        .up2-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          color: var(--ct-text-1);
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin: 0 0 6px;
        }
        .up2-subtitle {
          font-size: 13.5px;
          color: var(--ct-text-3);
          margin: 0;
          line-height: 1.5;
        }
        .up2-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(5,150,105,0.08);
          border: 1px solid rgba(5,150,105,0.18);
          font-size: 11px;
          font-weight: 700;
          color: var(--ct-emerald);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .up2-badge svg { flex-shrink: 0; }

        /* ── Cards ── */
        .up2-card {
          background: var(--ct-card);
          border-radius: var(--ct-radius);
          box-shadow: var(--ct-shadow);
          border: 1px solid var(--ct-border);
          margin: 0 16px 16px;
          overflow: hidden;
        }
        .up2-card-header {
          padding: 16px 20px 14px;
          border-bottom: 1px solid var(--ct-border-2);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .up2-card-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: var(--ct-gold-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ct-gold);
          flex-shrink: 0;
        }
        .up2-card-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--ct-text-2);
        }
        .up2-card-body {
          padding: 20px;
        }

        /* ── Alert banners ── */
        .up2-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          margin: 0 16px 16px;
          border: 1px solid transparent;
        }
        .up2-alert svg { flex-shrink: 0; margin-top: 1px; }
        .up2-alert--error {
          background: rgba(225,29,72,0.05);
          border-color: rgba(225,29,72,0.18);
          color: #c41a3a;
        }
        .up2-alert--success {
          background: rgba(5,150,105,0.06);
          border-color: rgba(5,150,105,0.18);
          color: #065f46;
        }
        .up2-alert--warning {
          background: rgba(217,119,6,0.06);
          border-color: rgba(217,119,6,0.2);
          color: #92400e;
          flex-direction: column;
          gap: 10px;
        }
        .up2-alert--warning-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        /* ── Amount input ── */
        .up2-amount-wrap {
          display: flex;
          align-items: center;
          border: 2px solid var(--ct-border);
          border-radius: 12px;
          background: #faf9f6;
          overflow: hidden;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .up2-amount-wrap:focus-within {
          border-color: var(--ct-gold);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
          background: #fff;
        }
        .up2-currency {
          padding: 0 6px 0 18px;
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 600;
          color: var(--ct-text-3);
          user-select: none;
          pointer-events: none;
          flex-shrink: 0;
        }
        .up2-amount-input {
          flex: 1;
          padding: 16px 18px 16px 4px;
          border: none;
          background: transparent;
          font-family: var(--font-mono);
          font-size: 28px;
          font-weight: 700;
          color: var(--ct-text-1);
          outline: none;
          min-width: 0;
          -moz-appearance: textfield;
        }
        .up2-amount-input::-webkit-outer-spin-button,
        .up2-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .up2-amount-input::placeholder { color: var(--ct-text-4); font-weight: 400; }

        /* ── Field label ── */
        .up2-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ct-text-3);
          margin-bottom: 8px;
        }
        .up2-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .up2-label-row .up2-label { margin-bottom: 0; }
        .up2-char-count {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ct-text-4);
        }

        /* ── Period grid ── */
        .up2-period-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .up2-select-wrap {
          position: relative;
        }
        .up2-select-wrap svg {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--ct-text-3);
        }
        .up2-select, .up2-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid var(--ct-border);
          border-radius: 10px;
          font-size: 13.5px;
          font-family: var(--font-mono);
          background: #faf9f6;
          color: var(--ct-text-1);
          box-sizing: border-box;
          transition: border-color 0.18s, box-shadow 0.18s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .up2-select { padding-right: 36px; cursor: pointer; }
        .up2-select:focus, .up2-input:focus {
          border-color: var(--ct-gold);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
          background: #fff;
        }
        .up2-select option { background: #fff; color: var(--ct-text-1); }

        /* ── Summary strip ── */
        .up2-summary {
          display: flex;
          margin-top: 14px;
          border: 1px solid var(--ct-border);
          border-radius: 10px;
          overflow: hidden;
          background: #faf9f6;
        }
        .up2-summary-tag {
          padding: 10px 12px;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ct-gold);
          border-right: 1px solid var(--ct-border);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: var(--ct-gold-bg);
        }
        .up2-summary-item {
          flex: 1;
          padding: 8px 12px;
          border-right: 1px solid var(--ct-border);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .up2-summary-item:last-child { border-right: none; }
        .up2-summary-lbl {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ct-text-3);
        }
        .up2-summary-val {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--ct-text-1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Textarea ── */
        .up2-textarea {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid var(--ct-border);
          border-radius: 10px;
          font-size: 13.5px;
          font-family: var(--font-sans);
          background: #faf9f6;
          color: var(--ct-text-1);
          box-sizing: border-box;
          transition: border-color 0.18s, box-shadow 0.18s;
          outline: none;
          resize: none;
          line-height: 1.55;
        }
        .up2-textarea::placeholder { color: var(--ct-text-4); }
        .up2-textarea:focus {
          border-color: var(--ct-gold);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
          background: #fff;
        }

        /* ── Dropzone ── */
        .up2-dropzone {
          border: 2px dashed var(--ct-border);
          border-radius: 12px;
          background: #faf9f6;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
        }
        .up2-dropzone:hover, .up2-dropzone--drag {
          border-color: var(--ct-gold);
          background: rgba(212,160,23,0.04);
        }
        .up2-dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 36px 24px;
          gap: 10px;
          text-align: center;
        }
        .up2-upload-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--ct-gold) 0%, #c49012 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 6px 20px rgba(212,160,23,0.3);
          margin-bottom: 4px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .up2-dropzone:hover .up2-upload-icon {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(212,160,23,0.35);
        }
        .up2-dropzone-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ct-text-1);
          margin: 0;
        }
        .up2-dropzone-title span { color: var(--ct-gold); }
        .up2-dropzone-hint {
          font-size: 12px;
          color: var(--ct-text-3);
          margin: 0;
        }
        .up2-preview-img {
          width: 100%;
          max-height: 260px;
          object-fit: contain;
          display: block;
        }

        /* ── File pill ── */
        .up2-file-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.18);
          border-radius: 10px;
          margin-top: 10px;
        }
        .up2-file-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ct-text-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .up2-file-size {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--ct-text-3);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .up2-remove-btn {
          width: 26px; height: 26px;
          border-radius: 7px;
          border: none;
          background: rgba(225,29,72,0.08);
          color: var(--ct-rose);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .up2-remove-btn:hover { background: rgba(225,29,72,0.14); }

        /* ── Submit area ── */
        .up2-submit-area {
          padding: 8px 16px 0;
        }
        .up2-submit-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          font-family: var(--font-sans);
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          -webkit-tap-highlight-color: transparent;
        }
        .up2-submit-btn--active {
          background: linear-gradient(135deg, #e8b94f 0%, var(--ct-gold) 60%, #b8880e 100%);
          color: #3a2700;
          box-shadow: 0 4px 20px rgba(212,160,23,0.35), 0 1px 3px rgba(212,160,23,0.2);
        }
        .up2-submit-btn--active:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(212,160,23,0.4), 0 2px 6px rgba(212,160,23,0.25);
        }
        .up2-submit-btn--active:active { transform: scale(0.99); }
        .up2-submit-btn:not(.up2-submit-btn--active) {
          background: var(--ct-border-2);
          border: 1.5px solid var(--ct-border);
          color: var(--ct-text-4);
          cursor: not-allowed;
        }

        .up2-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 12px;
          font-size: 11.5px;
          color: var(--ct-text-4);
        }

        /* ── Spinner ── */
        .up2-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(58,39,0,0.2);
          border-top-color: #3a2700;
          border-radius: 50%;
          animation: up2-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes up2-spin { to { transform: rotate(360deg); } }

        /* ── Divider ── */
        .up2-divider {
          height: 1px;
          background: var(--ct-border-2);
          margin: 20px 0;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="up2-page">

        {/* ── Page header ── */}
        <div className="up2-header">
          <div className="up2-header-left">
            <div className="up2-eyebrow">
              <span className="up2-eyebrow-dot" />
              Payment Verification
            </div>
            <h1 className="up2-title">Submit Payment Proof</h1>
            <p className="up2-subtitle">Upload your receipt to confirm your contribution.</p>
          </div>
          <div className="up2-badge">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Secure Upload
          </div>
        </div>

        {/* ── Error alert ── */}
        {error && (
          <div className="up2-alert up2-alert--error">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Success alert ── */}
        {success && (
          <div className="up2-alert up2-alert--success">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
            <span><strong>Submitted!</strong> {success}</span>
          </div>
        )}

        {/* ── Rejected contribution banner ── */}
        {rejectedContribution && (
          <div className="up2-alert up2-alert--warning">
            <div className="up2-alert--warning-top">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Your previous proof was rejected</p>
                {rejectedContribution.rejectionNote && (
                  <p style={{ margin: '3px 0 0', fontSize: 12 }}>Reason: {rejectedContribution.rejectionNote}</p>
                )}
              </div>
            </div>
            <a
              href="/payments"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(217,119,6,0.1)',
                border: '1px solid rgba(217,119,6,0.25)',
                color: '#92400e', fontSize: 12, fontWeight: 700,
                textDecoration: 'none', alignSelf: 'flex-start',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Go to My Payments to resubmit
            </a>
          </div>
        )}

        {/* ── Amount card ── */}
        <div className="up2-card">
          <div className="up2-card-header">
            <div className="up2-card-icon">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="up2-card-title">Amount Paid</span>
          </div>
          <div className="up2-card-body">
            <div className="up2-amount-wrap">
              <span className="up2-currency">₦</span>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
                min="1"
                placeholder="0"
                className="up2-amount-input"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        {/* ── Period card ── */}
        <div className="up2-card">
          <div className="up2-card-header">
            <div className="up2-card-icon">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="up2-card-title">Contribution Period</span>
          </div>
          <div className="up2-card-body">
            <div className="up2-period-grid">
              <div>
                <label className="up2-label">Month</label>
                <div className="up2-select-wrap">
                  <select name="month" value={form.month} onChange={handleChange} className="up2-select">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
              <div>
                <label className="up2-label">Year</label>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  min="2020" max="2100"
                  className="up2-input"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="up2-summary">
              <div className="up2-summary-tag">Summary</div>
              <div className="up2-summary-item">
                <span className="up2-summary-lbl">Period</span>
                <span className="up2-summary-val">{MONTHS[form.month - 1].slice(0,3)} {form.year}</span>
              </div>
              <div className="up2-summary-item">
                <span className="up2-summary-lbl">Amount</span>
                <span className="up2-summary-val" style={{ color: form.amount ? 'var(--ct-emerald)' : 'var(--ct-text-4)' }}>
                  {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
                </span>
              </div>
              {selectedGroup && (
                <div className="up2-summary-item">
                  <span className="up2-summary-lbl">Circle</span>
                  <span className="up2-summary-val" style={{ color: 'var(--ct-gold)', fontSize: 11 }}>{selectedGroup.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Note card ── */}
        <div className="up2-card">
          <div className="up2-card-header">
            <div className="up2-card-icon">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <span className="up2-card-title">Note</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: form.note.length > 450 ? 'var(--ct-rose)' : 'var(--ct-text-4)' }}>
              {form.note.length}/500
            </span>
          </div>
          <div className="up2-card-body">
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              placeholder="e.g. Paid via bank transfer, reference #XYZ123 (optional)"
              className="up2-textarea"
            />
          </div>
        </div>

        {/* ── Upload card ── */}
        <div className="up2-card">
          <div className="up2-card-header">
            <div className="up2-card-icon">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <span className="up2-card-title">Proof of Payment</span>
          </div>
          <div className="up2-card-body">
            <div
              className={`up2-dropzone${dragging ? ' up2-dropzone--drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('up2-proof-file').click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="up2-preview-img" />
              ) : (
                <div className="up2-dropzone-inner">
                  <div className="up2-upload-icon">
                    {compressing ? (
                      <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'up2-spin 0.65s linear infinite' }} />
                    ) : (
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                  </div>
                  <p className="up2-dropzone-title">
                    {compressing ? 'Compressing image…' : <>Tap to select or <span>browse</span></>}
                  </p>
                  <p className="up2-dropzone-hint">JPG · PNG · WebP · PDF &nbsp;—&nbsp; Max 5 MB</p>
                </div>
              )}
              <input id="up2-proof-file" type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {file && (
              <div className="up2-file-pill">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--ct-emerald)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
                </svg>
                <span className="up2-file-name">{file.name}</span>
                <span className="up2-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={removeFile} className="up2-remove-btn">×</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="up2-submit-area">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`up2-submit-btn${canSubmit ? ' up2-submit-btn--active' : ''}`}
          >
            {(loading || compressing) && <span className="up2-spinner" />}
            {compressing ? 'Compressing image…' : loading ? 'Uploading…' : 'Submit Payment Proof'}
          </button>
          <div className="up2-secure">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Secure &amp; encrypted submission
          </div>
        </div>

      </form>
    </>
  );
}
