'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function TelegramProvider({ children }) {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [isAuthed, setIsAuthed]         = useState(false);
  const [currentUser, setCurrentUser]   = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const eventHandlers = useRef([]);

  const SK = 'lz_session';
  const CK = 'lz_creds';

  const getClient = useCallback(async () => {
    if (clientRef.current?.connected) return clientRef.current;
    if (typeof window === 'undefined') return null;
    const { TelegramClient } = await import('telegram');
    const { StringSession }  = await import('telegram/sessions');
    const stored = JSON.parse(localStorage.getItem(CK) || '{}');
    const apiId   = parseInt(stored.apiId   || process.env.NEXT_PUBLIC_TG_API_ID  || '0');
    const apiHash =          stored.apiHash || process.env.NEXT_PUBLIC_TG_API_HASH || '';
    if (!apiId || !apiHash) return null;
    const session = new StringSession(localStorage.getItem(SK) || '');
    const client  = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1500,
      autoReconnect: true,
      baseLogger: { levels:[], log:()=>{}, warn:()=>{}, error:()=>{} },
    });
    clientRef.current = client;
    return client;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const client = await getClient();
        if (!client || !mounted) return;
        await client.connect();
        if (!mounted) return;
        setIsConnected(true);
        setConnectionState('connected');
        const authed = await client.checkAuthorization();
        if (authed && mounted) {
          setIsAuthed(true);
          const me = await client.getMe();
          setCurrentUser(me);
        }
      } catch(e) {
        if (mounted) setConnectionState('error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const saveSession = useCallback((c) => {
    const s = c.session.save();
    if (s) localStorage.setItem(SK, s);
  }, []);

  const saveCreds = useCallback((id, hash) => {
    localStorage.setItem(CK, JSON.stringify({ apiId: String(id), apiHash: String(hash) }));
  }, []);

  // ── AUTH ──────────────────────────────────────────────
  const sendCode = useCallback(async (phone) => {
    const c = await getClient();
    if (!c) throw new Error('API credentials not configured');
    if (!c.connected) await c.connect();
    return await c.sendCode({ apiId: c.apiId, apiHash: c._apiHash }, phone);
  }, [getClient]);

  const signIn = useCallback(async ({ phoneNumber, phoneCodeHash, phoneCode }) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const result = await c.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }));
    saveSession(c);
    const me = await c.getMe();
    setIsAuthed(true); setCurrentUser(me);
    return result;
  }, [getClient, saveSession]);

  const checkPassword = useCallback(async (password) => {
    const c = await getClient();
    // Use built-in GramJS password check — no external import needed
    await c.signInWithPassword(
      { apiId: c.apiId, apiHash: c._apiHash },
      {
        password: async () => password,
        onError: async (err) => { throw err; },
      }
    );
    saveSession(c);
    const me = await c.getMe();
    setIsAuthed(true); setCurrentUser(me);
  }, [getClient, saveSession]);

  const signOut = useCallback(async () => {
    try {
      const c = await getClient();
      if (c) {
        const { Api } = await import('telegram/tl');
        await c.invoke(new Api.auth.LogOut());
        await c.disconnect();
      }
    } catch {}
    localStorage.removeItem(SK);
    clientRef.current = null;
    setIsAuthed(false); setCurrentUser(null); setIsConnected(false);
  }, [getClient]);

  // ── DATA ──────────────────────────────────────────────
  const getDialogs = useCallback(async (opts={}) => {
    const c = await getClient(); if (!c) return [];
    return await c.getDialogs({ limit:100, ...opts });
  }, [getClient]);

  const getMessages = useCallback(async (entity, opts={}) => {
    const c = await getClient(); if (!c) return [];
    return await c.getMessages(entity, { limit:50, ...opts });
  }, [getClient]);

  const sendMessage = useCallback(async (entity, options) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    return await c.sendMessage(entity, options);
  }, [getClient]);

  const editMessage = useCallback(async (entity, id, text) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.EditMessage({ peer:entity, id, message:text }));
  }, [getClient]);

  const deleteMessages = useCallback(async (entity, ids, revoke=true) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.DeleteMessages({ id:ids, revoke }));
  }, [getClient]);

  const pinMessage = useCallback(async (entity, id, unpin=false) => {
    const c = await getClient(); if (!c) return;
    const { Api } = await import('telegram/tl');
    await c.invoke(new Api.messages.UpdatePinnedMessage({ peer:entity, id, unpin, silent:false, pmOneside:false }));
  }, [getClient]);

  const forwardMessages = useCallback(async (fromEntity, toEntity, ids) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.ForwardMessages({
      fromPeer:fromEntity, toPeer:toEntity, id:ids,
      randomId: ids.map(()=>BigInt(Math.floor(Math.random()*1e15))),
    }));
  }, [getClient]);

  const sendFile = useCallback(async (entity, options) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    return await c.sendFile(entity, options);
  }, [getClient]);

  const getEntity = useCallback(async (id) => {
    const c = await getClient(); if (!c) return null;
    return await c.getEntity(id);
  }, [getClient]);

  const getParticipants = useCallback(async (entity, opts={}) => {
    const c = await getClient(); if (!c) return [];
    return await c.getParticipants(entity, { limit:200, ...opts });
  }, [getClient]);

  const downloadProfilePhoto = useCallback(async (entity) => {
    const c = await getClient(); if (!c) return null;
    try {
      const bytes = await c.downloadProfilePhoto(entity, { isBig:false });
      if (!bytes || !bytes.length) return null;
      return URL.createObjectURL(new Blob([bytes], { type:'image/jpeg' }));
    } catch { return null; }
  }, [getClient]);

  const downloadMedia = useCallback(async (message, opts={}) => {
    const c = await getClient(); if (!c) return null;
    try { return await c.downloadMedia(message, { ...opts }); }
    catch { return null; }
  }, [getClient]);

  const setTyping = useCallback(async (entity, action='typing') => {
    const c = await getClient(); if (!c) return;
    try {
      const { Api } = await import('telegram/tl');
      const actions = {
        typing:      new Api.SendMessageTypingAction(),
        cancel:      new Api.SendMessageCancelAction(),
        record_voice:new Api.SendMessageRecordAudioAction(),
        upload_file: new Api.SendMessageUploadDocumentAction({ progress:0 }),
      };
      await c.invoke(new Api.messages.SetTyping({ peer:entity, action: actions[action]||actions.typing }));
    } catch {}
  }, [getClient]);

  const getFullUser = useCallback(async (entity) => {
    const c = await getClient(); if (!c) return null;
    const { Api } = await import('telegram/tl');
    try { return await c.invoke(new Api.users.GetFullUser({ id:entity })); } catch { return null; }
  }, [getClient]);

  const getFullChat = useCallback(async (chatId) => {
    const c = await getClient(); if (!c) return null;
    const { Api } = await import('telegram/tl');
    try { return await c.invoke(new Api.messages.GetFullChat({ chatId })); } catch { return null; }
  }, [getClient]);

  const getPinnedMessages = useCallback(async (entity) => {
    const c = await getClient(); if (!c) return [];
    const { Api } = await import('telegram/tl');
    try {
      const result = await c.invoke(new Api.messages.Search({
        peer:entity, q:'', filter:new Api.InputMessagesFilterPinned(),
        minDate:0, maxDate:0, offsetId:0, addOffset:0,
        limit:20, maxId:0, minId:0, hash:BigInt(0),
      }));
      return result.messages || [];
    } catch { return []; }
  }, [getClient]);

  const searchMessages = useCallback(async (entity, query, limit=30) => {
    const c = await getClient(); if (!c) return [];
    const { Api } = await import('telegram/tl');
    try {
      const result = await c.invoke(new Api.messages.Search({
        peer: entity || new Api.InputPeerEmpty(),
        q:query, filter:new Api.InputMessagesFilterEmpty(),
        minDate:0, maxDate:0, offsetId:0, addOffset:0,
        limit, maxId:0, minId:0, hash:BigInt(0),
      }));
      return result.messages || [];
    } catch { return []; }
  }, [getClient]);

  const createGroup = useCallback(async (title, users=[]) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.CreateChat({ users, title }));
  }, [getClient]);

  const sendReaction = useCallback(async (entity, msgId, emoticon) => {
    const c = await getClient(); if (!c) return;
    const { Api } = await import('telegram/tl');
    try {
      await c.invoke(new Api.messages.SendReaction({
        peer:entity, msgId,
        reaction: emoticon ? [new Api.ReactionEmoji({ emoticon })] : [],
      }));
    } catch {}
  }, [getClient]);

  const createPoll = useCallback(async (entity, question, answers, opts={}) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.SendMedia({
      peer:entity,
      media: new Api.InputMediaPoll({
        poll: new Api.Poll({
          id:BigInt(0), question,
          answers: answers.map((a,i) => new Api.PollAnswer({ text:a, option:Buffer.from([i]) })),
          ...opts,
        }),
      }),
      message:'', randomId:BigInt(Math.floor(Math.random()*1e15)),
    }));
  }, [getClient]);

  const getStickerSets = useCallback(async () => {
    const c = await getClient(); if (!c) return [];
    const { Api } = await import('telegram/tl');
    try {
      const result = await c.invoke(new Api.messages.GetAllStickers({ hash:BigInt(0) }));
      return result.sets || [];
    } catch { return []; }
  }, [getClient]);

  // ── CALLS ─────────────────────────────────────────────
  const requestCall = useCallback(async (userId) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    const { Api } = await import('telegram/tl');
    const dhConfig = await c.invoke(new Api.messages.GetDhConfig({ version:0, randomLength:256 }));
    return await c.invoke(new Api.phone.RequestCall({
      userId, randomId: Math.floor(Math.random()*1e9),
      gAHash: dhConfig.random,
      protocol: new Api.PhoneCallProtocol({ udpP2p:true, udpReflector:true, minLayer:65, maxLayer:92 }),
    }));
  }, [getClient]);

  const discardCall = useCallback(async (call, duration=0) => {
    const c = await getClient(); if (!c) return;
    const { Api } = await import('telegram/tl');
    try {
      await c.invoke(new Api.phone.DiscardCall({
        peer: new Api.InputPhoneCall({ id:call.id, accessHash:call.accessHash }),
        duration, connectionId:BigInt(0),
        reason: new Api.PhoneCallDiscardReasonHangup(),
      }));
    } catch {}
  }, [getClient]);

  // ── EVENTS ────────────────────────────────────────────
  const addUpdateHandler = useCallback(async (handler, event) => {
    const c = await getClient(); if (!c) return;
    c.addEventHandler(handler, event);
    eventHandlers.current.push({ handler, event });
  }, [getClient]);

  const removeUpdateHandler = useCallback(async (handler) => {
    const c = await getClient(); if (!c) return;
    c.removeEventHandler(handler);
    eventHandlers.current = eventHandlers.current.filter(h=>h.handler!==handler);
  }, [getClient]);

  const invoke = useCallback(async (request) => {
    const c = await getClient(); if (!c) throw new Error('Not connected');
    return await c.invoke(request);
  }, [getClient]);

  const value = {
    isConnected, isAuthed, isLoading, currentUser, connectionState,
    saveCreds, saveSession,
    sendCode, signIn, checkPassword, signOut,
    getDialogs, getMessages, sendMessage, editMessage, deleteMessages,
    pinMessage, forwardMessages, sendFile, searchMessages, getPinnedMessages,
    sendReaction, createPoll,
    getEntity, getParticipants, downloadProfilePhoto, downloadMedia,
    getFullUser, getFullChat, createGroup,
    getStickerSets, setTyping,
    requestCall, discardCall,
    addUpdateHandler, removeUpdateHandler, invoke,
    getClient,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTelegram() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTelegram must be inside TelegramProvider');
  return ctx;
}
