import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function compressImage(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size < 300 * 1024) { resolve(file); return; }
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
  useDocumentTitle('Upload Proof — ROTARA');
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
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') { setError('Only image files and PDFs are allowed'); return; }
    if (f.size > 5 * 1024 * 1024) { setError(`File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 5 MB.`); return; }
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
    setError(''); setSuccess('');
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
      setFile(null); setPreview(null);
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
        /* ── Full-bleed dark shell — cancels parent padding ── */
        .vault-shell {
          background: #0d0c0a;
          margin: -28px;
          padding: 36px 28px 56px;
          min-height: calc(100vh - 60px);
          font-family: var(--font-sans);
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .vault-shell { margin: -16px -14px -80px; padding: 28px 16px 100px; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .vault-shell { margin: -22px; padding: 32px 22px 56px; }
        }

        /* Subtle warm noise texture overlay */
        .vault-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,160,23,0.07) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .vault-inner {
          max-width: 520px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ── Header ── */
        .vault-header {
          margin-bottom: 32px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .vault-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #d4a017;
          margin-bottom: 12px;
        }
        .vault-eyebrow-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #d4a017;
          animation: vault-pulse 2.4s ease-in-out infinite;
        }
        @keyframes vault-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.6); }
        }
        .vault-title {
          font-family: var(--font-display);
          font-size: clamp(26px, 5vw, 34px);
          font-weight: 700;
          color: #f2ece0;
          letter-spacing: -0.025em;
          line-height: 1.12;
          margin: 0 0 8px;
        }
        .vault-subtitle {
          font-size: 13.5px;
          color: rgba(242,236,224,0.42);
          margin: 0;
          line-height: 1.5;
        }

        /* ── Alert banners ── */
        .vault-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
        }
        .vault-alert svg { flex-shrink: 0; margin-top: 1px; }
        .vault-alert--error {
          background: rgba(225,29,72,0.08);
          border: 1px solid rgba(225,29,72,0.2);
          color: #fca5a5;
        }
        .vault-alert--success {
          background: rgba(5,150,105,0.09);
          border: 1px solid rgba(5,150,105,0.22);
          color: #6ee7b7;
        }
        .vault-alert--warning {
          background: rgba(217,119,6,0.08);
          border: 1px solid rgba(217,119,6,0.22);
          color: #fcd34d;
          flex-direction: column;
          gap: 10px;
        }
        .vault-alert--warning-top { display: flex; align-items: flex-start; gap: 10px; }

        /* ── Section blocks ── */
        .vault-section {
          background: rgba(255,255,255,0.033);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          margin-bottom: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .vault-section:focus-within {
          border-color: rgba(212,160,23,0.3);
        }
        .vault-section-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .vault-section-icon {
          width: 28px; height: 28px;
          border-radius: 7px;
          background: rgba(212,160,23,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d4a017;
          flex-shrink: 0;
        }
        .vault-section-title {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: rgba(242,236,224,0.4);
        }
        .vault-section-body { padding: 18px; }

        /* ── Field label ── */
        .vault-label {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(242,236,224,0.38);
          margin-bottom: 8px;
        }
        .vault-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .vault-label-row .vault-label { margin-bottom: 0; }

        /* ── Amount ── */
        .vault-amount-wrap {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
        }
        .vault-amount-wrap:focus-within {
          border-color: rgba(212,160,23,0.6);
          background: rgba(212,160,23,0.04);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.1);
        }
        .vault-currency {
          padding: 0 4px 0 18px;
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          color: rgba(212,160,23,0.6);
          user-select: none;
          pointer-events: none;
          flex-shrink: 0;
        }
        .vault-amount-input {
          flex: 1;
          padding: 17px 18px 17px 4px;
          border: none;
          background: transparent;
          font-family: var(--font-mono);
          font-size: 30px;
          font-weight: 700;
          color: #f2ece0;
          outline: none;
          min-width: 0;
          -moz-appearance: textfield;
        }
        .vault-amount-input::-webkit-outer-spin-button,
        .vault-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .vault-amount-input::placeholder { color: rgba(242,236,224,0.15); font-weight: 400; }

        /* ── Selects & inputs ── */
        .vault-select-wrap { position: relative; }
        .vault-select-wrap svg {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(242,236,224,0.3);
        }
        .vault-select, .vault-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          font-size: 13.5px;
          font-family: var(--font-mono);
          background: rgba(255,255,255,0.04);
          color: #f2ece0;
          box-sizing: border-box;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .vault-select { padding-right: 36px; cursor: pointer; }
        .vault-select:focus, .vault-input:focus {
          border-color: rgba(212,160,23,0.55);
          background: rgba(212,160,23,0.04);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.1);
        }
        .vault-select option { background: #1a1814; color: #f2ece0; }

        /* ── Period grid ── */
        .vault-period-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        /* ── Summary strip ── */
        .vault-summary {
          display: flex;
          margin-top: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0,0,0,0.2);
        }
        .vault-summary-tag {
          padding: 10px 12px;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #d4a017;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: rgba(212,160,23,0.06);
        }
        .vault-summary-item {
          flex: 1;
          padding: 8px 12px;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .vault-summary-item:last-child { border-right: none; }
        .vault-summary-lbl {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(242,236,224,0.28);
        }
        .vault-summary-val {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: #f2ece0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Textarea ── */
        .vault-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          font-size: 13.5px;
          font-family: var(--font-sans);
          background: rgba(255,255,255,0.04);
          color: #f2ece0;
          box-sizing: border-box;
          transition: border-color 0.18s, box-shadow 0.18s;
          outline: none;
          resize: none;
          line-height: 1.55;
        }
        .vault-textarea::placeholder { color: rgba(242,236,224,0.2); }
        .vault-textarea:focus {
          border-color: rgba(212,160,23,0.55);
          background: rgba(212,160,23,0.03);
          box-shadow: 0 0 0 3px rgba(212,160,23,0.1);
        }

        /* ── Dropzone ── */
        .vault-dropzone {
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 14px;
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          animation: vault-breathe 3s ease-in-out infinite;
        }
        @keyframes vault-breathe {
          0%, 100% { border-color: rgba(212,160,23,0.18); }
          50% { border-color: rgba(212,160,23,0.42); }
        }
        .vault-dropzone:hover, .vault-dropzone--drag {
          border-color: #d4a017 !important;
          background: rgba(212,160,23,0.05);
          animation: none;
        }
        .vault-dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          gap: 12px;
          text-align: center;
        }
        .vault-upload-icon {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e8b94f 0%, #d4a017 50%, #b8880e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2a1c00;
          box-shadow: 0 8px 24px rgba(212,160,23,0.3), 0 0 0 8px rgba(212,160,23,0.08);
          margin-bottom: 4px;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .vault-dropzone:hover .vault-upload-icon {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 14px 32px rgba(212,160,23,0.4), 0 0 0 10px rgba(212,160,23,0.1);
        }
        .vault-dropzone-title {
          font-size: 14.5px;
          font-weight: 700;
          color: rgba(242,236,224,0.75);
          margin: 0;
        }
        .vault-dropzone-title span { color: #d4a017; }
        .vault-dropzone-hint {
          font-size: 11.5px;
          color: rgba(242,236,224,0.28);
          margin: 0;
          font-family: var(--font-mono);
          letter-spacing: 0.03em;
        }
        .vault-preview-img {
          width: 100%;
          max-height: 280px;
          object-fit: contain;
          display: block;
        }

        /* ── File pill ── */
        .vault-file-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(5,150,105,0.07);
          border: 1px solid rgba(5,150,105,0.2);
          border-radius: 10px;
          margin-top: 10px;
        }
        .vault-file-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 600;
          color: #f2ece0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .vault-file-size {
          font-size: 11px;
          font-family: var(--font-mono);
          color: rgba(242,236,224,0.35);
          flex-shrink: 0;
        }
        .vault-remove-btn {
          width: 26px; height: 26px;
          border-radius: 7px;
          border: none;
          background: rgba(225,29,72,0.1);
          color: #fca5a5;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .vault-remove-btn:hover { background: rgba(225,29,72,0.2); }

        /* ── Submit ── */
        .vault-submit-wrap { margin-top: 4px; }
        .vault-submit-btn {
          width: 100%;
          padding: 17px;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 800;
          font-family: var(--font-sans);
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.22s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          -webkit-tap-highlight-color: transparent;
        }
        .vault-submit-btn--active {
          background: linear-gradient(135deg, #f0c040 0%, #d4a017 55%, #b07a0a 100%);
          color: #2a1c00;
          box-shadow: 0 4px 24px rgba(212,160,23,0.4), 0 1px 4px rgba(212,160,23,0.3);
        }
        .vault-submit-btn--active:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(212,160,23,0.5), 0 2px 8px rgba(212,160,23,0.3);
        }
        .vault-submit-btn--active:active { transform: scale(0.99); box-shadow: 0 3px 14px rgba(212,160,23,0.3); }
        .vault-submit-btn:not(.vault-submit-btn--active) {
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.07);
          color: rgba(242,236,224,0.2);
          cursor: not-allowed;
        }
        .vault-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 11px;
          color: rgba(242,236,224,0.2);
          letter-spacing: 0.04em;
        }

        /* ── Spinner ── */
        .vault-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(42,28,0,0.25);
          border-top-color: #2a1c00;
          border-radius: 50%;
          animation: vault-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes vault-spin { to { transform: rotate(360deg); } }

        /* ── Staggered entry ── */
        .vault-fade { animation: vault-fadeup 0.45s ease both; }
        .vault-fade:nth-child(1) { animation-delay: 0s; }
        .vault-fade:nth-child(2) { animation-delay: 0.06s; }
        .vault-fade:nth-child(3) { animation-delay: 0.12s; }
        .vault-fade:nth-child(4) { animation-delay: 0.18s; }
        .vault-fade:nth-child(5) { animation-delay: 0.24s; }
        .vault-fade:nth-child(6) { animation-delay: 0.30s; }
        .vault-fade:nth-child(7) { animation-delay: 0.36s; }
        @keyframes vault-fadeup {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="vault-shell">
        <form onSubmit={handleSubmit} className="vault-inner">

          {/* ── Header ── */}
          <div className="vault-header vault-fade">
            <div className="vault-eyebrow">
              <span className="vault-eyebrow-dot" />
              Payment Verification
            </div>
            <h1 className="vault-title">Submit Payment Proof</h1>
            <p className="vault-subtitle">Upload your receipt to confirm your contribution securely.</p>
          </div>

          {/* ── Alerts ── */}
          {error && (
            <div className="vault-alert vault-alert--error vault-fade">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="vault-alert vault-alert--success vault-fade">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
              </svg>
              <span><strong>Submitted!</strong> {success}</span>
            </div>
          )}
          {rejectedContribution && (
            <div className="vault-alert vault-alert--warning vault-fade">
              <div className="vault-alert--warning-top">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Your previous proof was rejected</p>
                  {rejectedContribution.rejectionNote && (
                    <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.85 }}>Reason: {rejectedContribution.rejectionNote}</p>
                  )}
                </div>
              </div>
              <Link to="/my-payments" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)',
                color: '#fcd34d', fontSize: 12, fontWeight: 700, textDecoration: 'none',
              }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                Go to My Payments to resubmit
              </Link>
            </div>
          )}

          {/* ── Amount ── */}
          <div className="vault-section vault-fade">
            <div className="vault-section-head">
              <div className="vault-section-icon">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <span className="vault-section-title">Amount Paid</span>
            </div>
            <div className="vault-section-body">
              <div className="vault-amount-wrap">
                <span className="vault-currency">₦</span>
                <input
                  type="number" name="amount" value={form.amount}
                  onChange={handleChange} required min="1" placeholder="0"
                  className="vault-amount-input" inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* ── Period ── */}
          <div className="vault-section vault-fade">
            <div className="vault-section-head">
              <div className="vault-section-icon">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="vault-section-title">Contribution Period</span>
            </div>
            <div className="vault-section-body">
              <div className="vault-period-grid">
                <div>
                  <label className="vault-label">Month</label>
                  <div className="vault-select-wrap">
                    <select name="month" value={form.month} onChange={handleChange} className="vault-select">
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="vault-label">Year</label>
                  <input type="number" name="year" value={form.year}
                    onChange={handleChange} min="2020" max="2100"
                    className="vault-input" inputMode="numeric"
                  />
                </div>
              </div>
              <div className="vault-summary">
                <div className="vault-summary-tag">Summary</div>
                <div className="vault-summary-item">
                  <span className="vault-summary-lbl">Period</span>
                  <span className="vault-summary-val">{MONTHS[form.month - 1].slice(0,3)} {form.year}</span>
                </div>
                <div className="vault-summary-item">
                  <span className="vault-summary-lbl">Amount</span>
                  <span className="vault-summary-val" style={{ color: form.amount ? '#6ee7b7' : 'rgba(242,236,224,0.22)' }}>
                    {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
                  </span>
                </div>
                {selectedGroup && (
                  <div className="vault-summary-item">
                    <span className="vault-summary-lbl">Circle</span>
                    <span className="vault-summary-val" style={{ color: '#d4a017', fontSize: 11 }}>{selectedGroup.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Note ── */}
          <div className="vault-section vault-fade">
            <div className="vault-section-head">
              <div className="vault-section-icon">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <span className="vault-section-title">Note</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: form.note.length > 450 ? '#fca5a5' : 'rgba(242,236,224,0.2)' }}>
                {form.note.length}/500
              </span>
            </div>
            <div className="vault-section-body">
              <textarea
                name="note" value={form.note} onChange={handleChange}
                rows={2} maxLength={500}
                placeholder="e.g. Paid via GTBank transfer, ref #XYZ123 (optional)"
                className="vault-textarea"
              />
            </div>
          </div>

          {/* ── Upload ── */}
          <div className="vault-section vault-fade">
            <div className="vault-section-head">
              <div className="vault-section-icon">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <span className="vault-section-title">Proof of Payment</span>
            </div>
            <div className="vault-section-body">
              <div
                className={`vault-dropzone${dragging ? ' vault-dropzone--drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('vault-proof-file').click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="vault-preview-img" />
                ) : (
                  <div className="vault-dropzone-inner">
                    <div className="vault-upload-icon">
                      {compressing ? (
                        <div style={{ width: 20, height: 20, border: '2.5px solid rgba(42,28,0,0.3)', borderTopColor: '#2a1c00', borderRadius: '50%', animation: 'vault-spin 0.65s linear infinite' }} />
                      ) : (
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      )}
                    </div>
                    <p className="vault-dropzone-title">
                      {compressing ? 'Compressing…' : <>Tap to select or <span>browse</span></>}
                    </p>
                    <p className="vault-dropzone-hint">JPG · PNG · WebP · PDF — Max 5 MB</p>
                  </div>
                )}
                <input id="vault-proof-file" type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>

              {file && (
                <div className="vault-file-pill">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
                  </svg>
                  <span className="vault-file-name">{file.name}</span>
                  <span className="vault-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={removeFile} className="vault-remove-btn">×</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="vault-submit-wrap vault-fade">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`vault-submit-btn${canSubmit ? ' vault-submit-btn--active' : ''}`}
            >
              {(loading || compressing) && <span className="vault-spinner" />}
              {compressing ? 'Compressing image…' : loading ? 'Uploading to vault…' : 'Submit Payment Proof'}
            </button>
            <div className="vault-secure">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Secure &amp; encrypted submission
            </div>
          </div>

        </form>
      </div>
    </>
  );
}
