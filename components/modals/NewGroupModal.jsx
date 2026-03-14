'use client';
import { useState } from 'react';
import { useStore } from '../../lib/store';
import { createGroup } from '../../lib/db';
import toast from 'react-hot-toast';

export default function NewGroupModal({ onClose, onCreated }) {
  var user = useStore(function(s){ return s.user; });
  var [name, setName] = useState('');
  var [desc, setDesc] = useState('');
  var [type, setType] = useState('private');
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(null); // holds created group data to show code

  async function create() {
    if (!name.trim() || !user) { toast.error('Enter a group name'); return; }
    setLoading(true);
    try {
      var g = await createGroup(name.trim(), desc.trim(), user.id, type === 'private');
      setDone(g);
      if (onCreated) onCreated(g);
      if (type === 'public') {
        toast.success('Group request submitted! Awaiting admin approval.');
      }
    } catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  var baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://linzoo-eight.vercel.app';

  if (done) {
    return (
      <div>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:17 }}>Group Created!</div>
          <div style={{ fontSize:14, color:'var(--text-2)', marginTop:4 }}>{done.name}</div>
        </div>
        {type === 'private' && (
          <div style={{ background:'var(--brand-dim)', borderRadius:12, padding:'16px', marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:6 }}>Join Code</div>
            <div style={{ fontWeight:900, fontSize:34, letterSpacing:6, color:'var(--brand)', marginBottom:10 }}>{done.group_code}</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:8 }}>Share this link:</div>
            <div style={{ fontSize:12, color:'var(--brand)', wordBreak:'break-all', marginBottom:10 }}>{baseUrl+'/join/'+done.group_code}</div>
            <button className="btn btn-outline btn-sm" onClick={function(){
              navigator.clipboard.writeText(baseUrl+'/join/'+done.group_code).then(function(){toast.success('Copied!');});
            }}>Copy Link</button>
          </div>
        )}
        {type === 'public' && (
          <div style={{ background:'#f97316',padding:'12px 16px',borderRadius:10,marginBottom:16,color:'#fff',fontSize:14 }}>
            ⏳ Pending admin approval. You'll get a notification once approved.
          </div>
        )}
        <button className="btn btn-primary" style={{ width:'100%' }} onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <label style={L}>Group Name</label>
        <input className="input" placeholder="My Awesome Group" value={name} onChange={function(e){setName(e.target.value);}} style={{ fontSize:15 }} maxLength={60} autoFocus />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={L}>Description <span style={{ fontWeight:400,color:'var(--text-3)' }}>(optional)</span></label>
        <input className="input" placeholder="What is this group about?" value={desc} onChange={function(e){setDesc(e.target.value);}} style={{ fontSize:14 }} maxLength={200} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {[
          { val:'private', label:'Private', sub:'Instant, invite only' },
          { val:'public',  label:'Public',  sub:'Admin approval needed' },
        ].map(function(opt){
          var sel = type===opt.val;
          return (
            <button key={opt.val} onClick={function(){setType(opt.val);}} style={{ padding:'12px', borderRadius:12, border:'2px solid '+(sel?'var(--brand)':'var(--border)'), background:sel?'var(--brand-dim)':'transparent', cursor:'pointer', textAlign:'center' }}>
              <div style={{ fontWeight:700, color:sel?'var(--brand)':'var(--text-1)', fontSize:15 }}>{opt.label}</div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{opt.sub}</div>
            </button>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ width:'100%' }} onClick={create} disabled={!name.trim()||loading}>
        {loading?'Creating…':'Create Group'}
      </button>
    </div>
  );
}
var L = { display:'block', fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6 };
