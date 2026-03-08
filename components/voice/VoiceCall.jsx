'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { useTelegram } from '../../lib/TelegramContext';
import { WebRTCCall } from '../../lib/webrtc';
import { getName, getInitials, getColor } from '../../lib/helpers';
import toast from 'react-hot-toast';

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text-300)' }}>{m}:{s}</span>;
}

function CallBtn({ icon, label, active, danger, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  const bg = danger
    ? (hov ? '#c0392b' : 'var(--dnd)')
    : active
      ? (hov ? 'var(--bg-500)' : 'var(--bg-400)')
      : (hov ? 'var(--bg-400)' : 'var(--bg-300)');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#fff' : active ? 'var(--text-100)' : 'var(--text-300)',
        transition: 'background var(--ease-fast), transform var(--ease-fast)',
        transform: hov && !disabled ? 'scale(1.06)' : 'scale(1)',
        boxShadow: danger ? '0 4px 16px rgba(239,68,68,0.3)' : 'none',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

export default function VoiceCallUI() {
  const { activeCall, setActiveCall } = useStore();
  const { discardCall, downloadProfilePhoto } = useTelegram();
  const [muted, setMuted]       = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [sharing, setSharing]   = useState(false);
  const [deafen, setDeafen]     = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callStart, setCallStart] = useState(null);
  const [photo, setPhoto]       = useState(null);
  const [quality, setQuality]   = useState('HD');
  const rtcRef        = useRef(null);
  const localVidRef   = useRef(null);
  const remoteVidRef  = useRef(null);

  const isVideo = activeCall?.type === 'video';
  const peer    = activeCall?.peer;
  const state   = activeCall?.state || 'connecting';
  const peerName = peer ? getName(peer) : 'Unknown';

  useEffect(() => {
    if (!activeCall || !peer) return;
    let mounted = true;

    downloadProfilePhoto(peer).then(url => { if (url && mounted) setPhoto(url); }).catch(() => {});

    async function initRTC() {
      try {
        const call = new WebRTCCall({
          onLocalStream: (stream) => {
            if (localVidRef.current) {
              localVidRef.current.srcObject = stream;
              localVidRef.current.muted = true;
            }
          },
          onRemoteStream: (stream) => {
            if (remoteVidRef.current) remoteVidRef.current.srcObject = stream;
          },
          onStateChange: (s) => {
            if (!mounted) return;
            if (s === 'connected') {
              setCallStart(Date.now());
              setActiveCall(prev => prev ? { ...prev, state: 'connected' } : null);
            }
            if (s === 'failed' || s === 'disconnected') hangup();
          },
        });

        await call.init(isVideo);
        rtcRef.current = call;

        // Simulate ringing → connected (real Telegram call signaling would go here)
        setActiveCall(prev => prev ? { ...prev, state: 'ringing' } : null);
        setTimeout(() => {
          if (!mounted) return;
          setCallStart(Date.now());
          setActiveCall(prev => prev ? { ...prev, state: 'connected' } : null);
        }, 2500);
      } catch (e) {
        toast.error(e.message || 'Could not start call. Check microphone permissions.');
        setActiveCall(null);
      }
    }

    initRTC();
    return () => {
      mounted = false;
      rtcRef.current?.destroy();
    };
  }, [activeCall?.peer?.id?.toString()]);

  async function hangup() {
    rtcRef.current?.destroy();
    try {
      if (activeCall?.callObj) {
        await discardCall(activeCall.callObj, callStart ? Math.floor((Date.now() - callStart) / 1000) : 0);
      }
    } catch {}
    setActiveCall(null);
    setCallStart(null);
    setPhoto(null);
  }

  function toggleMute() {
    rtcRef.current?.setMuted(!muted);
    setMuted(v => !v);
  }
  function toggleVideo() {
    rtcRef.current?.setVideoOff(!videoOff);
    setVideoOff(v => !v);
  }
  async function toggleScreenShare() {
    try {
      if (sharing) { await rtcRef.current?.stopScreenShare(); setSharing(false); }
      else { await rtcRef.current?.startScreenShare(); setSharing(true); }
    } catch (e) { toast.error(e.message); }
  }

  if (!activeCall) return null;

  // ── Minimized pill ──────────────────────────────────────
  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          background: 'var(--bg-400)',
          border: '1px solid var(--border-300)',
          borderRadius: 'var(--r-xl)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', zIndex: 9000,
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp 200ms ease',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: photo ? `url(${photo}) center/cover` : getColor(peerName),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden',
          animation: state === 'connected' ? 'callPulse 2s infinite' : undefined,
        }}>
          {!photo && getInitials(peerName)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{peerName}</div>
          <div style={{ fontSize: 11, color: 'var(--online)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {state === 'connected' && callStart
              ? <Timer startTime={callStart} />
              : state === 'ringing' ? '📞 Ringing…' : 'Connecting…'
            }
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); hangup(); }}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--dnd)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 12 19a19.79 19.79 0 0 1-3.45-5.71A2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Full call UI ────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,7,9,0.9)',
      backdropFilter: 'blur(24px)',
      animation: 'fadeIn 200ms ease',
    }}>
      <div style={{
        width: isVideo ? 700 : 400,
        background: 'var(--bg-300)',
        borderRadius: 'var(--r-2xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--border-200)',
        animation: 'modalIn 250ms var(--ease-spring)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Video area */}
        {isVideo ? (
          <div style={{ position: 'relative', height: 380, background: '#000', overflow: 'hidden' }}>
            <video ref={remoteVidRef} autoPlay playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Local video PiP */}
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              width: 130, height: 98,
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.15)',
              background: videoOff ? 'var(--bg-400)' : 'transparent',
              boxShadow: 'var(--shadow-md)',
            }}>
              {videoOff
                ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>😶</div>
                : <video ref={localVidRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              }
            </div>
            {/* State overlay when connecting */}
            {state !== 'connected' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: 'rgba(0,0,0,0.6)' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', background: photo ? `url(${photo}) center/cover` : getColor(peerName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', overflow: 'hidden', animation: 'callPulse 2s infinite' }}>
                  {!photo && getInitials(peerName)}
                </div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{peerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                  {state === 'ringing' ? '📹 Video calling…' : 'Connecting…'}
                </div>
              </div>
            )}
            {/* Quality badge */}
            {state === 'connected' && (
              <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                {quality}
              </div>
            )}
          </div>
        ) : (
          /* Voice call visual */
          <div style={{
            height: 280, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(160deg, var(--bg-100) 0%, #0d1a2e 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            {/* Animated rings when ringing */}
            {state === 'ringing' && [80, 130, 180].map((size, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: size, height: size, borderRadius: '50%',
                border: `2px solid rgba(77,141,255,${0.25 - i * 0.07})`,
                animation: `callPulse ${1.8 + i * 0.4}s ${i * 0.35}s ease-out infinite`,
              }} />
            ))}
            {/* Avatar */}
            <div style={{
              width: 82, height: 82, borderRadius: '50%',
              background: photo ? `url(${photo}) center/cover` : getColor(peerName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 700, color: '#fff',
              overflow: 'hidden', zIndex: 1,
              boxShadow: `0 0 0 4px rgba(255,255,255,0.08), var(--shadow-brand)`,
              animation: state === 'connected' ? 'callPulse 2.5s infinite' : undefined,
            }}>
              {!photo && getInitials(peerName)}
            </div>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>{peerName}</div>
              <div style={{ fontSize: 13, color: 'var(--online)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {state === 'connected' && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--online)', animation: 'ping 1.5s infinite' }} />
                )}
                {state === 'connected' && callStart
                  ? <Timer startTime={callStart} />
                  : state === 'ringing' ? '📞 Calling…' : 'Connecting…'
                }
              </div>
            </div>
            {/* Sound wave when connected */}
            {state === 'connected' && !muted && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', zIndex: 1 }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2,
                    height: 4 + Math.abs(Math.sin(i * 0.7)) * 16,
                    background: 'var(--online)',
                    animation: `typing ${0.8 + Math.random() * 0.4}s ${i * 0.08}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: '20px 24px 24px', background: 'var(--bg-300)' }}>
          {/* Top row — extra controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            <CallBtn
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.8" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
              label={muted ? 'Unmute' : 'Mute'}
              active={muted}
              onClick={toggleMute}
            />
            {isVideo && (
              <CallBtn
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /></svg>}
                label={videoOff ? 'Start Video' : 'Stop Video'}
                active={videoOff}
                onClick={toggleVideo}
              />
            )}
            <CallBtn
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
              label={sharing ? 'Stop Share' : 'Share Screen'}
              active={sharing}
              onClick={toggleScreenShare}
              disabled={!isVideo}
            />
            <CallBtn
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="currentColor" strokeWidth="1.8" /></svg>}
              label={deafen ? 'Undeafen' : 'Deafen'}
              active={deafen}
              onClick={() => setDeafen(v => !v)}
            />
          </div>

          {/* Main action row */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
            <CallBtn
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 12 19a19.79 19.79 0 0 1-3.45-5.71A2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              label="End Call"
              danger
              onClick={hangup}
            />
            <CallBtn
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><polyline points="9 21 3 21 3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
              label="Minimize"
              onClick={() => setMinimized(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
