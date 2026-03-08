'use client';
import { useState, useEffect } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { getDialogType, getDialogId, getInitials, getColor, getName } from '../../lib/helpers';

function MemberItem({ user, photo, online, isBot }) {
  const [hov, setHov] = useState(false);
  const { openProfile } = useStore();
  const name = getName(user);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => openProfile(user)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '5px 10px', borderRadius: 'var(--r-md)',
        margin: '1px 6px', cursor: 'pointer',
        background: hov ? 'var(--bg-hover)' : 'transparent',
        transition: 'background var(--ease-fast)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: photo ? `url(${photo}) center/cover` : getColor(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden',
          opacity: online ? 1 : 0.5,
        }}>
          {!photo && getInitials(name)}
        </div>
        <div className={`dot dot-${online ? 'online' : 'offline'}`}
          style={{ position: 'absolute', bottom: -1, right: -1 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: online ? 'var(--text-200)' : 'var(--text-400)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {name}
          {isBot && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: 'var(--brand)',
              background: 'var(--brand-dim)', padding: '1px 5px',
              borderRadius: 'var(--r-sm)', letterSpacing: '0.05em', flexShrink: 0,
            }}>BOT</span>
          )}
        </div>
        {user.username && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{user.username}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '10px 16px 4px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10"
          style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform var(--ease-fast)', flexShrink: 0 }}>
          <path d="M2 4l3 3 3-3" stroke="var(--text-400)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-400)',
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {title} — {count}
        </span>
      </div>
      {open && children}
    </div>
  );
}

export default function MembersList() {
  const { getParticipants, downloadProfilePhoto } = useTelegram();
  const { selectedDialog, showMembers, onlineUsers, avatarCache, setAvatar } = useStore();
  const [members, setMembers] = useState([]);
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(false);

  const type = selectedDialog ? getDialogType(selectedDialog) : null;
  const isGroup = type === 'group' || type === 'channel';

  useEffect(() => {
    if (!selectedDialog || !isGroup) { setMembers([]); return; }
    let mounted = true;
    setLoading(true);
    const entity = selectedDialog.entity || selectedDialog.inputEntity;

    getParticipants(entity, { limit: 200 }).then(async parts => {
      if (!mounted) return;
      setMembers(parts);
      setLoading(false);
      for (const p of parts.slice(0, 40)) {
        const id = p.id?.toString();
        if (!id) continue;
        if (avatarCache[id]) { setPhotos(ph => ({ ...ph, [id]: avatarCache[id] })); continue; }
        downloadProfilePhoto(p).then(url => {
          if (url && mounted) {
            setPhotos(ph => ({ ...ph, [id]: url }));
            setAvatar(id, url);
          }
        });
      }
    }).catch(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [selectedDialog]);

  if (!showMembers) return null;

  const online = members.filter(m => onlineUsers.has(m.id?.toString()));
  const offline = members.filter(m => !onlineUsers.has(m.id?.toString()));

  return (
    <div style={{
      width: 'var(--col-members)', minWidth: 'var(--col-members)',
      height: '100vh', background: 'var(--bg-200)',
      borderLeft: '1px solid var(--border-100)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 'var(--topbar-h)', borderBottom: '1px solid var(--border-100)',
        display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Members</span>
        {!loading && members.length > 0 && (
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-400)' }}>
            {members.length}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {!isGroup && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>
            Open a group or channel to see members
          </div>
        )}

        {isGroup && loading && (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 16px', alignItems: 'center' }}>
              <div className="skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div>
                <div className="skel" style={{ height: 12, width: 80, marginBottom: 4 }} />
                <div className="skel" style={{ height: 10, width: 55 }} />
              </div>
            </div>
          ))
        )}

        {isGroup && !loading && members.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>
            No members visible
          </div>
        )}

        {isGroup && !loading && members.length > 0 && (
          <>
            {online.length > 0 && (
              <Section title="Online" count={online.length} defaultOpen={true}>
                {online.map(m => (
                  <MemberItem
                    key={m.id?.toString()}
                    user={m}
                    photo={photos[m.id?.toString()]}
                    online={true}
                    isBot={m.bot}
                  />
                ))}
              </Section>
            )}
            <Section title="Offline" count={offline.length} defaultOpen={offline.length < 30}>
              {offline.map(m => (
                <MemberItem
                  key={m.id?.toString()}
                  user={m}
                  photo={photos[m.id?.toString()]}
                  online={false}
                  isBot={m.bot}
                />
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
