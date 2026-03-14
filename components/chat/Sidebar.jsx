'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { getConversations, createDM, invalidateConversations } from '../../lib/db';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import NewDMModal from '../modals/NewDMModal';
import toast from 'react-hot-toast';

export default function Sidebar() {
  var user = useStore(function(s){ return s.user; });
  var activeChat = useStore(function(s){ return s.activeChat; });
  var setActiveChat = useStore(function(s){ return s.setActiveChat; });
  var conversations = useStore(function(s){ return s.conversations; });
  var setConversations = useStore(function(s){ return s.setConversations; });
  var [loading, setLoading] = useState(true);
  var [showNew, setShowNew] = useState(false);
  var [search, setSearch] = useState('');

  useEffect(function() {
    if (!user) return;
    getConversations(user.id).then(function(c) {
      setConversations(c || []);
    }).catch(function(e){ toast.error(e.message); }).finally(function(){ setLoading(false); });
  }, [user]);

  var filtered = conversations.filter(function(c) {
    if (!search.trim()) return true;
    var name = (c.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  }).filter(function(c){ return c.type === 'dm'; }); // Sidebar only shows DMs

  async function openDM(partnerId, partnerName) {
    if (!user) return;
    try {
      var dm = await createDM(user.id, partnerId);
      invalidateConversations(user.id);
      setActiveChat({ id:dm.id, name:partnerName, type:'dm', dmPartnerId:partnerId });
      getConversations(user.id).then(setConversations);
      setShowNew(false);
    } catch(e){ toast.error(e.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      <div style={{ padding:'12px 14px 8px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontWeight:800, fontSize:17 }}>Messages</span>
          <button className="btn-icon" onClick={function(){setShowNew(true);}} title="New DM">
            <Icon name="pencil" size={18} />
          </button>
        </div>
        <input className="input" placeholder="Search conversations…" value={search}
          onChange={function(e){setSearch(e.target.value);}}
          style={{ fontSize:14, padding:'7px 12px', width:'100%', boxSizing:'border-box' }} />
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div className="spinner" /></div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:48, color:'var(--text-3)', fontSize:14 }}>
            No conversations yet.<br />Start a DM!
          </div>
        )}
        {filtered.map(function(c) {
          var isActive = activeChat && activeChat.id === c.id;
          var name = c.name || 'User';
          return (
            <div key={c.id} onClick={function(){
              setActiveChat({ id:c.id, name:c.name, type:'dm', dmPartnerId:c.dmPartnerId, dm_pair:c.dm_pair, created_by:c.created_by });
            }} style={{ display:'flex', gap:10, padding:'10px 14px', cursor:'pointer', alignItems:'center', background:isActive?'var(--brand-dim)':'transparent', borderLeft:isActive?'3px solid var(--brand)':'3px solid transparent' }}>
              <Avatar name={name} size={40} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>Direct message</div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showNew} onClose={function(){setShowNew(false);}} title="New Message" width={400}>
        <NewDMModal onClose={function(){setShowNew(false);}} onSelect={openDM} currentUserId={user&&user.id} />
      </Modal>
    </div>
  );
}
