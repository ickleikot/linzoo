import { supabase } from './supabase';
import { cacheSet, cacheGet, cacheDel } from './cache';

// ── PROFILE ────────────────────────────────────────────
export async function ensureProfileExists(userId, username, fullName) {
  var check = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (check.data) return;
  var uname = (username || '').toLowerCase().trim();
  var role  = uname === 'ickleikot' ? 'superadmin' : 'member';
  await supabase.from('profiles').insert({ id: userId, username: uname, full_name: fullName || uname, role });
}

// ── CONVERSATIONS ──────────────────────────────────────
export async function getConversations(userId) {
  var cacheKey = 'convs_' + userId;
  var doFetch = async function() {
    var res = await supabase.from('chat_members')
      .select('chat_id, chats(id,name,type,created_at,dm_pair,group_status,is_private,is_universal,group_code,created_by)')
      .eq('user_id', userId);
    if (res.error) throw res.error;
    var seen = new Set(), chats = [];
    for (var r of (res.data || [])) {
      if (r.chats && !seen.has(r.chats.id)) {
        seen.add(r.chats.id); chats.push(r.chats);
      }
    }
    var resolved = await Promise.all(chats.map(async function(chat) {
      if (chat.type !== 'dm' || !chat.dm_pair) return chat;
      var otherId = chat.dm_pair.find(function(id){ return id !== userId; });
      if (!otherId) return chat;
      var pRes = await supabase.from('profiles').select('id,full_name,username,avatar_color').eq('id', otherId).maybeSingle();
      return Object.assign({}, chat, {
        name: pRes.data && (pRes.data.full_name || pRes.data.username) || 'User',
        dmPartnerId: otherId, dmPartner: pRes.data,
      });
    }));
    cacheSet(cacheKey, resolved, 60);
    return resolved;
  };
  var cached = cacheGet(cacheKey);
  if (cached) { doFetch().catch(function(){}); return cached; }
  return doFetch();
}
export function invalidateConversations(userId) { cacheDel('convs_' + userId); }

export async function createDM(userIdA, userIdB) {
  var memberRes = await supabase.from('chat_members').select('chat_id').eq('user_id', userIdA);
  if (memberRes.data && memberRes.data.length > 0) {
    var ids = memberRes.data.map(function(r){ return r.chat_id; });
    var exist = await supabase.from('chats').select('id').eq('type','dm').in('id',ids).contains('dm_pair',[userIdB]).maybeSingle();
    if (exist.data) return exist.data;
  }
  var res = await supabase.from('chats').insert({ type:'dm', dm_pair:[userIdA,userIdB] }).select().single();
  if (res.error) throw res.error;
  await supabase.from('chat_members').insert([
    { chat_id:res.data.id, user_id:userIdA },
    { chat_id:res.data.id, user_id:userIdB },
  ]);
  invalidateConversations(userIdA);
  return res.data;
}

// ── MESSAGES ──────────────────────────────────────────
// FIX: self-referential join not supported in PostgREST
// Fetch reply messages separately
export async function getMessages(chatId) {
  var res = await supabase.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .eq('chat_id', chatId).is('deleted_at', null)
    .order('created_at', { ascending:true }).limit(150);
  if (res.error) throw res.error;
  var msgs = res.data || [];

  // Fetch reply messages separately
  var replyIds = msgs.filter(function(m){ return m.reply_to; }).map(function(m){ return m.reply_to; });
  if (replyIds.length > 0) {
    var rRes = await supabase.from('messages')
      .select('id,text,sender:profiles!messages_sender_id_fkey(username,full_name)')
      .in('id', replyIds);
    if (rRes.data) {
      var rMap = {};
      rRes.data.forEach(function(r){ rMap[r.id] = r; });
      msgs = msgs.map(function(m){ return m.reply_to ? Object.assign({}, m, { reply_msg: rMap[m.reply_to] }) : m; });
    }
  }
  return msgs;
}

