'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../../lib/store';
import Avatar from './Avatar';
import Icon from './Icon';

export default function NavBar({ unreadNotifs }) {
  var user = useStore(function(s){ return s.user; });
  var theme = useStore(function(s){ return s.theme; });
  var toggleTheme = useStore(function(s){ return s.toggleTheme; });
  var pathname = usePathname() || '';
  var name = (user && (user.full_name || user.username)) || '';
  var avatarColor = user && user.avatar_color;

  var links = [
    { href:'/chat',   label:'Messages' },
    { href:'/feed',   label:'Feed' },
    { href:'/groups', label:'Groups' },
  ];

  return (
    <nav style={{ height:52, background:'var(--bg)', borderBottom:'1px solid var(--border)', padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, zIndex:200, position:'sticky', top:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        <Link href="/feed" style={{ fontWeight:900, fontSize:22, color:'var(--brand)', textDecoration:'none', marginRight:12, letterSpacing:-0.5 }}>Linzoo</Link>
        {links.map(function(l){
          var active = pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} style={{ padding:'6px 10px', borderRadius:8, fontWeight:active?700:500, color:active?'var(--brand)':'var(--text-2)', textDecoration:'none', fontSize:14, background:active?'var(--brand-dim)':'transparent', transition:'all 0.12s', WebkitTapHighlightColor:'transparent' }}>
              {l.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:2 }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme} className="btn-icon" title="Toggle theme" type="button">
          {theme === 'dark'
            ? <span style={{ fontSize:16 }}>☀️</span>
            : <span style={{ fontSize:16 }}>🌙</span>
          }
        </button>

        {/* Bell */}
        <Link href="/notifications" className="btn-icon" title="Notifications" style={{ position:'relative' }}>
          <Icon name="bell" size={18} color="var(--text-2)" />
          {unreadNotifs > 0 && (
            <span style={{ position:'absolute', top:5, right:5, background:'var(--danger)', color:'#fff', borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700 }}>
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </Link>

        {/* Settings */}
        <Link href="/settings" className="btn-icon" title="Settings">
          <Icon name="settings" size={18} color="var(--text-2)" />
        </Link>

        {/* Avatar → profile */}
        <Link href={'/u/' + (user && user.username || '')} style={{ marginLeft:2 }}>
          <Avatar name={name} size={30} color={avatarColor} />
        </Link>
      </div>
    </nav>
  );
}
