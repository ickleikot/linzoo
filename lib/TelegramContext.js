'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function TelegramProvider({ children }) {
  const clientRef  = useRef(null);
  const [isConnected, setIsConnected]     = useState(false);
  const [isAuthed, setIsAuthed]           = useState(false);
  const [currentUser, setCurrentUser]     = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const eventHandlers = useRef([]);

  const SK = 'lz_session';
  const CK = 'lz_creds';

  // Read creds from localStorage OR env vars
  function readCreds() {
    const stored = JSON.parse(localStorage.getItem(CK) || '{}');
    const apiId   = parseInt(stored.apiId   || process.env.NEXT_PUBLIC_TG_API_ID  || '0');
    const apiHash =          stored.apiHash || process.env.NEXT_PUBLIC_TG_API_HASH || '';
    return { apiId, apiHash };
  }

  // Build a fresh connected client — always creates new one
  const buildClient = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const { apiId, apiHash } = readCreds();
    if (!apiId || !apiHash) throw new Error('API credentials not configured. Set NEXT_PUBLIC_TG_API_ID and NEXT_PUBLIC_TG_API_HASH in Vercel.');
    const { TelegramClient } = await import('telegram');
    const { StringSession }  = await import('telegram/sessions');
    const session = new StringSession(localStorage.getItem(SK) || '');
    const client  = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1500,
      autoReconnect: true,
      baseLogger: { levels:[], log:()=>{}, warn:()=>{}, error:()=>{} },
    });
    await client.connect();
    clientRef.current = client;
    return client;
  }, []);

  // Get existing client or build new one
  const getClient = useCallback(async () => {
    if (clientRef.current?.connected) return clientRef.current;
    return await buildClient();
  }, [buildClient]);

  // On mount: try to connect and check if already authed
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { apiId, apiHash } = readCreds();
        if (!apiId || !apiHash) {
          // No creds yet — wait for user to enter them
          setIsLoading(false);
          setConnectionState('no-creds');
          return;
        }
        const client = await buildClient();
        if (!client || !mounted) return;
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

  // Save creds and destroy old client so next getClient() builds fresh
  const saveCreds = useCallback((id, hash) => {
    localStorage.setItem(CK, JSON.stringify({ apiId: String(id), apiHash: String(hash) }));
    // Reset client so it gets rebuilt with new credentials
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }
  }, []);

  // ── AUTH ──────────────────────────────────────────────
  const sendCode = useCallback(async (phone) => {
    // Always ensure creds are saved from env vars before attempting
    const { apiId, apiHash } = readCreds();
    if (!apiId || !apiHash) throw new Error('API credentials missing. Check environment variables in Vercel.');
    // Ensure localStorage has them (in case env vars are set but localStorage wasn't written yet)
    if (!localStorage.getItem(CK)) {
      localStorage.setItem(CK, JSON.stringify({ apiId: String(apiId), apiHash: String(apiHash) }));
    }
    const c = await getClient();
    if (!c) throw new Error('Could not connect to Telegram');
    return await c.sendCode({ apiId: c.apiId, apiHash: c._apiHash }, phone);
  }, [getClient]);

  const signIn = useCallback(async ({ phoneNumber, phoneCodeHash, phoneCode }) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const result = await c.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }));
    saveSession(c);
    const me = await c.getMe();
    setIsAuthed(true);
    setCurrentUser(me);
    return result;
  }, [getClient, saveSession]);

  const checkPassword = useCallback(async (password) => {
    const c = await getClient();
    await c.signInWithPassword(
      { apiId: c.apiId, apiHash: c._apiHash },
      { password: async () => password, onError: async (err) => { throw err; } }
    );
    saveSession(c);
    const me = await c.getMe();
    setIsAuthed(true);
    setCurrentUser(me);
  }, [getClient, saveSession]);

  const signOut = useCallback(async () => {
    try {
      const c = clientRef.current;
      if (c) { await c.invoke((await import('telegram/tl')).Api.auth.LogOut ? new (await import('telegram/tl')).Api.auth.LogOut() : {}); }
    } catch {}
    localStorage.removeItem(SK);
    clientRef.current = null;
    setIsAuthed(false);
    setCurrentUser(null);
    window.location.href = '/';
  }, []);

  // ── MESSAGES ─────────────────────────────────────────
  const getMessages = useCallback(async (entity, opts = {}) => {
    const c = await getClient();
    return await c.getMessages(entity, { limit: 50, ...opts });
  }, [getClient]);

  const sendMessage = useCallback(async (entity, opts = {}) => {
    const c = await getClient();
    return await c.sendMessage(entity, opts);
  }, [getClient]);

  const editMessage = useCallback(async (entity, id, text) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.EditMessage({ peer: entity, id, message: text }));
  }, [getClient]);

  const deleteMessages = useCallback(async (entity, ids) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.DeleteMessages({ id: ids, revoke: true }));
  }, [getClient]);

  const pinMessage = useCallback(async (entity, id, unpin = false) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.UpdatePinnedMessage({ peer: entity, id, unpin, pmOneSide: false, silent: false }));
  }, [getClient]);

  const forwardMessages = useCallback(async (fromEntity, toEntity, ids) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.ForwardMessages({ fromPeer: fromEntity, toPeer: toEntity, id: ids, randomId: [BigInt(Math.floor(Math.random() * 1e15))] }));
  }, [getClient]);

  const sendFile = useCallback(async (entity, opts = {}) => {
    const c = await getClient();
    return await c.sendFile(entity, opts);
  }, [getClient]);

  const searchMessages = useCallback(async (entity, query, limit = 20) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const r = await c.invoke(new Api.messages.Search({ peer: entity, q: query, filter: new Api.InputMessagesFilterEmpty(), minDate: 0, maxDate: 0, offsetId: 0, addOffset: 0, limit, maxId: 0, minId: 0, hash: BigInt(0) }));
    return r.messages || [];
  }, [getClient]);

  const getPinnedMessages = useCallback(async (entity) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const r = await c.invoke(new Api.messages.Search({ peer: entity, q: '', filter: new Api.InputMessagesFilterPinned(), minDate: 0, maxDate: 0, offsetId: 0, addOffset: 0, limit: 20, maxId: 0, minId: 0, hash: BigInt(0) }));
    return r.messages || [];
  }, [getClient]);

  const sendReaction = useCallback(async (entity, msgId, reaction) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    await c.invoke(new Api.messages.SendReaction({ peer: entity, msgId, reaction: [new Api.ReactionEmoji({ emoticon: reaction })] }));
  }, [getClient]);

  const createPoll = useCallback(async (entity, question, answers, anonymous = false) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.SendMedia({
      peer: entity,
      media: new Api.InputMediaPoll({ poll: new Api.Poll({ id: BigInt(0), question: new Api.TextWithEntities({ text: question, entities: [] }), answers: answers.map((a, i) => new Api.PollAnswer({ text: new Api.TextWithEntities({ text: a, entities: [] }), option: Buffer.from([i]) })), publicVoters: !anonymous, closed: false, closePeriod: 0, closeDate: 0 }) }),
      message: '', randomId: BigInt(Math.floor(Math.random() * 1e15))
    }));
  }, [getClient]);

  // ── DIALOGS ──────────────────────────────────────────
  const getDialogs = useCallback(async (opts = {}) => {
    const c = await getClient();
    return await c.getDialogs({ limit: 100, ...opts });
  }, [getClient]);

  const getEntity = useCallback(async (id) => {
    const c = await getClient();
    return await c.getEntity(id);
  }, [getClient]);

  const getParticipants = useCallback(async (entity, opts = {}) => {
    const c = await getClient();
    return await c.getParticipants(entity, opts);
  }, [getClient]);

  const downloadProfilePhoto = useCallback(async (entity) => {
    try {
      const c = await getClient();
      const buf = await c.downloadProfilePhoto(entity, { isBig: false });
      if (!buf || !buf.length) return null;
      const blob = new Blob([buf], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch { return null; }
  }, [getClient]);

  const downloadMedia = useCallback(async (media, opts = {}) => {
    try {
      const c = await getClient();
      const buf = await c.downloadMedia(media, { workers: 1, ...opts });
      if (!buf || !buf.length) return null;
      return buf;
    } catch { return null; }
  }, [getClient]);

  const getFullUser = useCallback(async (user) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.users.GetFullUser({ id: user }));
  }, [getClient]);

  const getFullChat = useCallback(async (chat) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    try {
      return await c.invoke(new Api.channels.GetFullChannel({ channel: chat }));
    } catch {
      return await c.invoke(new Api.messages.GetFullChat({ chatId: chat.id }));
    }
  }, [getClient]);

  const createGroup = useCallback(async (title, users) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    return await c.invoke(new Api.messages.CreateChat({ users, title }));
  }, [getClient]);

  // ── STATUS ───────────────────────────────────────────
  const setTyping = useCallback(async (entity, action = 'typing') => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const actions = { typing: new Api.SendMessageTypingAction(), cancel: new Api.SendMessageCancelAction(), uploadPhoto: new Api.SendMessageUploadPhotoAction({ progress: 0 }), uploadDocument: new Api.SendMessageUploadDocumentAction({ progress: 0 }), recordAudio: new Api.SendMessageRecordAudioAction() };
    await c.invoke(new Api.messages.SetTyping({ peer: entity, action: actions[action] || actions.typing }));
  }, [getClient]);

  // ── STICKERS ─────────────────────────────────────────
  const getStickerSets = useCallback(async () => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const r = await c.invoke(new Api.messages.GetAllStickers({ hash: BigInt(0) }));
    return r.sets || [];
  }, [getClient]);

  // ── CALLS ────────────────────────────────────────────
  const requestCall = useCallback(async (userId) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    const user = await c.getEntity(userId);
    return await c.invoke(new Api.phone.RequestCall({ userId: user, randomId: Math.floor(Math.random() * 1e9), gAHash: Buffer.alloc(32), protocol: new Api.PhoneCallProtocol({ udpP2p: true, udpReflector: true, minLayer: 65, maxLayer: 92, libraryVersions: ['4.0.0'] }) }));
  }, [getClient]);

  const discardCall = useCallback(async (callObj, duration = 0) => {
    const c = await getClient();
    const { Api } = await import('telegram/tl');
    await c.invoke(new Api.phone.DiscardCall({ peer: callObj, duration, reason: new Api.PhoneCallDiscardReasonHangup(), connectionId: BigInt(0) }));
  }, [getClient]);

  // ── EVENTS ───────────────────────────────────────────
  const addUpdateHandler = useCallback(async (handler) => {
    const c = await getClient();
    const { events } = await import('telegram');
    const h = new events.NewMessage({});
    c.addEventHandler(handler, h);
    eventHandlers.current.push({ handler, event: h });
  }, [getClient]);

  const removeUpdateHandler = useCallback(async (handler) => {
    const c = clientRef.current;
    if (!c) return;
    c.removeEventHandler(handler);
  }, []);

  const invoke = useCallback(async (request) => {
    const c = await getClient();
    return await c.invoke(request);
  }, [getClient]);

  const value = {
    isConnected, isAuthed, currentUser, isLoading, connectionState,
    saveCreds, sendCode, signIn, checkPassword, signOut,
    getMessages, sendMessage, editMessage, deleteMessages, pinMessage,
    forwardMessages, sendFile, searchMessages, getPinnedMessages, sendReaction, createPoll,
    getDialogs, getEntity, getParticipants, downloadProfilePhoto, downloadMedia,
    getFullUser, getFullChat, createGroup, setTyping, getStickerSets,
    requestCall, discardCall, addUpdateHandler, removeUpdateHandler, invoke,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTelegram() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTelegram must be used inside TelegramProvider');
  return ctx;
}
