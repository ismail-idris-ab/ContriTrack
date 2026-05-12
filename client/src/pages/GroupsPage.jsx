import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import TemplatePickerStep from '../components/TemplatePickerStep';
import CircleSettingsDrawer from '../components/CircleSettingsDrawer';
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';
import Skeleton from '../components/Skeleton';

const isGroupAdmin = (grp, userId) =>
  grp?.members?.some(m => String(m.user?._id || m.user) === String(userId) && m.role === 'admin');

function ShareButton({ groupName, inviteCode }) {
  const message = `Join my "${groupName}" savings circle on ROTARA!\nUse invite code: ${inviteCode}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Share via WhatsApp"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 7,
        border: '1px solid rgba(37,211,102,0.3)',
        background: 'rgba(37,211,102,0.07)',
        color: '#128c7e',
        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
      }}
    >
      <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.845L.057 23.547a.5.5 0 00.608.608l5.702-1.472A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.666-.523-5.181-1.432l-.371-.221-3.384.873.893-3.268-.242-.381A9.944 9.944 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
      </svg>
      Share
    </button>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 7,
      border: copied ? '1px solid rgba(5,150,105,0.3)' : '1px solid rgba(0,0,0,0.08)',
      background: copied ? 'rgba(5,150,105,0.06)' : '#faf9f6',
      color: copied ? 'var(--ct-emerald)' : 'var(--ct-text-2)',
      fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
    }}>
      {copied ? (
        <>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy code
        </>
      )}
    </button>
  );
}

export default function GroupsPage() {
  useDocumentTitle('My Circles — ROTARA');
  const { user } = useAuth();
  const toast = useToast();
  const { groups, activeGroup, selectGroup, loadGroups, loadingGroups } = useGroup();
  const [searchParams] = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [leavingId, setLeavingId] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '', description: '', contributionAmount: '',
    dueDay: '25', graceDays: '3', rotationType: 'fixed',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [createStep, setCreateStep] = useState('template'); // 'template' | 'form'
  const [settingsGroup, setSettingsGroup] = useState(null);

  // Edit form
  const [editingGroup, setEditingGroup] = useState(null); // group object
  const [editForm, setEditForm] = useState({ name: '', description: '', contributionAmount: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Archive (delete) group
  const [archivingId, setArchivingId] = useState(null);

  // Custom confirmation modal state (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal shape: { title, body, onConfirm }

  const openConfirm = (title, body, onConfirm) =>
    setConfirmModal({ title, body, onConfirm });
  const closeConfirm = () => setConfirmModal(null);

  const resetCreate = () => {
    setCreateStep('template');
    setCreateForm({ name: '', description: '', contributionAmount: '', dueDay: '25', graceDays: '3', rotationType: 'fixed' });
    setCreateError('');
  };

  // Auto-open create form when navigated here with ?action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreate(true);
      resetCreate();
      setShowJoin(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (group, e) => {
    e.stopPropagation();
    setEditForm({ name: group.name, description: group.description || '', contributionAmount: String(group.contributionAmount || '') });
    setEditError('');
    setEditingGroup(group);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editForm.name.trim()) return setEditError('Group name is required');
    setSaving(true);
    try {
      const { data: updated } = await api.patch(`/groups/${editingGroup._id}`, {
        name: editForm.name.trim(),
        description: editForm.description,
        contributionAmount: editForm.contributionAmount,
      });
      await loadGroups();
      // Keep activeGroup in sync if this was the selected circle
      if (activeGroup?._id === editingGroup._id) selectGroup(updated);
      toast.success(`"${editForm.name.trim()}" updated.`);
      setEditingGroup(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = (group, e) => {
    e.stopPropagation();
    openConfirm(
      `Archive "${group.name}"?`,
      'All members will lose access immediately. This cannot be undone.',
      async () => {
        setArchivingId(group._id);
        try {
          await api.delete(`/groups/${group._id}`);
          if (activeGroup?._id === group._id) selectGroup(null);
          await loadGroups();
          toast.success(`"${group.name}" archived.`);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Could not archive group.');
        } finally {
          setArchivingId(null);
        }
      }
    );
  };

  const handleSettingsSaved = async (updatedGroup) => {
    await loadGroups();
    if (activeGroup?._id === updatedGroup._id) selectGroup(updatedGroup);
    setSettingsGroup(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim()) return setCreateError('Group name is required');
    setCreating(true);
    try {
      const { data: newGroup } = await api.post('/groups', {
        name:               createForm.name.trim(),
        description:        createForm.description,
        contributionAmount: Number(createForm.contributionAmount) || 0,
        dueDay:             Number(createForm.dueDay)    || 25,
        graceDays:          Number(createForm.graceDays) || 3,
        rotationType:       createForm.rotationType      || 'fixed',
      });
      await loadGroups();
      selectGroup(newGroup);
      setShowCreate(false);
      resetCreate();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'GROUP_LIMIT_REACHED' || code === 'MEMBER_LIMIT_REACHED') {
        setCreateError('__UPGRADE__');
      } else {
        setCreateError(err.response?.data?.message || 'Failed to create group');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = (group) => {
    openConfirm(
      `Leave "${group.name}"?`,
      "You'll need an invite code to rejoin this circle.",
      async () => {
        setLeavingId(group._id);
        try {
          await api.delete(`/groups/${group._id}/members/${user._id}`);
          if (activeGroup?._id === group._id) selectGroup(null);
          await loadGroups();
          toast.success(`Left "${group.name}".`);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Could not leave group.');
        } finally {
          setLeavingId(null);
        }
      }
    );
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!inviteCode.trim()) return setJoinError('Please enter an invite code');
    setJoining(true);
    try {
      await api.post('/groups/join', { inviteCode: inviteCode.trim() });
      await loadGroups();
      setShowJoin(false);
      setInviteCode('');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'MEMBER_LIMIT_REACHED') {
        setJoinError('__UPGRADE__');
      } else {
        setJoinError(err.response?.data?.message || 'Failed to join group');
      }
    } finally {
      setJoining(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #e2e0da', borderRadius: 10,
    fontSize: 13.5, fontFamily: 'var(--font-sans)',
    background: '#faf9f6', color: 'var(--ct-text-1)',
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'var(--ct-text-2)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.07em',
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div className="groups-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            color: 'var(--ct-text-1)', margin: '0 0 6px', letterSpacing: '-0.02em',
          }}>
            My Circles
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
            Manage your savings circles and track contributions per group.
          </p>
        </div>
        <div className="groups-action-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowJoin(v => !v); setShowCreate(false); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10,
              border: '1.5px solid #e2e0da', background: '#fff',
              color: 'var(--ct-text-2)', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M10 14L21 3M21 21H3V3"/>
            </svg>
            Join with code
          </button>
          <button
            onClick={() => { const next = !showCreate; setShowCreate(next); if (next) resetCreate(); setShowJoin(false); }}
            className="btn-gold"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10,
              border: 'none', background: 'var(--ct-gold)',
              color: '#0f0f14', fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New circle
          </button>
        </div>
      </div>

      {/* Join panel */}
      {showJoin && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px 28px',
          boxShadow: 'var(--ct-shadow)', marginBottom: 24,
          border: '1px solid rgba(79,70,229,0.1)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            Join a Circle
          </h3>
          {joinError === '__UPGRADE__'
            ? <UpgradeErrorBanner onDismiss={() => setJoinError('')} />
            : joinError
            ? <div style={{ color: '#e11d48', fontSize: 13, marginBottom: 12 }}>{joinError}</div>
            : null
          }
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code e.g. A3F9C1B2"
              style={{ ...inputStyle, flex: 1, minWidth: 220, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            />
            <button
              type="submit" disabled={joining}
              style={{
                padding: '11px 22px', borderRadius: 10, border: 'none',
                background: joining ? '#e8e4dc' : 'var(--ct-gold)',
                color: joining ? 'var(--ct-text-3)' : '#0f0f14',
                fontSize: 13.5, fontWeight: 700, cursor: joining ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
              }}
            >
              {joining ? 'Joining…' : 'Join Circle'}
            </button>
          </form>
        </div>
      )}

      {/* Create panel */}
      {showCreate && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px 28px',
          boxShadow: 'var(--ct-shadow)', marginBottom: 24,
          border: '1px solid rgba(212,160,23,0.12)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Create a New Circle
          </h3>
          {createStep === 'template' ? (
            <TemplatePickerStep
              onSelect={(settings) => {
                setCreateForm(f => ({
                  ...f,
                  contributionAmount: String(settings.contributionAmount ?? f.contributionAmount),
                  dueDay:             String(settings.dueDay    ?? f.dueDay),
                  graceDays:          String(settings.graceDays ?? f.graceDays),
                  rotationType:       settings.rotationType     ?? f.rotationType,
                }));
                setCreateStep('form');
              }}
              onSkip={() => setCreateStep('form')}
            />
          ) : (
            <>
              {createError === '__UPGRADE__'
                ? <UpgradeErrorBanner onDismiss={() => setCreateError('')} />
                : createError
                ? <div style={{ color: '#e11d48', fontSize: 13, marginBottom: 12 }}>{createError}</div>
                : null
              }
              <form onSubmit={handleCreate}>
                <div className="groups-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Circle Name *</label>
                    <input
                      value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Idrisi Family Circle"
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Monthly Target (₦)</label>
                    <input
                      type="number"
                      value={createForm.contributionAmount}
                      onChange={e => setCreateForm(f => ({ ...f, contributionAmount: e.target.value }))}
                      placeholder="e.g. 5000"
                      min="0"
                      style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Description <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 11, color: 'var(--ct-text-3)' }}>(optional)</span></label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What is this circle for?"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
                {/* New settings fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
                      Due day <span style={{ fontWeight: 400, color: 'var(--ct-text-3)' }}>(1–28)</span>
                    </label>
                    <input
                      type="number" min="1" max="28"
                      value={createForm.dueDay}
                      onChange={e => setCreateForm(f => ({ ...f, dueDay: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
                      Grace period
                    </label>
                    <select
                      value={createForm.graceDays}
                      onChange={e => setCreateForm(f => ({ ...f, graceDays: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {[0,1,2,3,5,7].map(d => <option key={d} value={d}>{d === 0 ? 'None' : `${d} day${d > 1 ? 's' : ''}`}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 8 }}>
                    Rotation type
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { v: 'fixed', l: 'Fixed' }, { v: 'join-order', l: 'Join Order' },
                      { v: 'random', l: 'Random' }, { v: 'bid', l: 'Bid' },
                    ].map(({ v, l }) => (
                      <button
                        key={v} type="button"
                        onClick={() => setCreateForm(f => ({ ...f, rotationType: v }))}
                        className={createForm.rotationType === v ? 'filter-pill active' : 'filter-pill'}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn-outline" onClick={() => setCreateStep('template')} style={{ marginRight: 8 }}>
                    ← Back
                  </button>
                  <button
                    type="submit" disabled={creating}
                    style={{
                      padding: '11px 22px', borderRadius: 10, border: 'none',
                      background: creating ? '#e8e4dc' : 'var(--ct-gold)',
                      color: creating ? 'var(--ct-text-3)' : '#0f0f14',
                      fontSize: 13.5, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {creating ? 'Creating…' : 'Create Circle'}
                  </button>
                  <button
                    type="button" onClick={() => setShowCreate(false)}
                    style={{
                      padding: '11px 18px', borderRadius: 10,
                      border: '1px solid #e2e0da', background: 'transparent',
                      color: 'var(--ct-text-2)', fontSize: 13.5, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Groups grid */}
      {loadingGroups && (
        <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Skeleton height={18} width={160} style={{ marginBottom: 10 }} />
              <Skeleton height={12} width={220} style={{ marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <Skeleton height={28} width={80} borderRadius={8} />
                <Skeleton height={28} width={80} borderRadius={8} />
              </div>
              <Skeleton height={36} borderRadius={10} />
            </div>
          ))}
        </div>
      )}
      {!loadingGroups && groups.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '72px 40px',
          background: '#fff', borderRadius: 18,
          boxShadow: 'var(--ct-shadow)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(212,160,23,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 8px' }}>
            No circles yet
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ct-text-3)', margin: 0 }}>
            Create your first savings circle or join one with an invite code.
          </p>
        </div>
      ) : (
        <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {groups.map(group => {
            const myMembership = group.members.find(m => m.user._id === user._id || m.user === user._id);
            const myRole = myMembership?.role || 'member';
            const isActive = activeGroup?._id === group._id;

            return (
              <div
                key={group._id}
                onClick={() => selectGroup(isActive ? null : group)}
                style={{
                  background: '#fff', borderRadius: 16, padding: '22px 22px 18px',
                  boxShadow: isActive ? '0 0 0 2px var(--ct-gold), var(--ct-shadow)' : 'var(--ct-shadow)',
                  border: isActive ? '1px solid rgba(212,160,23,0.35)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  position: 'relative',
                }}
                className="card-hover"
              >
                {/* Active badge */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    padding: '2px 9px', borderRadius: 99,
                    background: 'var(--ct-gold)', color: '#0f0f14',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    Active
                  </div>
                )}

                {/* Group avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: getAvatarGradient(group.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff',
                  marginBottom: 14, letterSpacing: '-0.02em',
                }}>
                  {getInitials(group.name)}
                </div>

                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
                  color: 'var(--ct-text-1)', margin: '0 0 4px', letterSpacing: '-0.01em',
                }}>
                  {group.name}
                </h3>
                {group.description && (
                  <p style={{ fontSize: 12.5, color: 'var(--ct-text-3)', margin: '0 0 14px', lineHeight: 1.5 }}>
                    {group.description}
                  </p>
                )}

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Members</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ct-text-1)' }}>
                      {group.members.length}
                    </div>
                  </div>
                  {group.contributionAmount > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Monthly Target</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ct-emerald)' }}>
                        ₦{Number(group.contributionAmount).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Your Role</div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 6,
                      background: myRole === 'admin' ? 'rgba(212,160,23,0.1)' : 'rgba(79,70,229,0.07)',
                      color: myRole === 'admin' ? '#b8860a' : 'var(--ct-indigo)',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                      textTransform: 'capitalize',
                    }}>
                      {myRole === 'admin' && (
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      )}
                      {myRole}
                    </div>
                  </div>
                </div>

                {/* Invite code */}
                <div style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: '#faf9f6', border: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>Invite Code</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ct-text-1)', letterSpacing: '0.1em' }}>
                      {group.inviteCode}
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                    <CopyButton text={group.inviteCode} />
                    <ShareButton groupName={group.name} inviteCode={group.inviteCode} />
                  </div>
                </div>

                {/* Admin actions: edit + archive */}
                {myRole === 'admin' && (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={e => openEdit(group, e)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer',
                        border: '1px solid rgba(79,70,229,0.2)',
                        background: 'rgba(79,70,229,0.05)',
                        color: 'var(--ct-indigo)', fontSize: 12, fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Edit
                    </button>
                    {group.createdBy?._id === user._id || group.createdBy === user._id ? (
                      <button
                        onClick={e => handleArchive(group, e)}
                        disabled={archivingId === group._id}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 9,
                          cursor: archivingId === group._id ? 'wait' : 'pointer',
                          border: '1px solid rgba(225,29,72,0.18)',
                          background: 'rgba(225,29,72,0.04)',
                          color: '#e11d48', fontSize: 12, fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          opacity: archivingId === group._id ? 0.6 : 1,
                        }}
                      >
                        {archivingId === group._id ? 'Archiving…' : 'Archive'}
                      </button>
                    ) : null}
                  </div>
                )}

                {isGroupAdmin(group, user?._id) && (
                  <div onClick={e => e.stopPropagation()} style={{ marginBottom: 8 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setSettingsGroup(group); }}
                      title="Circle settings"
                      style={{
                        background: 'none', border: '1.5px solid var(--ct-border)',
                        borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                        color: 'var(--ct-text-3)', fontSize: 12, fontFamily: 'var(--font-sans)',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ct-gold)'; e.currentTarget.style.color = 'var(--ct-gold)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ct-border)'; e.currentTarget.style.color = 'var(--ct-text-3)'; }}
                    >
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                      </svg>
                      Settings
                    </button>
                  </div>
                )}

                {/* Leave button — only for non-creators */}
                {group.createdBy?._id !== user._id && group.createdBy !== user._id && (
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); handleLeave(group); }}
                      disabled={leavingId === group._id}
                      style={{
                        width: '100%', padding: '8px 0',
                        borderRadius: 9, cursor: leavingId === group._id ? 'wait' : 'pointer',
                        border: '1px solid rgba(225,29,72,0.18)',
                        background: 'rgba(225,29,72,0.04)',
                        color: '#e11d48', fontSize: 12, fontWeight: 600,
                        fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                        opacity: leavingId === group._id ? 0.6 : 1,
                      }}
                    >
                      {leavingId === group._id ? 'Leaving…' : 'Leave circle'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Confirmation modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 10px' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--ct-text-2)', margin: '0 0 24px', lineHeight: 1.6 }}>
              {confirmModal.body}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeConfirm}
                style={{
                  padding: '9px 20px', borderRadius: 9,
                  border: '1px solid #e2e0da', background: 'transparent',
                  color: 'var(--ct-text-2)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); closeConfirm(); }}
                style={{
                  padding: '9px 20px', borderRadius: 9, border: 'none',
                  background: '#e11d48', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit group modal */}
      {editingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '28px 28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              Edit Circle
            </h3>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9, color: '#be123c', fontSize: 13, marginBottom: 14 }}>
                {editError}
              </div>
            )}
            <form onSubmit={handleEdit}>
              <div className="groups-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Circle Name *</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Monthly Target (₦)</label>
                  <input
                    type="number"
                    value={editForm.contributionAmount}
                    onChange={e => setEditForm(f => ({ ...f, contributionAmount: e.target.value }))}
                    placeholder="e.g. 5000"
                    min="0"
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Description <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 11, color: 'var(--ct-text-3)' }}>(optional)</span></label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit" disabled={saving}
                  style={{
                    padding: '11px 22px', borderRadius: 10, border: 'none',
                    background: saving ? '#e8e4dc' : 'var(--ct-gold)',
                    color: saving ? 'var(--ct-text-3)' : '#0f0f14',
                    fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  style={{
                    padding: '11px 18px', borderRadius: 10,
                    border: '1px solid #e2e0da', background: 'transparent',
                    color: 'var(--ct-text-2)', fontSize: 13.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MyTemplatesSection />

      {settingsGroup && (
        <CircleSettingsDrawer
          group={settingsGroup}
          onClose={() => setSettingsGroup(null)}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  );
}

function UpgradeErrorBanner({ onDismiss }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 10,
      marginBottom: 16,
      background: 'rgba(212,160,23,0.08)',
      border: '1px solid rgba(212,160,23,0.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ color: '#92690a', fontSize: 13.5, fontWeight: 500 }}>
        You've reached your plan limit.
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a
          href="/subscription?upgrade=pro"
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #d4a017, #e8b820)',
            color: '#1a1206',
            fontSize: 12.5, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Upgrade Plan →
        </a>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none',
            color: '#92690a', fontSize: 18,
            cursor: 'pointer', lineHeight: 1, padding: '2px 4px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function MyTemplatesSection() {
  const [mine, setMine] = useState([]);
  const { user } = useAuth();
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/templates').then(({ data }) => setMine(data.mine || [])).catch(() => {});
  }, [user]);

  if (!mine.length) return null;

  const handleDelete = async (id, name) => {
    try {
      await api.delete(`/templates/${id}`);
      setMine(prev => prev.filter(t => t._id !== id));
      toast.success(`Template "${name}" deleted.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete template');
    }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setEditName(t.name);
    setEditDesc(t.description || '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/templates/${id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setMine(prev => prev.map(t => t._id === id ? data : t));
      setEditingId(null);
      toast.success(`Template "${data.name}" updated.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 14 }}>
        My saved templates
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {mine.map(t => (
          <div key={t._id} style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#fff', border: '1.5px solid var(--ct-border-2)',
            boxShadow: 'var(--ct-shadow)',
            minWidth: 200,
          }}>
            {editingId === t._id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={80}
                  placeholder="Template name"
                  style={{
                    fontSize: 13, fontWeight: 600, padding: '6px 10px',
                    borderRadius: 7, border: '1.5px solid var(--ct-border-2)',
                    fontFamily: 'var(--font-sans)', outline: 'none',
                    color: 'var(--ct-text-1)', background: 'var(--ct-page)',
                    width: '100%', boxSizing: 'border-box',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(t._id); if (e.key === 'Escape') cancelEdit(); }}
                />
                <input
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  maxLength={200}
                  placeholder="Description (optional)"
                  style={{
                    fontSize: 12, padding: '5px 10px',
                    borderRadius: 7, border: '1.5px solid var(--ct-border-2)',
                    fontFamily: 'var(--font-sans)', outline: 'none',
                    color: 'var(--ct-text-2)', background: 'var(--ct-page)',
                    width: '100%', boxSizing: 'border-box',
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleSave(t._id)}
                    disabled={saving || !editName.trim()}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7, border: 'none',
                      background: saving || !editName.trim() ? 'rgba(0,0,0,0.06)' : 'var(--ct-gold)',
                      color: saving || !editName.trim() ? 'var(--ct-text-4)' : '#1a1206',
                      fontSize: 12, fontWeight: 700, cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    style={{
                      padding: '6px 10px', borderRadius: 7,
                      border: '1.5px solid var(--ct-border-2)', background: 'none',
                      color: 'var(--ct-text-3)', fontSize: 12, fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{t.icon || '◎'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>
                    ₦{Number(t.settings?.contributionAmount || 0).toLocaleString('en-NG')} · Due {t.settings?.dueDay}th
                  </div>
                </div>
                <button
                  onClick={() => startEdit(t)}
                  aria-label={`Edit template ${t.name}`}
                  title="Rename"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', padding: '2px 5px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(t._id, t.name)}
                  aria-label={`Delete template ${t.name}`}
                  title="Delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', fontSize: 18, padding: '2px 5px', lineHeight: 1 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-rose)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
