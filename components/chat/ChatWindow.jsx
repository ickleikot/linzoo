'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { getMessages, sendMessage, editMessage, deleteMessage, adminDeleteMessage, markRead, leaveChat } from '../../lib/db';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatDetails from './ChatDetails';
import Icon from '../ui/Icon';
import toast from 'react-hot-toast';

export default function ChatWindow({ onBack }) {
  var activeChat = useStore(function(s) { return s.activeChat; });
  var user       = useStore(function(s) { return s.user; });
  var messages   = useStore(function(s) { return s.messages; });
  var setMessages  = useStore(function(s) { return s.setMessages; });
  var addMessage   = useStore(function(s) { return s.addMessage; });
  var updateMessage = useStore(function(s) { return s.updateMessage; });
  var removeMessage = useStore(function(s) { return s.removeMessage; });
  var setActiveChat = useStore(function(s) { return s.setActiveChat; });

  var [loading, setLoading] = useState(false);
  var [replyTo, setReplyTo]   = useState(null);
  var [editing, setEditing]   = useState(null);
  var [editText, setEditText] = useState('');
  var [showDetails, setShowDetails] = useState(false);
  var bottomRef = useRef(null);
  var msgRefs   = useRef({});

  var chatId  = activeChat && activeChat.id;
  var isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  useEffect(function() {
    if (!chatId) return;
    setLoading(true);
    getMessages(chatId).then(function(msgs) {
      setMessages(chatId, msgs);
      if (user) markRead(chatId, user.id);
    }).catch(function(e) { toast.error(e.message); }).finally(function() { setLoading(false); });

    var ch = supabase.channel('msg_' + chatId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:'chat_id=eq.'+chatId },
        function(p) {
          supabase.from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(id,username,full_name), reply_msg:messages!messages_reply_to_fkey(id,text,sender:profiles!messages_sender_id_fkey(username,full_name))')
            .eq('id', p.new.id).single()
            .then(function(r) { if (r.data) addMessage(chatId, r.data); });
        })
      .subscribe();
    return function() { supabase.removeChannel(ch); };
  }, [chatId]);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior:'smooth' });
  }, [(messages[chatId] || []).length]);

  function scrollToMsg(id) {
    var el = msgRefs.current[id];
    if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function handleSend(text) {
    if (!user || !chatId) return;
    try {
      var msg = await sendMessage(chatId, user.id, text, replyTo && replyTo.id);
      addMessage(chatId, msg);
      setReplyTo(null);
    } catch(e) { toast.error(e.message); }
  }

  async function handleEdit() {
    if (!editing || !editText.trim()) return;
    try {
      await editMessage(editing.id, user.id, editText.trim());
      updateMessage(chatId, editing.id, { text: editText.trim(), edited: true });
      setEditing(null); setEditText('');
    } catch(e) { toast.error(e.message); }
  }

  async function handleDelete(msgId) {
    try {
      await deleteMessage(msgId, user.id);
      removeMessage(chatId, msgId);
    } catch(e) { toast.error(e.message); }
  }

  async function handleAdminDelete(msgId) {
    try {
      await adminDeleteMessage(msgId);
      updateMessage(chatId, msgId, { text:'[deleted by admin]', deleted_at: new Date().toISOString() });
    } catch(e) { toast.error(e.message); }
  }

  if (!activeChat) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color:'var(--text-3)' }}>
        <svg viewBox="0 0 24 24" width="60" height="60" fill="var(--border)"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 7.854 3.494 7.854 8 0 4.421-3.536 7.847-7.885 7.847-.98 0-1.934-.185-2.818-.521L3.093 20.48l1.3-3.588C2.289 15.644 1.75 12.92 1.75 10z"/></svg>
        <div style={{ fontWeight:600, fontSize:15 }}>Select a conversation</div>
      </div>
    );
  }

  var msgs = messages[chatId] || [];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0, position:'relative' }}>
      {/* Header */}
      <div style={{ height:52, padding:'0 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {onBack && (
            <button className="btn-icon" onClick={onBack}>
              <Icon name="back" size={20} />
            </button>
          )}
          {/* Clicking name opens details */}
          <button onClick={function(){ setShowDetails(true); }} style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{activeChat.name || 'Chat'}</div>
            <div style={{ fontSize:12, color:'var(--brand)' }}>
              {activeChat.type === 'group' ? 'Group · tap for details' : 'Direct message · tap for details'}
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:32 }}><div className="spinner" /></div>}
        {!loading && msgs.length === 0 && <div style={{ textAlign:'center', padding:48, color:'var(--text-3)', fontSize:14 }}>No messages yet. Say hello!</div>}
        {msgs.map(function(msg) {
          return (
            <div key={msg.id} ref={function(el) { msgRefs.current[msg.id] = el; }}>
              <MessageBubble
                msg={msg}
                isMine={user && msg.sender_id === user.id}
                isAdmin={isAdmin}
                onReply={setReplyTo}
                onEdit={function(m) { setEditing(m); setEditText(m.text); }}
                onDelete={handleDelete}
                onAdminDelete={handleAdminDelete}
                onScrollToReply={scrollToMsg}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Edit bar */}
      {editing && (
        <div style={{ padding:'8px 14px', background:'var(--brand-dim)', borderTop:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <input className="input" value={editText} onChange={function(e){setEditText(e.target.value);}}
            onKeyDown={function(e){if(e.key==='Enter')handleEdit();}}
            style={{ flex:1, fontSize:14 }} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={handleEdit}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={function(){setEditing(null);}}>✕</button>
        </div>
      )}

      <MessageInput onSend={handleSend} replyTo={replyTo} onCancelReply={function(){setReplyTo(null);}} />

      {/* Details panel */}
      {showDetails && (
        <ChatDetails
          chat={activeChat}
          user={user}
          onClose={function(){ setShowDetails(false); }}
          onLeft={function(){
            setActiveChat(null);
            setShowDetails(false);
            if (onBack) onBack();
          }}
        />
      )}
    </div>
  );
}
