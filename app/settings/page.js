'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/auth';
import { updateUserProfile, updateAvatarColor, sendReport } from '../../lib/db';
import { changePassword, signOut } from '../../lib/auth';
import { useStore } from '../../lib/store';
import { cacheClear } from '../../lib/cache';
import Link from 'next/link';
import Avatar from '../../components/ui/Avatar';
import Toast from '../../components/ui/Toast';
import toast from 'react-hot-toast';

var PRESET_COLORS = ['#1D9BF0','#00BA7C','#E0245E','#7C3AED','#F97316','#0EA5E9','#EC4899','#10B981','#F59E0B','#EF4444','#6366F1','#14B8A6'];

export default function SettingsPage() {
  var [me, setMe]     = useState(null);
  var [bio, setBio]   = useState('');
  var [email, setEmail] = useState('');
  var [newPw, setNewPw] = useState('');
  var [saving, setSaving] = useState(false);
  var [showReport, setShowReport] = useState(false);
  var [reportSubject, setReportSubject] = useState('');
  var [reportBody, setReportBody] = useState('');
  var [selectedColor, setSelectedColor] = useState('#1D9BF0');
  var theme = useStore(function(s){return s.theme;});
  var toggleTheme = useStore(function(s){return s.toggleTheme;});
  var initTheme = useStore(function(s){return s.initTheme;});
  var setUser = useStore(function(s){return s.setUser;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var p = await getProfile(res.data.session.user.id);
      if (!p){router.replace('/');return;}
      setMe(p); setBio(p.bio||''); setEmail(p.email_for_reset||'');
      setSelectedColor(p.avatar_color||'#1D9BF0');
    });
  },[]);

  async function saveBio(){
    setSaving(true);
    try {
      await updateUserProfile(me.id,{bio:bio.trim(),email_for_reset:email.trim()||null});
      toast.success('Profile saved!');
    } catch(e){toast.error(e.message);} finally{setSaving(false);}
  }

  async function saveColor(){
    try {
      await updateAvatarColor(me.id,selectedColor);
      setMe(function(p){return Object.assign({},p,{avatar_color:selectedColor});});
      setUser(function(u){return Object.assign({},u,{avatar_color:selectedColor});});
      toast.success('Color updated!');
    } catch(e){toast.error(e.message);}
  }

  async function changePass(){
    if (!newPw||newPw.length<6){toast.error('Password must be 6+ chars');return;}
    setSaving(true);
    try {await changePassword(newPw);setNewPw('');toast.success('Password changed!');} catch(e){toast.error(e.message);} finally{setSaving(false);}
  }

  async function submitReport(){
    if (!reportSubject.trim()||!reportBody.trim()){toast.error('Fill all fields');return;}
    try {
      await sendReport(me.id,reportSubject.trim(),reportBody.trim());
      setReportSubject(''); setReportBody(''); setShowReport(false);
      toast.success('Report sent!');
    } catch(e){toast.error(e.message);}
  }

  async function logout(){ cacheClear(); await signOut(); router.replace('/'); }

  if (!me) return (
    <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <Toast/><div className="spinner" style={{width:32,height:32}}/>
    </div>
  );

  var roleLabel = me.role==='superadmin'?'⚡ Super Admin':me.role==='admin'?'🛡️ Admin':'Member';
  var roleColor = me.role==='superadmin'?'#7C3AED':me.role==='admin'?'var(--brand)':'var(--text-3)';

  return (
    <div className="page-outer">
      <Toast/>
      <div className="page-header">
        <Link href="/feed" style={{color:'var(--brand)',fontWeight:700,textDecoration:'none',fontSize:15}}>← Back</Link>
        <span style={{fontWeight:800,fontSize:17}}>Settings</span>
      </div>
      <div style={{maxWidth:520,margin:'0 auto',padding:16}}>

        <div className="card" style={{padding:'20px',marginBottom:14,display:'flex',gap:16,alignItems:'center'}}>
          <Avatar name={me.full_name||me.username} size={64} color={selectedColor}/>
          <div>
            <div style={{fontWeight:800,fontSize:19}}>{me.full_name}</div>
            <div style={{fontSize:14,color:'var(--text-3)'}}>@{me.username}</div>
            <span style={{fontSize:12,marginTop:5,background:roleColor+'20',color:roleColor,padding:'2px 9px',borderRadius:99,fontWeight:700,display:'inline-block'}}>{roleLabel}</span>
          </div>
        </div>

        <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:15}}>Profile Color</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            {PRESET_COLORS.map(function(c){
              return <button key={c} type="button" onClick={function(){setSelectedColor(c);}} style={{width:30,height:30,borderRadius:'50%',background:c,border:selectedColor===c?'3px solid var(--text-1)':'3px solid transparent',cursor:'pointer',transition:'border 0.1s'}}/>;
            })}
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
            <input type="color" value={selectedColor} onChange={function(e){setSelectedColor(e.target.value);}} style={{width:36,height:36,border:'none',borderRadius:8,cursor:'pointer',background:'none'}}/>
            <span style={{fontSize:13,color:'var(--text-2)'}}>Custom color: <strong>{selectedColor}</strong></span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveColor}>Save Color</button>
        </div>

        <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>Edit Profile</div>
          <label style={L}>Bio</label>
          <textarea className="input" rows={3} placeholder="Tell people about yourself…" value={bio} onChange={function(e){setBio(e.target.value);}} maxLength={200} style={{marginBottom:12}}/>
          <label style={L}>Recovery Email</label>
          <input className="input" type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="your@email.com" style={{marginBottom:14}}/>
          <button className="btn btn-primary btn-sm" onClick={saveBio} disabled={saving}>Save</button>
        </div>

        <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>Change Password</div>
          <input className="input" type="password" value={newPw} onChange={function(e){setNewPw(e.target.value);}} placeholder="New password (min 6 chars)" style={{marginBottom:14}}/>
          <button className="btn btn-primary btn-sm" onClick={changePass} disabled={saving}>Update</button>
        </div>

        <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:14,fontSize:15}}>Appearance</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Dark mode</span>
            <button type="button" onClick={toggleTheme} style={{background:theme==='dark'?'var(--brand)':'var(--border)',border:'none',cursor:'pointer',borderRadius:99,width:48,height:26,position:'relative',transition:'background 0.2s'}}>
              <div style={{position:'absolute',top:3,left:theme==='dark'?24:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
            </button>
          </div>
        </div>

        <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
          <div style={{fontWeight:700,marginBottom:4,fontSize:15}}>Report to Super Admin</div>
          <div style={{fontSize:13,color:'var(--text-3)',marginBottom:12}}>Send a concern or issue directly to the super admin.</div>
          {!showReport
            ? <button className="btn btn-ghost btn-sm" onClick={function(){setShowReport(true);}}>Write Report</button>
            : <>
                <label style={L}>Subject</label>
                <input className="input" value={reportSubject} onChange={function(e){setReportSubject(e.target.value);}} placeholder="Brief subject…" style={{marginBottom:10}}/>
                <label style={L}>Message</label>
                <textarea className="input" rows={4} value={reportBody} onChange={function(e){setReportBody(e.target.value);}} placeholder="Describe your concern…" style={{marginBottom:12}}/>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary btn-sm" onClick={submitReport}>Send</button>
                  <button className="btn btn-ghost btn-sm" onClick={function(){setShowReport(false);}}>Cancel</button>
                </div>
              </>
          }
        </div>

        {(me.role==='admin'||me.role==='superadmin')&&(
          <Link href="/admin" style={{display:'block'}}>
            <div className="card" style={{padding:'14px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
              <span style={{fontWeight:700,fontSize:15}}>{me.role==='superadmin'?'⚡ Super Admin Panel':'🛡️ Admin Panel'}</span>
              <span style={{color:'var(--text-3)'}}>›</span>
            </div>
          </Link>
        )}

        <button onClick={logout} className="btn btn-danger" style={{width:'100%',marginTop:8}}>Sign Out</button>
      </div>
    </div>
  );
}
var L = {display:'block',fontSize:13,fontWeight:600,color:'var(--text-2)',marginBottom:5};
