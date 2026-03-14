'use client';
import AppShell from '../../components/ui/AppShell';
import Sidebar from '../../components/chat/Sidebar';
import ChatWindow from '../../components/chat/ChatWindow';
import { useStore } from '../../lib/store';
import { useIsMobile } from '../../lib/hooks';
export default function ChatPage() {
  var activeChat = useStore(function(s){return s.activeChat;});
  var setActiveChat = useStore(function(s){return s.setActiveChat;});
  var isMobile = useIsMobile();
  return (
    <AppShell>
      {isMobile
        ? activeChat
          ? <ChatWindow onBack={function(){setActiveChat(null);}}/>
          : <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}><Sidebar/></div>
        : <div style={{display:'flex',flex:1,overflow:'hidden'}}>
            <div style={{width:300,borderRight:'1px solid var(--border)',flexShrink:0,overflow:'hidden'}}><Sidebar/></div>
            <ChatWindow/>
          </div>
      }
    </AppShell>
  );
}
