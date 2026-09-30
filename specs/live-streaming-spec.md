# Live Streaming Spec: peytspencer.com/live

## Problem

Instagram and YouTube mute your own music when you go live. Their copyright bots don't care that you made it.

## Solution

Self-hosted streaming. Your server, your rules. Play whatever you want.

---

## Architecture

```
┌─────────────────┐       RTMP        ┌────────────────────────┐
│  Your Computer  │ ─────────────────►│  Hetzner VPS ($5/mo)   │
│  + OBS Studio   │                   │  Running Owncast       │
└─────────────────┘                   └───────────┬────────────┘
                                                  │
                                                  │ HLS video
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         peytspencer.com/live                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Video Player (HLS.js)                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │   Live Chat       │  │  Support Section  │  │  Email Signup       │  │
│  │   (Owncast)       │  │  (Stripe)         │  │                     │  │
│  └───────────────────┘  └───────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Costs

| Component | Cost |
|-----------|------|
| Hetzner CX22 (2 vCPU, 4GB RAM, 20TB bandwidth) | ~$5/mo |
| Cloudflare (DNS + SSL + protection) | $0 |
| Vercel (hosts Next.js site) | $0 |
| Stripe | 2.9% + 30¢ per transaction |
| **Total** | **~$5/mo** |

If you scale past 50+ concurrent viewers and need CDN offload:
- Backblaze B2 + Cloudflare: ~$1-5/mo additional

---

## Bad Actor Protection

### Layer 1: Owncast Built-in

Owncast has moderation out of the box:

| Feature | What It Does |
|---------|--------------|
| Slow mode | Enforces delay between messages |
| Ban user | Block by IP, one click |
| Word filter | Auto-block specific words |
| Mod roles | Let trusted people moderate |

For your current audience size, this handles 90% of problems.

### Layer 2: Rate Limiting (Next.js Middleware)

Blocks IPs that spam requests:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const requests = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

function getIP(request: NextRequest): string {
  return (
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requests.get(ip);

  if (!record || now > record.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS) return true;
  record.count++;
  return false;
}

const BLOCKED_IPS = new Set<string>([
  // Add bad actors here
]);

export function middleware(request: NextRequest) {
  const ip = getIP(request);

  if (BLOCKED_IPS.has(ip)) {
    return new NextResponse("Blocked", { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
```

### Layer 3: Cloudflare

Put Cloudflare in front of your Hetzner server. Free tier includes:
- DDoS protection
- Bot filtering
- SSL certificates

---

## Hetzner Setup

### 1. Create Account
Go to hetzner.com, sign up, add payment.

### 2. Create Server
- Location: Ashburn, VA (closest to US/Canada)
- Image: Ubuntu 24.04
- Type: CX22
- Add SSH key or use password

### 3. Connect
```bash
ssh root@YOUR_SERVER_IP
```

### 4. Install Owncast
```bash
curl -s https://owncast.online/install.sh | bash
cd owncast
./owncast
```

### 5. Run as Service
```bash
nano /etc/systemd/system/owncast.service
```

Paste:
```
[Unit]
Description=Owncast
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/owncast
ExecStart=/root/owncast/owncast
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl enable owncast
systemctl start owncast
```

### 6. DNS Setup (Cloudflare)
Add A record: `stream.peytspencer.com` → YOUR_SERVER_IP

Set proxy status to "DNS only" (gray cloud) for video streaming.

### 7. SSL with Caddy
```bash
apt update && apt install caddy -y
nano /etc/caddy/Caddyfile
```

Paste:
```
stream.peytspencer.com {
    reverse_proxy localhost:8080
}
```

Then:
```bash
systemctl restart caddy
```

Your stream is now at `https://stream.peytspencer.com`

---

## Owncast Configuration

Access admin at: `https://stream.peytspencer.com/admin`

Default password: `abc123` (change it immediately)

Settings:
```
Stream Key: [generate something random]

Latency Level: 3 (balanced)

Stream Qualities:
  - 1080p @ 4500 Kbps
  - 720p @ 2500 Kbps
  - 480p @ 1200 Kbps

Chat:
  - Slow Mode: 15 seconds
  - Require Username: Yes
```

---

