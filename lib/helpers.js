import { format, isToday, isYesterday, differenceInDays, differenceInMinutes } from 'date-fns';

export const toDate = (ts) => ts instanceof Date ? ts : new Date((ts || 0) * 1000);

export const fmtTime  = (ts) => format(toDate(ts), 'HH:mm');
export const fmtFull  = (ts) => format(toDate(ts), 'dd MMM yyyy, HH:mm');
export const fmtDate  = (ts) => {
  const d = toDate(ts);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday`;
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
};
export const fmtSep = (ts) => {
  const d = toDate(ts);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

export function getName(e) {
  if (!e) return 'Unknown';
  if (e.firstName || e.lastName) return [e.firstName, e.lastName].filter(Boolean).join(' ');
  return e.title || (e.username ? `@${e.username}` : 'Unknown');
}

export function getDialogName(d) {
  if (!d) return 'Unknown';
  if (d.title) return d.title;
  if (d.entity) return getName(d.entity);
  return d.name || 'Unknown';
}

export function getDialogId(d) {
  return d?.entity?.id?.toString() || d?.id?.toString() || '';
}

export function getDialogType(d) {
  if (!d?.entity) return 'user';
  const cn = d.entity.className;
  if (cn === 'Channel') return d.entity.megagroup ? 'group' : 'channel';
  if (cn === 'Chat')    return 'group';
  return 'user';
}

export function isGroupDialog(d) {
  const t = getDialogType(d);
  return t === 'group' || t === 'channel';
}

export function getInitials(name) {
  if (!name) return '?';
  const w = name.trim().split(/\s+/);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

const COLORS = [
  '#4d8dff','#22d47a','#f59e0b','#ff6b6b',
  '#a855f7','#06b6d4','#ec4899','#84cc16',
  '#14b8a6','#f97316','#8b5cf6','#3b82f6',
];
export function getColor(name) {
  if (!name) return COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export function truncate(t, n = 60) {
  if (!t) return '';
  return t.length <= n ? t : t.slice(0, n) + '…';
}

export function getPreview(dialog) {
  const msg = dialog?.message;
  if (!msg) return '';
  if (msg.message) return truncate(msg.message, 55);
  if (msg.media) {
    const cn = msg.media?.className || '';
    if (cn.includes('Photo'))    return '📷 Photo';
    if (cn.includes('Document')) return '📎 File';
    if (cn.includes('Geo'))      return '📍 Location';
    if (cn.includes('Poll'))     return '📊 Poll';
    if (cn.includes('Contact'))  return '👤 Contact';
    if (cn.includes('Dice'))     return '🎲 Dice';
    return '📎 Media';
  }
  return '';
}

export function fmtSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B','KB','MB','GB'];
  let s = bytes, i = 0;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function getSenderName(msg, myId) {
  if (!msg) return '';
  if (msg.out || msg.senderId?.toString() === myId?.toString()) return 'You';
  const s = msg.sender;
  if (!s) return '';
  return getName(s);
}

export function shouldGroupWithPrev(msg, prev) {
  if (!prev || prev._type === 'date-sep') return false;
  const sameSender = (msg.senderId || msg.fromId?.userId)?.toString() ===
                     (prev.senderId || prev.fromId?.userId)?.toString();
  if (!sameSender) return false;
  return Math.abs(msg.date - prev.date) < 300;
}

export function groupByDate(messages) {
  const out = [];
  let lastDate = null;
  for (const m of messages) {
    const ds = format(toDate(m.date), 'yyyy-MM-dd');
    if (ds !== lastDate) {
      out.push({ _type: 'date-sep', date: m.date, id: `sep-${ds}` });
      lastDate = ds;
    }
    out.push(m);
  }
  return out;
}

export function getMediaType(msg) {
  if (!msg?.media) return null;
  const cn = msg.media.className || '';
  if (cn.includes('Photo'))    return 'photo';
  if (cn.includes('Document')) {
    const attrs = msg.media.document?.attributes || [];
    const animated = attrs.find(a => a.className === 'DocumentAttributeAnimated');
    const sticker  = attrs.find(a => a.className === 'DocumentAttributeSticker');
    const audio    = attrs.find(a => a.className === 'DocumentAttributeAudio');
    const video    = attrs.find(a => a.className === 'DocumentAttributeVideo');
    if (sticker)  return 'sticker';
    if (animated) return 'gif';
    if (audio?.voice) return 'voice';
    if (audio)    return 'audio';
    if (video?.roundMessage) return 'round_video';
    if (video)    return 'video';
    return 'document';
  }
  if (cn.includes('Poll'))    return 'poll';
  if (cn.includes('Geo'))     return 'location';
  if (cn.includes('Contact')) return 'contact';
  if (cn.includes('Dice'))    return 'dice';
  return 'unknown';
}

export function getMimeIcon(mime = '') {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf'))      return '📄';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return '🗜️';
  if (mime.includes('word') || mime.includes('doc')) return '📝';
  if (mime.includes('excel') || mime.includes('sheet')) return '📊';
  return '📎';
}
