'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { getGroups, joinGroup, joinGroupByCode, getConversations, invalidateConversations } from '../../lib/db';
import Avatar from '../ui/Avatar';
import ChatWindow from '../chat/ChatWindow';
import Modal from '../ui/Modal';
import NewGroupModal from '../modals/NewGroupModal';
import Icon from '../ui/Icon';
import { useIsMobile } from '../../lib/hooks';
import toast from 'react-hot-toast';

export default function GroupsPanel() {
  var user = useStore(function(s){return s.user;});
  var activeChat = useStore(function(s){return s.activeChat;});
  var setActiveChat = useStore(function(s){return s.setActiveChat;});
  var [publicGroups, setPublicGroups] = useState([]);
  var [myPrivate, setMyPrivate] = useState([]);
  var [code, setCode] = useState('');
  var [showNew, setShowNew] = useState(false);
  var [loading, setLoading] = useState(true);
  var isMobile = useIsMobile();

  useEffect(function(){
    if (!user) return;
    Promise.all([getGroups(), getConversations(user.id)]).then(function(r){
      setPublicGroups(r[0]||[]);
      // ONLY show private groups the current user is actually a member of
      var mine = (r[1]||[]).filter(function(c){ return c.type==='group' && c.is_private===true; });
      setMyPrivate(mine);
    }).catch(function(e){toast.error(e.message);}).finally(function(){setLoading(false);});
  },[user]);

  async function openGroup(g){
    if (!user) return;
    // Only auto-join public non-pending groups
    if (!g.is_private && g.group_status==='active') {
      try { await joinGroup(g.id, user.id); } catch(e) {}
    }
    setActiveChat({id:g.id,name:g.name,type:'group',is_universal:g.is_universal,is_private:g.is_private,group_code:g.group_code,created_by:g.created_by,group_status:g.group_status});
  }

  async function joinByCode(){
    if (!code.trim()||!user) return;
    try {
      var g = await joinGroupByCode(code.trim(), user.id);
      invalidateConversations(user.id);
      setActiveChat({id:g.id,name:g.name,type:'group',is_private:g.is_private,group_code:g.group_code,created_by:g.created_by});
      setCode('');
      if (g.is_private) setMyPrivate(function(p){return p.some(function(x){return x.id===g.id;})?p:p.concat([g]);});
      else {
        // Refresh public groups
        getGroups().then(setPublicGroups);
      }
      toast.success('Joined '+g.name+'!');
    } catch(e){toast.error(e.message);}
  }

  var sidebar = (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'var(--bg)'}}>
      <div style={{padding:'12px 14px 8px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:800,fontSize:17}}>Groups</span>
          <button className="btn-icon" onClick={function(){setShowNew(true);}} title="New group"><Icon name="plus" size={20}/></button>
        </div>
        <div style={{display:'flex',gap:6}}>
          <input className="input" placeholder="Join by code…" value={code}
            onChange={function(e){setCode(e.target.value.toUpperCase());}}
            style={{flex:1,fontSize:14,padding:'7px 12px'}} maxLength={6}/>
          <button className="btn btn-primary btn-sm" onClick={joinByCode} disabled={code.length<4}>Join</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {loading&&<div style={{display:'flex',justifyContent:'center',padding:24}}><div className="spinner"/></div>}
        {/* Public groups (visible to all) */}
        {publicGroups.map(function(g){
          var isActive = activeChat&&activeChat.id===g.id;
          return (
            <GroupRow key={g.id} g={g} isActive={isActive} onClick={function(){openGroup(g);}}/>
          );
        })}
        {/* My private groups (only I see) */}
        {myPrivate.length>0&&(
          <div style={{padding:'8px 14px 4px',fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:1}}>My Private</div>
        )}
        {myPrivate.map(function(g){
          var isActive = activeChat&&activeChat.id===g.id;
          return (
            <GroupRow key={g.id} g={g} isActive={isActive} isPrivate onClick={function(){setActiveChat({id:g.id,name:g.name,type:'group',is_private:true,group_code:g.group_code,created_by:g.created_by});}}/>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {activeChat ? <ChatWindow onBack={function(){setActiveChat(null);}} /> : sidebar}
        <Modal open={showNew} onClose={function(){setShowNew(false);}} title="New Group" width={440}>
          <NewGroupModal onClose={function(){setShowNew(false);}} onCreated={function(g){
            if (g.is_private) setMyPrivate(function(p){return p.concat([g]);});
            else getGroups().then(setPublicGroups);
          }}/>
        </Modal>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      <div style={{width:280,borderRight:'1px solid var(--border)',flexShrink:0,overflow:'hidden'}}>{sidebar}</div>
      <ChatWindow/>
      <Modal open={showNew} onClose={function(){setShowNew(false);}} title="New Group" width={440}>
        <NewGroupModal onClose={function(){setShowNew(false);}} onCreated={function(g){
          if (g.is_private) setMyPrivate(function(p){return p.concat([g]);});
          else getGroups().then(setPublicGroups);
        }}/>
      </Modal>
    </div>
  );
}

function GroupRow({g,isActive,onClick,isPrivate}){
  return (
    <div onClick={onClick} style={{display:'flex',gap:10,padding:'10px 14px',cursor:'pointer',alignItems:'center',background:isActive?'var(--brand-dim)':'transparent',borderLeft:isActive?'3px solid var(--brand)':'3px solid transparent',transition:'background 0.1s'}}>
      <Avatar name={g.name} size={40}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</div>
        <div style={{fontSize:12,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.description||'Group'}</div>
      </div>
      {g.is_universal&&<span style={{fontSize:10,background:'var(--brand-dim)',color:'var(--brand)',padding:'2px 6px',borderRadius:99,fontWeight:700,flexShrink:0}}>ALL</span>}
      {isPrivate&&<span style={{fontSize:10,background:'var(--bg-input)',color:'var(--text-3)',padding:'2px 6px',borderRadius:99,fontWeight:700,flexShrink:0}}>PRIVATE</span>}
    </div>
  );
}
