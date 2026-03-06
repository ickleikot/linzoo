'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TelegramProvider, useTelegram } from '../../lib/TelegramContext';
import { Toaster } from 'react-hot-toast';

const ServerList    = dynamic(() => import('../../components/layout/ServerList'),    { ssr: false });
const ChannelSidebar= dynamic(() => import('../../components/layout/ChannelSidebar'),{ ssr: false });
const ChatArea      = dynamic(() => import('../../components/chat/ChatArea'),        { ssr: false });
const MembersList   = dynamic(() => import('../../components/layout/MembersList'),   { ssr: false });
const VoiceCallUI   = dynamic(() => import('../../components/voice/VoiceCall'),      { ssr: false });
const ImageViewer   = dynamic(() => import('../../components/media/ImageViewer'),    { ssr: false });
const UserProfileModal = dynamic(() => import('../../components/modals/UserProfile'),{ ssr: false });

function AppShell() {
  const { isAuthed, isLoading } = useTelegram();
  const router = useRouter();

  useEffect(() => { if (!isLoading && !isAuthed) router.replace('/'); }, [isAuthed, isLoading]);

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-000)', flexDirection:'column', gap:16 }}>
      <div style={{ width:60, height:60, background:'linear-gradient(135deg,#4d8dff,#7c3aed)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', animation:'pulse 1.5s ease-in-out infinite', boxShadow:'0 0 40px rgba(77,141,255,0.4)' }}>
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M8 20h24M8 13h16M8 27h10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
      </div>
      <p style={{ color:'var(--text-400)', fontSize:14 }}>Connecting to Telegram…</p>
    </div>
  );

  if (!isAuthed) return null;

  return (
    <div style={{ display:'flex', height:'100vh', width:'100vw', overflow:'hidden', background:'var(--bg-000)' }}>
      <ServerList />
      <ChannelSidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <ChatArea />
      </div>
      <MembersList />
      <VoiceCallUI />
      <ImageViewer />
      <UserProfileModal />
      <Toaster position="bottom-right" toastOptions={{
        style: { background:'var(--bg-400)', color:'var(--text-100)', border:'1px solid var(--border-200)', borderRadius:'var(--r-lg)', fontFamily:'var(--font-ui)', fontSize:13 },
        success: { iconTheme: { primary:'var(--online)', secondary:'var(--bg-000)' } },
        error:   { iconTheme: { primary:'var(--dnd)',    secondary:'var(--bg-000)' } },
      }}/>
    </div>
  );
}

export default function ChatPage() {
  return <TelegramProvider><AppShell /></TelegramProvider>;
}
