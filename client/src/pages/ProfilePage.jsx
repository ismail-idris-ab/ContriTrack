import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import api from '../api/axios';

const inputStyle = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e2e0da', borderRadius: 10,
  fontSize: 13.5, fontFamily: 'var(--font-sans)',
  background: '#faf9f6', color: 'var(--ct-text-1)',
  boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block', fontSize: 11.5, fontWeight: 700,
  color: 'var(--ct-text-2)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'], ['#059669','#0d9488'],
  ['#d97706','#b45309'], ['#e11d48','#be123c'], ['#0ea5e9','#0284c7'],
];
const getAvatarGradient = (name = '') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
};
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      padding: '24px 28px', marginBottom: 20,
      boxShadow: 'var(--ct-shadow)',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 700,
        color: 'var(--ct-text-1)',
        margin: '0 0 20px', letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Alert({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: 13,
      background: isError ? 'rgba(225,29,72,0.08)' : 'rgba(5,150,105,0.08)',
      border: `1px solid ${isError ? 'rgba(225,29,72,0.22)' : 'rgba(5,150,105,0.22)'}`,
      color: isError ? '#e11d48' : '#059669',
    }}>
      {message}
    </div>
  );
}

export default function ProfilePage() {
  useDocumentTitle('Profile — ContriTrack');
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // ── Profile form ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileError,   setProfileError]   = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile,  setSavingProfile]  = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        name:  profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      // Update stored user
      const updated = { ...user, name: data.name, email: data.email, phone: data.phone };
      login(updated);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password form ───────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [passwordError,   setPasswordError]   = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword,  setSavingPassword]  = useState(false);

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwords.newPassword.length < 6) {
      return setPasswordError('New password must be at least 6 characters.');
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setPasswordError('Passwords do not match.');
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });
      setPasswordSuccess('Password updated successfully.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2 MB.');
      return;
    }

    setAvatarError('');
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.patch('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = { ...user, avatar: data.avatar };
      login(updated);
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 640, margin: '0 auto' }}>

      {/* Avatar + name hero */}
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '28px 28px 24px',
        marginBottom: 20,
        boxShadow: 'var(--ct-shadow)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        {/* Clickable avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            onMouseEnter={e => {
              if (!uploadingAvatar) {
                const overlay = e.currentTarget.querySelector('[data-overlay]');
                if (overlay) overlay.style.opacity = '1';
              }
            }}
            onMouseLeave={e => {
              const overlay = e.currentTarget.querySelector('[data-overlay]');
              if (overlay) overlay.style.opacity = '0';
            }}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              position: 'relative', cursor: uploadingAvatar ? 'default' : 'pointer',
              boxShadow: '0 0 0 4px #fff, 0 0 0 6px rgba(212,160,23,0.25)',
              overflow: 'hidden',
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: getAvatarGradient(user?.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(user?.name)}
              </div>
            )}

            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}

            {!uploadingAvatar && (
              <div
                data-overlay=""
                style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.18s ease',
                  pointerEvents: 'none',
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, marginTop: 3, letterSpacing: '0.05em' }}>CHANGE</span>
              </div>
            )}
          </div>

          {avatarError && (
            <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              marginTop: 6, whiteSpace: 'nowrap',
              fontSize: 11, color: '#e11d48', fontWeight: 500,
            }}>
              {avatarError}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 700,
            color: 'var(--ct-text-1)', letterSpacing: '-0.01em',
          }}>
            {user?.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ct-text-3)', marginTop: 3 }}>
            {user?.email}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: user?.role === 'admin' ? 'rgba(212,160,23,0.1)' : 'rgba(79,70,229,0.08)',
              color: user?.role === 'admin' ? '#b8860a' : 'var(--ct-indigo)',
              textTransform: 'capitalize',
            }}>
              {user?.role}
            </span>
            {(() => {
              const plan = user?.subscription?.plan || 'free';
              const colors = { free: ['#52526e','rgba(82,82,110,0.1)'], pro: ['#d4a017','rgba(212,160,23,0.1)'], coordinator: ['#4f46e5','rgba(79,70,229,0.1)'] };
              const [color, bg] = colors[plan] || colors.free;
              return (
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, textTransform: 'capitalize' }}>
                  {plan} plan
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Profile details */}
      <Section title="Account Details">
        <Alert type="error"   message={profileError} />
        <Alert type="success" message={profileSuccess} />
        <form onSubmit={handleProfileSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                style={inputStyle}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                placeholder="08012345678"
                type="tel"
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: savingProfile ? '#e8e4dc' : 'var(--ct-gold)',
              color: savingProfile ? 'var(--ct-text-3)' : '#0f0f14',
              fontSize: 13.5, fontWeight: 700,
              cursor: savingProfile ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <Alert type="error"   message={passwordError} />
        <Alert type="success" message={passwordSuccess} />
        <form onSubmit={handlePasswordSave}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
              style={inputStyle}
              placeholder="Enter current password"
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                style={inputStyle}
                placeholder="Min. 6 characters"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                style={inputStyle}
                placeholder="Repeat new password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: savingPassword ? '#e8e4dc' : '#14141e',
              color: savingPassword ? 'var(--ct-text-3)' : '#fff',
              fontSize: 13.5, fontWeight: 700,
              cursor: savingPassword ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <div style={{
        background: 'rgba(225,29,72,0.04)', borderRadius: 16,
        padding: '20px 28px',
        border: '1px solid rgba(225,29,72,0.14)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#e11d48', margin: '0 0 6px' }}>
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: '0 0 16px' }}>
          Account deletion is permanent and cannot be undone. Contact support to proceed.
        </p>
        <button
          disabled
          style={{
            padding: '9px 20px', borderRadius: 9,
            border: '1px solid rgba(225,29,72,0.25)',
            background: 'transparent', color: '#be123c',
            fontSize: 13, fontWeight: 600, cursor: 'not-allowed',
            fontFamily: 'var(--font-sans)', opacity: 0.6,
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
