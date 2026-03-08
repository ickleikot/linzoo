'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { load, save, verifySecret, DEFAULTS } from '../../lib/adminSettings';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

// ── Small UI helpers ───────────────────────────────────────
function Toggle({ value, onChange, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-100)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-100)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width: 42, height: 24, borderRadius: 99,
        background: value ? 'var(--brand)' : 'var(--bg-500)',
        position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16,
        transition: 'background var(--ease-normal)',
        boxShadow: value ? 'var(--shadow-brand)' : 'none',
      }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left var(--ease-spring)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
      </div>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-100)' }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-100)', marginBottom: 4 }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-400)', marginBottom: 8 }}>{desc}</div>}
      {children}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background: 'var(--bg-200)', border: '1px solid var(--border-200)', borderRadius: 'var(--r-xl)', padding: '20px 24px', marginBottom: 20 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>{title}
      </h2>
      {children}
    </div>
  );
}

// ── Password gate ──────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  function check() {
    if (verifySecret(pw)) { onAuth(); }
    else { setErr('Wrong password. Try again.'); setPw(''); }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-000)' }}>
      <div style={{ width: 360, background: 'var(--bg-200)', border: '1px solid var(--border-200)', borderRadius: 'var(--r-xl)', padding: 32, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-400)', fontSize: 13 }}>Enter your admin password to continue</p>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Admin password"
          className="input"
          style={{ marginBottom: 8 }}
          autoFocus
        />
        {err && <p style={{ color: 'var(--dnd)', fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <button onClick={check} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          Enter Admin Panel
        </button>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          Default password: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-300)' }}>admin</code> — change via env variable
        </p>
      </div>
    </div>
  );
}

// ── Main admin panel ───────────────────────────────────────
function AdminDashboard() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [newBotToken, setNewBotToken] = useState('');
  const router = useRouter();

  useEffect(() => { setSettings(load()); }, []);

  function update(path, value) {
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setSaved(false);
  }

  function saveAll() {
    save(settings);
    toast.success('Settings saved!');
    setSaved(true);
  }

  function addBot() {
    if (!newBotToken.trim()) return;
    const bots = [...(settings.bots || []), { token: newBotToken.trim(), enabled: true, addedAt: Date.now() }];
    update('bots', bots);
    setNewBotToken('');
    toast.success('Bot added');
  }

  function removeBot(i) {
    const bots = settings.bots.filter((_, j) => j !== i);
    update('bots', bots);
  }

  function resetAll() {
    if (!confirm('Reset ALL settings to defaults?')) return;
    setSettings(JSON.parse(JSON.stringify(DEFAULTS)));
    save(DEFAULTS);
    toast.success('Settings reset');
  }

  if (!settings) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="a-spin" style={{ width: 28, height: 28, border: '3px solid var(--border-200)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}/></div>;

  const totalFeatures = Object.values(settings.features).length;
  const enabledFeatures = Object.values(settings.features).filter(Boolean).length;
  const statCards = [
    { icon: '⚡', label: 'Features Active', value: `${enabledFeatures}/${totalFeatures}`, color: 'var(--brand)' },
    { icon: '🤖', label: 'Bots Registered', value: settings.bots?.length || 0, color: 'var(--accent-purple)' },
    { icon: '📁', label: 'Max File Size', value: `${settings.moderation.maxFileSizeMB} MB`, color: 'var(--accent-green)' },
    { icon: settings.platform.maintenanceMode ? '🔴' : '🟢', label: 'Platform Status', value: settings.platform.maintenanceMode ? 'Maintenance' : 'Online', color: settings.platform.maintenanceMode ? 'var(--dnd)' : 'var(--online)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-000)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <div style={{ height: 56, background: 'var(--bg-100)', borderBottom: '1px solid var(--border-100)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4d8dff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 40 40" fill="none"><path d="M8 20h24M8 13h16M8 27h10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Linzoo Admin</span>
        <div style={{ flex: 1 }}/>
        <button onClick={() => router.push('/chat')} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>← Back to App</button>
        <button onClick={saveAll} className="btn-primary" style={{ padding: '6px 18px', fontSize: 13, opacity: saved ? 0.6 : 1 }}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>Settings</h1>
          <p style={{ color: 'var(--text-400)', fontSize: 14 }}>Control every aspect of your Linzoo platform</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          {statCards.map(c => (
            <div key={c.label} style={{ background: 'var(--bg-200)', border: '1px solid var(--border-200)', borderRadius: 'var(--r-xl)', padding: '16px 20px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-400)' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Platform */}
        <Section title="Platform" icon="🌐">
          <Field label="Platform Name" desc="Shown in the browser tab and header">
            <input value={settings.platform.name} onChange={e => update('platform.name', e.target.value)} className="input" style={{ fontSize: 13 }}/>
          </Field>
          <Field label="Tagline" desc="Subtitle shown on the login page">
            <input value={settings.platform.tagline} onChange={e => update('platform.tagline', e.target.value)} className="input" style={{ fontSize: 13 }}/>
          </Field>
          <Toggle label="Maintenance Mode" desc="Prevents users from logging in" value={settings.platform.maintenanceMode} onChange={v => update('platform.maintenanceMode', v)}/>
          <Toggle label="Registration Open" desc="Allow new users to set up accounts" value={settings.platform.registrationOpen} onChange={v => update('platform.registrationOpen', v)}/>
        </Section>

        {/* Features */}
        <Section title="Features" icon="⚡">
          {Object.entries(settings.features).map(([key, val]) => {
            const labels = {
              voiceCalls: ['Voice Calls', 'Allow 1-on-1 voice calls between users'],
              videoCalls: ['Video Calls', 'Allow 1-on-1 video calls with camera'],
              screenShare: ['Screen Sharing', 'Share your screen during video calls'],
              fileSharing: ['File Sharing', 'Allow sending files and documents'],
              voiceMessages: ['Voice Messages', 'Record and send voice notes'],
              groups: ['Groups', 'Allow users to participate in group chats'],
              channels: ['Channels', 'Allow broadcast channels'],
              bots: ['Bots', 'Allow Telegram bots in chats'],
              gifs: ['GIFs', 'GIF picker powered by Tenor'],
              stickers: ['Stickers', 'Telegram sticker packs'],
              polls: ['Polls', 'Create and vote in polls'],
              reactions: ['Reactions', 'React to messages with emoji'],
              scheduledMessages: ['Scheduled Messages', 'Send messages at a scheduled time'],
              secretChats: ['Secret Chats', 'End-to-end encrypted secret chats'],
            };
            const [label, desc] = labels[key] || [key, ''];
            return <Toggle key={key} label={label} desc={desc} value={val} onChange={v => update(`features.${key}`, v)}/>;
          })}
        </Section>

        {/* Bots */}
        <Section title="Bots" icon="🤖">
          <Field label="Add Bot" desc="Paste a Telegram bot token from @BotFather">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newBotToken} onChange={e => setNewBotToken(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBot()} placeholder="123456:ABCdef..." className="input" style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-mono)' }}/>
              <button onClick={addBot} className="btn-primary" style={{ padding: '0 18px', fontSize: 13 }}>Add</button>
            </div>
          </Field>
          {settings.bots?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {settings.bots.map((bot, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-300)', borderRadius: 'var(--r-md)', marginBottom: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bot.token.slice(0, 16)}…
                    </div>
                  </div>
                  <button onClick={() => update(`bots.${i}.enabled`, !bot.enabled)} style={{ fontSize: 11, padding: '2px 8px', background: bot.enabled ? 'rgba(34,212,122,0.15)' : 'var(--bg-400)', color: bot.enabled ? 'var(--online)' : 'var(--text-400)', border: `1px solid ${bot.enabled ? 'rgba(34,212,122,0.3)' : 'var(--border-200)'}`, borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    {bot.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => removeBot(i)} className="ibtn danger" style={{ flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {(!settings.bots || settings.bots.length === 0) && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>No bots added yet. Create one at @BotFather on Telegram.</p>
          )}
        </Section>

        {/* Moderation */}
        <Section title="Moderation" icon="🛡️">
          <Field label="Max File Size" desc="Maximum size per uploaded file">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={10} max={4000} step={10} value={settings.moderation.maxFileSizeMB} onChange={e => update('moderation.maxFileSizeMB', Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--brand)' }}/>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)', minWidth: 70 }}>{settings.moderation.maxFileSizeMB} MB</span>
            </div>
          </Field>
          <Toggle label="Anti-Spam Protection" desc="Detect and block automated spam messages" value={settings.moderation.antiSpam} onChange={v => update('moderation.antiSpam', v)}/>
          <Field label="Allowed File Types">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {['image','video','audio','document','archive','code'].map(t => {
                const active = settings.moderation.allowedTypes?.includes(t);
                return (
                  <button key={t} onClick={() => {
                    const cur = settings.moderation.allowedTypes || [];
                    update('moderation.allowedTypes', active ? cur.filter(x => x !== t) : [...cur, t]);
                  }} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 99, border: `1px solid ${active ? 'var(--brand)' : 'var(--border-200)'}`, background: active ? 'var(--brand-dim)' : 'var(--bg-300)', color: active ? 'var(--brand-light)' : 'var(--text-400)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all var(--ease-fast)' }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon="🎨">
          <Toggle label="Compact Mode" desc="Smaller message bubbles and tighter spacing" value={settings.appearance.compactMode} onChange={v => update('appearance.compactMode', v)}/>
          <Toggle label="Show Avatars" desc="Display profile pictures in chats" value={settings.appearance.showAvatars} onChange={v => update('appearance.showAvatars', v)}/>
          <Toggle label="Message Grouping" desc="Group consecutive messages from the same sender" value={settings.appearance.messageGrouping} onChange={v => update('appearance.messageGrouping', v)}/>
          <Toggle label="Animations Enabled" desc="UI transitions and message animations" value={settings.appearance.animationsEnabled} onChange={v => update('appearance.animationsEnabled', v)}/>
          <Field label="Default Theme">
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {['dark', 'light'].map(t => (
                <button key={t} onClick={() => update('appearance.defaultTheme', t)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-md)', border: `2px solid ${settings.appearance.defaultTheme === t ? 'var(--brand)' : 'var(--border-200)'}`, background: t === 'dark' ? '#111827' : '#f9fafb', color: t === 'dark' ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-ui)', transition: 'border-color var(--ease-fast)' }}>
                  {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon="🔔">
          <Toggle label="Browser Push Notifications" desc="Send push notifications when the tab is in background" value={settings.notifications.browserPush} onChange={v => update('notifications.browserPush', v)}/>
          <Toggle label="Sound" desc="Play a sound on new messages" value={settings.notifications.sound} onChange={v => update('notifications.sound', v)}/>
          <Toggle label="Mentions Only" desc="Only notify for @mentions and replies" value={settings.notifications.mentionsOnly} onChange={v => update('notifications.mentionsOnly', v)}/>
        </Section>

        {/* Danger */}
        <Section title="Danger Zone" icon="⚠️">
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 14, color: 'var(--text-200)', marginBottom: 12 }}>
              Reset all settings to factory defaults. This cannot be undone.
            </div>
            <button onClick={resetAll} className="btn-danger btn-secondary" style={{ fontSize: 13 }}>
              Reset All Settings
            </button>
          </div>
        </Section>

        {/* Save footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
          <button onClick={() => setSettings(load())} className="btn-secondary" style={{ fontSize: 13 }}>Discard Changes</button>
          <button onClick={saveAll} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>
            {saved ? '✓ Saved' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'var(--bg-400)', color: 'var(--text-100)', border: '1px solid var(--border-200)', fontFamily: 'var(--font-ui)', fontSize: 13 },
      }}/>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('lz_admin_auth') === '1') setAuthed(true);
  }, []);
  function onAuth() { sessionStorage.setItem('lz_admin_auth', '1'); setAuthed(true); }
  return authed ? <AdminDashboard /> : <PasswordGate onAuth={onAuth} />;
}
