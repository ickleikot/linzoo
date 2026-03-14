'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '../lib/auth';
import { useStore } from '../lib/store';
import { cacheClear } from '../lib/cache';
import Toast from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  var [mode, setMode]       = useState('login');
  var [username, setUsername] = useState('');
  var [fullName, setFullName] = useState('');
  var [password, setPassword] = useState('');
  var [email, setEmail]     = useState('');
  var [loading, setLoading] = useState(true);
  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(function(res){
      if (res.data&&res.data.session) router.replace('/feed');
      else setLoading(false);
    });
  },[]);

  function switchMode(m){ setMode(m); setUsername(''); setFullName(''); setPassword(''); setEmail(''); }

  async function submit(){
    var u=username.trim(); var p=password.trim();
    if (!u||!p){toast.error('Fill all required fields');return;}
    if (mode==='signup'&&!fullName.trim()){toast.error('Enter your full name');return;}
    if (p.length<6){toast.error('Password must be 6+ chars');return;}
    setLoading(true);
    try {
      if (mode==='signup'){
        await signUp({username:u,fullName:fullName.trim(),password:p,emailForReset:email.trim()||null});
        toast.success('Account created! Sign in now.');
        switchMode('login');
      } else {
        cacheClear();
        await signIn({username:u,password:p});
        router.push('/feed');
      }
    } catch(e){toast.error(e.message);}
    finally{setLoading(false);}
  }

  if (loading&&mode==='login') return (
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',gap:16}}>
      <Toast/>
      <div style={{fontWeight:900,fontSize:32,color:'var(--brand)'}}>Linzoo</div>
      <div className="spinner" style={{width:32,height:32}}/>
    </div>
  );

  return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-page)',padding:'20px 16px'}}>
      <Toast/>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:38,color:'var(--brand)',letterSpacing:-1}}>Linzoo</div>
          <div style={{color:'var(--text-2)',fontSize:15,marginTop:6}}>{mode==='login'?'Welcome back':'Join Linzoo'}</div>
        </div>
        <div className="card" style={{padding:'28px 24px'}}>
          {mode==='signup'&&(
            <div style={{marginBottom:14}}>
              <label style={LS}>Full Name</label>
              <input className="input" autoComplete="new-password" placeholder="Your full name" value={fullName} onChange={function(e){setFullName(e.target.value);}}/>
            </div>
          )}
          <div style={{marginBottom:14}}>
            <label style={LS}>Username</label>
            <input className="input" autoComplete="new-password" placeholder="username" value={username}
              onChange={function(e){setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g,''));}}/>
          </div>
          <div style={{marginBottom:mode==='signup'?14:22}}>
            <label style={LS}>Password</label>
            <input className="input" type="password" autoComplete="new-password" placeholder="Min 6 characters" value={password}
              onChange={function(e){setPassword(e.target.value);}}
              onKeyDown={function(e){if(e.key==='Enter')submit();}}/>
          </div>
          {mode==='signup'&&(
            <div style={{marginBottom:22}}>
              <label style={LS}>Recovery Email <span style={{fontWeight:400,color:'var(--text-3)'}}>(optional)</span></label>
              <input className="input" type="email" autoComplete="new-password" placeholder="your@email.com" value={email} onChange={function(e){setEmail(e.target.value);}}/>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Used for password recovery via admin.</div>
            </div>
          )}
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{width:'100%',marginBottom:16}}>
            {loading?'Please wait…':(mode==='login'?'Sign in':'Create account')}
          </button>
          <div style={{textAlign:'center',fontSize:14,color:'var(--text-2)'}}>
            {mode==='login'
              ? <span>No account? <TxtBtn onClick={function(){switchMode('signup');}}>Sign up</TxtBtn></span>
              : <span>Have an account? <TxtBtn onClick={function(){switchMode('login');}}>Sign in</TxtBtn></span>
            }
          </div>
        </div>
        <div style={{textAlign:'center',marginTop:16,fontSize:13,color:'var(--text-3)'}}>
          Forgot password? Ask the super admin from Settings → Report.
        </div>
      </div>
    </div>
  );
}
var LS = {display:'block',fontSize:13,fontWeight:600,color:'var(--text-2)',marginBottom:5};
function TxtBtn({onClick,children}){
  return <button onClick={onClick} style={{background:'none',border:'none',color:'var(--brand)',fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',fontSize:14}}>{children}</button>;
}
