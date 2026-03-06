'use client';
import { useState, useEffect } from 'react';
import { useTelegram } from '../lib/TelegramContext';
import toast from 'react-hot-toast';

const S = {
  card: { background:'var(--bg-200)', border:'1px solid var(--border-200)', borderRadius:'var(--r-xl)', padding:32, boxShadow:'var(--shadow-xl), 0 0 0 1px rgba(77,141,255,0.06)' },
  label: { display:'block', fontSize:12, fontWeight:600, color:'var(--text-300)', marginBottom:6, letterSpacing:'0.06em', textTransform:'uppercase' },
  hint: { fontSize:11, color:'var(--text-muted)', marginTop:5 },
  back: { width:'100%', marginTop:8, padding:10, color:'var(--text-400)', fontSize:13, borderRadius:'var(--r-md)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-ui)' },
};

function StepBar({ step, total }) {
  return (
    <div style={{ display:'flex', gap:5, marginBottom:28 }}>
      {Array.from({ length: total }).map((_,i) => (
        <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i<=step ? 'var(--brand)' : 'var(--border-200)', transition:'background 400ms ease' }}/>
      ))}
    </div>
  );
}

function FInput({ label, hint, ...p }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={S.label}>{label}</label>}
      <input {...p}
        onFocus={e=>{setF(true);p.onFocus?.(e);}}
        onBlur={e=>{setF(false);p.onBlur?.(e);}}
        className="input"
        style={{ borderColor:f?'var(--brand)':'var(--border-200)', boxShadow:f?'0 0 0 3px var(--brand-dim)':'none', ...p.style }}
      />
      {hint && <p style={S.hint}>{hint}</p>}
    </div>
  );
}

function Btn({ children, loading, ...p }) {
  return (
    <button {...p} className="btn-primary"
      style={{ width:'100%', padding:'13px', fontSize:15, justifyContent:'center', ...p.style }}
      disabled={loading||p.disabled}>
      {loading
        ? <><span className="a-spin" style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block' }}/> Loading...</>
        : children}
    </button>
  );
}

// Step 0 - only shown if no env vars configured
function StepCreds({ onNext }) {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const { saveCreds } = useTelegram();
  function go() {
    if (!apiId.trim() || !apiHash.trim()) return toast.error('Both fields required');
    saveCreds(apiId.trim(), apiHash.trim());
    onNext();
  }
  return <>
    <h2 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:4 }}>Connect Telegram</h2>
    <p style={{ color:'var(--text-300)', fontSize:13, marginBottom:22 }}>
      Create an app at{' '}
      <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer">my.telegram.org</a>
      {' '}to get credentials.
    </p>
    <FInput label="API ID" type="number" placeholder="12345678" value={apiId} onChange={e=>setApiId(e.target.value)} hint="Found in API development tools"/>
    <FInput label="API Hash" type="text" placeholder="0123456789abcdef..." value={apiHash} onChange={e=>setApiHash(e.target.value)}/>
    <Btn onClick={go} style={{ marginTop:8 }}>Continue</Btn>
  </>;
}