export async function sendMessage(chatId, senderId, text, replyTo) {
  var res = await supabase.from('messages')
    .insert({ chat_id:chatId, sender_id:senderId, text, reply_to:replyTo||null })
    .select('*, sender:profiles!messages_sender_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .single();
  if (res.error) throw res.error;
  // Fetch reply separately if needed
  if (res.data.reply_to) {
    var rRes = await supabase.from('messages')
      .select('id,text,sender:profiles!messages_sender_id_fkey(username,full_name)')
      .eq('id', res.data.reply_to).maybeSingle();
    if (rRes.data) res.data.reply_msg = rRes.data;
  }
  return res.data;
}

export async function editMessage(msgId, userId, text) {
  var res = await supabase.from('messages').update({ text, edited:true }).eq('id',msgId).eq('sender_id',userId);
  if (res.error) throw res.error;
}

export async function deleteMessage(msgId, userId) {
  var res = await supabase.from('messages').update({ deleted_at:new Date().toISOString() }).eq('id',msgId).eq('sender_id',userId);
  if (res.error) throw res.error;
}

export async function adminDeleteMessage(msgId) {
  var res = await supabase.from('messages').update({ text:'[deleted by admin]', deleted_at:new Date().toISOString() }).eq('id',msgId);
  if (res.error) throw res.error;
}

export async function markRead(chatId, userId) {
  await supabase.from('messages').update({ msg_status:'read' })
    .eq('chat_id',chatId).neq('sender_id',userId).neq('msg_status','read');
}

export async function leaveChat(chatId, userId) {
  await supabase.from('chat_members').delete().eq('chat_id',chatId).eq('user_id',userId);
  invalidateConversations(userId);
}

export async function deleteGroupAsAdmin(chatId, userId) {
  var chatRes = await supabase.from('chats').select('created_by,is_universal').eq('id',chatId).single();
  if (chatRes.error) throw chatRes.error;
  if (chatRes.data.is_universal) throw new Error('Cannot delete the General group');
  var profileRes = await supabase.from('profiles').select('role').eq('id',userId).single();
  var role = profileRes.data && profileRes.data.role;
  if (chatRes.data.created_by !== userId && role !== 'admin' && role !== 'superadmin') throw new Error('Not authorized');
  await supabase.from('chats').delete().eq('id',chatId);
}

export async function removeGroupMember(chatId, memberId, byUserId) {
  var res = await supabase.from('chat_members').delete().eq('chat_id',chatId).eq('user_id',memberId);
  if (res.error) throw res.error;
}

export async function downloadChat(chatId, chatName, fromDate, toDate) {
  var query = supabase.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(username,full_name)')
    .eq('chat_id',chatId).is('deleted_at',null).order('created_at',{ascending:true});
  if (fromDate) query = query.gte('created_at',fromDate);
  if (toDate)   query = query.lte('created_at',toDate);
  var res = await query;
  if (res.error) throw res.error;
  var rows = (res.data||[]).map(function(m){
    var name = (m.sender&&(m.sender.full_name||m.sender.username))||'Unknown';
    var txt  = (m.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return '<div style="margin-bottom:10px;padding:9px 12px;border:1px solid #eee;border-radius:8px"><b>'+name+'</b> <small style="color:#888">'+new Date(m.created_at).toLocaleString()+'</small><br>'+txt+'</div>';
  }).join('');
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+chatName+'</title></head><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 16px"><h2>'+chatName+'</h2>'+rows+'</body></html>';
  var blob = new Blob([html],{type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='linzoo-'+chatName+'-'+Date.now()+'.html'; a.click(); URL.revokeObjectURL(url);
}

// ── GROUPS ────────────────────────────────────────────
function randomCode(){ return Math.random().toString(36).substring(2,8).toUpperCase(); }

export async function getGroups() {
  var cached = cacheGet('public_groups');
  if (cached) return cached;
  var res = await supabase.from('chats').select('*')
    .eq('type','group').eq('group_status','active').eq('is_private',false)
    .order('is_universal',{ascending:false}).order('created_at',{ascending:true});
  if (res.error) throw res.error;
  cacheSet('public_groups',res.data,120);
  return res.data;
}

export async function getGroupMembers(chatId) {
  var res = await supabase.from('chat_members')
    .select('*, profile:profiles!chat_members_user_id_fkey(id,username,full_name,role,avatar_color,badge_name,badge_color)')
    .eq('chat_id',chatId);
  return res.data||[];
}

export async function createGroup(name, desc, creatorId, isPrivate) {
  var code = randomCode();
  var status = isPrivate ? 'active' : 'pending';
  if (isPrivate) {
    var pRes = await supabase.from('profiles').select('private_group_limit').eq('id',creatorId).single();
    var limit = (pRes.data&&pRes.data.private_group_limit)||2;
    var cntRes = await supabase.from('chats').select('id',{count:'exact',head:true}).eq('type','group').eq('is_private',true).eq('created_by',creatorId);
    if ((cntRes.count||0) >= limit) throw new Error('Limit: max '+limit+' private groups');
  }
  var res = await supabase.from('chats').insert({
    type:'group', name, description:desc||'', created_by:creatorId,
    is_private:!!isPrivate, group_status:status, group_code:code,
  }).select().single();
  if (res.error) throw new Error(res.error.message);
  await supabase.from('chat_members').insert({ chat_id:res.data.id, user_id:creatorId, role:'admin' });
  cacheDel('public_groups');
  invalidateConversations(creatorId);
  return res.data;
}

export async function joinGroup(chatId, userId) {
  var exist = await supabase.from('chat_members').select('chat_id').eq('chat_id',chatId).eq('user_id',userId).maybeSingle();
  if (exist.data) return;
  var res = await supabase.from('chat_members').insert({ chat_id:chatId, user_id:userId });
  if (res.error) throw new Error(res.error.message);
  invalidateConversations(userId);
}

export async function joinGroupByCode(code, userId) {
  var res = await supabase.from('chats').select('*').eq('group_code',code.toUpperCase()).eq('group_status','active').maybeSingle();
  if (!res.data) throw new Error('Invalid or inactive group code');
  await joinGroup(res.data.id, userId);
  return res.data;
}

// ── FEED ──────────────────────────────────────────────
export async function getFeedPosts(forceRefresh) {
  if (!forceRefresh) {
    var cached = cacheGet('feed');
    if (cached) return cached;
  }
  var res = await supabase.from('linzes')
    .select('*, author:profiles!linzes_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .is('deleted_at',null).order('created_at',{ascending:false}).limit(50);
  if (res.error) throw res.error;
  var posts = await Promise.all((res.data||[]).map(async function(p) {
    if (!p.shared_linz_id) return p;
    var s = await supabase.from('linzes')
      .select('id,text,author:profiles!linzes_author_id_fkey(username,full_name)')
      .eq('id',p.shared_linz_id).maybeSingle();
    return Object.assign({},p,{shared_linz:s.data});
  }));
  cacheSet('feed',posts,90);
  return posts;
}

export async function getUserLinzes(userId) {
  var res = await supabase.from('linzes')
    .select('*, author:profiles!linzes_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .eq('author_id',userId).is('deleted_at',null).order('created_at',{ascending:false});
  if (res.error) throw res.error;
  return res.data;
}

export async function getLinzById(id) {
  var res = await supabase.from('linzes')
    .select('*, author:profiles!linzes_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .eq('id',id).single();
  if (res.error) throw res.error;
  return res.data;
}

export async function createLinz(authorId, text, sharedLinzId) {
  var res = await supabase.from('linzes')
    .insert({ author_id:authorId, text, shared_linz_id:sharedLinzId||null })
    .select('*, author:profiles!linzes_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color,badge_hidden,role)')
    .single();
  if (res.error) throw res.error;
  if (sharedLinzId) await supabase.rpc('increment_reposts',{p_linz_id:sharedLinzId,p_delta:1});
  cacheDel('feed');
  return res.data;
}

export async function deleteLinz(linzId, userId, role) {
  var isAdmin = role==='admin'||role==='superadmin';
  var q = supabase.from('linzes').update({ deleted_at:new Date().toISOString() }).eq('id',linzId);
  if (!isAdmin) q = q.eq('author_id',userId);
  var res = await q;
  if (res.error) throw res.error;
  cacheDel('feed');
}

export async function getLikedLinzIds(userId) {
  var cached = cacheGet('liked_'+userId);
  if (cached) return new Set(cached);
  var res = await supabase.from('linz_likes').select('linz_id').eq('user_id',userId);
  var ids = (res.data||[]).map(function(r){return r.linz_id;});
  cacheSet('liked_'+userId,ids,300);
  return new Set(ids);
}

export async function toggleLike(linzId, userId, liked) {
  if (liked) {
    await supabase.from('linz_likes').delete().eq('linz_id',linzId).eq('user_id',userId);
    await supabase.rpc('increment_likes',{p_linz_id:linzId,p_delta:-1});
  } else {
    await supabase.from('linz_likes').insert({linz_id:linzId,user_id:userId});
    await supabase.rpc('increment_likes',{p_linz_id:linzId,p_delta:1});
  }
  cacheDel('liked_'+userId);
  return !liked;
}

// ── COMMENTS ──────────────────────────────────────────
export async function getComments(linzId) {
  var res = await supabase.from('linz_comments')
    .select('*, author:profiles!linz_comments_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color)')
    .eq('linz_id',linzId).order('created_at',{ascending:true});
  if (res.error) throw res.error;
  return res.data||[];
}

export async function addComment(linzId, authorId, text) {
  var res = await supabase.from('linz_comments')
    .insert({linz_id:linzId,author_id:authorId,text})
    .select('*, author:profiles!linz_comments_author_id_fkey(id,username,full_name,avatar_color,badge_name,badge_color)')
    .single();
  if (res.error) throw res.error;
  await supabase.rpc('increment_comments',{p_linz_id:linzId,p_delta:1});
  return res.data;
}

export async function deleteComment(commentId) {
  var res = await supabase.from('linz_comments').delete().eq('id',commentId);
  if (res.error) throw res.error;
}

// ── CONNECTIONS ───────────────────────────────────────
export async function getConnectionStatus(fromId, toId) {
  var res = await supabase.from('connections').select('*')
    .or('and(from_id.eq.'+fromId+',to_id.eq.'+toId+'),and(from_id.eq.'+toId+',to_id.eq.'+fromId+')')
    .maybeSingle();
  // If declined, treat as non-existent (allow re-request)
  if (res.data && res.data.status === 'declined') return null;
  return res.data;
}

export async function sendConnectionRequest(fromId, toId) {
  // Delete any previous declined record first
  await supabase.from('connections').delete()
    .or('and(from_id.eq.'+fromId+',to_id.eq.'+toId+'),and(from_id.eq.'+toId+',to_id.eq.'+fromId+')')
    .eq('status','declined');
  var res = await supabase.from('connections').insert({from_id:fromId,to_id:toId}).select().single();
  if (res.error) throw new Error(res.error.message);
  await supabase.from('notifications').insert({
    user_id:toId, type:'connection_request', from_id:fromId, ref_id:res.data.id
  });
  return res.data;
}

export async function respondToConnection(connId, status) {
  var res = await supabase.from('connections').update({status}).eq('id',connId).select().single();
  if (res.error) throw res.error;
  await supabase.from('notifications').update({resolved:true}).eq('ref_id',connId).eq('type','connection_request');
  if (status==='accepted' && res.data) {
    await supabase.from('notifications').insert({
      user_id:res.data.from_id, type:'connection_accepted', from_id:res.data.to_id, ref_id:connId
    });
  }
}

export async function removeConnection(fromId, toId) {
  await supabase.from('connections').delete()
    .or('and(from_id.eq.'+fromId+',to_id.eq.'+toId+'),and(from_id.eq.'+toId+',to_id.eq.'+fromId+')');
}

export async function getUserConnections(userId) {
  var res = await supabase.from('connections')
    .select('*, from:profiles!connections_from_id_fkey(id,username,full_name,avatar_color), to:profiles!connections_to_id_fkey(id,username,full_name,avatar_color)')
    .or('from_id.eq.'+userId+',to_id.eq.'+userId).eq('status','accepted');
  return res.data||[];
}

// ── BLOCKS ────────────────────────────────────────────
export async function blockUser(bId,blId){await supabase.from('blocks').insert({blocker_id:bId,blocked_id:blId});}
export async function unblockUser(bId,blId){await supabase.from('blocks').delete().eq('blocker_id',bId).eq('blocked_id',blId);}
export async function getBlockedIds(userId){
  var res=await supabase.from('blocks').select('blocked_id').eq('blocker_id',userId);
  return new Set((res.data||[]).map(function(r){return r.blocked_id;}));
}

// ── NOTIFICATIONS ─────────────────────────────────────
export async function getNotifications(userId) {
  var res = await supabase.from('notifications')
    .select('*, from:profiles!notifications_from_id_fkey(id,username,full_name,avatar_color)')
    .eq('user_id',userId).order('created_at',{ascending:false}).limit(60);
  return res.data||[];
}

export async function getUnreadNotifCount(userId) {
  var res = await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('read',false);
  return res.count||0;
}

export async function markAllNotifsRead(userId) {
  await supabase.from('notifications').update({read:true}).eq('user_id',userId).eq('read',false);
}

// ── NOTICES ───────────────────────────────────────────
export async function getNotices(userId) {
  var res = await supabase.from('notices')
    .select('*, from:profiles!notices_from_id_fkey(username,full_name)')
    .or('to_id.is.null,to_id.eq.'+userId)
    .order('created_at',{ascending:false}).limit(30);
  return res.data||[];
}

export async function sendNotice(fromId, toId, title, body) {
  var res = await supabase.from('notices').insert({ from_id:fromId, to_id:toId||null, title, body });
  if (res.error) throw res.error;
  if (toId) {
    await supabase.from('notifications').insert({ user_id:toId, type:'notice', from_id:fromId });
  }
}

export async function deleteNotice(id) {
  await supabase.from('notices').delete().eq('id',id);
}

// ── REPORTS ───────────────────────────────────────────
export async function sendReport(fromId, subject, body) {
  var res = await supabase.from('reports').insert({ from_id:fromId, subject, body });
  if (res.error) throw res.error;
}

export async function getReports() {
  var res = await supabase.from('reports')
    .select('*, from:profiles!reports_from_id_fkey(username,full_name)')
    .order('created_at',{ascending:false});
  return res.data||[];
}

export async function markReportRead(id) {
  await supabase.from('reports').update({read:true}).eq('id',id);
}

// ── SEARCH ────────────────────────────────────────────
export async function searchUsers(query) {
  var res = await supabase.from('profiles').select('id,username,full_name,role,avatar_color,badge_name,badge_color').ilike('username','%'+query+'%').limit(10);
  return res.data||[];
}

// ── ADMIN ─────────────────────────────────────────────
export async function getAllUsers() {
  var res = await supabase.from('profiles').select('*').order('created_at');
  return res.data||[];
}

export async function updateUserRole(userId, role) {
  await supabase.from('profiles').update({role}).eq('id',userId);
}

export async function updateUserProfile(userId, updates) {
  var res = await supabase.from('profiles').update(updates).eq('id',userId);
  if (res.error) throw res.error;
}

export async function banUser(userId, banned, bannedUntil) {
  await supabase.from('profiles').update({ banned, banned_until:bannedUntil||null }).eq('id',userId);
}

export async function setGroupLimit(userId, limit) {
  await supabase.from('profiles').update({private_group_limit:limit}).eq('id',userId);
}

export async function getUserGroupMemberships(userId) {
  var res = await supabase.from('chat_members')
    .select('role, chats!chat_members_chat_id_fkey(id,name,type,is_private,group_code)')
    .eq('user_id', userId);
  return res.data||[];
}

export async function getUserConnectionList(userId) {
  return getUserConnections(userId);
}

export async function getPendingGroups() {
  var res = await supabase.from('chats')
    .select('*, creator:profiles!chats_created_by_fkey(username,full_name)')
    .eq('type','group').eq('group_status','pending').order('created_at');
  return res.data||[];
}

export async function approveGroup(chatId, creatorId) {
  await supabase.from('chats').update({group_status:'active'}).eq('id',chatId);
  cacheDel('public_groups');
  if (creatorId) {
    await supabase.from('notifications').insert({ user_id:creatorId, type:'group_approved', ref_id:chatId });
  }
}

export async function rejectGroup(chatId, creatorId) {
  await supabase.from('chats').update({group_status:'rejected'}).eq('id',chatId);
  if (creatorId) {
    await supabase.from('notifications').insert({ user_id:creatorId, type:'group_rejected', ref_id:chatId });
  }
}

export async function getGroupHistory(chatId) {
  var res = await supabase.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(username,full_name)')
    .eq('chat_id',chatId).is('deleted_at',null).order('created_at',{ascending:true});
  return res.data||[];
}

export async function getAllGroups() {
  var res = await supabase.from('chats').select('*, creator:profiles!chats_created_by_fkey(username,full_name)')
    .eq('type','group').order('created_at');
  return res.data||[];
}

export async function getPasswordResetRequests() {
  var res = await supabase.from('password_reset_requests').select('*').eq('req_status','pending').order('created_at');
  return res.data||[];
}

export async function resolvePasswordReset(id, tempPassword) {
  await supabase.from('password_reset_requests').update({req_status:'resolved',temp_password:tempPassword}).eq('id',id);
}

export async function getAllNotices() {
  var res = await supabase.from('notices').select('*, from:profiles!notices_from_id_fkey(username,full_name)').order('created_at',{ascending:false}).limit(50);
  return res.data||[];
}

// ── PROFILE COLOR & BADGE ─────────────────────────────
export async function updateAvatarColor(userId, color) {
  await supabase.from('profiles').update({ avatar_color:color }).eq('id',userId);
}

export async function updateBadge(userId, badgeName, badgeColor, badgeHidden) {
  await supabase.from('profiles').update({ badge_name:badgeName||null, badge_color:badgeColor||'#1D9BF0', badge_hidden:!!badgeHidden }).eq('id',userId);
}
