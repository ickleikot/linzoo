'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/auth';
import { getAllUsers, updateUserRole, banUser, setGroupLimit, updateUserProfile, updateBadge,
  getPendingGroups, approveGroup, rejectGroup,
  getAllGroups, getGroupMembers, getGroupHistory,
  getPasswordResetRequests, resolvePasswordReset,
  getUserGroupMemberships, getUserConnectionList,
  sendNotice, getReports, markReportRead } from '../../lib/db';
import { useStore } from '../../lib/store';
import Avatar from '../../components/ui/Avatar';
import RoleBadge from '../../components/ui/RoleBadge';
import Icon from '../../components/ui/Icon';
import Link from 'next/link';
import Toast from '../../components/ui/Toast';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

var TABS = ['Users','Groups','Group Requests','Password Resets','Send Notice','Reports'];
var BADGE_COLORS = ['#1D9BF0','#7C3AED','#00BA7C','#E0245E','#F97316','#EF4444','#EC4899','#14B8A6','#F59E0B'];

export default function AdminPage() {
  var [me, setMe] = useState(null);
  var [tab, setTab] = useState('Users');
  var [users, setUsers] = useState([]);
  var [groups, setGroups] = useState([]);
  var [pendingGroups, setPendingGroups] = useState([]);
  var [resets, setResets] = useState([]);
  var [reports, setReports] = useState([]);
  var [loading, setLoading] = useState(true);
  var [tempPw, setTempPw] = useState({});
  var [noticeTarget, setNoticeTarget] = useState('broadcast');
  var [noticeTitle, setNoticeTitle] = useState('');
  var [noticeBody, setNoticeBody] = useState('');
  // Inspect states
  var [inspectGroup, setInspectGroup] = useState(null);
  var [groupMembers, setGroupMembers] = useState([]);
  var [groupMsgs, setGroupMsgs] = useState([]);
  var [inspectUser, setInspectUser] = useState(null);
  var [userGroups, setUserGroups] = useState([]);
  var [userConns, setUserConns] = useState([]);
  // Edit user
  var [editUser, setEditUser] = useState(null);
  var [editFields, setEditFields] = useState({});
  // Badge editor
  var [badgeUser, setBadgeUser] = useState(null);
  var [badgeName, setBadgeName] = useState('');
  var [badgeColor, setBadgeColor] = useState('#1D9BF0');
  var [badgeHidden, setBadgeHidden] = useState(false);

  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var p = await getProfile(res.data.session.user.id);
      if (!p||(p.role!=='admin'&&p.role!=='superadmin')){router.replace('/feed');return;}
      setMe(p);
      var [u,g,pg,r,rpts] = await Promise.all([getAllUsers(),getAllGroups(),getPendingGroups(),getPasswordResetRequests(),getReports()]);
      setUsers(u); setGroups(g); setPendingGroups(pg); setResets(r); setReports(rpts);
      setLoading(false);
    });
  },[]);

  // ── Inspect group
  async function openGroup(g){
    setInspectGroup(g);
    var [mems,msgs] = await Promise.all([getGroupMembers(g.id),getGroupHistory(g.id)]);
    setGroupMembers(mems); setGroupMsgs(msgs);
  }

  // ── Inspect user
  async function openUser(u){
    setInspectUser(u);
    var [grps,conns] = await Promise.all([getUserGroupMemberships(u.id),getUserConnectionList(u.id)]);
    setUserGroups(grps); setUserConns(conns);
  }

  // ── Change role
  async function changeRole(userId, role){
    try {
      await updateUserRole(userId,role);
      setUsers(function(p){return p.map(function(u){return u.id===userId?Object.assign({},u,{role}):u;});});
      toast.success('Role updated');
    } catch(e){toast.error(e.message);}
  }

  // ── Ban
  async function toggleBan(u){
    var nb = !u.banned;
    try {
      await banUser(u.id,nb,null);
      setUsers(function(p){return p.map(function(x){return x.id===u.id?Object.assign({},x,{banned:nb,banned_until:null}):x;});});
      toast.success(nb?'Banned':'Unbanned');
    } catch(e){toast.error(e.message);}
  }

  async function tempBan(u){
    var days = parseInt(prompt('Ban for how many days?','1'));
    if (isNaN(days)||days<1) return;
    var until = new Date(Date.now()+days*86400000).toISOString();
    try {
      await banUser(u.id,true,until);
      setUsers(function(p){return p.map(function(x){return x.id===u.id?Object.assign({},x,{banned:true,banned_until:until}):x;});});
      toast.success('Temp banned for '+days+' days');
    } catch(e){toast.error(e.message);}
  }

  async function unban(u){
    try {
      await banUser(u.id,false,null);
      setUsers(function(p){return p.map(function(x){return x.id===u.id?Object.assign({},x,{banned:false,banned_until:null}):x;});});
      toast.success('Unbanned');
    } catch(e){toast.error(e.message);}
  }

  // ── Save user edit
  async function saveUserEdit(){
    if (!editUser) return;
    try {
      await updateUserProfile(editUser.id,editFields);
      setUsers(function(p){return p.map(function(u){return u.id===editUser.id?Object.assign({},u,editFields):u;});});
      setEditUser(null); setEditFields({});
      toast.success('User updated');
    } catch(e){toast.error(e.message);}
  }

  // ── Save badge
  async function saveBadge(){
    if (!badgeUser) return;
    try {
      await updateBadge(badgeUser.id,badgeName||null,badgeColor,badgeHidden);
      setUsers(function(p){return p.map(function(u){return u.id===badgeUser.id?Object.assign({},u,{badge_name:badgeName||null,badge_color:badgeColor,badge_hidden:badgeHidden}):u;});});
      setBadgeUser(null); toast.success('Badge updated');
    } catch(e){toast.error(e.message);}
  }

  // ── Group requests
  async function approve(g){
    try {await approveGroup(g.id,g.created_by);setPendingGroups(function(p){return p.filter(function(x){return x.id!==g.id;});});toast.success('Approved');}
    catch(e){toast.error(e.message);}
  }
  async function reject2(g){
    try {await rejectGroup(g.id,g.created_by);setPendingGroups(function(p){return p.filter(function(x){return x.id!==g.id;});});toast.success('Rejected');}
    catch(e){toast.error(e.message);}
  }

  // ── Password reset
  async function resolveReset(r){
    var pw = tempPw[r.id];
    if (!pw||!pw.trim()){toast.error('Enter a temp password');return;}
    try {
      await resolvePasswordReset(r.id,pw.trim());
      setResets(function(p){return p.filter(function(x){return x.id!==r.id;});});
      toast.success('Resolved. Tell user: '+pw.trim());
    } catch(e){toast.error(e.message);}
  }

  // ── Send notice
  async function submitNotice(){
    if (!noticeTitle.trim()||!noticeBody.trim()){toast.error('Fill title and body');return;}
    var toId = null;
    if (noticeTarget!=='broadcast'){
      var found = users.find(function(u){return u.username===noticeTarget.trim().toLowerCase();});
      if (!found){toast.error('User not found');return;}
      toId = found.id;
    }
    try {
      await sendNotice(me.id,toId,noticeTitle.trim(),noticeBody.trim());
      setNoticeTitle(''); setNoticeBody(''); setNoticeTarget('broadcast');
      toast.success('Notice sent!');
    } catch(e){toast.error(e.message);}
  }

  // ── Mark report read
  async function readReport(r){
    await markReportRead(r.id);
    setReports(function(p){return p.map(function(x){return x.id===r.id?Object.assign({},x,{read:true}):x;});});
  }

  // ── Render loading
  if (loading) return (
    <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <Toast/><div className="spinner" style={{width:36,height:36}}/>
    </div>
  );

  // ── Inspect Group screen
  if (inspectGroup) return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <button className="btn-icon" onClick={function(){setInspectGroup(null);}}><Icon name="back" size={20}/></button>
        <span style={{fontWeight:800,fontSize:17}}>Group: {inspectGroup.name}</span>
      </div>
      <div style={{maxWidth:700,margin:'0 auto',padding:16}}>
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:8,fontSize:14}}>Info</div>
          <div style={{fontSize:13,color:'var(--text-2)'}}>Code: <strong>{inspectGroup.group_code}</strong> · Type: {inspectGroup.is_private?'Private':'Public'} · Status: {inspectGroup.group_status}</div>
        </div>
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Members ({groupMembers.length})</div>
          {groupMembers.map(function(m){
            var p2=m.profile||{};
            return (
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                <Avatar name={p2.full_name||p2.username||'?'} size={30} color={p2.avatar_color}/>
                <div style={{flex:1}}>
                  <span style={{fontSize:13,fontWeight:600}}>{p2.full_name} </span>
                  <span style={{fontSize:12,color:'var(--text-3)'}}>@{p2.username} · group role: {m.role} · app role: {p2.role}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={function(){setInspectGroup(null);openUser(p2);}}>View User</button>
              </div>
            );
          })}
        </div>
        <div className="card" style={{padding:16}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Messages ({groupMsgs.length})</div>
          <div style={{maxHeight:360,overflowY:'auto'}}>
            {groupMsgs.map(function(m){
              var sn=(m.sender&&(m.sender.full_name||m.sender.username))||'?';
              return (
                <div key={m.id} style={{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontWeight:700,color:'var(--brand)',fontSize:12}}>{sn}</span>
                  <span style={{fontSize:11,color:'var(--text-3)',marginLeft:6}}>{new Date(m.created_at).toLocaleString()}</span>
                  <div style={{fontSize:13,marginTop:2}}>{m.text}</div>
                </div>
              );
            })}
            {groupMsgs.length===0&&<div style={{color:'var(--text-3)',fontSize:14}}>No messages</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Inspect User screen
  if (inspectUser) {
    var ago2='';
    try{ago2=formatDistanceToNow(new Date(inspectUser.created_at),{addSuffix:true});}catch(e){}
    return (
      <div className="page-outer">
        <Toast/>
        <div className="page-header">
          <button className="btn-icon" onClick={function(){setInspectUser(null);}}><Icon name="back" size={20}/></button>
          <span style={{fontWeight:800,fontSize:17}}>User: @{inspectUser.username}</span>
        </div>
        <div style={{maxWidth:700,margin:'0 auto',padding:16}}>
          {/* User card */}
          <div className="card" style={{padding:18,marginBottom:14}}>
            <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
              <Avatar name={inspectUser.full_name||inspectUser.username} size={56} color={inspectUser.avatar_color}/>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <span style={{fontWeight:800,fontSize:18}}>{inspectUser.full_name}</span>
                  <RoleBadge profile={inspectUser}/>
                </div>
                <div style={{fontSize:14,color:'var(--text-3)'}}>@{inspectUser.username} · Joined {ago2}</div>
                {inspectUser.bio&&<div style={{fontSize:14,marginTop:4}}>{inspectUser.bio}</div>}
                {inspectUser.email_for_reset&&<div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>📧 {inspectUser.email_for_reset}</div>}
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {me.role==='superadmin'&&(
                <>
                  <button className="btn btn-ghost btn-sm" onClick={function(){
                    setEditUser(inspectUser);
                    setEditFields({full_name:inspectUser.full_name,bio:inspectUser.bio||'',email_for_reset:inspectUser.email_for_reset||'',private_group_limit:inspectUser.private_group_limit,username:inspectUser.username});
                    setInspectUser(null);
                  }}>Edit Profile</button>
                  <button className="btn btn-ghost btn-sm" onClick={function(){setBadgeUser(inspectUser);setBadgeName(inspectUser.badge_name||'');setBadgeColor(inspectUser.badge_color||'#1D9BF0');setBadgeHidden(inspectUser.badge_hidden||false);setInspectUser(null);}}>Badge</button>
                  <select value={inspectUser.role} onChange={function(e){changeRole(inspectUser.id,e.target.value);setInspectUser(function(u){return Object.assign({},u,{role:e.target.value});});}} style={{fontSize:12,padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-input)',color:'var(--text-1)'}}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </>
              )}
              {!inspectUser.banned
                ? <>
                    <button onClick={function(){toggleBan(inspectUser);setInspectUser(function(u){return Object.assign({},u,{banned:true,banned_until:null});});}} style={{fontSize:12,padding:'5px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:'#ef444420',color:'var(--danger)'}}>Ban</button>
                    <button onClick={function(){tempBan(inspectUser);}} style={{fontSize:12,padding:'5px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:'#f9731620',color:'#f97316'}}>Temp Ban</button>
                  </>
                : <button onClick={function(){unban(inspectUser);setInspectUser(function(u){return Object.assign({},u,{banned:false,banned_until:null});});}} style={{fontSize:12,padding:'5px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:'var(--brand-dim)',color:'var(--brand)'}}>Unban</button>
              }
            </div>
            {inspectUser.banned&&<div style={{fontSize:12,color:'var(--danger)',marginTop:8}}>🚫 Banned{inspectUser.banned_until?' until '+new Date(inspectUser.banned_until).toLocaleDateString():' permanently'}</div>}
          </div>

          {/* Groups */}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Group Memberships ({userGroups.length})</div>
            {userGroups.length===0&&<div style={{color:'var(--text-3)',fontSize:13}}>No groups</div>}
            {userGroups.map(function(m,i){
              var chat=m.chats||{};
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600}}>{chat.name}</span>
                    <span style={{fontSize:12,color:'var(--text-3)',marginLeft:6}}>{chat.is_private?'Private':'Public'} · Your role: {m.role}</span>
                  </div>
                  {chat.group_code&&<span style={{fontSize:11,color:'var(--brand)',fontWeight:700}}>#{chat.group_code}</span>}
                </div>
              );
            })}
          </div>

          {/* Connections */}
          <div className="card" style={{padding:16}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Connections ({userConns.length})</div>
            {userConns.length===0&&<div style={{color:'var(--text-3)',fontSize:13}}>No connections</div>}
            {userConns.map(function(c){
              var other = c.from_id===inspectUser.id ? c.to : c.from;
              if (!other) return null;
              return (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <Avatar name={other.full_name||other.username} size={28} color={other.avatar_color}/>
                  <span style={{fontSize:13}}>{other.full_name} <span style={{color:'var(--text-3)'}}>@{other.username}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin page
  return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <Link href="/settings" style={{color:'var(--brand)',fontWeight:700,textDecoration:'none',fontSize:15}}>← Settings</Link>
        <span style={{fontWeight:800,fontSize:17}}>{me&&me.role==='superadmin'?'⚡ Super Admin':'🛡️ Admin'}</span>
      </div>

      {/* Tabs */}
      <div style={{background:'var(--bg)',borderBottom:'1px solid var(--border)',display:'flex',overflowX:'auto',gap:0}}>
        {TABS.map(function(t){
          var badge = t==='Group Requests'?pendingGroups.length:t==='Password Resets'?resets.length:t==='Reports'?reports.filter(function(r){return !r.read;}).length:0;
          return (
            <button key={t} onClick={function(){setTab(t);}} style={{padding:'12px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font)',fontWeight:tab===t?700:500,color:tab===t?'var(--brand)':'var(--text-2)',fontSize:13,borderBottom:tab===t?'2px solid var(--brand)':'2px solid transparent',whiteSpace:'nowrap',position:'relative'}}>
              {t}
              {badge>0&&<span style={{marginLeft:4,background:'var(--danger)',color:'#fff',borderRadius:99,fontSize:10,fontWeight:700,padding:'1px 5px'}}>{badge}</span>}
            </button>
          );
        })}
      </div>

      <div style={{maxWidth:780,margin:'0 auto',padding:16}}>

        {/* USERS */}
        {tab==='Users' && users.map(function(u){
          var isSelf = me&&u.id===me.id;
          var roleColor = u.role==='superadmin'?'#7C3AED':u.role==='admin'?'var(--brand)':'var(--text-3)';
          return (
            <div key={u.id} className="card" style={{padding:'14px 16px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <Avatar name={u.full_name||u.username} size={38} color={u.avatar_color}/>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontWeight:700}}>{u.full_name}</span>
                      <RoleBadge profile={u} small/>
                    </div>
                    <div style={{fontSize:12,color:'var(--text-3)'}}>@{u.username}</div>
                    <div style={{fontSize:11}}>
                      <span style={{color:roleColor,fontWeight:700}}>{u.role}</span>
                      {u.banned&&<span style={{marginLeft:8,color:'var(--danger)',fontWeight:700}}>🚫 BANNED{u.banned_until?' until '+new Date(u.banned_until).toLocaleDateString():''}</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                  <button className="btn btn-ghost btn-sm" onClick={function(){openUser(u);}}>View</button>
                  {!isSelf&&(
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={function(){setEditUser(u);setEditFields({full_name:u.full_name,bio:u.bio||'',email_for_reset:u.email_for_reset||'',private_group_limit:u.private_group_limit,username:u.username});}}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={function(){setBadgeUser(u);setBadgeName(u.badge_name||'');setBadgeColor(u.badge_color||'#1D9BF0');setBadgeHidden(u.badge_hidden||false);}}>Badge</button>
                      {me.role==='superadmin'&&(
                        <select value={u.role} onChange={function(e){changeRole(u.id,e.target.value);}} style={{fontSize:11,padding:'4px 7px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-input)',color:'var(--text-1)'}}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      )}
                      {!u.banned
                        ? <>
                            <button onClick={function(){toggleBan(u);}} style={{fontSize:11,padding:'4px 9px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:700,background:'#ef444420',color:'var(--danger)'}}>Ban</button>
                            <button onClick={function(){tempBan(u);}} style={{fontSize:11,padding:'4px 9px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:700,background:'#f9731620',color:'#f97316'}}>Temp</button>
                          </>
                        : <button onClick={function(){unban(u);}} style={{fontSize:11,padding:'4px 9px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:700,background:'var(--brand-dim)',color:'var(--brand)'}}>Unban</button>
                      }
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* GROUPS */}
        {tab==='Groups' && (
          <div>
            {groups.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--text-3)'}}>No groups</div>}
            {groups.map(function(g){
              return (
                <div key={g.id} className="card" style={{padding:'14px 16px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{g.name}</div>
                      <div style={{fontSize:13,color:'var(--text-2)'}}>{g.description||'No description'}</div>
                      <div style={{fontSize:12,color:'var(--text-3)',marginTop:3}}>
                        Code: <strong>{g.group_code}</strong> · {g.is_private?'Private':'Public'} · {g.group_status} · {new Date(g.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={function(){openGroup(g);}}>Inspect</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GROUP REQUESTS */}
        {tab==='Group Requests' && (
          <div>
            {pendingGroups.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--text-3)'}}>No pending requests</div>}
            {pendingGroups.map(function(g){
              return (
                <div key={g.id} className="card" style={{padding:'14px 16px',marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:15}}>{g.name}</div>
                  <div style={{fontSize:13,color:'var(--text-2)',marginTop:3}}>{g.description}</div>
                  <div style={{fontSize:12,color:'var(--text-3)',marginTop:3}}>By @{g.creator&&g.creator.username} · {new Date(g.created_at).toLocaleDateString()}</div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button className="btn btn-primary btn-sm" onClick={function(){approve(g);}}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={function(){reject2(g);}}>Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PASSWORD RESETS */}
        {tab==='Password Resets' && (
          <div>
            {resets.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--text-3)'}}>No pending requests</div>}
            {resets.map(function(r){
              return (
                <div key={r.id} className="card" style={{padding:'14px 16px',marginBottom:10}}>
                  <div style={{fontWeight:700}}>@{r.username}</div>
                  <div style={{fontSize:13,color:'var(--text-2)'}}>Email: {r.email}</div>
                  <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{new Date(r.created_at).toLocaleString()}</div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <input className="input" placeholder="Set temp password" style={{flex:1,fontSize:13,padding:'7px 12px'}}
                      value={tempPw[r.id]||''} onChange={function(e){var o=Object.assign({},tempPw);o[r.id]=e.target.value;setTempPw(o);}}/>
                    <button className="btn btn-primary btn-sm" onClick={function(){resolveReset(r);}}>Resolve</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SEND NOTICE */}
        {tab==='Send Notice' && (
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>Send Official Notice</div>
            <div style={{marginBottom:12}}>
              <label style={LA}>Send to</label>
              <div style={{display:'flex',gap:8,marginBottom:6}}>
                <button onClick={function(){setNoticeTarget('broadcast');}} className={'btn btn-sm '+(noticeTarget==='broadcast'?'btn-primary':'btn-ghost')}>📢 Broadcast</button>
                <button onClick={function(){setNoticeTarget('');}} className={'btn btn-sm '+(noticeTarget!=='broadcast'?'btn-primary':'btn-ghost')}>👤 Specific User</button>
              </div>
              {noticeTarget!=='broadcast'&&(
                <input className="input" placeholder="@username" value={noticeTarget} onChange={function(e){setNoticeTarget(e.target.value.toLowerCase().replace('@',''));}} style={{fontSize:14}}/>
              )}
            </div>
            <div style={{marginBottom:12}}>
              <label style={LA}>Title</label>
              <input className="input" placeholder="Notice title" value={noticeTitle} onChange={function(e){setNoticeTitle(e.target.value);}} style={{fontSize:14}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={LA}>Message</label>
              <textarea className="input" rows={5} placeholder="Write your notice…" value={noticeBody} onChange={function(e){setNoticeBody(e.target.value);}}/> 
            </div>
            <button className="btn btn-primary" onClick={submitNotice} disabled={!noticeTitle.trim()||!noticeBody.trim()}>Send Notice</button>
          </div>
        )}

        {/* REPORTS */}
        {tab==='Reports' && (
          <div>
            {reports.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--text-3)'}}>No reports</div>}
            {reports.map(function(r){
              var fromName=(r.from&&(r.from.full_name||r.from.username))||'Unknown';
              var ago3=''; try{ago3=formatDistanceToNow(new Date(r.created_at),{addSuffix:true});}catch(e){}
              return (
                <div key={r.id} className="card" style={{padding:'14px 16px',marginBottom:10,background:r.read?'var(--bg)':'var(--brand-dim)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{r.subject}</div>
                      <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>From @{r.from&&r.from.username||fromName} · {ago3}</div>
                    </div>
                    {!r.read&&<button className="btn btn-ghost btn-sm" onClick={function(){readReport(r);}}>Mark Read</button>}
                  </div>
                  <div style={{fontSize:14,color:'var(--text-2)',marginTop:8,lineHeight:1.6}}>{r.body}</div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* EDIT USER modal */}
      {editUser&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}}>
          <div className="card" style={{padding:22,width:'100%',maxWidth:400}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>Edit @{editUser.username}</div>
            {[
              {key:'full_name',label:'Display Name'},
              {key:'username',label:'Username'},
              {key:'bio',label:'Bio'},
              {key:'email_for_reset',label:'Recovery Email'},
              {key:'private_group_limit',label:'Private Group Limit',type:'number'},
            ].map(function(f){
              return (
                <div key={f.key} style={{marginBottom:10}}>
                  <label style={LA}>{f.label}</label>
                  <input className="input" type={f.type||'text'} value={editFields[f.key]||''} onChange={function(e){var o=Object.assign({},editFields);o[f.key]=e.target.value;setEditFields(o);}} style={{fontSize:14}}/>
                </div>
              );
            })}
            <div style={{marginBottom:10}}>
              <label style={LA}>New Password (leave blank to keep)</label>
              <input className="input" type="password" placeholder="Leave blank to skip" value={editFields.newPassword||''} onChange={function(e){var o=Object.assign({},editFields);o.newPassword=e.target.value;setEditFields(o);}} style={{fontSize:14}}/>
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button className="btn btn-primary btn-sm" onClick={saveUserEdit}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={function(){setEditUser(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BADGE EDITOR modal */}
      {badgeUser&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}}>
          <div className="card" style={{padding:22,width:'100%',maxWidth:380}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>Badge for @{badgeUser.username}</div>
            <div style={{marginBottom:12}}>
              <label style={LA}>Badge Text (e.g. "Mod", "VIP")</label>
              <input className="input" placeholder="Leave blank to remove badge" value={badgeName} onChange={function(e){setBadgeName(e.target.value);}} style={{fontSize:14}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={LA}>Badge Color</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {BADGE_COLORS.map(function(c){
                  return <button key={c} onClick={function(){setBadgeColor(c);}} type="button" style={{width:26,height:26,borderRadius:'50%',background:c,border:badgeColor===c?'3px solid var(--text-1)':'3px solid transparent',cursor:'pointer'}}/>;
                })}
              </div>
              <input type="color" value={badgeColor} onChange={function(e){setBadgeColor(e.target.value);}} style={{width:36,height:36,border:'none',borderRadius:8,cursor:'pointer'}}/>
            </div>
            <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" id="bhidden" checked={badgeHidden} onChange={function(e){setBadgeHidden(e.target.checked);}}/>
              <label htmlFor="bhidden" style={{fontSize:14}}>Hide badge (temporarily)</label>
            </div>
            {badgeName&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>Preview:</div>
                <span style={{display:'inline-flex',alignItems:'center',padding:'2px 9px',borderRadius:99,fontSize:11,fontWeight:800,background:badgeColor+'20',color:badgeColor}}>{badgeName}</span>
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={saveBadge}>Save Badge</button>
              <button className="btn btn-ghost btn-sm" onClick={function(){setBadgeUser(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
var LA = {display:'block',fontSize:13,fontWeight:600,color:'var(--text-2)',marginBottom:5};
