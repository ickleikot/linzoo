'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TelegramProvider, useTelegram } from '../lib/TelegramContext';
import dynamic from 'next/dynamic';

const LoginFlow = dynamic(() => import('../components/LoginFlow'), { ssr: false });

function LoginInner() {
  const { isAuthed, isLoading } = useTelegram();
  const router = useRouter();
  useEffect(() => { if (!isLoading && isAuthed) router.replace('/chat'); }, [isAuthed, isLoading]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-000)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      {/* Animated orbs */}
      {[
        { x:'15%',y:'20%', c:'rgba(77,141,255,0.07)', s:600 },
        { x:'80%',y:'70%', c:'rgba(168,85,247,0.06)', s:700 },
        { x:'60%',y:'15%', c:'rgba(34,212,122,0.04)', s:500 },
        { x:'30%',y:'80%', c:'rgba(236,72,153,0.04)', s:450 },
      ].map((o,i) => (
        <div key={i} style={{
          position:'absolute', left:o.x, top:o.y,
          width:o.s, height:o.s, borderRadius:'50%',
          background:`radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
          transform:'translate(-50%,-50%)',
          pointerEvents:'none',
          animation:`pulse ${3+i*0.5}s ease-in-out ${i*0.3}s infinite`,
        }}/>
      ))}
      {/* Dot grid */}
      <div style={{ position:'absolute',inset:0,pointerEvents:'none', backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize:'32px 32px' }}/>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:48, animation:'slideUp 500ms ease both' }}>
        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:76, height:76, background:'linear-gradient(135deg,#4d8dff 0%,#7c3aed 60%,#ec4899 100%)', borderRadius:22, marginBottom:20, boxShadow:'0 0 60px rgba(77,141,255,0.4), 0 20px 40px rgba(0,0,0,0.4)' }}>
          <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
            <path d="M8 20h24M8 13h16M8 27h10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="30" cy="10" r="6" fill="#22d47a" stroke="white" strokeWidth="2"/>
          </svg>
        </div>
        <h1 style={{ fontSize:'2.8rem', fontWeight:800, fontFamily:'var(--font-display)', background:'linear-gradient(135deg,#fff 20%,#7aaeff 70%,#a855f7 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.04em', lineHeight:1, marginBottom:10 }}>Linzoo</h1>
        <p style={{ color:'var(--text-300)', fontSize:'1rem', fontWeight:400, letterSpacing:'0.02em' }}>Where Conversations Live</p>
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
          {['⚡ Real-time','🔒 E2E Encrypted','📱 All your Telegram','🎙️ Voice & Video'].map(f => (
            <span key={f} style={{ fontSize:11, color:'var(--text-400)', background:'var(--bg-300)', border:'1px solid var(--border-100)', borderRadius:99, padding:'3px 10px' }}>{f}</span>
          ))}
        </div>
      </div>

      <div style={{ width:'100%', maxWidth:420, padding:'0 20px', animation:'slideUp 500ms 80ms ease both' }}>
        {isLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="a-spin" style={{ width:36, height:36, border:'3px solid var(--border-200)', borderTopColor:'var(--brand)', borderRadius:'50%' }}/>
          </div>
        ) : <LoginFlow />}
      </div>

      <p style={{ marginTop:36, color:'var(--text-muted)', fontSize:12, textAlign:'center', animation:'fadeIn 600ms 300ms ease both' }}>
        Uses Telegram MTProto. Get API keys at{' '}
        <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" style={{ color:'var(--brand)' }}>my.telegram.org</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <TelegramProvider><LoginInner /></TelegramProvider>;
}
