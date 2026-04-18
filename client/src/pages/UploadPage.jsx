import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Compress images client-side before upload (max 1200px, 0.82 JPEG quality).
// PDFs and small images (<300KB) are passed through unchanged.
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
  const navigate = useNavigate();
  const { activeGroup } = useGroup();
  const now = new Date();
  const [form, setForm] = useState({
    amount: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    note: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setAlreadySubmitted(false);
  };

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
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files[0]);
  };
  const removeFile = () => { setFile(null); setPreview(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) return setError('Please select a proof of payment image');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');

    const formData = new FormData();
    formData.append('proof', file);
    formData.append('amount', form.amount);
    formData.append('month', form.month);
    formData.append('year', form.year);
    formData.append('note', form.note);
    if (activeGroup) formData.append('groupId', activeGroup._id);

    setLoading(true);
    try {
      await api.post('/contributions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Proof submitted! Awaiting admin review.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (err.response?.status === 400 && msg.toLowerCase().includes('already submitted')) {
        setAlreadySubmitted(true);
      } else {
        setError(msg || 'Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .upload-card {
          background: #14141e;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 8px 48px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .upload-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(212,160,23,0.3);
          background: rgba(212,160,23,0.08);
          font-family: var(--font-sans);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ct-gold);
          margin-bottom: 18px;
        }
        .upload-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ct-gold);
          animation: pulse-gold 2s ease-in-out infinite;
        }
        @keyframes pulse-gold {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }

        .upload-title {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 700;
          line-height: 1.15;
          color: #f5f0e8;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .upload-subtitle {
          font-family: var(--font-sans);
          font-size: 13.5px;
          color: rgba(255,255,255,0.38);
          margin: 0 0 24px;
          line-height: 1.5;
        }

        .upload-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
          margin: 0 0 24px;
        }

        .upload-label {
          display: block;
          font-family: var(--font-sans);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.38);
          margin-bottom: 8px;
        }

        .upload-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          font-size: 14px;
          font-family: var(--font-mono);
          background: rgba(255,255,255,0.04);
          color: #f0ede6;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .upload-input::placeholder { color: rgba(255,255,255,0.2); }
        .upload-input:focus {
          border-color: rgba(212,160,23,0.5);
          background: rgba(212,160,23,0.04);
        }

        .upload-select-wrapper {
          position: relative;
        }
        .upload-select-wrapper svg {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(255,255,255,0.3);
        }
        .upload-input option {
          background: #1e1e2e;
          color: #f0ede6;
        }

        .upload-summary {
          display: grid;
          grid-template-columns: auto 1fr 1fr;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .upload-summary-tag {
          padding: 14px 16px;
          font-family: var(--font-sans);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ct-gold);
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .upload-summary-cell {
          padding: 14px 16px;
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .upload-summary-cell:last-child { border-right: none; }
        .upload-summary-cell-label {
          font-family: var(--font-sans);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 3px;
        }
        .upload-summary-cell-value {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          color: #f0ede6;
        }

        .upload-drop-zone {
          border: 2px dashed rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 36px 20px;
          text-align: center;
          cursor: pointer;
          background: rgba(255,255,255,0.02);
          transition: all 0.2s;
          overflow: hidden;
          position: relative;
        }
        .upload-drop-zone.dragging,
        .upload-drop-zone:hover {
          border-color: rgba(212,160,23,0.5);
          background: rgba(212,160,23,0.04);
        }
        .upload-drop-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--ct-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          color: #0f0f14;
          box-shadow: 0 4px 20px rgba(212,160,23,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .upload-drop-zone:hover .upload-drop-icon {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(212,160,23,0.45);
        }
        .upload-drop-text {
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          margin: 0 0 5px;
        }
        .upload-drop-text span {
          color: var(--ct-gold);
          font-weight: 700;
        }
        .upload-drop-hint {
          font-family: var(--font-sans);
          font-size: 11.5px;
          color: rgba(255,255,255,0.22);
          margin: 0;
        }

        .upload-file-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(5,150,105,0.08);
          border: 1px solid rgba(5,150,105,0.2);
          border-radius: 10px;
          margin-top: 12px;
        }
        .upload-file-name {
          flex: 1;
          font-size: 12.5px;
          font-weight: 600;
          color: #f0ede6;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-sans);
        }
        .upload-file-size {
          font-size: 11px;
          font-family: var(--font-mono);
          color: rgba(255,255,255,0.28);
          white-space: nowrap;
        }
        .upload-file-remove {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: rgba(225,29,72,0.12);
          color: #fb7185;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          line-height: 1;
          transition: background 0.15s;
        }
        .upload-file-remove:hover { background: rgba(225,29,72,0.22); }

        .upload-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 700;
          font-family: var(--font-sans);
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: all 0.22s;
          margin-top: 4px;
        }
        .upload-btn.active {
          background: var(--ct-gold);
          color: #0f0f14;
          box-shadow: 0 4px 24px rgba(212,160,23,0.35);
        }
        .upload-btn.active:hover {
          background: var(--ct-gold-light);
          transform: translateY(-1px);
          box-shadow: 0 6px 32px rgba(212,160,23,0.45);
        }
        .upload-btn.inactive {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.22);
          cursor: not-allowed;
        }

        .upload-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          font-family: var(--font-sans);
          font-size: 11.5px;
          color: rgba(255,255,255,0.22);
        }

        .upload-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: var(--font-sans);
          font-size: 13px;
          margin-bottom: 16px;
        }
        .upload-alert.error {
          background: rgba(225,29,72,0.08);
          border: 1px solid rgba(225,29,72,0.25);
          color: #fb7185;
        }
        .upload-alert.success-alert {
          background: rgba(5,150,105,0.08);
          border: 1px solid rgba(5,150,105,0.25);
          color: #34d399;
        }

        .upload-preview-img {
          width: 100%;
          max-height: 280px;
          object-fit: contain;
          display: block;
          border-radius: 10px;
        }

        .upload-textarea {
          resize: none;
        }

        .upload-amount-prefix {
          position: relative;
        }
        .upload-amount-prefix .prefix {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-mono);
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          pointer-events: none;
          user-select: none;
        }
        .upload-amount-prefix input {
          padding-left: 32px;
        }

        .upload-spinner {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid rgba(15,15,20,0.3);
          border-top-color: #0f0f14;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>

        {/* Active group banner */}
        {activeGroup && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(212,160,23,0.08)',
            border: '1px solid rgba(212,160,23,0.2)',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 13, color: 'var(--ct-text-2)' }}>
              Submitting for circle: <strong style={{ color: 'var(--ct-text-1)' }}>{activeGroup.name}</strong>
            </span>
          </div>
        )}

        {/* Alerts */}
        {alreadySubmitted && (
          <div className="upload-alert" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, fontSize: 13.5 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
            <span>
              You've already submitted a contribution for {MONTHS[form.month - 1]} {form.year}.{' '}
              <button onClick={() => navigate('/my-payments')} style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' }}>
                View payment history →
              </button>
            </span>
          </div>
        )}
        {error && (
          <div className="upload-alert error">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="upload-alert success-alert">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
            <span><strong>Submitted!</strong> {success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="upload-card">

            {/* Badge */}
            <div className="upload-badge">
              <span className="upload-badge-dot" />
              Payment Verification
            </div>

            {/* Heading */}
            <h1 className="upload-title">Submit<br />Payment Proof</h1>
            <p className="upload-subtitle">Upload your proof of payment to confirm your<br />transaction securely.</p>

            <hr className="upload-divider" />

            {/* Amount */}
            <div style={{ marginBottom: 18 }}>
              <label className="upload-label">Amount Paid</label>
              <div className="upload-amount-prefix">
                <span className="prefix">₦</span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="0.00"
                  className="upload-input"
                />
              </div>
            </div>

            {/* Month + Year */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label className="upload-label">Month</label>
                <div className="upload-select-wrapper">
                  <select name="month" value={form.month} onChange={handleChange} className="upload-input" style={{ paddingRight: 38, cursor: 'pointer' }}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
              <div>
                <label className="upload-label">Year</label>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  min="2020" max="2100"
                  className="upload-input"
                />
              </div>
            </div>

            {/* Summary row */}
            <div className="upload-summary" style={{ gridTemplateColumns: activeGroup ? 'auto 1fr 1fr 1fr' : 'auto 1fr 1fr' }}>
              <div className="upload-summary-tag">Summary</div>
              <div className="upload-summary-cell">
                <div className="upload-summary-cell-label">Period</div>
                <div className="upload-summary-cell-value">{MONTHS[form.month - 1]} {form.year}</div>
              </div>
              <div className="upload-summary-cell">
                <div className="upload-summary-cell-label">Amount</div>
                <div className="upload-summary-cell-value" style={{ color: form.amount ? '#34d399' : 'rgba(255,255,255,0.25)' }}>
                  {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
                </div>
              </div>
              {activeGroup && (
                <div className="upload-summary-cell">
                  <div className="upload-summary-cell-label">Circle</div>
                  <div className="upload-summary-cell-value" style={{ fontSize: 11, color: 'var(--ct-gold)' }}>
                    {activeGroup.name}
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="upload-label" style={{ margin: 0 }}>
                  Note{' '}
                  <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 0, fontSize: 10, fontWeight: 400 }}>(optional)</span>
                </label>
                <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: form.note.length > 450 ? '#fb7185' : 'rgba(255,255,255,0.22)' }}>
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
                className="upload-input upload-textarea"
              />
            </div>

            {/* Drop zone */}
            <div style={{ marginBottom: 22 }}>
              <label className="upload-label">Proof of Payment</label>
              <div
                className={`upload-drop-zone${dragging ? ' dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('proofFile').click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="upload-preview-img" />
                ) : (
                  <>
                    <div className="upload-drop-icon">
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <p className="upload-drop-text">
                      Drop file here, or <span>browse</span>
                    </p>
                    <p className="upload-drop-hint">JPG · PNG · WebP · PDF &nbsp;—&nbsp; Max 5 MB</p>
                  </>
                )}
                <input id="proofFile" type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>

              {file && (
                <div className="upload-file-pill">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
                  </svg>
                  <span className="upload-file-name">{file.name}</span>
                  <span className="upload-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={removeFile} className="upload-file-remove">×</button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!file || loading || compressing}
              className={`upload-btn ${file && !loading && !compressing ? 'active' : 'inactive'}`}
            >
              {(loading || compressing) && <span className="upload-spinner" />}
              {compressing ? 'Compressing image…' : loading ? 'Uploading to cloud…' : 'Submit Payment Proof'}
            </button>

            {/* Secure footer */}
            <div className="upload-secure">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Secure &amp; encrypted submission
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
