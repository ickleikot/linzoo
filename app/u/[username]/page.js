'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getProfile, getProfileByUsername } from '../../../lib/auth';
import { getConnectionStatus, sendConnectionRequest, respondToConnection, removeConnection, getUserConnections, getUserLinzes, createDM, blockUser, unblockUser, getBlockedIds } from '../../../lib/db';
import Avatar from '../../../components/ui/Avatar';
import RoleBadge from '../../../components/ui/RoleBadge';
import Toast from '../../../components/ui/Toast';
import { useStore } from '../../../lib/store';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  var params = useParams();
  var [me, setMe] = useState(null);
  var [profile, setProfile] = useState(null);
  var [conn, setConn] = useState(null);
  var [totalConns, setTotalConns] = useState(0);
  var [linzes, setLinzes] = useState([]);
  var [blocked, setBlocked] = useState(false);
  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();
  var username = params.username;

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var myProfile = await getProfile(res.data.session.user.id);
      setMe(myProfile);
      var target = await getProfileByUsername(username);
      if (!target){router.replace('/feed');return;}
      setProfile(target);
      var [connData, conns, lz, blockedIds] = await Promise.all([
        getConnectionStatus(res.data.session.user.id, target.id),
        getUserConnections(target.id),
        getUserLinzes(target.id),
        getBlockedIds(res.data.session.user.id),
      ]);
      setConn(connData);
      setTotalConns(conns.length);
      setLinzes(lz);
      setBlocked(blockedIds.has(target.id));
    });
  },[username]);

  var isMe = me && profile && me.id === profile.id;
  var connStatus = null;
  if (conn) {
    if (conn.status==='accepted') connStatus='connected';
    else if (conn.status==='pending') connStatus = conn.from_id===(me&&me.id)?'pending_sent':'pending_received';
  }

  async function connect(){
    if (!me||!profile) return;
    try {
      var r = await sendConnectionRequest(me.id, profile.id);
      setConn(r);
    } catch(e){toast.error(e.message);}
  }

  async function acceptInline(){
    if (!conn) return;
    await respondToConnection(conn.id,'accepted');
    setConn(function(c){return Object.assign({},c,{status:'accepted'});});
    setTotalConns(function(n){return n+1;});
    toast.success('Connected!');
  }

  async function declineInline(){
    if (!conn) return;
    await respondToConnection(conn.id,'declined');
    setConn(null);
  }

  async function disconnect(){
    await removeConnection(me.id, profile.id);
    setConn(null); setTotalConns(function(n){return Math.max(0,n-1);});
  }

  async function dm(){
    if (!me||!profile) return;
    var dmChat = await createDM(me.id, profile.id);
    useStore.getState().setActiveChat({id:dmChat.id,name:profile.full_name||profile.username,type:'dm',dmPartnerId:profile.id});
    router.push('/chat');
  }

  async function toggleBlock(){
    if (!me||!profile) return;
    if (blocked) {
      await unblockUser(me.id, profile.id);
      setBlocked(false); toast.success('Unblocked');
    } else {
      await blockUser(me.id, profile.id);
      setBlocked(true); toast.success('Blocked');
    }
  }

  if (!profile) return (
    <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <Toast/><div className="spinner" style={{width:32,height:32}}/>
    </div>
  );

  return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <button onClick={function(){router.back();}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--brand)',fontWeight:700,fontSize:15,fontFamily:'var(--font)'}}>← Back</button>
        <span style={{fontWeight:800,fontSize:17}}>{profile.full_name}</span>
      </div>

      <div style={{maxWidth:520,margin:'0 auto'}}>
        <div style={{background:'var(--bg)',padding:'20px 16px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <Avatar name={profile.full_name||profile.username} size={72} color={profile.avatar_color}/>
            {!isMe && (
              <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end',marginTop:4}}>
                {/* Message button — always show if not me and not blocked */}
                {!blocked && (
                  <button className="btn btn-primary btn-sm" onClick={dm}>Message</button>
                )}
                {connStatus==='connected' && (
                  <button className="btn btn-ghost btn-sm" onClick={disconnect}>Connected ✓</button>
                )}
                {connStatus==='pending_sent' && (
                  <button className="btn btn-ghost btn-sm" disabled>Pending…</button>
                )}
                {connStatus==='pending_received' && (
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-primary btn-sm" onClick={acceptInline}>Accept</button>
                    <button className="btn btn-ghost btn-sm" onClick={declineInline}>Decline</button>
                  </div>
                )}
                {!connStatus && (
                  <button className="btn btn-outline btn-sm" onClick={connect}>Connect</button>
                )}
                <button className="btn btn-ghost btn-sm" style={{color:blocked?'var(--brand)':'var(--danger)'}} onClick={toggleBlock}>
                  {blocked?'Unblock':'Block'}
                </button>
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
            <span style={{fontWeight:800,fontSize:20}}>{profile.full_name}</span>
            {!profile.badge_hidden && <RoleBadge profile={profile}/>}
          </div>
          <div style={{fontSize:14,color:'var(--text-3)',marginBottom:8}}>@{profile.username}</div>
          {profile.bio && <div style={{fontSize:15,lineHeight:1.6,marginBottom:8}}>{profile.bio}</div>}
          <div style={{fontSize:14,color:'var(--text-3)'}}>{totalConns} connection{totalConns!==1?'s':''}</div>
        </div>

        {/* Linzes */}
        <div>
          {linzes.length===0 && <div style={{textAlign:'center',padding:48,color:'var(--text-3)'}}>No posts yet</div>}
          {linzes.map(function(p){
            var ago='';
            try{ago=formatDistanceToNow(new Date(p.created_at),{addSuffix:true});}catch(e){}
            return (
              <div key={p.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
                <Link href={'/linz/'+p.id} style={{textDecoration:'none'}}>
                  <div style={{fontSize:15,lineHeight:1.6,color:'var(--text-1)',marginBottom:4}}>{p.text}</div>
                  <div style={{fontSize:12,color:'var(--text-3)'}}>{ago} · ♥ {p.likes} · 💬 {p.comments}</div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
