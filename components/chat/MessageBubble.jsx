'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { fmtTime, getInitials, getColor, getName, shouldGroupWithPrev, getMediaType, fmtSize, getMimeIcon } from '../../lib/helpers';

// ── Reaction Picker ────────────────────────────────────────
const QUICK_REACT = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','💯','🤔'];

function ReactionPicker({ onPick }) {
  return (
    <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'var(--bg-400)', border:'1px solid var(--border-300)', borderRadius:'var(--r-full)', padding:'4px 8px', display:'flex', gap:2, boxShadow:'var(--shadow-lg)', zIndex:100, animation:'ctxIn 100ms var(--ease-spring)' }}>
      {QUICK_REACT.map(e => (
        <button key={e} onClick={()=>onPick(e)} style={{ fontSize:20, background:'none', border:'none', cursor:'pointer', padding:'2px 3px', borderRadius:8, transition:'transform var(--ease-fast)', lineHeight:1 }}
          onMouseEnter={e2=>e2.currentTarget.style.transform='scale(1.3)'}
          onMouseLeave={e2=>e2.currentTarget.style.transform='scale(1)'}>
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Message Actions ────────────────────────────────────────
function MessageActions({ message, isOwn, onReply, onEdit, onDelete, onForward, onPin, onReact }) {
  const [showReact, setShowReact] = useState(false);
  const actions = [
    { icon:'😀', label:'React', action:()=>setShowReact(v=>!v), always:true },
    { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Reply', action:onReply, always:true },
    { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="15 17 20 12 15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 18v-2a4 4 0 0 1 4-4h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Forward', action:onForward, always:true },
    { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Pin', action:onPin, always:true },
    { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Edit', action:onEdit, show:isOwn },
    { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="var(--dnd)" strokeWidth="1.8" strokeLinecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="var(--dnd)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Delete', action:onDelete, danger:true, show:true },
  ].filter(a => a.always || a.show);

  return (
    <div style={{ display:'flex', gap:1, background:'var(--bg-400)', border:'1px solid var(--border-200)', borderRadius:'var(--r-md)', padding:2, boxShadow:'var(--shadow-md)', position:'relative' }}>
      {showReact && <ReactionPicker onPick={(e)=>{ onReact(e); setShowReact(false); }}/>}
      {actions.map(a => (
        <button key={a.label} onClick={a.action} title={a.label}
          style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', color: a.danger?'var(--dnd)':'var(--text-300)', fontSize:13, transition:'all var(--ease-fast)' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.color=a.danger?'var(--dnd)':'var(--text-000)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color=a.danger?'var(--dnd)':'var(--text-300)'; }}>
          {a.icon}
        </button>
      ))}
    </div>
  );
}

// ── Poll Message ───────────────────────────────────────────
function PollMsg({ media }) {
  const poll = media?.poll;
  const results = media?.results;
  if (!poll) return null;
  const total = results?.totalVoters || 0;
  return (
    <div style={{ background:'var(--bg-300)', border:'1px solid var(--border-200)', borderRadius:'var(--r-lg)', padding:'12px 16px', minWidth:240 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>📊 {poll.question}</div>
      <div style={{ fontSize:11, color:'var(--text-400)', marginBottom:10 }}>{poll.closed?'Closed poll':'Anonymous poll'} · {total} votes</div>
      {poll.answers?.map((a, i) => {
        const res = results?.results?.[i];
        const pct = total > 0 && res ? Math.round((res.voters/total)*100) : 0;
        const chosen = res?.chosen;
        return (
          <div key={i} style={{ marginBottom:7, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3, color: chosen?'var(--brand-light)':'var(--text-200)' }}>
              <span>{chosen?'✓ ':''}{a.text}</span><span style={{ fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={{ height:5, background:'var(--bg-500)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background: chosen?'var(--brand)':'var(--border-300)', borderRadius:99, transition:'width 500ms ease' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Location Message ───────────────────────────────────────
function LocationMsg({ media }) {
  const geo = media?.geo;
  if (!geo) return null;
  const url = `https://maps.google.com/?q=${geo.lat},${geo.long}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display:'block', textDecoration:'none' }}>
      <div style={{ background:'var(--bg-300)', border:'1px solid var(--border-200)', borderRadius:'var(--r-lg)', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
        <div style={{ width:40, height:40, borderRadius:'var(--r-md)', background:'var(--bg-400)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📍</div>
        <div>
          <div style={{ fontSize:13, fontWeight:600 }}>Location</div>
          <div style={{ fontSize:11, color:'var(--text-400)' }}>{geo.lat.toFixed(4)}, {geo.long.toFixed(4)}</div>
          <div style={{ fontSize:11, color:'var(--brand)', marginTop:2 }}>Open in Maps →</div>
        </div>
      </div>
    </a>
  );
}

// ── Contact Message ────────────────────────────────────────
function ContactMsg({ media }) {
  if (!media) return null;
  const name = [media.firstName, media.lastName].filter(Boolean).join(' ') || 'Contact';
  return (
    <div style={{ background:'var(--bg-300)', border:'1px solid var(--border-200)', borderRadius:'var(--r-lg)', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, minWidth:200 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', background:getColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff' }}>{getInitials(name)}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
        {media.phoneNumber && <div style={{ fontSize:11, color:'var(--text-400)' }}>{media.phoneNumber}</div>}
      </div>
    </div>
  );
}

// ── Document/File Message ──────────────────────────────────
function FileMsg({ media }) {
  const doc = media?.document;
  if (!doc) return null;
  const attrs = doc.attributes || [];
  const nameAttr = attrs.find(a => a.fileName);
  const fileName = nameAttr?.fileName || 'File';
  const mime = doc.mimeType || '';
  const icon = getMimeIcon(mime);
  const size = fmtSize(doc.size);
  return (
    <div style={{ background:'var(--bg-300)', border:'1px solid var(--border-200)', borderRadius:'var(--r-lg)', padding:'10px 14px', display:'flex', alignItems:'center', gap:12, minWidth:220, maxWidth:320, cursor:'pointer' }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-400)'}
      onMouseLeave={e=>e.currentTarget.style.background='var(--bg-300)'}>
      <div style={{ width:42, height:42, borderRadius:'var(--r-md)', background:'var(--brand-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fileName}</div>
        <div style={{ fontSize:11, color:'var(--text-400)', marginTop:2, display:'flex', gap:6 }}>
          <span>{size}</span><span>·</span><span>{mime.split('/')[1]?.toUpperCase() || 'FILE'}</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color:'var(--brand)', flexShrink:0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

// ── Sticker Message ────────────────────────────────────────
function StickerMsg({ media }) {
  const doc = media?.document;
  if (!doc) return <div style={{ fontSize:32 }}>🎭</div>;
  return <div style={{ fontSize:13, color:'var(--text-400)', padding:'8px 12px', background:'var(--bg-300)', borderRadius:'var(--r-md)' }}>🎭 Sticker</div>;
}

// ── Round Video ────────────────────────────────────────────
function RoundVideoMsg() {
  return <div style={{ width:160, height:160, borderRadius:'50%', background:'var(--bg-300)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, border:'3px solid var(--border-200)' }}>🎬</div>;
}

// ── Voice Message ──────────────────────────────────────────
function VoiceMsg({ message }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const audioRef = useRef(null);
  const { downloadMedia } = useTelegram();
  const { mediaCache, setMedia } = useStore();
  const key = `voice-${message.id}`;

  async function toggle() {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    let url = mediaCache[key];
    if (!url) {
      const bytes = await downloadMedia(message);
      if (bytes) {
        const blob = new Blob([bytes], { type:'audio/ogg' });
        url = URL.createObjectURL(blob);
        setMedia(key, url);
      }
    }
    if (url) {
      if (!audioRef.current) audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onloadedmetadata = () => setDuration(audioRef.current.duration);
      audioRef.current.play();
      setPlaying(true);
    }
  }

  const attrs = message.media?.document?.attributes || [];
  const audioAttr = attrs.find(a => a.duration);
  const dur = audioAttr?.duration || duration;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg-300)', border:'1px solid var(--border-200)', borderRadius:'var(--r-full)', padding:'8px 14px 8px 8px', minWidth:180 }}>
      <button onClick={toggle} style={{ width:32, height:32, borderRadius:'50%', background:playing?'var(--dnd)':'var(--brand)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background var(--ease-fast)' }}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
      </button>
      {/* Waveform visual placeholder */}
      <div style={{ display:'flex', gap:1.5, alignItems:'center', flex:1, height:24 }}>
        {Array.from({length:20}).map((_,i) => (
          <div key={i} style={{ width:2.5, height: 4+Math.abs(Math.sin(i*0.8))*14, borderRadius:2, background: playing&&i<10?'var(--brand)':'var(--border-300)', transition:'height 200ms ease' }}/>
        ))}
      </div>
      <span style={{ fontSize:11, color:'var(--text-400)', flexShrink:0 }}>
        {dur ? `${Math.floor(dur/60)}:${String(Math.floor(dur%60)).padStart(2,'0')}` : '–:––'}
      </span>
    </div>
  );
}

// ── Photo Message ──────────────────────────────────────────
function PhotoMsg({ message }) {
  const { downloadMedia } = useTelegram();
  const { mediaCache, setMedia, openImage } = useStore();
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = `photo-${message.id}`;

  useEffect(() => {
    if (mediaCache[key]) { setSrc(mediaCache[key]); setLoading(false); return; }
    downloadMedia(message, { thumb: 1 }).then(bytes => {
      if (bytes) {
        const url = URL.createObjectURL(new Blob([bytes], { type:'image/jpeg' }));
        setSrc(url); setMedia(key, url);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [message.id]);

  if (loading) return <div className="skel" style={{ width:240, height:180, borderRadius:'var(--r-lg)' }}/>;
  if (!src) return <div style={{ width:240, height:180, background:'var(--bg-300)', borderRadius:'var(--r-lg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-400)', fontSize:13 }}>📷 Photo</div>;

  return (
    <img src={src} alt="Photo" onClick={()=>openImage({src, alt:'Photo', message})}
      style={{ maxWidth:320, maxHeight:400, borderRadius:'var(--r-lg)', cursor:'pointer', display:'block', objectFit:'cover', border:'1px solid var(--border-100)' }}
      onMouseEnter={e=>e.target.style.opacity='0.9'} onMouseLeave={e=>e.target.style.opacity='1'}
    />
  );
}

// ── Text with formatting ───────────────────────────────────
function FormattedText({ text, entities }) {
  if (!text) return null;
  if (!entities?.length) return <span style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{text}</span>;

  // Build segments
  const segs = [];
  let pos = 0;
  const sorted = [...entities].sort((a,b) => a.offset - b.offset);

  for (const e of sorted) {
    if (e.offset > pos) segs.push({ text: text.slice(pos, e.offset), type:'text' });
    segs.push({ text: text.slice(e.offset, e.offset + e.length), type: e.className?.replace('MessageEntity','').toLowerCase() || 'text' });
    pos = e.offset + e.length;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), type:'text' });

  return (
    <span style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
      {segs.map((s, i) => {
        const styles = {
          bold: { fontWeight:700 },
          italic: { fontStyle:'italic' },
          underline: { textDecoration:'underline' },
          strike: { textDecoration:'line-through' },
          code: { fontFamily:'var(--font-mono)', fontSize:'0.9em', background:'rgba(0,0,0,0.2)', padding:'1px 5px', borderRadius:4 },
          pre: { fontFamily:'var(--font-mono)', display:'block', background:'var(--bg-100)', padding:'8px 12px', borderRadius:'var(--r-md)', margin:'4px 0', fontSize:'0.85em', overflowX:'auto', whiteSpace:'pre' },
          url: { color:'var(--text-link)', textDecoration:'underline', cursor:'pointer' },
          texturl: { color:'var(--text-link)', textDecoration:'underline', cursor:'pointer' },
          mention: { color:'var(--brand-light)', fontWeight:600, cursor:'pointer' },
          hashtag: { color:'var(--brand-light)', cursor:'pointer' },
          spoiler: { background:'var(--bg-400)', color:'transparent', borderRadius:3, cursor:'pointer', transition:'all 300ms' },
        };
        return <span key={i} style={styles[s.type] || {}}>{s.text}</span>;
      })}
    </span>
  );
}

// ── Main Bubble ────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, prevItem, dialog }) {
  const [hovered, setHovered] = useState(false);
  const { setReplyingTo, setEditingMsg, setForwardingMsg, openImage } = useStore();
  const { deleteMessages, pinMessage, sendReaction } = useTelegram();
  const grouped = shouldGroupWithPrev(message, prevItem);
  const senderName = isOwn ? 'You' : (message.sender ? getName(message.sender) : '');
  const senderColor = getColor(senderName);
  const mediaType = getMediaType(message);
  const reactions = message.reactions?.results || [];
  const time = fmtTime(message.date);
  const edited = message.editDate > 0;
  const hasText = !!message.message;

  async function handleDelete() {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteMessages(dialog.entity, [message.id], true);
      const { removeMessage } = useStore.getState();
      const { getDialogId } = await import('../../lib/helpers');
      removeMessage(getDialogId(dialog), message.id);
    } catch (e) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(e.message || 'Delete failed');
    }
  }

  async function handlePin() {
    try { await pinMessage(dialog.entity, message.id); }
    catch (e) { const { default: t } = await import('react-hot-toast'); t.error(e.message); }
  }

  async function handleReact(emoji) {
    try { await sendReaction(dialog.entity, message.id, emoji); }
    catch {}
  }

  const isService = message.className === 'MessageService' || message.action;
  if (isService) {
    return (
      <div style={{ display:'flex', justifyContent:'center', padding:'6px 20px', userSelect:'none' }}>
        <span style={{ fontSize:12, color:'var(--text-400)', background:'var(--bg-300)', padding:'3px 12px', borderRadius:99, border:'1px solid var(--border-100)' }}>
          {message.action?.className?.replace('MessageAction','') || 'Event'}
        </span>
      </div>
    );
  }

  return (
    <div className={hovered?'':'a-msg'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display:'flex', flexDirection: isOwn?'row-reverse':'row', gap: grouped?0:10, padding:`${grouped?1:8}px 16px 1px`, alignItems:'flex-end', position:'relative' }}>

      {/* Avatar */}
      {!isOwn && (
        <div style={{ width:36, flexShrink:0, display:'flex', alignItems:'flex-end' }}>
          {!grouped && (
            <div style={{ width:36, height:36, borderRadius:'50%', background:getColor(senderName), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', flexShrink:0 }}
              onClick={()=>message.sender&&useStore.getState().openProfile(message.sender)}>
              {getInitials(senderName)}
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div style={{ maxWidth: mediaType==='sticker'||mediaType==='round_video'?'auto':'68%', minWidth:0 }}>
        {/* Sender name + time */}
        {!grouped && !isOwn && (
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:700, color:senderColor, cursor:'pointer' }}
              onClick={()=>message.sender&&useStore.getState().openProfile(message.sender)}>
              {senderName}
            </span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{time}</span>
            {edited && <span style={{ fontSize:10, color:'var(--text-muted)' }}>(edited)</span>}
          </div>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div style={{ marginBottom:5, padding:'4px 10px', borderLeft:'3px solid var(--brand)', background:'var(--bg-300)', borderRadius:'0 var(--r-md) var(--r-md) 0', fontSize:12, color:'var(--text-400)', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            ↩ Replying to a message
          </div>
        )}

        {/* Media */}
        {mediaType === 'photo'       && <PhotoMsg message={message}/>}
        {mediaType === 'voice'       && <VoiceMsg message={message}/>}
        {mediaType === 'sticker'     && <StickerMsg media={message.media}/>}
        {mediaType === 'round_video' && <RoundVideoMsg/>}
        {mediaType === 'document'    && <FileMsg media={message.media}/>}
        {mediaType === 'poll'        && <PollMsg media={message.media}/>}
        {mediaType === 'location'    && <LocationMsg media={message.media}/>}
        {mediaType === 'contact'     && <ContactMsg media={message.media}/>}
        {mediaType === 'gif' && <div style={{ fontSize:13, color:'var(--text-400)', padding:'8px 12px', background:'var(--bg-300)', borderRadius:'var(--r-md)' }}>🎞️ GIF</div>}
        {mediaType === 'video' && <div style={{ width:280, height:160, background:'var(--bg-300)', borderRadius:'var(--r-lg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, border:'1px solid var(--border-100)' }}>▶️</div>}
        {mediaType === 'dice' && <div style={{ fontSize:40, lineHeight:1.2 }}>{message.media?.value||'🎲'}</div>}

        {/* Text bubble */}
        {hasText && (
          <div style={{
            background: isOwn ? 'var(--brand)' : 'var(--bg-300)',
            borderRadius: isOwn
              ? `var(--r-xl) ${grouped?'var(--r-xl)':'var(--r-sm)'} var(--r-sm) var(--r-xl)`
              : `${grouped?'var(--r-xl)':'var(--r-sm)'} var(--r-xl) var(--r-xl) var(--r-sm)`,
            padding: '9px 14px',
            marginTop: mediaType ? 4 : 0,
            fontSize:14, lineHeight:1.55,
            boxShadow: isOwn ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
            position:'relative',
          }}>
            <FormattedText text={message.message} entities={message.entities}/>
            <span style={{ display:'inline-flex', alignItems:'center', gap:3, float:'right', marginLeft:10, marginTop:2, fontSize:10, color: isOwn?'rgba(255,255,255,0.65)':'var(--text-muted)', whiteSpace:'nowrap' }}>
              {grouped && time}
              {edited && '✏️'}
              {isOwn && (
                message.id < 0 ? '🕐' :
                message.views ? <><svg width="14" height="8" viewBox="0 0 24 14" fill="none"><polyline points="2 7 7 12 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>{message.views.toLocaleString()}</> :
                <svg width="14" height="10" viewBox="0 0 24 10" fill="none"><polyline points="2 5 8 10 22 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </span>
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5, flexDirection: isOwn?'row-reverse':'row' }}>
            {reactions.map((r, i) => (
              <div key={i} className="reaction" onClick={()=>handleReact(r.reaction?.emoticon)}>
                <span className="emoji">{r.reaction?.emoticon||'👍'}</span>
                <span className="count">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{ position:'absolute', [isOwn?'left':'right']:0, top:-14, zIndex:10, transition:'opacity var(--ease-fast)' }}>
          <MessageActions message={message} isOwn={isOwn}
            onReply={()=>setReplyingTo(message)}
            onEdit={()=>setEditingMsg(message)}
            onDelete={handleDelete}
            onForward={()=>setForwardingMsg(message)}
            onPin={handlePin}
            onReact={handleReact}
          />
        </div>
      )}
    </div>
  );
}
