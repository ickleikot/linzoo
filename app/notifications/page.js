'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/auth';
import { getNotifications, markAllNotifsRead, respondToConnection, getNotices } from '../../lib/db';
import Avatar from '../../components/ui/Avatar';
import Toast from '../../components/ui/Toast';
import { useStore } from '../../lib/store';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  var [me, setMe] = useState(null);
  var [notifs, setNotifs] = useState([]);
  var [notices, setNotices] = useState([]);
  var [tab, setTab] = useState('notifications');
  var [loading, setLoading] = useState(true);
  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var p = await getProfile(res.data.session.user.id);
      if (!p){router.replace('/');return;}
      setMe(p);
      var [n,nts] = await Promise.all([getNotifications(p.id),getNotices(p.id)]);
      setNotifs(n); setNotices(nts); setLoading(false);
      markAllNotifsRead(p.id);
    });
  },[]);

  async function accept(notif){
    try {
      await respondToConnection(notif.ref_id,'accepted');
      setNotifs(function(prev){ return prev.map(function(n){ return n.id===notif.id?Object.assign({},n,{resolved:true,_accepted:true}):n; }); });
      toast.success('Connected!');
    } catch(e){toast.error(e.message);}
  }

  async function decline(notif){
    try {
      await respondToConnection(notif.ref_id,'declined');
      setNotifs(function(prev){ return prev.map(function(n){ return n.id===notif.id?Object.assign({},n,{resolved:true,_accepted:false}):n; }); });
    } catch(e){toast.error(e.message);}
  }

  var connReqs   = notifs.filter(function(n){return n.type==='connection_request';});
  var otherNotifs= notifs.filter(function(n){return n.type!=='connection_request';});

  function timeAgo(dt){ try{return formatDistanceToNow(new Date(dt),{addSuffix:true});}catch(e){return '';} }

  function notifIcon(type){
    if (type==='connection_accepted') return '🤝';
    if (type==='group_approved')      return '✅';
    if (type==='group_rejected')      return '❌';
    if (type==='notice')              return '📢';
    return '🔔';
  }

  function notifText(n){
    if (n.type==='connection_accepted') return ' accepted your connection request.';
    if (n.type==='group_approved')      return ' Your group was approved!';
    if (n.type==='group_rejected')      return ' Your group request was rejected.';
    if (n.type==='notice')              return ' sent you a notice.';
    return '';
  }

  var tabs = [
    {key:'notifications',label:'Activity',badge:otherNotifs.filter(function(n){return !n.read;}).length},
    {key:'requests',label:'Requests',badge:connReqs.filter(function(n){return !n.resolved;}).length},
    {key:'notices',label:'Notices',badge:0},
  ];

  return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <Link href="/feed" style={{color:'var(--brand)',fontWeight:700,textDecoration:'none',fontSize:15}}>← Back</Link>
        <span style={{fontWeight:800,fontSize:17}}>Notifications</span>
      </div>

      {/* Tab bar */}
      <div style={{background:'var(--bg)',borderBottom:'1px solid var(--border)',display:'flex'}}>
        {tabs.map(function(t){
          return (
            <button key={t.key} onClick={function(){setTab(t.key);}} style={{flex:1,padding:'12px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font)',fontWeight:tab===t.key?700:500,color:tab===t.key?'var(--brand)':'var(--text-2)',fontSize:14,borderBottom:tab===t.key?'2px solid var(--brand)':'2px solid transparent',position:'relative'}}>
              {t.label}
              {t.badge>0&&<span style={{position:'absolute',top:8,right:'calc(50% - 22px)',background:'var(--danger)',color:'#fff',borderRadius:99,fontSize:10,fontWeight:700,padding:'1px 5px'}}>{t.badge}</span>}
            </button>
          );
        })}
      </div>

      <div style={{maxWidth:600,margin:'0 auto'}}>
        {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner" style={{width:28,height:28}}/></div>}

        {/* Connection requests */}
        {!loading&&tab==='requests'&&(
          connReqs.length===0
            ? <Empty text="No connection requests"/>
            : connReqs.map(function(n){
                var fromName=(n.from&&(n.from.full_name||n.from.username))||'Someone';
                var fromU=(n.from&&n.from.username)||'';
                return (
                  <div key={n.id} style={{background:n.read?'var(--bg)':'var(--brand-dim)',borderBottom:'1px solid var(--border)',padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
                    <Link href={'/u/'+fromU} style={{textDecoration:'none',flexShrink:0}}><Avatar name={fromName} size={44} color={n.from&&n.from.avatar_color}/></Link>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,marginBottom:8}}>
                        <Link href={'/u/'+fromU} style={{fontWeight:700,color:'var(--text-1)',textDecoration:'none'}}>{fromName}</Link>
                        <span style={{color:'var(--text-2)'}}> wants to connect.</span>
                        <span style={{color:'var(--text-3)',fontSize:12,marginLeft:6}}>{timeAgo(n.created_at)}</span>
                      </div>
                      {!n.resolved
                        ? <div style={{display:'flex',gap:8}}>
                            <button className="btn btn-primary btn-sm" onClick={function(){accept(n);}}>Accept</button>
                            <button className="btn btn-ghost btn-sm" onClick={function(){decline(n);}}>Decline</button>
                          </div>
                        : <div style={{fontSize:13,color:'var(--text-3)'}}>{n._accepted?'✓ Accepted':'Declined'}</div>
                      }
                    </div>
                  </div>
                );
              })
        )}

        {/* General notifications */}
        {!loading&&tab==='notifications'&&(
          otherNotifs.length===0
            ? <Empty text="No notifications yet"/>
            : otherNotifs.map(function(n){
                var fromName=(n.from&&(n.from.full_name||n.from.username))||'';
                var fromU=(n.from&&n.from.username)||'';
                return (
                  <div key={n.id} style={{background:n.read?'var(--bg)':'var(--brand-dim)',borderBottom:'1px solid var(--border)',padding:'14px 16px',display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'var(--bg-input)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{notifIcon(n.type)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,lineHeight:1.5}}>
                        {fromU&&<Link href={'/u/'+fromU} style={{fontWeight:700,color:'var(--text-1)',textDecoration:'none'}}>{fromName}</Link>}
                        <span style={{color:'var(--text-2)'}}>{notifText(n)}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                );
              })
        )}

        {/* Notices */}
        {!loading&&tab==='notices'&&(
          notices.length===0
            ? <Empty text="No notices"/>
            : notices.map(function(n){
                var fromName=(n.from&&(n.from.full_name||n.from.username))||'Admin';
                return (
                  <div key={n.id} style={{background:'var(--bg)',borderBottom:'1px solid var(--border)',padding:'16px'}}>
                    <div style={{display:'flex',gap:10}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:'#7C3AED20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📢</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                          <span style={{fontWeight:700,fontSize:15}}>{n.title}</span>
                          {!n.to_id&&<span style={{fontSize:11,background:'#7C3AED20',color:'#7C3AED',padding:'2px 7px',borderRadius:99,fontWeight:700}}>BROADCAST</span>}
                        </div>
                        <div style={{fontSize:14,color:'var(--text-2)',lineHeight:1.6,marginBottom:6}}>{n.body}</div>
                        <div style={{fontSize:12,color:'var(--text-3)'}}>From {fromName} · {timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
        )}
      </div>
    </div>
  );
}

function Empty({text}){
  return <div style={{textAlign:'center',padding:60,color:'var(--text-3)',fontSize:14}}>{text}</div>;
}
