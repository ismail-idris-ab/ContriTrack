import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

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

export default function ResubmitModal({ contribution, onClose, onSuccess }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [note, setNote]           = useState(contribution.note || '');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const applyFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only image files and PDFs are allowed');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }
    setError('');
    setCompressing(true);
    const compressed = await compressImage(f);
    setCompressing(false);
    setFile(compressed);
    setPreview(compressed.type.startsWith('image/') ? URL.createObjectURL(compressed) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a new proof image'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('note', note);
      const { data } = await api.patch(`/contributions/${contribution._id}/resubmit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,10,16,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        backdropFilter: 'blur(6px)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        className="animate-fade-up"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20,
          maxWidth: 460, width: '100%',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, #e11d48, #fb7185, #e11d48)' }} />

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em',
            }}>
              Resubmit Proof
            </h3>
            <p style={{ fontSize: 12, color: 'var(--ct-text-3)', margin: '3px 0 0' }}>
              {MONTHS[contribution.month - 1]} {contribution.year}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)', background: '#f5f2ec',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ct-text-2)', fontSize: 16,
            }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {contribution.rejectionNote && (
            <div style={{
              background: 'rgba(225,29,72,0.06)', borderRadius: 10,
              border: '1px solid rgba(225,29,72,0.15)',
              padding: '12px 14px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                Rejection reason
              </p>
              <p style={{ fontSize: 13, color: 'var(--ct-text-1)', margin: 0, lineHeight: 1.5 }}>
                {contribution.rejectionNote}
              </p>
            </div>
          )}

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); applyFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--ct-gold)' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: 12, padding: '20px 16px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(212,160,23,0.04)' : '#faf9f6',
              transition: 'all 0.15s', marginBottom: 16,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => applyFile(e.target.files[0])}
            />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: 0 }}>
                  {compressing ? 'Compressing…' : 'Click or drag & drop your new proof'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--ct-text-3)', margin: '4px 0 0', opacity: 0.7 }}>
                  JPG, PNG, PDF — max 5 MB
                </p>
              </>
            )}
          </div>

          {file && (
            <p style={{ fontSize: 12, color: 'var(--ct-text-3)', marginBottom: 16, textAlign: 'center' }}>
              {file.name}
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                style={{ marginLeft: 8, fontSize: 11, color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Remove
              </button>
            </p>
          )}

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            maxLength={500}
            rows={2}
            style={{
              width: '100%', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '10px 12px', fontSize: 13,
              fontFamily: 'var(--font-sans)', resize: 'vertical',
              color: 'var(--ct-text-1)', background: '#faf9f6',
              boxSizing: 'border-box', marginBottom: 16,
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#e11d48', marginBottom: 12, textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || compressing || !file}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none',
              background: loading || compressing || !file ? '#c8c8d8' : 'var(--ct-gold)',
              color: '#0f0f14', fontWeight: 700, fontSize: 14,
              cursor: loading || compressing || !file ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
            }}
          >
            {loading ? 'Uploading…' : 'Resubmit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
