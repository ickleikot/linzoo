'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { getFeedPosts, createLinz, deleteLinz, toggleLike, getLikedLinzIds } from '../../lib/db';
import FeedPost from './FeedPost';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

export default function FeedPanel() {
  var user = useStore(function(s){ return s.user; });
  var feedPosts = useStore(function(s){ return s.feedPosts; });
  var setFeedPosts = useStore(function(s){ return s.setFeedPosts; });
  var prependPost = useStore(function(s){ return s.prependPost; });
  var [loading, setLoading] = useState(true);
  var [text, setText] = useState('');
  var [posting, setPosting] = useState(false);
  var [likedIds, setLikedIds] = useState(new Set());

  useEffect(function(){
    if (!user) return;
    Promise.all([getFeedPosts(), getLikedLinzIds(user.id)]).then(function(r){
      setFeedPosts(r[0]||[]);
      setLikedIds(r[1]||new Set());
    }).catch(function(e){toast.error(e.message);}).finally(function(){setLoading(false);});
  },[user]);

  async function post(){
    if (!text.trim()||posting||!user) return;
    setPosting(true);
    try {
      var p = await createLinz(user.id, text.trim());
      prependPost(p);
      setText('');
    } catch(e){toast.error(e.message);} finally{setPosting(false);}
  }

  async function handleLike(linzId){
    if (!user) return;
    var wasLiked = likedIds.has(linzId);
    setLikedIds(function(prev){ var n=new Set(prev); wasLiked?n.delete(linzId):n.add(linzId); return n; });
    setFeedPosts(feedPosts.map(function(p){ return p.id===linzId?Object.assign({},p,{likes:Math.max(0,p.likes+(wasLiked?-1:1))}):p; }));
    try { await toggleLike(linzId, user.id, wasLiked); } catch(e){toast.error(e.message);}
  }

  async function handleDelete(linzId){
    try {
      await deleteLinz(linzId, user.id, user.role);
      setFeedPosts(feedPosts.filter(function(p){ return p.id!==linzId; }));
    } catch(e){toast.error(e.message);}
  }

  var name = user&&(user.full_name||user.username)||'';

  return (
    <div style={{flex:1,overflowY:'auto',maxWidth:600,margin:'0 auto',width:'100%',padding:'0 0 40px'}}>
      {/* Compose box */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg)',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',gap:12}}>
          <Avatar name={name} size={42} color={user&&user.avatar_color}/>
          <div style={{flex:1}}>
            <textarea className="input" placeholder="What's happening?"
              value={text} onChange={function(e){setText(e.target.value);}}
              style={{resize:'none',fontSize:17,padding:'10px 0',minHeight:68,width:'100%',background:'transparent',border:'none',boxShadow:'none',borderRadius:0,lineHeight:1.5}}
              maxLength={280}/>
            <div style={{borderTop:'1px solid var(--border)',paddingTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:text.length>250?'var(--danger)':'var(--text-3)'}}>{280-text.length}</span>
              <button className="btn btn-primary btn-sm" onClick={post} disabled={!text.trim()||posting} style={{minWidth:80}}>
                {posting?'…':'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner" style={{width:28,height:28}}/></div>}
      {!loading&&feedPosts.length===0&&(
        <div style={{textAlign:'center',padding:60,color:'var(--text-3)'}}>
          <div style={{fontSize:40,marginBottom:10}}>🌱</div>
          <div style={{fontWeight:600}}>Nothing here yet. Post something!</div>
        </div>
      )}
      {feedPosts.map(function(post){
        return (
          <FeedPost key={post.id} post={post} currentUser={user}
            liked={likedIds.has(post.id)} onLike={handleLike} onDelete={handleDelete}/>
        );
      })}
    </div>
  );
}
