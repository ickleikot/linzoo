export const SETTINGS_KEY = 'lz_admin';

export const DEFAULTS = {
  features: {
    voiceCalls: true, videoCalls: true, screenShare: true,
    fileSharing: true, voiceMessages: true,
    groups: true, channels: true, bots: true,
    gifs: true, stickers: true, polls: true, reactions: true,
    scheduledMessages: true, secretChats: false,
  },
  bots: [],
  moderation: {
    maxFileSizeMB: 2000, allowedTypes: ['image','video','audio','document'],
    antiSpam: true, slowMode: 0,
  },
  appearance: {
    compactMode: false, showAvatars: true,
    messageGrouping: true, animationsEnabled: true,
    defaultTheme: 'dark',
  },
  platform: {
    name: 'Linzoo', tagline: 'Where Conversations Live',
    maintenanceMode: false, registrationOpen: true,
    customCss: '',
  },
  notifications: {
    browserPush: true, sound: true, badge: true,
    mentionsOnly: false,
  },
};

export function load() {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? deepMerge(DEFAULTS, JSON.parse(raw)) : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export function save(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function verifySecret(s) {
  return s === (process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin');
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = (typeof b[k] === 'object' && !Array.isArray(b[k]))
      ? deepMerge(a[k] || {}, b[k])
      : b[k];
  }
  return out;
}
