'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getProfile } from '../../../lib/auth';
import { joinGroupByCode } from '../../../lib/db';
import { useStore } from '../../../lib/store';
import Toast from '../../../components/ui/Toast';

export default function JoinPage() {
  var params = useParams();
  var [status, setStatus] = useState('Joining group…');
  var [isOk, setIsOk] = useState(null);
  var initTheme = useStore(function(s){return s.initTheme;});
  var router = useRouter();

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(async function(res){
      if (!res.data||!res.data.session){router.replace('/');return;}
      var profile = await getProfile(res.data.session.user.id);
      if (!profile){router.replace('/');return;}
      try {
        var g = await joinGroupByCode(params.code, profile.id);
        setStatus('Joined ' + g.name + '! Redirecting…');
        setIsOk(true);
        setTimeout(function(){router.replace('/groups');},1500);
      } catch(e){
        setStatus(e.message);
        setIsOk(false);
        setTimeout(function(){router.replace('/groups');},2000);
      }
    });
  },[]);

  return (
    <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:20}}>
      <Toast/>
      <div style={{fontWeight:900,fontSize:28,color:'var(--brand)'}}>Linzoo</div>
      {isOk===null&&<div className="spinner" style={{width:36,height:36}}/>}
      {isOk===true&&<div style={{fontSize:36}}>✅</div>}
      {isOk===false&&<div style={{fontSize:36}}>❌</div>}
      <div style={{fontSize:16,color:'var(--text-1)',fontWeight:600,textAlign:'center',padding:'0 24px'}}>{status}</div>
    </div>
  );
}
