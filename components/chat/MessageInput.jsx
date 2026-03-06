'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { useStore } from '../../lib/store';
import { getDialogName } from '../../lib/helpers';
import toast from 'react-hot-toast';

// ── Emoji Picker ───────────────────────────────────────────
const EMOJI_CATS = {
  '😀 Smileys':['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😶‍🌫️','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  '👋 People':['👋','🤚','🖐','✋','🖖','🤙','💪','🦾','🖕','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤲','🤝','🙏','✍️','💅','🤳','💃','🕺'],
  '❤️ Hearts':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🔱'],
  '🎉 Fun':['🎉','🎊','🎈','🎁','🎀','🎗','🎟','🎫','🏆','🥇','🥈','🥉','⭐','🌟','✨','💫','🔥','💥','🎯','🎲','🎮','🕹','🎸','🎵','🎶','🎤','🎧','🎬','🎥','📸','📷'],
  '🌍 Nature':['🌍','🌎','🌏','🌐','🗺','🌋','⛰','🏔','🗻','🏕','🏖','🏜','🏝','🏞','🌅','🌄','🌠','🎇','🎆','🌃','🏙','🌉','🌌','🌁','🌊','🌀','🌈','⛈','🌤','🌥','🌦','🌧','🌨','🌩','🌪','🌫','🌬'],
  '🍕 Food':['🍕','🍔','🍟','🌭','🌮','🌯','🥙','🥗','🥘','🍲','🥣','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','☕','🧉','🥤','🧃','🍵','🫖','🍶','🍺','🍻','🥂','🍷'],
  '🚀 Travel':['🚀','✈️','🛸','🛩','🚁','🛶','⛵','🚢','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎','🏍'],
};

function EmojiPicker({ onPick }) {
  const [cat, setCat] = useState(Object.keys(EMOJI_CATS)[0]);
  const [search, setSearch] = useState('');
  const cats = Object.keys(EMOJI_CATS);
  const emojis = search
    ? Object.values(EMOJI_CATS).flat().filter(e => e.includes(search))
    : EMOJI_CATS[cat] || [];

  return (
    <div style={{ width:320, height:340, background:'var(--bg-400)', border:'1px solid var(--border-300)', borderRadius:'var(--r-xl)', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-xl)', animation:'ctxIn 150ms var(--ease-spring)' }}>
      <div style={{ padding:'8px 8px 4px' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search emoji…" className="input" style={{ padding:'6px 10px', fontSize:13, borderRadius:'var(--r-md)' }}/>
      </div>
      {!search && (
        <div style={{ display:'flex', gap:1, padding:'2px 6px', borderBottom:'1px solid var(--border-100)', overflowX:'auto', scrollbarWidth:'none' }}>
          {cats.map(c => (
            <button key={c} onClick={()=>setCat(c)} style={{ padding:'4px 6px', fontSize:16, background: cat===c?'var(--bg-hover)':'none', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', flexShrink:0 }}>
              {c.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', padding:6, display:'flex', flexWrap:'wrap', gap:1, alignContent:'flex-start' }}>
        {emojis.map(e => (
          <button key={e} onClick={()=>onPick(e)} style={{ width:32, height:32, fontSize:20, background:'none', border:'none', cursor:'pointer', borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform var(--ease-fast)' }}
            onMouseEnter={e2=>e2.currentTarget.style.transform='scale(1.25)'}
            onMouseLeave={e2=>e2.currentTarget.style.transform='scale(1)'}>
            {e}
          </button>
        ))}
        {emojis.length === 0 && <div style={{ width:'100%', textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:20 }}>No emoji found</div>}
      </div>
    </div>
  );
}

// ── GIF Picker ─────────────────────────────────────────────
function GifPicker({ onPick }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const TENOR_KEY = 'AIzaSyANpIRTjTOAQbT-8mDjjIWVXE1E7AuFGBM'; // free demo key

  async function search(q) {
    setLoading(true);
    try {
      const r = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q||'trending')}&key=${TENOR_KEY}&limit=20&media_filter=gif`);
      const d = await r.json();
      setGifs(d.results || []);
    } catch { setGifs([]); } finally { setLoading(false); }
  }

  useEffect(() => { search(''); }, []);

  return (
    <div style={{ width:320, height:340, background:'var(--bg-400)', border:'1px solid var(--border-300)', borderRadius:'var(--r-xl)', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-xl)', animation:'ctxIn 150ms var(--ease-spring)' }}>
      <div style={{ padding:'8px 8px 4px' }}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search(query)} placeholder="Search GIFs… (press Enter)" className="input" style={{ padding:'6px 10px', fontSize:13 }}/>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:4, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
        {loading ? Array.from({length:6}).map((_,i)=><div key={i} className="skel" style={{ height:100, borderRadius:'var(--r-md)' }}/>) :
          gifs.map(g => {
            const url = g.media_formats?.tinygif?.url || g.media_formats?.gif?.url;
            const preview = g.media_formats?.tinygif?.url;
            return (
              <div key={g.id} onClick={()=>onPick(url)} style={{ cursor:'pointer', borderRadius:'var(--r-md)', overflow:'hidden' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.8'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <img src={preview} alt={g.content_description} style={{ width:'100%', height:90, objectFit:'cover', display:'block' }}/>
              </div>
            );
          })}
        {!loading && gifs.length===0 && <div style={{ gridColumn:'span 2', textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:20 }}>No GIFs found</div>}
      </div>
    </div>
  );
}

// ── Poll Creator ───────────────────────────────────────────
function PollCreator({ onSubmit, onClose }) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const [anon, setAnon] = useState(true);
  return (
    <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, right:0, background:'var(--bg-400)', border:'1px solid var(--border-300)', borderRadius:'var(--r-xl)', padding:16, boxShadow:'var(--shadow-xl)', zIndex:100, animation:'slideUp 150ms ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontWeight:700, fontSize:14 }}>📊 Create Poll</span>
        <button onClick={onClose} className="ibtn" style={{ width:24, height:24 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
      </div>
      <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a question…" className="input" style={{ marginBottom:10, fontSize:13 }}/>
      {answers.map((a,i)=>(
        <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
          <input value={a} onChange={e=>setAnswers(arr=>arr.map((x,j)=>j===i?e.target.value:x))} placeholder={`Option ${i+1}`} className="input" style={{ flex:1, fontSize:13, padding:'7px 10px' }}/>
          {answers.length > 2 && <button onClick={()=>setAnswers(arr=>arr.filter((_,j)=>j!==i))} className="ibtn" style={{ color:'var(--dnd)', flexShrink:0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>}
        </div>
      ))}
      {answers.length < 10 && <button onClick={()=>setAnswers(a=>[...a,''])} style={{ fontSize:12, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', marginBottom:10, fontFamily:'var(--font-ui)' }}>+ Add option</button>}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'var(--text-300)' }}>
          <input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} style={{ accentColor:'var(--brand)' }}/> Anonymous voting
        </label>
      </div>
      <button onClick={()=>{ if(!question.trim()||answers.filter(Boolean).length<2) return toast.error('Need question and 2+ options'); onSubmit(question, answers.filter(Boolean), {anonymous:anon}); }} className="btn-primary" style={{ width:'100%', padding:'9px', fontSize:13 }}>Send Poll</button>
    </div>
  );
}

// ── Format Toolbar ─────────────────────────────────────────
function FormatBar({ onFormat }) {
  const FMTS = [
    { l:'B', b:'**', a:'**', s:{fontWeight:'bold'} },
    { l:'I', b:'_', a:'_', s:{fontStyle:'italic'} },
    { l:'U', b:'__', a:'__', s:{textDecoration:'underline'} },
    { l:'S', b:'~~', a:'~~', s:{textDecoration:'line-through'} },
    { l:'`', b:'`', a:'`', s:{fontFamily:'monospace'} },
    { l:'||', b:'||', a:'||', s:{} },
  ];
  return (
    <div style={{ display:'flex', gap:1, padding:'4px 8px', borderBottom:'1px solid var(--border-100)', background:'var(--bg-300)' }}>
      {FMTS.map(f=>(
        <button key={f.l} onClick={()=>onFormat(f.b,f.a)} style={{ padding:'3px 7px', fontSize:12, background:'none', border:'none', cursor:'pointer', color:'var(--text-300)', borderRadius:'var(--r-sm)', fontFamily:f.l==='`'?'monospace':'inherit', transition:'all var(--ease-fast)', ...f.s }}
          onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-hover)';e.currentTarget.style.color='var(--text-000)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--text-300)';}}>
          {f.l}
        </button>
      ))}
    </div>
  );
}

// ── Main Input ─────────────────────────────────────────────
export default function MessageInput({ dialog }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(null); // 'emoji'|'gif'|'sticker'|'poll'
  const [showFormat, setShowFormat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [drag, setDrag] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const mediaRef = useRef(null);
  const typingTimer = useRef(null);
  const { sendMessage, sendFile, setTyping, editMessage, createPoll } = useTelegram();
  const { replyingTo, editingMsg, setReplyingTo, setEditingMsg, selectedDialog } = useStore();
  const name = dialog ? getDialogName(dialog) : 'message';

  // Pre-fill edit text
  useEffect(() => {
    if (editingMsg) { setText(editingMsg.message||''); taRef.current?.focus(); }
  }, [editingMsg]);

  // Auto-resize
  useEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height='auto';
    ta.style.height=Math.min(ta.scrollHeight, 200)+'px';
  }, [text]);

  // Close pickers on outside click
  useEffect(() => {
    if (!picker) return;
    const h = (e) => { if (!e.target.closest('[data-picker-area]')) setPicker(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [picker]);

  async function doSend() {
    const t = text.trim(); if (!t || sending) return;
    setSending(true);
    const entity = dialog?.entity || dialog?.inputEntity;
    try {
      if (editingMsg) {
        await editMessage(entity, editingMsg.id, t);
        setEditingMsg(null);
      } else {
        await sendMessage(entity, {
          message: t,
          ...(replyingTo ? { replyTo: replyingTo.id } : {}),
        });
        setReplyingTo(null);
      }
      setText('');
      if (taRef.current) taRef.current.style.height='auto';
    } catch (e) { toast.error(e.message||'Send failed'); }
    finally { setSending(false); }
  }

  function handleKey(e) {
    if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); doSend(); }
    if (e.key==='Escape') { setReplyingTo(null); setEditingMsg(null); setText(''); }
  }

  function insertAt(str) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const n = text.slice(0,s) + str + text.slice(e);
    setText(n);
    requestAnimationFrame(()=>{ ta.selectionStart=ta.selectionEnd=s+str.length; ta.focus(); });
  }

  function wrapSelection(b, a) {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = text.slice(s,e);
    const n = text.slice(0,s)+b+sel+a+text.slice(e);
    setText(n);
    requestAnimationFrame(()=>{ ta.selectionStart=s+b.length; ta.selectionEnd=e+b.length; ta.focus(); });
  }

  function handleTypingEvent(val) {
    setText(val);
    if (!dialog) return;
    const entity = dialog.entity||dialog.inputEntity;
    clearTimeout(typingTimer.current);
    setTyping(entity, 'typing');
    typingTimer.current = setTimeout(()=>setTyping(entity,'cancel'), 3000);
  }

  async function handleFiles(files) {
    if (!files?.length || !dialog) return;
    const entity = dialog.entity||dialog.inputEntity;
    for (const f of Array.from(files)) {
      const tid = toast.loading(`Uploading ${f.name}…`);
      try {
        await sendFile(entity, { file:f, caption:'', forceDocument: !f.type.startsWith('image/')&&!f.type.startsWith('video/') });
        toast.success('Sent!',{id:tid});
      } catch(e) { toast.error(e.message||'Upload failed',{id:tid}); }
    }
  }

  async function handleGif(url) {
    if (!dialog) return;
    const entity = dialog.entity||dialog.inputEntity;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await sendFile(entity, { file: new File([blob],'gif.gif',{type:'image/gif'}), caption:'' });
    } catch(e) { toast.error('Failed to send GIF'); }
    setPicker(null);
  }

  async function handlePoll(question, answers, opts) {
    if (!dialog) return;
    const entity = dialog.entity||dialog.inputEntity;
    try { await createPoll(entity, question, answers, opts); toast.success('Poll sent!'); setPicker(null); }
    catch(e) { toast.error(e.message||'Poll failed'); }
  }

  const icoBtns = [
    { id:'emoji',   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/></svg> },
    { id:'gif',     icon:<span style={{ fontSize:12, fontWeight:900, letterSpacing:'-0.05em', color:'currentColor' }}>GIF</span> },
    { id:'sticker', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 14.5s1 2 3.5 2 3.5-2 3.5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M15 10c.5-.8 1.5-1 2-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9 10c-.5-.8-1.5-1-2-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { id:'poll',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  ];

  return (
    <div style={{ padding:'10px 16px 14px', position:'relative', flexShrink:0 }} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}>
      {drag && (
        <div style={{ position:'absolute', inset:0, background:'var(--brand-dim)', border:'2px dashed var(--brand)', borderRadius:'var(--r-xl)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--brand)', zIndex:20, pointerEvents:'none' }}>Drop files to send 📎</div>
      )}

      {/* Pickers */}
      <div data-picker-area style={{ position:'relative' }}>
        {picker==='emoji' && <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, zIndex:200 }}><EmojiPicker onPick={e=>{ insertAt(e); setPicker(null); }}/></div>}
        {picker==='gif'   && <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, zIndex:200 }}><GifPicker onPick={handleGif}/></div>}
        {picker==='poll'  && <PollCreator onSubmit={handlePoll} onClose={()=>setPicker(null)}/>}
      </div>

      <div style={{ background:'var(--bg-300)', border:`1px solid ${drag?'var(--brand)':'var(--border-200)'}`, borderRadius:'var(--r-xl)', overflow:'hidden', boxShadow:'var(--shadow-md)', transition:'border-color var(--ease-fast)' }}>
        {showFormat && <FormatBar onFormat={wrapSelection}/>}

        <div style={{ display:'flex', alignItems:'flex-end', padding:'6px 4px 6px 8px', gap:2 }}>
          {/* Attach */}
          <button className="ibtn" title="Attach file" onClick={()=>fileRef.current?.click()} style={{ flexShrink:0, marginBottom:2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="ibtn" title="Media" onClick={()=>mediaRef.current?.click()} style={{ flexShrink:0, marginBottom:2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>
          <input ref={mediaRef} type="file" multiple accept="image/*,video/*" style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>

          {/* Text area */}
          <textarea ref={taRef} value={text} onChange={e=>handleTypingEvent(e.target.value)} onKeyDown={handleKey}
            placeholder={editingMsg ? 'Edit message…' : `Message ${name}…`}
            rows={1}
            style={{ flex:1, background:'none', border:'none', outline:'none', resize:'none', color:'var(--text-100)', fontSize:14, lineHeight:1.55, fontFamily:'var(--font-ui)', maxHeight:200, overflowY:'auto', padding:'6px 4px', scrollbarWidth:'thin' }}
          />

          {/* Right tools */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:1, flexShrink:0, marginBottom:2 }}>
            <button className={`ibtn ${showFormat?'active':''}`} title="Formatting" onClick={()=>setShowFormat(v=>!v)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {icoBtns.map(b => (
              <button key={b.id} className={`ibtn ${picker===b.id?'active':''}`} title={b.id} onClick={()=>setPicker(v=>v===b.id?null:b.id)} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                {b.icon}
              </button>
            ))}

            {/* Send or mic */}
            {text.trim() || editingMsg ? (
              <button onClick={doSend} disabled={sending} style={{ width:34, height:34, background: sending?'var(--bg-400)':'var(--brand)', border:'none', borderRadius:'var(--r-md)', display:'flex', alignItems:'center', justifyContent:'center', cursor:sending?'not-allowed':'pointer', transition:'all var(--ease-spring)', boxShadow: sending?'none':'var(--shadow-brand)', flexShrink:0 }}
                onMouseEnter={e=>{if(!sending)e.currentTarget.style.transform='scale(1.08)';}}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                {sending ? <div className="a-spin" style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%' }}/>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white"/></svg>}
              </button>
            ) : (
              <button className="ibtn" title="Voice message"
                onMouseDown={()=>setIsRecording(true)} onMouseUp={()=>setIsRecording(false)}
                style={{ color:isRecording?'var(--dnd)':undefined }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.8"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Char count for long messages */}
        {text.length > 3000 && (
          <div style={{ textAlign:'right', fontSize:11, padding:'0 12px 4px', color: text.length>4096?'var(--dnd)':'var(--text-muted)' }}>
            {4096-text.length} chars remaining
          </div>
        )}
      </div>
    </div>
  );
}
