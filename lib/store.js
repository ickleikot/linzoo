import { create } from 'zustand';

export var useStore = create(function(set, get) {
  return {
    user: null,
    setUser: function(u) { set({ user: typeof u === 'function' ? u(get().user) : u }); },

    theme: 'light',
    initTheme: function() {
      if (typeof window === 'undefined') return;
      var saved = localStorage.getItem('lz_theme') || 'light';
      document.documentElement.setAttribute('data-theme', saved);
      set({ theme: saved });
    },
    toggleTheme: function() {
      var next = get().theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('lz_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      set({ theme: next });
    },

    activeChat: null,
    setActiveChat: function(chat) { set({ activeChat: chat }); },

    messages: {},
    setMessages: function(chatId, msgs) {
      set(function(s){ return { messages: Object.assign({}, s.messages, { [chatId]: msgs }) }; });
    },
    addMessage: function(chatId, msg) {
      set(function(s) {
        var ex = s.messages[chatId] || [];
        if (ex.some(function(m){ return m.id === msg.id; })) return s;
        return { messages: Object.assign({}, s.messages, { [chatId]: ex.concat([msg]) }) };
      });
    },
    updateMessage: function(chatId, msgId, patch) {
      set(function(s) {
        var msgs = (s.messages[chatId]||[]).map(function(m){ return m.id===msgId?Object.assign({},m,patch):m; });
        return { messages: Object.assign({},s.messages,{ [chatId]: msgs }) };
      });
    },
    removeMessage: function(chatId, msgId) {
      set(function(s) {
        var msgs = (s.messages[chatId]||[]).filter(function(m){ return m.id!==msgId; });
        return { messages: Object.assign({},s.messages,{ [chatId]: msgs }) };
      });
    },

    conversations: [],
    setConversations: function(c) { set({ conversations: c }); },

    feedPosts: [],
    setFeedPosts: function(p) { set({ feedPosts: p }); },
    prependPost: function(post) {
      set(function(s){ return { feedPosts: [post].concat(s.feedPosts) }; });
    },
  };
});
