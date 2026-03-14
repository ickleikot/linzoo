'use client';
import { useState, useEffect } from 'react';
import { getComments, addComment, deleteComment } from '../../lib/db';
import Avatar from '../ui/Avatar';
import RoleBadge from '../ui/RoleBadge';
import Icon from '../ui/Icon';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function CommentsModal({ linzId, currentUser }) {
  var [comments, setComments] = useState([]);
  var [text, setText] = useState('');
  var [loading, setLoading] = useState(true);
  var [posting, setPosting] = useState(false);
  var isAdmin = currentUser&&(currentUser.role==='admin'||currentUser.role==='superadmin');

  useEffect(function(){
    if (!linzId) return;
    getComments(linzId).then(setComments).catch(function(e){toast.error(e.message);}).finally(function(){setLoading(false);});
  },[linzId]);

  async function post(){
    if (!text.trim()||posting||!currentUser) return;
    setPosting(true);
    try {
      var c = await addComment(linzId, currentUser.id, text.trim());
      setComments(function(prev){return prev.concat([c]);});
      setText('');
    } catch(e){toast.error(e.message);} finally{setPosting(false);}
  }

  async function remove(comment){
    try {
      await deleteComment(comment.id);
      setComments(function(prev){return prev.filter(function(c){return c.id!==comment.id;});});
    } catch(e){toast.error(e.message);}
  }

  return (
    <div>
      <div style={{maxHeight:380,overflowY:'auto',marginBottom:14}}>
        {loading&&<div style={{display:'flex',justifyContent:'center',padding:24}}><div className="spinner"/></div>}
        {!loading&&comments.length===0&&<div style={{textAlign:'center',padding:24,color:'var(--text-3)',fontSize:14}}>No comments yet</div>}
        {comments.map(function(c){
          var authorName=(c.author&&(c.author.full_name||c.author.username))||'User';
          var canDel=currentUser&&(c.author_id===currentUser.id||isAdmin);
          var ago=''; try{ago=formatDistanceToNow(new Date(c.created_at),{addSuffix:true});}catch(e){}
          return (
            <div key={c.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <Avatar name={authorName} size={32} color={c.author&&c.author.avatar_color}/>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{authorName}</span>
                    {c.author&&!c.author.badge_hidden&&<RoleBadge profile={c.author} small/>}
                    <span style={{fontSize:12,color:'var(--text-3)'}}>{ago}</span>
                  </div>
                  {canDel&&<button className="btn-icon" onClick={function(){remove(c);}} style={{width:24,height:24}}><Icon name="trash" size={12} color="var(--danger)"/></button>}
                </div>
                <div style={{fontSize:14,marginTop:3,lineHeight:1.5}}>{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      {currentUser&&(
        <div style={{display:'flex',gap:8}}>
          <input className="input" value={text} onChange={function(e){setText(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')post();}} placeholder="Write a comment…" maxLength={280} style={{flex:1,fontSize:14}}/>
          <button className="btn btn-primary btn-sm" onClick={post} disabled={!text.trim()||posting}>{posting?'…':'Post'}</button>
        </div>
      )}
    </div>
  );
}
