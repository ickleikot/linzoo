'use client';
import { useEffect, useState } from 'react';
import { getGroupMembers, leaveChat, deleteGroupAsAdmin, removeGroupMember, downloadChat, invalidateConversations } from '../../lib/db';
import Avatar from '../ui/Avatar';
import RoleBadge from '../ui/RoleBadge';
import Icon from '../ui/Icon';
import toast from 'react-hot-toast';

export default function ChatDetails({ chat, user, onClose, onLeft }) {
  var [members, setMembers] = useState([]);
  var [showDl, setShowDl] = useState(false);
  var [fromDate, setFromDate] = useState('');
  var [toDate, setToDate] = useState('');
  var [confirm, setConfirm] = useState(null);
  var isGroup   = chat.type==='group';
  var isAdmin   = user&&(user.role==='admin'||user.role==='superadmin');
  var isCreator = isGroup&&chat.created_by===user.id;
  var canDelGrp = isCreator||isAdmin;
  var isUniversal = !!chat.is_universal;
  var baseUrl = typeof window!=='undefined'?window.location.origin:'https://linzoo-eight.vercel.app';
  var joinLink = isGroup&&chat.group_code?baseUrl+'/join/'+chat.group_code:'';

  useEffect(function(){
    if (isGroup) getGroupMembers(chat.id).then(setMembers).catch(function(){});
  },[chat.id]);

  async function doLeave(){
    if (isUniversal){toast.error("You can't leave the General group!");return;}
    try {
      await leaveChat(chat.id,user.id);
      invalidateConversations(user.id);
      toast.success(isGroup?'Left group':'Conversation removed');
      onLeft();
    } catch(e){toast.error(e.message);}
  }

  async function doDelGrp(){
    try {
      await deleteGroupAsAdmin(chat.id,user.id);
      invalidateConversations(user.id);
      toast.success('Group deleted'); onLeft();
    } catch(e){toast.error(e.message);}
  }

  async function removeMember(memberId,name){
    try {
      await removeGroupMember(chat.id,memberId,user.id);
      setMembers(function(p){return p.filter(function(m){return m.user_id!==memberId;});});
      toast.success(name+' removed');
    } catch(e){toast.error(e.message);}
  }

  async function doDownload(){
    try {
      await downloadChat(chat.id,chat.name||'chat',
        fromDate?new Date(fromDate).toISOString():null,
        toDate?new Date(toDate+'T23:59:59').toISOString():null);
    } catch(e){toast.error(e.message);}
  }

  function copyLink(){ navigator.clipboard.writeText(joinLink).then(function(){toast.success('Copied!');}).catch(function(){toast.error('Copy failed');}); }

  return (
    <div style={{position:'absolute',inset:0,background:'var(--bg)',zIndex:50,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{height:52,padding:'0 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button className="btn-icon" onClick={onClose}><Icon name="back" size={20}/></button>
        <div style={{fontWeight:700,fontSize:16}}>{chat.name||'Details'}</div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 16px 32px'}}>

        {/* Code + link */}
        {isGroup&&chat.group_code&&(
          <div className="card" style={{padding:'14px 16px',marginBottom:14}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Group Info</div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:12,color:'var(--text-2)'}}>Join Code</div>
              <div style={{fontWeight:900,fontSize:30,letterSpacing:5,color:'var(--brand)'}}>{chat.group_code}</div>
            </div>
            <div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>Share Link</div>
            <div style={{fontSize:13,color:'var(--brand)',wordBreak:'break-all',marginBottom:8}}>{joinLink}</div>
            <button className="btn btn-outline btn-sm" onClick={copyLink}>📋 Copy Link</button>
          </div>
        )}

        {/* Download */}
        <div className="card" style={{padding:'14px 16px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Download Chat</div>
          {!showDl
            ? <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost btn-sm" onClick={doDownload}>Download All</button>
                <button className="btn btn-ghost btn-sm" onClick={function(){setShowDl(true);}}>Date Range</button>
              </div>
            : <div>
                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  <div><div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>From</div><input type="date" className="input" value={fromDate} onChange={function(e){setFromDate(e.target.value);}} style={{padding:'6px 10px',fontSize:13}}/></div>
                  <div><div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>To</div><input type="date" className="input" value={toDate} onChange={function(e){setToDate(e.target.value);}} style={{padding:'6px 10px',fontSize:13}}/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary btn-sm" onClick={doDownload}>Download</button>
                  <button className="btn btn-ghost btn-sm" onClick={function(){setShowDl(false);}}>Cancel</button>
                </div>
              </div>
          }
        </div>

        {/* Members */}
        {isGroup&&(
          <div className="card" style={{padding:'14px 16px',marginBottom:14}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Members ({members.length})</div>
            {members.map(function(m){
              var p2=m.profile||{};
              var name=p2.full_name||p2.username||'User';
              var isMe=p2.id===user.id;
              var canRm=canDelGrp&&!isMe&&!isUniversal;
              return (
                <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <Avatar name={name} size={32} color={p2.avatar_color}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:14,fontWeight:600}}>{name}</span>
                      {!p2.badge_hidden&&<RoleBadge profile={p2} small/>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text-3)'}}>@{p2.username} · {m.role==='admin'?'👑 Admin':'Member'}</div>
                  </div>
                  {canRm&&<button className="btn-icon" onClick={function(){removeMember(p2.id,name);}} style={{width:28,height:28}}><Icon name="close" size={14} color="var(--danger)"/></button>}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="card" style={{padding:'14px 16px'}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:14}}>Actions</div>
          {isGroup&&!isUniversal&&(
            <button className="btn btn-ghost btn-sm" onClick={function(){setConfirm('leave');}} style={{display:'block',width:'100%',marginBottom:8,textAlign:'left',color:'var(--danger)'}}>
              {isGroup?'Leave Group':'Delete Conversation (my side)'}
            </button>
          )}
          {isUniversal&&<div style={{fontSize:13,color:'var(--text-3)',padding:'8px 0'}}>🌎 This is the universal group — you cannot leave it.</div>}
          {!isGroup&&(
            <button className="btn btn-ghost btn-sm" onClick={function(){setConfirm('leave');}} style={{display:'block',width:'100%',marginBottom:8,textAlign:'left',color:'var(--danger)'}}>
              Delete Conversation (my side)
            </button>
          )}
          {canDelGrp&&isGroup&&!isUniversal&&(
            <button className="btn btn-danger btn-sm" onClick={function(){setConfirm('delete');}} style={{display:'block',width:'100%'}}>
              Delete Group Entirely
            </button>
          )}
        </div>
      </div>

      {confirm&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:20}}>
          <div className="card" style={{padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:10}}>
              {confirm==='leave'?(isGroup?'Leave Group?':'Delete Conversation?'):'Delete Group?'}
            </div>
            <div style={{fontSize:14,color:'var(--text-2)',marginBottom:20}}>
              {confirm==='leave'&&isGroup&&'You can rejoin using the group code.'}
              {confirm==='leave'&&!isGroup&&'Messages removed from your side only.'}
              {confirm==='delete'&&'This permanently deletes the group for everyone.'}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-danger btn-sm" onClick={confirm==='leave'?doLeave:doDelGrp}>Confirm</button>
              <button className="btn btn-ghost btn-sm" onClick={function(){setConfirm(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
