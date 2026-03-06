'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { getInitials, getColor, getDialogName, isGroupDialog, getDialogId } from '../../lib/helpers';

function Pill({ active, hovered }) {
  return <div style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:4, background:'var(--text-000)', borderRadius:'0 4px 4px 0', height: active ? 36 : hovered ? 20 : 8, transition:'height var(--ease-spring)' }}/>;
}

function ServerIcon({ id, name, photo, isActive, unread, onClick, title }) {
  const [hov, setHov] = useState(false);
  const color = getColor(name);
  const initials = getInitials(name);
  const r = isActive ? '35%' : hov ? '40%' : '50%';
  return (
    <div data-tooltip={title || name} style={{ position:'relative', flexShrink:0 }}>
      <Pill active={isActive} hovered={hov} />
      <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ width:48, height:48, borderRadius:r, background: photo ? `url(${photo}) center/cover` : color, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', letterSpacing:'-0.02em', transition:'border-radius var(--ease-spring), box-shadow var(--ease-normal), transform var(--ease-spring)', transform: hov||isActive ? 'scale(1.05)' : 'scale(1)', boxShadow: isActive ? `0 0 0 3px var(--brand), 0 0 24px var(--brand-glow)` : 'none', userSelect:'none', overflow:'hidden', flexShrink:0, position:'relative' }}>
        {!photo && initials}
        {unread > 0 && !isActive && <div style={{ position:'absolute', bottom:-2, right:-2, width:16, height:16, background:'var(--notification)', borderRadius:'50%', border:'2px solid var(--bg-000)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>{unread > 9?'9+':unread}</div>}
      </div>
    </div>
  );
}

function Sep() {
  return <div style={{ width:32, height:2, borderRadius:2, background:'var(--border-200)', margin:'2px auto' }}/>;
}

export default function ServerList() {
  const [groups, setGroups] = useState([]);
  const [photos, setPhotos] = useState({});
  const { getDialogs, downloadProfilePhoto, signOut, currentUser } = useTelegram();
  const { viewMode, selectedServerId, setViewMode, setSelectedServer, setSelectedDialog, unreadCounts } = useStore();
  const router = useRouter();

  useEffect(() => {
    let m = true;
    getDialogs().then(ds => {
      if (!m) return;
      const grps = ds.filter(d => isGroupDialog(d));
      setGroups(grps.slice(0, 40));
      grps.slice(0, 25).forEach(g => {
        const id = getDialogId(g);
        if (!id) return;
        downloadProfilePhoto(g.entity).then(url => {
          if (url && m) setPhotos(p => ({...p,[id]:url}));
        });
      });
    }).catch(() => {});
    return () => { m = false; };
  }, []);

  const dmActive = viewMode === 'dms';
  const dmUnread = Object.entries(unreadCounts).reduce((sum,[id,n]) => {
    const g = groups.find(g => getDialogId(g) === id);
    return g ? sum : sum + (n||0);
  }, 0);

  return (
    <div style={{ width:'var(--col-servers)', minWidth:'var(--col-servers)', height:'100vh', background:'var(--bg-100)', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 0', gap:8, overflowY:'auto', overflowX:'visible', scrollbarWidth:'none', borderRight:'1px solid var(--border-100)', zIndex:10, position:'relative' }}>
      {/* Logo */}
      <div data-tooltip="Linzoo Home" style={{ position:'relative', flexShrink:0 }}>
        <div onClick={() => router.push('/')} style={{ width:48, height:48, borderRadius:'35%', background:'linear-gradient(135deg,#4d8dff 0%,#7c3aed 60%,#ec4899 100%)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 0 24px rgba(77,141,255,0.35)', flexShrink:0, transition:'transform var(--ease-spring)', userSelect:'none' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none"><path d="M8 20h24M8 13h16M8 27h10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
      </div>
      <Sep />

      {/* DMs */}
      <div data-tooltip="Direct Messages" style={{ position:'relative', flexShrink:0 }}>
        <Pill active={dmActive} hovered={false} />
        <div onClick={() => { setViewMode('dms'); setSelectedServer(null); }}
          style={{ width:48, height:48, borderRadius: dmActive ? '35%' : '50%', background: dmActive ? 'var(--brand)' : 'var(--bg-300)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all var(--ease-spring)', boxShadow: dmActive ? 'var(--shadow-brand)' : 'none', userSelect:'none', position:'relative' }}
          onMouseEnter={e=>{ if(!dmActive) e.currentTarget.style.borderRadius='40%'; }}
          onMouseLeave={e=>{ if(!dmActive) e.currentTarget.style.borderRadius='50%'; }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={dmActive?'#fff':'var(--text-300)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {dmUnread > 0 && !dmActive && <div className="badge" style={{ position:'absolute', bottom:-2, right:-2, minWidth:16, height:16, fontSize:9 }}>{dmUnread>99?'99+':dmUnread}</div>}
        </div>
      </div>
      <Sep />

      {/* Groups as servers */}
      {groups.map(g => {
        const id = getDialogId(g);
        return (
          <ServerIcon key={id||getDialogName(g)}
            id={id} name={getDialogName(g)} photo={photos[id]}
            isActive={selectedServerId===id} unread={unreadCounts[id]||0}
            onClick={() => { setViewMode('server'); setSelectedServer(id); setSelectedDialog(g); }}
          />
        );
      })}

      {/* Add group */}
      <div data-tooltip="Join or Create Group" style={{ marginTop:4, flexShrink:0 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--bg-300)', border:'2px dashed var(--border-300)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all var(--ease-spring)', color:'var(--online)' }}
          onMouseEnter={e=>{ e.currentTarget.style.borderRadius='40%'; e.currentTarget.style.background='rgba(34,212,122,0.1)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderRadius='50%'; e.currentTarget.style.background='var(--bg-300)'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div style={{ flex:1 }}/>

      {/* Admin */}
      <div data-tooltip="Admin Panel">
        <div onClick={()=>router.push('/admin')} style={{ width:48, height:48, borderRadius:'50%', background:'var(--bg-300)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all var(--ease-spring)', color:'var(--text-300)' }}
          onMouseEnter={e=>{ e.currentTarget.style.borderRadius='40%'; e.currentTarget.style.background='var(--bg-active)'; e.currentTarget.style.color='var(--brand)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderRadius='50%'; e.currentTarget.style.background='var(--bg-300)'; e.currentTarget.style.color='var(--text-300)'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>
        </div>
      </div>
      <div style={{ height:8 }}/>
    </div>
  );
}