## OBS Settings

```
Stream:
  Service: Custom
  Server: rtmp://stream.peytspencer.com/live
  Stream Key: [your key from Owncast admin]

Output:
  Mode: Advanced
  Encoder: x264 (or NVENC)
  Rate Control: CBR
  Bitrate: 4500 Kbps
  Keyframe Interval: 2
  Preset: veryfast
  Profile: main

Audio:
  Bitrate: 192 Kbps
  Sample Rate: 48 kHz

Video:
  Resolution: 1920x1080
  FPS: 30
```

---

## Next.js /live Page

### File Structure
```
app/
├── live/
│   └── page.tsx
├── api/
│   └── subscribe/
│       └── route.ts
middleware.ts
```

### page.tsx

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const OWNCAST_URL = "https://stream.peytspencer.com";
const STRIPE_LINK = "https://buy.stripe.com/YOUR_LINK";

export default function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${OWNCAST_URL}/api/status`);
        const data = await res.json();
        setIsLive(data.online);
        setViewerCount(data.viewerCount || 0);
      } catch {
        setIsLive(false);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !isLive) return;

    const video = videoRef.current;
    const src = `${OWNCAST_URL}/hls/stream.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play();
    }
  }, [isLive]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/" className="text-xl font-bold">Peyt Spencer</a>
          {isLive && (
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE • {viewerCount} watching
            </span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {isLive ? (
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <p className="text-4xl mb-4">📺</p>
                  <p className="text-xl font-bold">Stream Offline</p>
                  <p className="text-gray-400 mt-2">Check back soon</p>
                </div>
              )}
            </div>

            {isLive && (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <iframe
                  src={`${OWNCAST_URL}/embed/chat/readwrite`}
                  className="w-full h-80"
                  title="Chat"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Support Your Boy</h2>
              <p className="text-gray-400 text-sm mb-4">
                No ads. If you're feeling the music, show some love.
              </p>
              <a
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-white text-black font-bold py-3 px-4 rounded-lg text-center hover:bg-gray-200 transition"
              >
                Send a Tip 💰
              </a>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Get Notified</h2>
              <form action="/api/subscribe" method="POST" className="flex flex-col gap-3">
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className="bg-gray-800 px-4 py-2 rounded-lg"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-bold transition"
                >
                  Notify Me
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### Dependencies

```bash
npm install hls.js
```

---

## Email Signup (Basic)

For the `/api/subscribe` route, options:

1. **Simple:** Link to a Google Form
2. **Better:** Use Buttondown or MailerLite API (free up to 1K subscribers)
3. **DIY:** Store in Supabase (free tier)

Basic API route example:

```typescript
// app/api/subscribe/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();

  if (!email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/live?error=invalid", request.url));
  }

  // TODO: Save to your email service or database
  console.log("New subscriber:", email);

  return NextResponse.redirect(new URL("/live?subscribed=true", request.url));
}
```

---

## Quick Reference

| Thing | Value |
|-------|-------|
| Stream server | stream.peytspencer.com |
| Owncast admin | stream.peytspencer.com/admin |
| OBS stream URL | rtmp://stream.peytspencer.com/live |
| Stream key | [set in Owncast admin] |
| Live page | peytspencer.com/live |

---

## Checklist

### Server Setup
- [ ] Create Hetzner account
- [ ] Provision CX22 server (Ubuntu 24.04, Ashburn VA)
- [ ] SSH in and install Owncast
- [ ] Set up systemd service
- [ ] Point stream.peytspencer.com to server IP
- [ ] Install Caddy for SSL
- [ ] Change Owncast admin password
- [ ] Set stream key
- [ ] Configure video qualities

### Next.js Page
- [ ] Create /live route
- [ ] Install hls.js
- [ ] Add video player component
- [ ] Add Stripe link
- [ ] Add email signup
- [ ] Add rate limiting middleware
- [ ] Deploy to Vercel

### Testing
- [ ] Test stream from OBS to Owncast
- [ ] Verify video plays on /live page
- [ ] Test chat functionality
- [ ] Test with a few friends watching

---

## Why This Works

- No copyright bots
- No ads
- No platform taking a cut
- You own the experience
- ~$5/month
