# Linzoo 🚀

**The ultimate Telegram-powered chat platform. Discord-grade UI. Your chats. Everywhere.**

> Voice calls · Video calls · Screen sharing · GIFs · Stickers · Polls · Reactions · Bots · Admin panel

---

## Quick Setup

1. Get API keys at [my.telegram.org](https://my.telegram.org)
2. Copy `.env.example` → `.env.local` and fill in your keys
3. `npm install && npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Set these environment variables in Vercel:
- `NEXT_PUBLIC_TG_API_ID`
- `NEXT_PUBLIC_TG_API_HASH`
- `NEXT_PUBLIC_ADMIN_SECRET`

## Tech Stack

- **Next.js 14** — App Router
- **GramJS** — Telegram MTProto API
- **Zustand** — State management
- **WebRTC** — Voice & Video calls
- **Framer Motion** — Animations

## Features

- ✅ All Telegram message types (text, photo, video, voice, files, polls, stickers, GIFs, location, contacts)
- ✅ Real-time messaging via Telegram updates
- ✅ Voice & video calls with WebRTC
- ✅ Screen sharing
- ✅ Message reactions, replies, edits, deletes, forwards, pins
- ✅ Emoji picker with 500+ emoji
- ✅ GIF picker (Tenor)
- ✅ Poll creator
- ✅ Rich text formatting
- ✅ Message search
- ✅ Fullscreen image viewer with zoom
- ✅ User profiles
- ✅ Members list with online status
- ✅ Admin panel at `/admin`
- ✅ Dark & light themes
- ✅ Discord-style server/group rail

## Admin Panel

Visit `/admin` on your deployed site. Default password: `admin` (change via `NEXT_PUBLIC_ADMIN_SECRET`).
