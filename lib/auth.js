import { supabase } from './supabase';

function toEmail(u){ return u.toLowerCase().trim()+'@linzoo.app'; }

export async function ensureProfile(userId, username, fullName) {
  var check = await supabase.from('profiles').select('id').eq('id',userId).maybeSingle();
  if (check.data) return check.data;
  var uname = (username||'').toLowerCase().trim();
  var role  = uname==='ickleikot'?'superadmin':'member';
  await supabase.from('profiles').insert({id:userId,username:uname,full_name:fullName||uname,role});
  // Auto-join General (trigger handles it, but belt-and-suspenders)
  var g = await supabase.from('chats').select('id').eq('is_universal',true).maybeSingle();
  if (g.data) await supabase.from('chat_members').insert({chat_id:g.data.id,user_id:userId}).select().maybeSingle();
}

export async function signUp({ username, fullName, password, emailForReset }) {
  var uname = username.toLowerCase().trim();
  var {data,error} = await supabase.auth.signUp({
    email: toEmail(uname), password,
    options: { data:{username:uname,full_name:fullName} },
  });
  if (error) {
    if (error.message.includes('already registered')) throw new Error('Username already taken');
    throw new Error(error.message);
  }
  if (data.user) {
    var role = uname==='ickleikot'?'superadmin':'member';
    await supabase.from('profiles').upsert({
      id:data.user.id,username:uname,full_name:fullName,role,
      email_for_reset:emailForReset||null,
    },{onConflict:'id'});
    // Auto-join General group
    var g = await supabase.from('chats').select('id').eq('is_universal',true).maybeSingle();
    if (g.data) await supabase.from('chat_members').insert({chat_id:g.data.id,user_id:data.user.id}).select().maybeSingle();
  }
  return data;
}

export async function signIn({ username, password }) {
  var {data,error} = await supabase.auth.signInWithPassword({ email:toEmail(username), password });
  if (error) {
    if (error.message.toLowerCase().includes('invalid')) throw new Error('Wrong username or password');
    throw new Error(error.message);
  }
  if (data.user) {
    var meta = data.user.user_metadata||{};
    var uname = meta.username||username.toLowerCase().trim();
    await ensureProfile(data.user.id, uname, meta.full_name||uname);
  }
  return data;
}

export async function signOut() { await supabase.auth.signOut(); }

export async function changePassword(newPassword) {
  var {error} = await supabase.auth.updateUser({password:newPassword});
  if (error) throw new Error(error.message);
}

export async function getProfile(userId) {
  var {data} = await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
  return data;
}

export async function getProfileByUsername(username) {
  var {data} = await supabase.from('profiles').select('*').eq('username',username.toLowerCase()).maybeSingle();
  return data;
}
