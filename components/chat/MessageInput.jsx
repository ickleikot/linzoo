'use client';
import { useState } from 'react';
import Icon from '../ui/Icon';

export default function MessageInput({ onSend, replyTo, onCancelReply, disabled }) {
  var [text, setText] = useState('');

  function send() {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }

  var replyName = replyTo && replyTo.sender && (replyTo.sender.full_name || replyTo.sender.username);

  return (
    <div style={{ flexShrink:0, borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
      {replyTo && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'var(--brand-dim)', borderBottom:'1px solid var(--border)' }}>
          <div style={{ flex:1, fontSize:13, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            <span style={{ color:'var(--brand)', fontWeight:700 }}>↩ {replyName || 'Message'}: </span>
            {replyTo.text}
          </div>
          <button className="btn-icon" onClick={onCancelReply} style={{ width:24,height:24 }}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px' }}>
        <input
          className="input"
          placeholder="Message…"
          value={text}
          onChange={function(e){ setText(e.target.value); }}
          onKeyDown={function(e){ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={disabled}
          style={{ flex:1, fontSize:15, padding:'9px 14px', maxHeight:44, borderRadius:22 }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || disabled}
          style={{ width:40, height:40, borderRadius:'50%', background:text.trim()?'var(--brand)':'var(--border)', border:'none', cursor:text.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}
        >
          <Icon name="send" size={17} color="#fff" />
        </button>
      </div>
    </div>
  );
}
