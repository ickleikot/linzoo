'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useTelegram } from '../../lib/TelegramContext';
import { getName, getInitials, getColor, fmtDate } from '../../lib/helpers';

export default function UserProfileModal() {
  const { profileModal, closeProfile, setActiveCall, avatarCache, setAvatar } = useStore();
  const { downloadProfilePhoto, getFullUser } = useTelegram();
  const [photo, setPhoto]     = useState(null);
  const [full, setFull]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileModal) { setPhoto(null); setFull(null); return; }
    const id = profileModal.id?.toString();
    setLoading(true);

    // Load avatar
    if (avatarCache[id]) {
      setPhoto(avatarCache[id]);
    } else {
      downloadProfilePhoto(profileModal).then(url => {
        if (url) { setPhoto(url); setAvatar(id, url); }
      }).catch(() => {});
    }

    // Load full info
    getFullUser(profileModal).then(f => { setFull(f); setLoading(false); }).catch(() => setLoading(false));
  }, [profileModal?.id?.toString()]);

  if (!profileModal) return null;

  const name   = getName(profileModal);
  const color  = getColor(name);
  const bio    = full?.fullUser?.about || '';
  const phone  = profileModal.phone ? `+${profileModal.phone}` : null;
  const status = profileModal.status;
  const isBot  = profileModal.bot;

  let statusText = 'Offline';
  let statusColor = 'var(--offline)';
  if (status?.className === 'UserStatusOnline') { statusText = 'Online'; statusColor = 'var(--online)'; }
  else if (status?.className === 'UserStatusRecently') { statusText = 'Last seen recently'; }
  else if (status?.wasOnline) { statusText = `Last seen ${fmtDate(status.wasOnline)}`; }

  function startCall(video) {
    setActiveCall({ type: video ? 'video' : 'voice', peer: profileModal, state: 'connecting', callObj: null });
    closeProfile();
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && closeProfile()}>
      <div className="modal" style={{ width: 340 }}>
        {/* Header with avatar */}
        <div style={{
          height: 160, position: 'relative', overflow: 'hidden',
          background: photo ? `url(${photo}) center/cover` : `linear-gradient(135deg, ${color}, ${color}99)`,
          flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)' }}/>
          <button onClick={closeProfile} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          {!photo && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{getInitials(name)}</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>{name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }}/>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{statusText}</span>
              {isBot && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', background: 'rgba(77,141,255,0.2)', padding: '1px 6px', borderRadius: 99 }}>BOT</span>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><div className="a-spin" style={{ width: 20, height: 20, border: '2px solid var(--border-200)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}/></div>}

          {bio && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bio</div>
              <p style={{ fontSize: 13, color: 'var(--text-200)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{bio}</p>
            </div>
          )}

          {[
            { label: 'Username', value: profileModal.username ? `@${profileModal.username}` : null },
            { label: 'Phone', value: phone },
            { label: 'User ID', value: profileModal.id?.toString() },
          ].filter(r => r.value).map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-100)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-400)' }}>{row.label}</span>
              <span style={{ fontSize: 13, color: 'var(--text-200)', fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!isBot && (
          <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 8, borderTop: '1px solid var(--border-100)', flexShrink: 0 }}>
            <button onClick={() => startCall(false)} className="btn-secondary" style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Call
            </button>
            <button onClick={() => startCall(true)} className="btn-primary" style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="white" strokeWidth="1.8"/></svg>
              Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
