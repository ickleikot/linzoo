'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getProfile } from '../../../lib/auth';
import { getLinzById, toggleLike, getLikedLinzIds, deleteLinz } from '../../../lib/db';
import Avatar from '../../../components/ui/Avatar';
import RoleBadge from '../../../components/ui/RoleBadge';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import CommentsModal from '../../../components/feed/CommentsModal';
import Toast from '../../../components/ui/Toast';
import { useStore } from '../../../lib/store';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function LinzPage() {
  var params = useParams();
  var [me, setMe] = useState(null);
  var [post, setPost] = useState(null);
  var [liked, setLiked] = useState(false);
  var [showComments, setShowComments] = useState(false);
  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var p = await getProfile(res.data.session.user.id);
      setMe(p);
      var [linz,likedSet] = await Promise.all([getLinzById(params.id),getLikedLinzIds(res.data.session.user.id)]);
      setPost(linz); setLiked(likedSet.has(params.id));
    });
  },[]);

  async function like(){
    if (!me||!post) return;
    var wasLiked = liked;
    setLiked(!wasLiked);
    setPost(function(p){return Object.assign({},p,{likes:Math.max(0,p.likes+(wasLiked?-1:1))});});
    await toggleLike(post.id, me.id, wasLiked);
  }

  if (!post) return (
    <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <Toast/><div className="spinner" style={{width:32,height:32}}/>
    </div>
  );

  var author = post.author||{};
  var authorName = author.full_name||author.username||'?';
  var ago=''; try{ago=formatDistanceToNow(new Date(post.created_at),{addSuffix:true});}catch(e){}
  var canDel = me&&(post.author_id===me.id||(me.role==='admin'||me.role==='superadmin'));

  return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <Link href="/feed" style={{color:'var(--brand)',fontWeight:700,textDecoration:'none',fontSize:15}}>← Feed</Link>
        <span style={{fontWeight:800,fontSize:17}}>Post</span>
      </div>
      <div style={{maxWidth:560,margin:'0 auto',padding:16}}>
        <div style={{background:'var(--bg)',borderRadius:14,padding:20,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',gap:12,marginBottom:14}}>
            <Link href={'/u/'+(author.username||'')} style={{flexShrink:0}}>
              <Avatar name={authorName} size={48} color={author.avatar_color}/>
            </Link>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <Link href={'/u/'+(author.username||'')} style={{fontWeight:800,fontSize:16,color:'var(--text-1)',textDecoration:'none'}}>{authorName}</Link>
                {!author.badge_hidden&&<RoleBadge profile={author}/>}
              </div>
              <Link href={'/u/'+(author.username||'')} style={{fontSize:14,color:'var(--text-3)',textDecoration:'none'}}>@{author.username}</Link>
              <div style={{fontSize:13,color:'var(--text-3)'}}>{ago}</div>
            </div>
          </div>
          <div style={{fontSize:18,lineHeight:1.7,marginBottom:18,wordBreak:'break-word'}}>{post.text}</div>
          <div style={{display:'flex',gap:28,paddingTop:14,borderTop:'1px solid var(--border)'}}>
            <Btn onClick={function(){setShowComments(true);}}>
              <Icon name="comment" size={20}/><span>{post.comments||0}</span>
            </Btn>
            <Btn onClick={like}>
              <Icon name="heart" size={20} filled={liked} color={liked?'var(--danger)':'var(--text-3)'}/>
              <span style={{color:liked?'var(--danger)':'var(--text-3)'}}>{post.likes||0}</span>
            </Btn>
            {canDel&&(
              <Btn onClick={async function(){
                await deleteLinz(post.id,me.id,me.role);
                router.push('/feed');
              }}>
                <Icon name="trash" size={20} color="var(--danger)"/>
              </Btn>
            )}
          </div>
        </div>
      </div>
      <Modal open={showComments} onClose={function(){setShowComments(false);}} title="Comments" width={480}>
        <CommentsModal linzId={post.id} currentUser={me}/>
      </Modal>
    </div>
  );
}
function Btn({onClick,children}){
  return <button onClick={onClick} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:15,color:'var(--text-3)',padding:'4px 0'}}>{children}</button>;
}
