'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { getDialogName, getDialogType, getDialogId, fmtSep, groupByDate, getName } from '../../lib/helpers';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SearchModal from '../modals/SearchModal';

function TopBar({ dialog }) {
  const { toggleMembers, showMembers, toggleSearch, togglePinned, showPinned, pinnedByChatId } = useStore();
  const { requestCall } = useTelegram();
  const { setActiveCall } = useStore();
  const name = getDialogName(dialog);
  const type = getDialogType(dialog);
  const id = getDialogId(dialog);
  const pinCount = (pinnedByChatId[id] || []).length;

  const typeIcon = type === 'channel'
    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 9l3-6 2 4 1-2 2 4" stroke="var(--accent-purple)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : type === 'group'
    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="var(--accent-green)" strokeWidth="1.8" strokeLinecap="round"/></svg>
    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

  async function startCall(video = false) {
    if (type !== 'user') { import('react-hot-toast').then(({default:t})=>t.error('Voice calls only work with individual users')); return; }
    setActiveCall({ type: video?'video':'voice', peer: dialog.entity, state: 'connecting', callObj: null });
  }

  return (
    <div style={{ height:'var(--topbar-h)', borderBottom:'1px solid var(--border-100)', display:'flex', alignItems:'center', padding:'0 16px', gap:10, background:'var(--bg-200)', flexShrink:0, backdropFilter:'blur(12px)', zIndex:5 }}>
      <div style={{ color:'var(--text-400)', display:'flex', alignItems:'center' }}>{typeIcon}</div>
      <span style={{ fontSize:15, fontWeight:700, color:'var(--text-100)' }}>{name}</span>
      {type !== 'user' && <span style={{ fontSize:11, color:'var(--text-400)', background:'var(--bg-300)', border:'1px solid var(--border-100)', borderRadius:99, padding:'2px 8px' }}>{type}</span>}
      {pinCount > 0 && (
        <button onClick={togglePinned} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: showPinned?'var(--brand)':'var(--text-400)', background: showPinned?'var(--brand-dim)':'none', border:'none', borderRadius:99, padding:'2px 8px', cursor:'pointer', transition:'all var(--ease-fast)' }}>
          📌 {pinCount} pinned
        </button>
      )}
      <div style={{ flex:1 }}/>
      <div style={{ display:'flex', gap:2 }}>
        <button className="ibtn" title="Voice Call" onClick={()=>startCall(false)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button className="ibtn" title="Video Call" onClick={()=>startCall(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/></svg></button>
        <button className={`ibtn ${showMembers?'active':''}`} title="Members" onClick={toggleMembers}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        <button className={`ibtn ${false?'active':''}`} title="Search in Chat" onClick={toggleSearch}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        <button className="ibtn" title="More"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg></button>
      </div>
    </div>
  );
}

function PinnedBar({ messages, onJump }) {
  const [idx, setIdx] = useState(0);
  if (!messages?.length) return null;
  const msg = messages[idx % messages.length];
  return (
    <div style={{ borderBottom:'1px solid var(--border-100)', padding:'6px 16px', display:'flex', alignItems:'center', gap:10, background:'var(--bg-200)', cursor:'pointer', flexShrink:0 }} onClick={()=>{ onJump?.(msg); setIdx(i=>i+1); }}>
      <div style={{ width:3, height:36, background:'var(--brand)', borderRadius:2, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--brand)', marginBottom:2 }}>📌 Pinned Message {messages.length>1?`(${(idx%messages.length)+1}/${messages.length})`:''}
        </div>
        <div style={{ fontSize:12, color:'var(--text-300)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg?.message || '(media)'}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, color:'var(--text-400)' }}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
    </div>
  );
}

function DateSep({ date }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 20px 6px', userSelect:'none' }}>
      <div style={{ flex:1, height:1, background:'var(--border-100)' }}/>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text-400)', background:'var(--bg-300)', borderRadius:99, padding:'3px 12px', border:'1px solid var(--border-100)' }}>{fmtSep(date)}</span>
      <div style={{ flex:1, height:1, background:'var(--border-100)' }}/>
    </div>
  );
}

function TypingIndicator({ users }) {
  if (!users?.length) return null;
  const names = users.slice(0,3).map(u=>getName(u));
  const text = names.length===1 ? `${names[0]} is typing`
    : names.length===2 ? `${names[0]} and ${names[1]} are typing`
    : `${names[0]}, ${names[1]} and ${names.length-2} more are typing`;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 20px 8px', fontSize:12, color:'var(--text-400)' }}>
      <div style={{ display:'flex', gap:3 }}>
        {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'var(--brand)', animation:`typing 1.4s ${i*0.16}s ease-in-out infinite` }}/>)}
      </div>
      <span><strong style={{color:'var(--brand-light)'}}>{text}</strong></span>
    </div>
  );
}

