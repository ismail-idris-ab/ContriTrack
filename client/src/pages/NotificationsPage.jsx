import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import useDocumentTitle from '../utils/useDocumentTitle';

const TYPE_CONFIG = {
  contribution_verified: { icon: '✅', color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  contribution_rejected: { icon: '❌', color: '#e11d48', bg: 'rgba(225,29,72,0.10)'  },
  contribution_pending:  { icon: '⏳', color: '#d97706', bg: 'rgba(217,119,6,0.10)'  },
  penalty_issued:        { icon: '⚠️', color: '#e11d48', bg: 'rgba(225,29,72,0.10)'  },
  penalty_waived:        { icon: '🎉', color: '#059669', bg: 'rgba(5,150,105,0.10)'  },
  payout_scheduled:      { icon: '📅', color: '#d4a017', bg: 'rgba(212,160,23,0.10)' },
  payout_paid:           { icon: '💰', color: '#059669', bg: 'rgba(5,150,105,0.10)'  },
  member_joined:         { icon: '👋', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)'  },
  group_update:          { icon: '🔔', color: '#d4a017', bg: 'rgba(212,160,23,0.10)' },
  reminder:              { icon: '📱', color: '#65a30d', bg: 'rgba(101,163,13,0.10)' },
  system:                { icon: 'ℹ️', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)'  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  useDocumentTitle('Notifications — ROTARA');
  const queryClient = useQueryClient();

  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data: notifData, isLoading: loading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=30').then(r => r.data),
  });

  const notifications = notifData?.notifications || [];
  const unreadCount   = notifData?.unreadCount   || 0;
  const hasMore       = notifData?.hasMore        || false;

  const TABS = [
    { key: 'all',           label: 'All'           },
    { key: 'unread',        label: 'Unread'        },
    { key: 'contributions', label: 'Contributions' },
    { key: 'payouts',       label: 'Payouts'       },
    { key: 'penalties',     label: 'Penalties'     },
  ];

  const TAB_COUNTS = {
    all:           notifications.length,
    unread:        unreadCount,
    contributions: notifications.filter(n => n.type.startsWith('contribution_')).length,
    payouts:       notifications.filter(n => n.type.startsWith('payout_')).length,
    penalties:     notifications.filter(n => n.type.startsWith('penalty_')).length,
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread')        return !n.read;
    if (filter === 'contributions') return n.type.startsWith('contribution_');
    if (filter === 'payouts')       return n.type.startsWith('payout_');
    if (filter === 'penalties')     return n.type.startsWith('penalty_');
    return true;
  });

  const loadMore = async () => {
    const last = notifications[notifications.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/notifications?limit=30&before=${last._id}`);
      queryClient.setQueryData(['notifications'], (old) => ({
        ...old,
        notifications: [...(old?.notifications || []), ...(data.notifications || [])],
        hasMore: data.hasMore || false,
      }));
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const deleteNotification = async (id) => {
    await api.delete(`/notifications/${id}`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24, fontWeight: 700,
            color: 'var(--ct-text-1)', margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(225,29,72,0.10)',
              border: '1.5px solid rgba(225,29,72,0.20)',
              color: '#be123c', fontSize: 11.5, fontWeight: 700,
            }}>
              {unreadCount} unread
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 9,
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.08)',
              color: 'var(--ct-text-2)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.16s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.16)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto',
        marginBottom: 18, paddingBottom: 2,
        scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => {
          const isActive = filter === tab.key;
          const count    = TAB_COUNTS[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 20, border: '1px solid',
                borderColor: isActive ? 'rgba(212,160,23,0.28)' : 'rgba(0,0,0,0.08)',
                background: isActive ? 'rgba(212,160,23,0.10)' : '#fff',
                color: isActive ? '#92700f' : '#52526e',
                fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.16s ease',
                flexShrink: 0,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  padding: '1px 6px', borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                  background: tab.key === 'unread'
                    ? 'rgba(225,29,72,0.10)'
                    : 'rgba(212,160,23,0.14)',
                  color: tab.key === 'unread' ? '#e11d48' : '#d4a017',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: 80, borderRadius: 'var(--ct-radius)',
              background: 'linear-gradient(90deg, #f0ede6 0%, #e8e5de 50%, #f0ede6 100%)',
              backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 'var(--ct-radius)',
          boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.04)',
          textAlign: 'center', padding: '72px 24px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: 28,
          }}>
            🔔
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--ct-text-1)', marginBottom: 8,
            fontSize: 20, fontWeight: 700,
          }}>
            {filter === 'all' ? 'All caught up' : `No ${TABS.find(t => t.key === filter)?.label.toLowerCase()} notifications`}
          </h3>
          <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5 }}>
            {filter === 'all'
              ? "No notifications yet — you'll see activity here."
              : 'Nothing here yet — check back later.'}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((n, idx) => {
            const typeInfo = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const isUnread  = !n.read;
            return (
              <div
                key={n._id}
                className="animate-fade-up"
                onClick={() => { if (isUnread) markRead(n._id); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 18px',
                  background: isUnread ? '#fff' : '#fff',
                  border: `1.5px solid ${isUnread ? 'rgba(212,160,23,0.22)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 'var(--ct-radius-sm)',
                  cursor: isUnread ? 'pointer' : 'default',
                  boxShadow: isUnread ? '0 2px 10px rgba(212,160,23,0.08), 0 1px 3px rgba(0,0,0,0.04)' : 'var(--ct-shadow)',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                  animationDelay: `${idx * 0.025}s`,
                }}
                onMouseEnter={e => { if (isUnread) e.currentTarget.style.borderColor = 'rgba(212,160,23,0.36)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isUnread ? 'rgba(212,160,23,0.22)' : 'rgba(0,0,0,0.06)'; }}
              >
                {/* Left unread accent bar */}
                {isUnread && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: 'var(--ct-gold)',
                    borderRadius: '10px 0 0 10px',
                  }} />
                )}

                {/* Type icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: typeInfo.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {typeInfo.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: isUnread ? 700 : 500,
                    color: isUnread ? 'var(--ct-text-1)' : 'var(--ct-text-2)',
                    marginBottom: 3, lineHeight: 1.4,
                  }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{
                      fontSize: 12.5, color: 'var(--ct-text-3)',
                      lineHeight: 1.5, marginBottom: 6,
                    }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11.5, color: 'var(--ct-text-4)', fontWeight: 500,
                    }}>
                      {timeAgo(n.createdAt)}
                    </span>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontSize: 11.5, color: 'var(--ct-gold)',
                          textDecoration: 'none', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        View
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    )}
                    {isUnread && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700,
                        color: '#a07010',
                        padding: '1px 7px', borderRadius: 8,
                        background: 'rgba(212,160,23,0.10)',
                        letterSpacing: '0.04em',
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); deleteNotification(n._id); }}
                  title="Delete"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--ct-text-4)', padding: 5,
                    fontSize: 16, lineHeight: 1, flexShrink: 0,
                    borderRadius: 6, transition: 'all 0.14s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-rose)'; e.currentTarget.style.background = 'rgba(225,29,72,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; e.currentTarget.style.background = 'none'; }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && filter === 'all' && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-outline"
            style={{ margin: '0 auto' }}
          >
            {loadingMore ? (
              <>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Loading…
              </>
            ) : (
              <>
                Load more
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
