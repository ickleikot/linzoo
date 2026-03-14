'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getProfile, ensureProfile } from '../../lib/auth';
import { getUnreadNotifCount } from '../../lib/db';
import { useStore } from '../../lib/store';
import NavBar from './NavBar';
import Toast from './Toast';

export default function AppShell({ children }) {
  var [ready, setReady] = useState(false);
  var [unread, setUnread] = useState(0);
  var setUser = useStore(function(s){ return s.setUser; });
  var initTheme = useStore(function(s){ return s.initTheme; });
  var router = useRouter();

  useEffect(function() {
    initTheme();
    supabase.auth.getSession().then(async function(res) {
      var session = res.data && res.data.session;
      if (!session) { router.replace('/'); return; }
      var u = session.user;
      var meta = u.user_metadata || {};
      var uname = meta.username || (u.email ? u.email.split('@')[0] : u.id.slice(0,8));
      await ensureProfile(u.id, uname, meta.full_name || uname);
      var profile = await getProfile(u.id);
      if (!profile) { router.replace('/'); return; }
      if (profile.banned) {
        var until = profile.banned_until ? ' until ' + new Date(profile.banned_until).toLocaleDateString() : '';
        alert('Your account has been banned' + until + '.');
        await supabase.auth.signOut();
        router.replace('/'); return;
      }
      setUser(Object.assign({}, u, profile));
      setReady(true);
      getUnreadNotifCount(u.id).then(setUnread).catch(function(){});
    });

    var { data: sub } = supabase.auth.onAuthStateChange(function(event) {
      if (event === 'SIGNED_OUT') router.replace('/');
    });
    return function() { sub.subscription.unsubscribe(); };
  }, []);

  if (!ready) {
    return (
      <div style={{ height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, background:'var(--bg)' }}>
        <Toast/>
        <div style={{ fontWeight:900, fontSize:28, color:'var(--brand)' }}>Linzoo</div>
        <div className="spinner" style={{ width:28, height:28 }} />
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'var(--bg)' }}>
      <NavBar unreadNotifs={unread} />
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
        {children}
      </div>
      <Toast/>
    </div>
  );
}