function EmptyChat({ dialog }) {
  const name = getDialogName(dialog);
  const type = getDialogType(dialog);
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:40, textAlign:'center' }}>
      <div style={{ width:80, height:80, borderRadius:24, background:'linear-gradient(135deg,var(--brand-dim),rgba(168,85,247,0.1))', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border-200)' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div>
        <h3 style={{ fontWeight:700, marginBottom:6, fontSize:'1.05rem' }}>Start of your conversation with {name}</h3>
        <p style={{ fontSize:13, color:'var(--text-400)', maxWidth:360, lineHeight:1.6 }}>
          {type==='channel' ? 'This is a broadcast channel.' : `Say hello! 👋`}
        </p>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { getMessages, addUpdateHandler, removeUpdateHandler, getPinnedMessages, currentUser } = useTelegram();
  const { selectedDialog, messagesByChat, setMessages, prependMessage, typingByChatId, showSearch, toggleSearch, showPinned, pinnedByChatId, setPinned, replyingTo, setReplyingTo, editingMsg, setEditingMsg } = useStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const id = selectedDialog ? getDialogId(selectedDialog) : null;
  const messages = id ? [...(messagesByChat[id] || [])].reverse() : [];
  const pinned = (id && pinnedByChatId[id]) || [];
  const typing = (id && typingByChatId[id]) || [];
  const myId = currentUser?.id?.toString();

  // Load messages
  useEffect(() => {
    if (!selectedDialog || !id) return;
    let m = true; setLoading(true);
    const entity = selectedDialog.entity || selectedDialog.inputEntity;
    getMessages(entity, { limit: 50 }).then(msgs => {
      if (!m) return; setMessages(id, msgs); setLoading(false);
    }).catch(() => { if (m) setLoading(false); });
    // Load pinned
    getPinnedMessages(entity).then(pins => { if (m && pins.length) setPinned(id, pins); }).catch(()=>{});
    return () => { m = false; };
  }, [id]);

  // Scroll to bottom
  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages.length, loading]);

  // Real-time updates
  useEffect(() => {
    if (!id) return;
    let handler;
    async function setup() {
      const { NewMessage, EditedMessage } = await import('telegram/events');
      handler = async (event) => {
        const msg = event.message;
        if (!msg) return;
        const chatId = msg.chatId?.toString() || msg.peerId?.channelId?.toString() || msg.peerId?.chatId?.toString() || msg.peerId?.userId?.toString();
        if (chatId && (chatId === id || id.replace('-','') === chatId || id === '-'+chatId)) {
          prependMessage(id, msg);
        }
      };
      addUpdateHandler(handler, new NewMessage({}));
    }
    setup();
    return () => { if (handler) removeUpdateHandler(handler); };
  }, [id]);

  // Load older messages
  async function loadMore() {
    if (loadingMore || !id || !messages.length) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const older = await getMessages(selectedDialog.entity || selectedDialog.inputEntity, { limit: 50, offsetId: oldest.id });
      if (older.length) {
        const { appendMessages } = useStore.getState();
        appendMessages(id, older);
      }
    } catch {} finally { setLoadingMore(false); }
  }

  function handleScroll(e) {
    if (e.target.scrollTop < 200) loadMore();
  }

  const grouped = groupByDate(messages);

  if (!selectedDialog) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-100)', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'var(--text-400)' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>💬</div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:8 }}>Welcome to Linzoo</h2>
          <p style={{ fontSize:13, maxWidth:300, lineHeight:1.6 }}>Select a conversation from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-100)', overflow:'hidden' }}>
      <TopBar dialog={selectedDialog}/>
      {showPinned && pinned.length > 0 && <PinnedBar messages={pinned} />}
      {showSearch && <SearchModal onClose={toggleSearch} dialog={selectedDialog}/>}

      {/* Message list */}
      <div ref={listRef} onScroll={handleScroll} style={{ flex:1, overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column' }}>
        {loadingMore && <div style={{ display:'flex', justifyContent:'center', padding:12 }}><div className="a-spin" style={{ width:20, height:20, border:'2px solid var(--border-200)', borderTopColor:'var(--brand)', borderRadius:'50%' }}/></div>}

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:8 }}>
            {Array.from({length:7}).map((_,i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'4px 20px', alignItems:'flex-end', flexDirection:i%3===0?'row-reverse':'row' }}>
                <div className="skel" style={{ width:36, height:36, borderRadius:'50%', flexShrink:0 }}/>
                <div><div className="skel" style={{ height:12, width:80, marginBottom:5 }}/><div className="skel" style={{ height:38, width:100+Math.random()*120, borderRadius:'var(--r-lg)' }}/></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyChat dialog={selectedDialog}/>
        ) : (
          <>
            {grouped.map((item, i) => {
              if (item._type === 'date-sep') return <DateSep key={item.id} date={item.date}/>;
              const isOwn = myId && (item.out || item.senderId?.toString()===myId || item.fromId?.userId?.toString()===myId);
              const prev = grouped[i-1];
              return (
                <MessageBubble key={item.id} message={item} isOwn={isOwn} prevItem={prev} dialog={selectedDialog}/>
              );
            })}
          </>
        )}

        <TypingIndicator users={typing}/>
        <div ref={bottomRef} style={{ height:4 }}/>
      </div>

      {/* Reply/Edit bar */}
      {(replyingTo || editingMsg) && (
        <div style={{ margin:'0 16px', padding:'8px 12px', background:'var(--bg-300)', borderLeft:`3px solid ${editingMsg?'var(--accent-yellow)':'var(--brand)'}`, borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:editingMsg?'var(--accent-yellow)':'var(--brand)', marginBottom:2 }}>
              {editingMsg ? '✏️ Editing message' : `↩ Replying to ${(replyingTo?.sender&&getName(replyingTo.sender))||'message'}`}
            </div>
            <div style={{ color:'var(--text-300)', fontSize:12, maxWidth:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {(editingMsg||replyingTo)?.message?.slice(0,80)}
            </div>
          </div>
          <button onClick={()=>{ setReplyingTo(null); setEditingMsg(null); }} className="ibtn" style={{ width:24, height:24 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}

      <MessageInput dialog={selectedDialog}/>
    </div>
  );
}
