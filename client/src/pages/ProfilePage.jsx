import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  useDocumentTitle('Profile — ROTARA');
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

  // ── Referral ─────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  const { data: referral } = useQuery({
    queryKey: ['referral', 'me'],
    queryFn:  () => api.get('/referral/me').then(r => r.data),
    staleTime: 60_000,
  });

  const copyLink = () => {
    if (!referral?.link) return;
    navigator.clipboard.writeText(referral.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsappShare = () => {
    if (!referral?.link) return;
    const text = encodeURIComponent(
      `Join me on Rotata — the easiest way to manage your Ajo or savings circle! Sign up here: ${referral.link}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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

      {/* Refer & Earn */}
      <Section title="Refer & Earn">
        <p style={{ fontSize: 13.5, color: 'var(--ct-text-2)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Share your link. Earn <strong>1 free month</strong> for every friend who upgrades to a paid plan.
        </p>

        {referral ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{
                flex: 1, minWidth: 0,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid #e2e0da',
                background: '#faf9f6',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                color: 'var(--ct-text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {referral.link}
              </div>
              <button
                onClick={copyLink}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  border: '1.5px solid #e2e0da',
                  background: copied ? 'rgba(5,150,105,0.08)' : '#faf9f6',
                  color: copied ? '#059669' : 'var(--ct-text-2)',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={whatsappShare}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  border: 'none', background: '#25D366', color: '#fff',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Referred',      value: referral.totalReferred },
                { label: 'Converted',     value: referral.convertedReferrals },
                { label: 'Months earned', value: Math.max(0, referral.creditsEarned) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  flex: '1 1 80px', padding: '12px 16px',
                  borderRadius: 10, border: '1.5px solid #e2e0da',
                  background: '#faf9f6', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                    color: 'var(--ct-gold)', lineHeight: 1, marginBottom: 4,
                  }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ct-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ct-text-3)' }}>Loading referral link…</div>
        )}
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
