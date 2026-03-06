'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { getDialogName, getDialogType, getDialogId, getInitials, getColor, getPreview, fmtDate, isGroupDialog } from '../../lib/helpers';

const TABS = [
  { id:'all',   icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { id:'dms',   icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id:'unread',icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
];

function SearchBar({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ padding:'8px 10px 6px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-100)', border:`1px solid ${focused?'var(--brand)':'var(--border-100)'}`, borderRadius:'var(--r-md)', padding:'7px 10px', transition:'border-color var(--ease-fast)', boxShadow: focused?'0 0 0 3px var(--brand-dim)':'none' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="11" cy="11" r="7" stroke="var(--text-400)" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="var(--text-400)" strokeWidth="2" strokeLinecap="round"/></svg>
        <input value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search conversations…" style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-100)', fontSize:13 }}/>
        {value && <button onClick={()=>onChange('')} style={{ background:'none', border:'none', color:'var(--text-400)', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display:'inline-flex', gap:2, alignItems:'center', marginRight:2 }}>
      {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, background:'var(--brand)', borderRadius:'50%', display:'inline-block', animation:`typing 1.4s ${i*0.16}s ease-in-out infinite` }}/>)}
    </span>
  );
}

function DialogRow({ dialog, isActive, photo, onClick }) {
  const [hov, setHov] = useState(false);
  const { unreadCounts, typingByChatId } = useStore();
  const name = getDialogName(dialog);
  const type = getDialogType(dialog);
  const id = getDialogId(dialog);
  const preview = getPreview(dialog);
  const date = dialog?.message?.date ? fmtDate(dialog.message.date) : '';
  const unread = unreadCounts[id] || dialog?.unreadCount || 0;
  const isMuted = dialog?.dialog?.notifySettings?.muteUntil > 0;
  const isTyping = (typingByChatId[id] || []).length > 0;
  const typeColors = { user:'var(--brand)', group:'var(--accent-green)', channel:'var(--accent-purple)' };

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:'var(--r-md)', margin:'1px 6px', cursor:'pointer', background: isActive ? 'var(--bg-active)' : hov ? 'var(--bg-hover)' : 'transparent', transition:'background var(--ease-fast)', userSelect:'none', minHeight:58 }}>
      {/* Avatar */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ width:42, height:42, borderRadius:'50%', background: photo ? `url(${photo}) center/cover` : getColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', boxShadow: isActive ? `0 0 0 2px var(--brand)` : 'none', transition:'box-shadow var(--ease-fast)', overflow:'hidden' }}>
          {!photo && getInitials(name)}
        </div>
        {/* Type badge */}
        {type !== 'user' && (
          <div style={{ position:'absolute', bottom:-1, right:-1, width:14, height:14, borderRadius:'50%', background:typeColors[type], border:'2px solid var(--bg-200)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {type==='channel' ? <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M2 9l3-6 2 4 1-2 2 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="5" r="2" fill="white"/><circle cx="8" cy="5" r="2" fill="white"/></svg>}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
          <span style={{ fontSize:14, fontWeight: unread>0 ? 700 : 500, color: isActive?'var(--text-000)':'var(--text-200)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'72%' }}>{name}</span>
          <span style={{ fontSize:11, color:'var(--text-400)', flexShrink:0, fontWeight: unread>0?600:400, color: unread>0?'var(--brand-light)':'var(--text-400)' }}>{date}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:12, color:'var(--text-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, display:'flex', alignItems:'center', gap:3 }}>
            {isTyping ? <><TypingDots /><span style={{color:'var(--brand)', fontSize:11}}>typing…</span></> : preview}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            {isMuted && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {unread > 0 && <span className="badge" style={{ fontSize:10, minWidth:16, height:16, border:'none', background: isMuted?'var(--text-400)':'var(--notification)' }}>{unread>99?'99+':unread}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPanel() {
  const { currentUser, signOut, downloadProfilePhoto } = useTelegram();
  const { avatarCache, setAvatar, theme, setTheme, openProfile } = useStore();
  const [photo, setPhoto] = useState(null);
  const [micOff, setMicOff] = useState(false);
  const [deafen, setDeafen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const id = currentUser.id?.toString();
    if (avatarCache[id]) { setPhoto(avatarCache[id]); return; }
    downloadProfilePhoto(currentUser).then(url => { if (url) { setPhoto(url); setAvatar(id, url); } });
  }, [currentUser]);

  const name = currentUser ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') : 'You';

  return (
    <div style={{ padding:'8px 10px', background:'var(--bg-100)', borderTop:'1px solid var(--border-100)', display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', flexShrink:0, cursor:'pointer' }} onClick={()=>currentUser&&openProfile(currentUser)}>
        <div style={{ width:34, height:34, borderRadius:'50%', background: photo?`url(${photo}) center/cover`:getColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', overflow:'hidden' }}>
          {!photo && getInitials(name)}
        </div>
        <div className="dot dot-online" style={{ position:'absolute', bottom:-1, right:-1 }}/>
      </div>
      <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={()=>currentUser&&openProfile(currentUser)}>
        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
        <div style={{ fontSize:11, color:'var(--text-400)' }}>{currentUser?.username?`@${currentUser.username}`:'Online'}</div>
      </div>
      <div style={{ display:'flex', gap:1 }}>
        <button className="ibtn" title={micOff?'Unmute':'Mute'} onClick={()=>setMicOff(v=>!v)} style={{ color:micOff?'var(--dnd)':undefined }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">{micOff ? <><path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> : <><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.8"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>}</svg>
        </button>
        <button className="ibtn" title={deafen?'Undeafen':'Deafen'} onClick={()=>setDeafen(v=>!v)} style={{ color:deafen?'var(--dnd)':undefined }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="currentColor" strokeWidth="1.8"/></svg>
        </button>
        <button className="ibtn" title={theme==='dark'?'Light mode':'Dark mode'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
          {theme==='dark' ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <button className="ibtn danger" title="Sign Out" onClick={signOut}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function ChannelSidebar() {
  const [dialogs, setDialogs] = useState([]);
  const [photos, setPhotos] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const { getDialogs, downloadProfilePhoto } = useTelegram();
  const { selectedDialog, setSelectedDialog, viewMode, unreadCounts } = useStore();

  const load = useCallback(async () => {
    try {
      const data = await getDialogs();
      setDialogs(data); setLoading(false);
      data.slice(0, 35).forEach(d => {
        const id = getDialogId(d);
        if (!id) return;
        downloadProfilePhoto(d.entity).then(url => {
          if (url) setPhotos(p => ({...p,[id]:url}));
        });
      });
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = dialogs.filter(d => {
    const grp = isGroupDialog(d);
    if (viewMode === 'server' && !grp) return false;
    if (tab === 'dms' && grp) return false;
    if (tab === 'unread' && !(unreadCounts[getDialogId(d)] || d.unreadCount)) return false;
    if (search) return getDialogName(d).toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const selId = selectedDialog ? getDialogId(selectedDialog) : null;
  const title = viewMode === 'server' ? 'Channels' : 'Messages';

  return (
    <div style={{ width:'var(--col-sidebar)', minWidth:'var(--col-sidebar)', height:'100vh', background:'var(--bg-200)', display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-100)' }}>
      {/* Header */}
      <div style={{ height:'var(--topbar-h)', borderBottom:'1px solid var(--border-100)', display:'flex', alignItems:'center', padding:'0 14px', gap:8, flexShrink:0 }}>
        <span style={{ fontSize:15, fontWeight:700, flex:1, color:'var(--text-100)' }}>{title}</span>
        <button className="ibtn" title="Refresh" onClick={load}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button className="ibtn" title="New Conversation"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, padding:'6px 10px 2px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 4px', borderRadius:'var(--r-md)', background: tab===t.id?'var(--bg-active)':'none', color: tab===t.id?'var(--brand)':'var(--text-400)', fontSize:11, fontWeight:tab===t.id?700:500, border:'none', cursor:'pointer', transition:'all var(--ease-fast)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'var(--font-ui)' }}>
            {t.icon}{t.id}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch}/>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:4 }}>
        {loading ? (
          Array.from({length:9}).map((_,i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'7px 10px', margin:'1px 6px', alignItems:'center' }}>
              <div className="skel" style={{ width:42, height:42, borderRadius:'50%', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div className="skel" style={{ height:13, width:'58%', marginBottom:6 }}/>
                <div className="skel" style={{ height:11, width:'75%' }}/>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-400)', fontSize:13 }}>
            {search ? 'No matching conversations' : tab==='unread' ? 'No unread messages 🎉' : 'No conversations yet'}
          </div>
        ) : (
          filtered.map(d => {
            const id = getDialogId(d);
            return (
              <DialogRow key={id||getDialogName(d)} dialog={d} isActive={id===selId} photo={photos[id]}
                onClick={() => { setSelectedDialog(d); }}
              />
            );
          })
        )}
      </div>
      <UserPanel />
    </div>
  );
}
