import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // ── Navigation ──────────────────────────────────────────
  viewMode: 'dms',       // 'dms' | 'server'
  selectedDialog: null,
  selectedServerId: null,
  setViewMode: (m) => set({ viewMode: m }),
  setSelectedDialog: (d) => set({ selectedDialog: d }),
  setSelectedServer: (id) => set({ selectedServerId: id }),

  // ── Dialogs ─────────────────────────────────────────────
  dialogs: [],
  setDialogs: (dialogs) => set({ dialogs }),
  updateDialogUnread: (id, count) => set((s) => ({
    dialogs: s.dialogs.map(d =>
      d.entity?.id?.toString() === id?.toString() ? { ...d, unreadCount: count } : d
    ),
  })),

  // ── Messages cache ───────────────────────────────────────
  messagesByChat: {},
  setMessages: (chatId, msgs) => set((s) => ({
    messagesByChat: { ...s.messagesByChat, [chatId]: msgs },
  })),
  prependMessage: (chatId, msg) => set((s) => {
    const prev = s.messagesByChat[chatId] || [];
    if (prev.find(m => m.id === msg.id)) return {};
    return { messagesByChat: { ...s.messagesByChat, [chatId]: [msg, ...prev] } };
  }),
  appendMessages: (chatId, msgs) => set((s) => {
    const prev = s.messagesByChat[chatId] || [];
    const ids = new Set(prev.map(m => m.id));
    const fresh = msgs.filter(m => !ids.has(m.id));
    return { messagesByChat: { ...s.messagesByChat, [chatId]: [...prev, ...fresh] } };
  }),
  updateMessage: (chatId, msgId, updates) => set((s) => ({
    messagesByChat: {
      ...s.messagesByChat,
      [chatId]: (s.messagesByChat[chatId] || []).map(m => m.id === msgId ? { ...m, ...updates } : m),
    },
  })),
  removeMessage: (chatId, msgId) => set((s) => ({
    messagesByChat: {
      ...s.messagesByChat,
      [chatId]: (s.messagesByChat[chatId] || []).filter(m => m.id !== msgId),
    },
  })),

  // ── Typing ───────────────────────────────────────────────
  typingByChatId: {},
  setTypingUsers: (chatId, users) => set((s) => ({
    typingByChatId: { ...s.typingByChatId, [chatId]: users },
  })),

  // ── Online status ────────────────────────────────────────
  onlineUsers: new Set(),
  setOnlineUser: (id, online) => set((s) => {
    const next = new Set(s.onlineUsers);
    online ? next.add(id) : next.delete(id);
    return { onlineUsers: next };
  }),

  // ── Avatars ──────────────────────────────────────────────
  avatarCache: {},
  setAvatar: (id, url) => set((s) => ({ avatarCache: { ...s.avatarCache, [id]: url } })),

  // ── Media cache ──────────────────────────────────────────
  mediaCache: {},
  setMedia: (key, url) => set((s) => ({ mediaCache: { ...s.mediaCache, [key]: url } })),

  // ── Pinned messages ──────────────────────────────────────
  pinnedByChatId: {},
  setPinned: (chatId, msgs) => set((s) => ({ pinnedByChatId: { ...s.pinnedByChatId, [chatId]: msgs } })),

  // ── UI State ─────────────────────────────────────────────
  showMembers: true,
  showSearch: false,
  showPinned: false,
  compactMode: false,
  theme: 'dark',
  toggleMembers: () => set((s) => ({ showMembers: !s.showMembers })),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),
  togglePinned: () => set((s) => ({ showPinned: !s.showPinned })),
  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
  setCompactMode: (v) => set({ compactMode: v }),

  // ── Compose state ────────────────────────────────────────
  replyingTo: null,
  editingMsg: null,
  forwardingMsg: null,
  draft: {},
  setReplyingTo: (m) => set({ replyingTo: m }),
  setEditingMsg: (m) => set({ editingMsg: m }),
  setForwardingMsg: (m) => set({ forwardingMsg: m }),
  setDraft: (chatId, text) => set((s) => ({ draft: { ...s.draft, [chatId]: text } })),

  // ── Active call ──────────────────────────────────────────
  activeCall: null,    // { type: 'voice'|'video', peer, callObj, state }
  setActiveCall: (c) => set({ activeCall: c }),

  // ── Modals ───────────────────────────────────────────────
  profileModal: null,     // user entity
  groupSettingsOpen: false,
  openProfile: (u) => set({ profileModal: u }),
  closeProfile: () => set({ profileModal: null }),
  setGroupSettings: (v) => set({ groupSettingsOpen: v }),

  // ── Notifications ────────────────────────────────────────
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
  clearNotifications: () => set({ notifications: [] }),

  // ── Unread ───────────────────────────────────────────────
  unreadCounts: {},
  setUnread: (id, n) => set((s) => ({ unreadCounts: { ...s.unreadCounts, [id]: n } })),
  incUnread: (id) => set((s) => ({ unreadCounts: { ...s.unreadCounts, [id]: (s.unreadCounts[id] || 0) + 1 } })),
  clearUnread: (id) => set((s) => { const n = { ...s.unreadCounts }; delete n[id]; return { unreadCounts: n }; }),

  // ── Image viewer ─────────────────────────────────────────
  imageViewer: null,   // { src, alt, message }
  openImage: (d) => set({ imageViewer: d }),
  closeImage: () => set({ imageViewer: null }),

  // ── Voice channel ────────────────────────────────────────
  voiceChannelId: null,
  voiceChannelMembers: [],
  setVoiceChannel: (id, members) => set({ voiceChannelId: id, voiceChannelMembers: members }),

  // ── GIF picker / sticker picker ──────────────────────────
  stickerSets: [],
  setStickerSets: (sets) => set({ stickerSets: sets }),
}));