// Step 1 - phone number
function StepPhone({ onNext, showBack, onBack }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendCode, saveCreds } = useTelegram();

  // If env vars are set, load them into the client automatically
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_TG_API_ID;
    const hash = process.env.NEXT_PUBLIC_TG_API_HASH;
    if (id && hash) saveCreds(id, hash);
  }, []);

  async function go() {
    if (!phone.trim()) return toast.error('Enter your phone number');
    setLoading(true);
    try {
      const r = await sendCode(phone.trim());
      onNext({ phone: phone.trim(), phoneCodeHash: r.phoneCodeHash });
    } catch(e) {
      toast.error(e.message || 'Failed to send code. Check your API credentials.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <h2 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:4 }}>Sign In</h2>
    <p style={{ color:'var(--text-300)', fontSize:13, marginBottom:22 }}>
      Enter your Telegram phone number with country code.
    </p>
    <FInput
      label="Phone Number" type="tel" placeholder="+880 1234 567890"
      value={phone} onChange={e=>setPhone(e.target.value)}
      onKeyDown={e=>e.key==='Enter'&&go()}
      hint="Include country code e.g. +880 for Bangladesh"
    />
    <Btn onClick={go} loading={loading}>Send Code</Btn>
    {showBack && (
      <button style={S.back} onClick={onBack}>Back</button>
    )}
  </>;
}

// Step 2 - OTP code
function StepOTP({ data, onPassword, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useTelegram();

  async function go() {
    if (code.length < 4) return toast.error('Enter the verification code');
    setLoading(true);
    try {
      await signIn({ phoneNumber: data.phone, phoneCodeHash: data.phoneCodeHash, phoneCode: code.trim() });
      toast.success('Signed in! Welcome to Linzoo!');
    } catch(e) {
      if (e.message?.includes('SESSION_PASSWORD_NEEDED')) onPassword();
      else toast.error(e.message || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <h2 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:4 }}>Verify Code</h2>
    <p style={{ color:'var(--text-300)', fontSize:13, marginBottom:22 }}>
      Code sent to <strong style={{ color:'var(--text-100)' }}>{data?.phone}</strong>
    </p>
    <FInput
      label="Verification Code" type="text" inputMode="numeric"
      placeholder="12345" maxLength={6}
      value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}
      onKeyDown={e=>e.key==='Enter'&&go()}
      style={{ letterSpacing:'0.4em', textAlign:'center', fontSize:'1.4rem', fontWeight:700 }}
    />
    <Btn onClick={go} loading={loading}>Verify Code</Btn>
    <button style={S.back} onClick={onBack}>Use different number</button>
  </>;
}

// Step 3 - 2FA password
function StepPassword({ onBack }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { checkPassword } = useTelegram();

  async function go() {
    if (!pw) return toast.error('Enter your password');
    setLoading(true);
    try {
      await checkPassword(pw);
      toast.success('Welcome to Linzoo!');
    } catch(e) {
      toast.error(e.message || 'Wrong password');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <h2 style={{ fontSize:'1.2rem', fontWeight:700, marginBottom:4 }}>Two-Factor Auth</h2>
    <p style={{ color:'var(--text-300)', fontSize:13, marginBottom:22 }}>
      Your account has 2FA enabled. Enter your cloud password.
    </p>
    <div style={{ position:'relative', marginBottom:16 }}>
      <label style={S.label}>Cloud Password</label>
      <input
        type={show?'text':'password'} value={pw}
        onChange={e=>setPw(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&go()}
        placeholder="Enter password" className="input"
        style={{ paddingRight:44 }}
      />
      <button onClick={()=>setShow(v=>!v)} style={{ position:'absolute', right:12, top:32, color:'var(--text-400)', padding:4, background:'none', border:'none', cursor:'pointer' }}>
        {show
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
        }
      </button>
    </div>
    <Btn onClick={go} loading={loading}>Sign In</Btn>
    <button style={S.back} onClick={onBack}>Use different number</button>
  </>;
}

export default function LoginFlow() {
  const hasEnvCreds = !!(process.env.NEXT_PUBLIC_TG_API_ID && process.env.NEXT_PUBLIC_TG_API_HASH);
  // If env vars set, skip step 0 (credentials form) and start at step 1 (phone)
  const startStep = hasEnvCreds ? 1 : 0;
  const totalSteps = hasEnvCreds ? 3 : 4;

  const [step, setStep] = useState(startStep);
  const [data, setData] = useState({});

  // Visual step for progress bar
  const visualStep = hasEnvCreds ? step - 1 : step;

  return (
    <div style={S.card} className="a-up">
      <StepBar step={visualStep} total={totalSteps} />
      {step === 0 && (
        <StepCreds onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <StepPhone
          showBack={!hasEnvCreds}
          onBack={() => setStep(0)}
          onNext={d => { setData(p => ({...p,...d})); setStep(2); }}
        />
      )}
      {step === 2 && (
        <StepOTP
          data={data}
          onPassword={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepPassword onBack={() => setStep(1)} />
      )}
    </div>
  );
}
