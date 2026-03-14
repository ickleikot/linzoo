'use client';
import { useState } from 'react';
import { searchUsers } from '../../lib/db';
import Avatar from '../ui/Avatar';

export default function NewDMModal({ onClose, onSelect, currentUserId }) {
  var [q, setQ] = useState('');
  var [results, setResults] = useState([]);
  var [searching, setSearching] = useState(false);
  var timer = null;

  function search(val) {
    setQ(val);
    if (timer) clearTimeout(timer);
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    timer = setTimeout(async function() {
      var r = await searchUsers(val.trim());
      setResults((r||[]).filter(function(u){ return u.id !== currentUserId; }));
      setSearching(false);
    }, 300);
  }

  return (
    <div>
      <input className="input" placeholder="Search by username…" value={q}
        onChange={function(e){search(e.target.value);}} autoFocus style={{ marginBottom:12, fontSize:14 }} />
      {searching && <div style={{ textAlign:'center', padding:12, color:'var(--text-3)' }}>Searching…</div>}
      {results.map(function(u) {
        return (
          <div key={u.id} onClick={function(){ onSelect(u.id, u.full_name||u.username); }}
            style={{ display:'flex', gap:10, padding:'10px 0', cursor:'pointer', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
            <Avatar name={u.full_name||u.username} size={36} />
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{u.full_name||u.username}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>@{u.username}</div>
            </div>
          </div>
        );
      })}
      {!searching && q && results.length === 0 && (
        <div style={{ textAlign:'center', padding:20, color:'var(--text-3)', fontSize:14 }}>No users found</div>
      )}
    </div>
  );
}
