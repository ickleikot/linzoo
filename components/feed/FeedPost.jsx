'use client';
import { useState } from 'react';
import Link from 'next/link';
import Avatar from '../ui/Avatar';
import RoleBadge from '../ui/RoleBadge';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import CommentsModal from './CommentsModal';
import { createLinz } from '../../lib/db';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function FeedPost({ post, currentUser, liked, onLike, onDelete }) {
  var [showComments, setShowComments] = useState(false);
  var [reposting, setReposting] = useState(false);
  var author = post.author || {};
  var authorName = author.full_name || author.username || 'Unknown';
  var isOwn  = currentUser && post.author_id === currentUser.id;
  var isAdm  = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
  var canDel = isOwn || isAdm;

  var ago = '';
  try { ago = formatDistanceToNow(new Date(post.created_at), { addSuffix:true }); } catch(e){}

  async function repost() {
    if (!currentUser || reposting || isOwn) return;
    setReposting(true);
    try {
      await createLinz(currentUser.id, '↩ ' + post.text, post.id);
      toast.success('Reposted!');
    } catch(e){ toast.error(e.message); } finally { setReposting(false); }
  }

  return (
    <div style={{ borderBottom:'1px solid var(--border)', padding:'14px 16px', background:'var(--bg)' }}>
      {post.shared_linz_id && (
        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
          <Icon name="repost" size={12} color="var(--text-3)" /> Reposted
        </div>
      )}
      <div style={{ display:'flex', gap:10 }}>
        <Link href={'/u/'+(author.username||'')} style={{ flexShrink:0 }}>
          <Avatar name={authorName} size={42} color={author.avatar_color} />
        </Link>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
            <Link href={'/u/'+(author.username||'')} style={{ fontWeight:700, fontSize:15, color:'var(--text-1)', textDecoration:'none' }}>{authorName}</Link>
            <Link href={'/u/'+(author.username||'')} style={{ fontSize:13, color:'var(--text-3)', textDecoration:'none' }}>@{author.username}</Link>
            {!author.badge_hidden && <RoleBadge profile={author} small />}
            <span style={{ fontSize:12, color:'var(--text-3)' }}>· {ago}</span>
          </div>

          <Link href={'/linz/'+post.id} style={{ textDecoration:'none', display:'block' }}>
            <div style={{ fontSize:15, lineHeight:1.6, color:'var(--text-1)', marginBottom:8, wordBreak:'break-word' }}>{post.text}</div>
          </Link>

          {post.shared_linz && (
            <div style={{ border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', marginBottom:10, background:'var(--bg-input)' }}>
              <div style={{ fontSize:12, color:'var(--brand)', fontWeight:700, marginBottom:3 }}>@{post.shared_linz.author&&post.shared_linz.author.username}</div>
              <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.5 }}>{post.shared_linz.text}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:18 }}>
            <ActionBtn icon="comment" count={post.comments||0} onClick={function(){setShowComments(true);}} />
            <ActionBtn icon="repost" count={post.reposts||0} onClick={repost} disabled={isOwn||reposting} color={reposting?'var(--success)':null} />
            <ActionBtn icon="heart" count={post.likes||0} onClick={function(){onLike&&onLike(post.id);}} filled={liked} activeColor="var(--danger)" />
            {canDel && (
              <ActionBtn icon="trash" onClick={function(){onDelete&&onDelete(post.id);}} activeColor="var(--danger)" />
            )}
          </div>
        </div>
      </div>

      <Modal open={showComments} onClose={function(){setShowComments(false);}} title="Comments" width={480}>
        <CommentsModal linzId={post.id} currentUser={currentUser} />
      </Modal>
    </div>
  );
}

function ActionBtn({ icon, count, onClick, disabled, filled, activeColor, color }) {
  var [hover, setHover] = useState(false);
  var c = hover && activeColor ? activeColor : color || 'var(--text-3)';
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={function(){setHover(true);}} onMouseLeave={function(){setHover(false);}}
      style={{ background:'none', border:'none', cursor:disabled?'default':'pointer', display:'flex', alignItems:'center', gap:4, padding:'4px 6px', borderRadius:8, opacity:disabled?0.4:1 }}>
      <Icon name={icon} size={17} filled={filled} color={c} />
      {count !== undefined && <span style={{ fontSize:13, color:c }}>{count}</span>}
    </button>
  );
}
