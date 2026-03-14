'use client';
import { useState } from 'react';
import Avatar from '../ui/Avatar';
import RoleBadge from '../ui/RoleBadge';
import Icon from '../ui/Icon';

export default function MessageBubble({ msg, isMine, isAdmin, onReply, onEdit, onDelete, onAdminDelete, onScrollToReply }) {
  var [hover, setHover] = useState(false);
  var isDeleted = !!msg.deleted_at;
  var sender = msg.sender || {};
  var senderName = sender.full_name || sender.username || '?';
  var replyMsg = msg.reply_msg;

  return (
    <div onMouseEnter={function(){setHover(true);}} onMouseLeave={function(){setHover(false);}}
      style={{ display:'flex', gap:7, padding:'3px 12px', flexDirection:isMine?'row-reverse':'row', alignItems:'flex-end' }}>

      {!isMine && (
        <div style={{ flexShrink:0, marginBottom:16 }}>
          <Avatar name={senderName} size={28} color={sender.avatar_color} />
        </div>
      )}

      <div style={{ maxWidth:'74%', minWidth:0 }}>
        {!isMine && (
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2, paddingLeft:2 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--brand)' }}>{senderName}</span>
            {!sender.badge_hidden && <RoleBadge profile={sender} small />}
          </div>
        )}

        {/* Reply preview */}
        {replyMsg && (
          <button onClick={function(){onScrollToReply&&onScrollToReply(replyMsg.id);}}
            style={{ display:'block', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0, textAlign:isMine?'right':'left', marginBottom:3 }}>
            <div style={{ background:'var(--bg-input)', borderLeft:'3px solid var(--brand)', borderRadius:8, padding:'4px 10px', fontSize:12, color:'var(--text-2)' }}>
              <div style={{ fontWeight:700, color:'var(--brand)', fontSize:11, marginBottom:1 }}>
                {replyMsg.sender ? (replyMsg.sender.full_name||replyMsg.sender.username) : 'Message'}
              </div>
              <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyMsg.text}</div>
            </div>
          </button>
        )}

        <div style={{ background:isDeleted?'var(--bg-input)':(isMine?'var(--brand)':'var(--bg-input)'), color:isDeleted?'var(--text-3)':(isMine?'#fff':'var(--text-1)'), borderRadius:isMine?'18px 18px 4px 18px':'18px 18px 18px 4px', padding:'9px 13px', fontSize:15, lineHeight:1.5, wordBreak:'break-word', fontStyle:isDeleted?'italic':'normal' }}>
          {isDeleted ? <span>This message was deleted</span> : <span>{msg.text}</span>}
          {msg.edited && !isDeleted && <span style={{ fontSize:10, opacity:0.6, marginLeft:5 }}>(edited)</span>}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2, justifyContent:isMine?'flex-end':'flex-start' }}>
          <span style={{ fontSize:11, color:'var(--text-3)' }}>
            {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
          </span>
          {isMine && (
            <Icon name={msg.msg_status==='read'?'checkDouble':'check'} size={12} color={msg.msg_status==='read'?'var(--brand)':'var(--text-3)'} />
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hover && !isDeleted && (
        <div style={{ display:'flex', gap:2, alignSelf:'center', flexShrink:0 }}>
          <button className="btn-icon" onClick={function(){onReply&&onReply(msg);}} title="Reply" style={{ width:28,height:28 }}>
            <Icon name="reply" size={13} />
          </button>
          {isMine && <button className="btn-icon" onClick={function(){onEdit&&onEdit(msg);}} title="Edit" style={{ width:28,height:28 }}><Icon name="pencil" size={13} /></button>}
          {isMine && <button className="btn-icon" onClick={function(){onDelete&&onDelete(msg.id);}} title="Delete" style={{ width:28,height:28 }}><Icon name="trash" size={13} color="var(--danger)" /></button>}
          {isAdmin && !isMine && <button className="btn-icon" onClick={function(){onAdminDelete&&onAdminDelete(msg.id);}} title="Admin delete" style={{ width:28,height:28 }}><Icon name="warn" size={13} color="var(--danger)" /></button>}
        </div>
      )}
    </div>
  );
}
