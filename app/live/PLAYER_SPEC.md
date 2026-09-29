# Browser Live-Stream Player Spec

Scope: the WHEP-first, HLS-fallback video player on `/live`. mediamtx 1.21 serves WHEP at
`{live|rehearsal}/whep` and LL-HLS (AAC mirror, since OBS sends AAC and WebRTC needs Opus) at
`{live|rehearsal}_aac/index.m3u8`. coturn runs beside mediamtx for NAT traversal. Viewers are
mostly iPhone Safari and desktop Chrome watching a rap set, so audio quality and sync matter more
than raw resolution. The stage `<video>` sits inside a page with a chat rail and schedule that
reflow, so it must survive layout changes without a visible reload.

## Principles

1. **One video element, one lifetime.** The `<video>` node mounts once for the life of a stream
   session and never remounts because of a layout branch, breakpoint flip, or orientation change.
   Everything that depends on the node (WHEP target, HLS attach, stats polling) reads it through a
   stable ref, never through a conditionally-rendered JSX branch.
2. **WHEP is the target path, HLS is the safety net.** Try WHEP first for sub-second latency.
   Fall back to HLS only on a real failure signal (no connection, no ICE, no frames), not on a
   timer alone, and keep trying to return to WHEP rather than treating the fallback as final.
3. **Disconnected is not failed.** ICE `disconnected` is common on cellular NATs and often
   self-heals in a few seconds. Only fall back or reconnect once the state reaches `failed`, and
   attempt an ICE restart before giving up on WHEP entirely.
4. **Autoplay is muted-only until a gesture.** Start every session muted, detect the `play()`
   promise outcome, and only unmute on an explicit tap. Never assume autoplay succeeded.
5. **Clean up in the order things depend on each other.** Stop media, then close the peer
   connection, then tell the server (DELETE), then detach the video element. Do this on every exit
   path: normal teardown, layout change, tab hide/bfcache, and timeout.
6. **A connected transport is not proof of a watchable stream.** `connectionState === "connected"`
   means DTLS is up, not that frames are decoding. Confirm `framesDecoded` is advancing before
   treating WHEP as a success worth staying on.
7. **iOS Safari has its own physics.** No Low Power Mode detection, autoplay-with-sound never
   works, fullscreen on `<video>` is `webkitEnterFullscreen` only, and OS audio focus (a phone
   call) silently pauses the element outside any WebRTC state machine.
8. **Log what a viewer actually experienced**, not just which code path ran: player path chosen,
   time to first frame, fallback reason, freeze events, reconnect count. That is what makes the
   next incident diagnosable from PostHog instead of from a screen recording.

## Checklist

### WHEP protocol
- [ ] POST the SDP offer with `Content-Type: application/sdp`; treat `201` as success, read
      `Location` (session URL, resolve relative to the request URL) and `ETag` (session version).
- [ ] Read ICE servers from `Link: <...>; rel="ice-server"` headers, both from an OPTIONS
      capability-discovery request and from the POST `201` response itself, since a WHEP server is
      not required to expose the same header on both. Always add a public STUN server as a last
      resort, never as the only server when TURN (coturn) is configured server-side.
- [ ] Use two `recvonly` transceivers (video, audio); never `sendrecv` for a viewer.
- [ ] Support trickle ICE via `PATCH` to the session URL with
      `Content-Type: application/trickle-ice-sdpfrag` and `If-Match: <etag>` when the server
      advertises it; fall back to waiting for `icegatheringstatechange` to reach `complete` (with
      a timeout) when it does not.
- [ ] On `iceconnectionstate`/`connectionState` `disconnected`, wait; on `failed`, attempt one ICE
      restart via `PATCH` with `If-Match: "*"` before tearing the session down.
- [ ] Treat `404`/`405` on POST as "path not publishing yet," not a hard error; treat other
      non-2xx as a hard error. Retry the not-yet-live case with backoff instead of falling back to
      HLS immediately.
- [ ] Always `DELETE` the session URL on teardown, including on a timeout that fires after the
      POST already succeeded (the session exists server-side even if `connected` was never
      reached). Use `keepalive: true` since teardown often happens on unload.
- [ ] Know the mediamtx specifics in use: `webrtcICEServers2` for STUN/TURN config,
      `webrtcAdditionalHosts` must list every public IP/hostname a client can reach the server by
      or negotiation silently fails for anyone outside the LAN, and a path with no active
      publisher answers WHEP with `404`.

### React video element lifecycle
- [ ] Render exactly one `<video>` element per active stream session, from one call site, keyed
      so React never unmounts and remounts it as a side effect of a different branch becoming
      true (a mobile/desktop layout swap, a breakpoint media query flip, `isDemo` toggling). If
      the video must visually move between layouts, move it with CSS/portal, not by having two
      JSX branches each render their own `<video ref>`.
- [ ] Attach `srcObject` only via a ref/DOM call (`videoEl.srcObject = stream`), never as a JSX
      prop. Resolve the target video node at the moment the track actually arrives (`ontrack`),
      not the node captured when the connection attempt started, since the two can differ if a
      remount happens in between.
- [ ] `playsInline` is mandatory for iOS inline playback; `muted` is mandatory for autoplay.
- [ ] Treat `play()` as a Promise: on resolve, autoplay worked; on reject (check
      `error.name === "NotAllowedError"`), show the tap-to-play affordance instead of retrying
      play() in a loop.
- [ ] On `pagehide`/`freeze`, close the peer connection and send the WHEP DELETE before bfcache
      eviction. On `pageshow` with `event.persisted === true`, reconnect rather than trusting
      whatever state the page was frozen in.
- [ ] Cleanup order on every exit path: stop remote tracks / close the `RTCPeerConnection`, `DELETE`
      the WHEP session, destroy the HLS instance if any, then clear `srcObject`/`src` and call
      `video.load()`.
- [ ] Attach the `loadedmetadata`/`resize` aspect listeners inside the same `start()` lifecycle that
      mounts the video, not a separate effect keyed on `[isLive, isDemo]`: the `<video>` mounts
      through a portal after the online flip, so a separate effect reads `videoRef.current` as `null`
      at effect-time and never re-runs. Render at 16:9 while the aspect is unknown, and treat the
      stream as portrait only once real metadata reports it.

### Fallback strategy
- [ ] Fall back from WHEP to HLS when: the POST/negotiation fails outright, ICE reaches `failed`
      after a restart attempt, or `connectionState` is `connected` but no frames decode within a
      few seconds.
- [ ] iOS Safari: prefer native HLS (`video.canPlayType('application/vnd.apple.mpegurl')`) for
      compatibility, or hls.js with the Managed Media Source API (iOS 17+) if low-latency parity
      with desktop matters more than simplicity. Desktop/Chrome: hls.js with MSE.
- [ ] Tune LL-HLS on the client to match the server's part duration: set `liveSyncDuration`/
      `liveSyncDurationCount` explicitly rather than relying on hls.js defaults, since native
      Safari and hls.js compute different live edges from the same manifest when `HOLD-BACK`/
      `PART-HOLD-BACK` aren't both honored.
- [ ] Keep attempting to return to WHEP on an interval while parked on HLS; do not treat the
      fallback as a one-way door for the rest of the session.
- [ ] Latency mode is an internal detail, not necessarily UI: only surface it if support needs to
      know why a viewer is behind, not as a permanent on-screen badge.

### Playback health
- [ ] Poll `RTCPeerConnection.getStats()` every 1-5s while on WHEP; track deltas of
      `framesDecoded`, `packetsLost`, `bytesReceived`, and `freezeCount`/`totalFreezesDuration`
      from the inbound-rtp report.
- [ ] Detect a freeze specifically as: `bytesReceived` increasing while `framesDecoded` delta is
      zero (distinguishes a real freeze from a clean network cutoff, where both stop).
- [ ] On HLS, use `waiting`/`stalled` events plus a `timeupdate` watchdog (no progress for N
      seconds) since MSE doesn't expose the same RTP-level stats.
- [ ] On a detected freeze, try a local recovery first (for HLS: `recoverMediaError()`/seek to
      live edge; for WHEP: nothing to recover client-side, wait for `disconnected`→`failed` or
      time out and fall back) before tearing the whole session down.
- [ ] Keep audio playing through a video degradation when possible; do not mute or pause on a
      video-only stall for a music stream, since silence is worse than a frozen frame.
- [ ] Log to PostHog: chosen player path, time-to-first-frame, fallback reason and count, freeze
      count/duration, and final `connectionState`/HLS error type at session end. Never log stream
      URLs or credentials.

### Mobile Safari specifics
- [ ] Expect ICE `disconnected` around cellular NAT UDP-binding expiry (roughly 20-30s of no
      reverse traffic); ICE consent-freshening keepalives don't help once the binding is already
      gone, so a restart (or fast reconnect) matters more on mobile than on desktop.
- [ ] Handle OS audio-session interruption (a phone call, Siri, another app taking audio focus)
      as its own case: the element pauses with no WebRTC state change at all, so a stall watchdog
      built only on `connectionState` will miss it. Resume playback (muted-state aware) once the
      interruption clears rather than treating the pause as a fatal stall.
- [ ] Low Power Mode blocks autoplay with no way to feature-detect it; always be ready to show
      tap-to-play, and never assume a failed autoplay means anything else is wrong.
- [ ] Handle orientation change without remounting the `<video>`; only the CSS layout around it
      should respond to the media query, per the "one video element" principle above.
- [ ] Fullscreen on iPhone is `video.webkitEnterFullscreen()`, not the standard Fullscreen API;
      feature-detect and fall back appropriately.
- [ ] Picture-in-Picture on iOS is `webkitSetPresentationMode('picture-in-picture')`, and is
      unreliable when triggered from a `visibilitychange` handler rather than a direct user
      gesture; treat it as a nice-to-have, not a relied-upon backgrounding strategy.

## Gap list (current code, ordered by user impact)

1. `app/live/LiveClient.tsx:1021-1051` — `renderStage()` is called once per layout (mobile,
   desktop) and each branch renders its own `<video ref={videoRef}>`, gated by
   `isDesktop === isDesktopStage`. When `isDesktop` flips (breakpoint crossed, orientation
   change), the mounted video unmounts from one call site and a fresh node mounts at the other.
   Render the stage video from a single call site (or portal it into whichever layout is active)
   so it never remounts on a layout flip.
2. `app/live/LiveClient.tsx:477,572` — the WHEP/HLS effect depends on `isDesktop`, so the flip in
   gap 1 also tears down and rebuilds the entire player (closes the WHEP session, destroys HLS,
   reconnects from scratch) on every layout change, producing a visible black frame and audio cut
   mid-stream. Drop `isDesktop` from the dependency array once the video node is stable, or split
   the connect/reconnect effect from the layout-driven render.
3. `app/live/LiveClient.tsx:539` and `app/lib/whep.ts:46-50,67-70` — `connectWhep(whepUrl, video, 4000)`
   passes the raw `videoRef.current` node captured at effect-start instead of the getter form
   (`() => videoRef.current`) that `whep.ts` explicitly documents for exactly this case: if the
   video element remounts before `ontrack` fires, the stream attaches to a detached node and the
   viewer sees nothing with an apparently healthy connection. Pass the getter.
4. `app/live/LiveClient.tsx:548-554` — on `connectionState === "failed"` the code tears down and
   jumps straight to HLS; it never handles `disconnected` as a recoverable intermediate state and
   never attempts an ICE restart. Given the mostly-cellular iPhone audience, this means routine
   mobile NAT hiccups permanently demote every affected viewer to the higher-latency HLS path for
   the rest of the show. Add a `disconnected` grace period and one ICE-restart attempt before
   falling back.
5. `app/lib/whep.ts:36-39` — ICE servers come only from an OPTIONS preflight to the WHEP URL; if
   that request fails, is blocked, or mediamtx only emits `Link: rel="ice-server"` on the POST
   `201` response (not OPTIONS), the client silently ends up with STUN only and no TURN, even
   though coturn is deployed specifically for restrictive/cellular networks. Also parse the `Link`
   header from the POST response as a source of ICE servers.
6. `app/lib/whep.ts:112-118` — the outer timeout's `fail()` only has `pc` in scope and calls
   `pc?.close()`; it never issues the `DELETE` to the session URL, so a POST that succeeded
   server-side but didn't reach `connected` within `timeoutMs` leaks a session on mediamtx.
   Track the session URL outside `attempt()` so the timeout path can also DELETE it.
7. `app/lib/whep.ts:81-86` and `app/live/LiveClient.tsx:556-560` — a non-2xx POST response is
   treated as one undifferentiated failure that goes straight to HLS with no retry; a `404`
   (stream path not publishing yet, e.g. the viewer arrived seconds before the artist goes live)
   is functionally different from a hard error and should retry WHEP with backoff instead of
   permanently falling back.
8. `app/live/LiveClient.tsx:539-572` — once HLS fallback starts, there is no periodic attempt to
   reconnect WHEP; a viewer who falls back early in the stream (e.g., a transient blip) stays on
   the higher-latency path for the whole show. Add a background retry of `connectWhep` on an
   interval while parked on HLS.
9. `app/live/LiveClient.tsx` (whole player effect) — no `RTCPeerConnection.getStats()` polling and
   no freeze detection exist anywhere; the only signal used is `connectionState`, which per
   principle 6 can read `connected` while no frames are decoding. For a music set, a silent
   freeze (audio glitch or frozen frame with an open connection) is currently invisible to both
   the viewer-facing UI and to PostHog. Add stats polling with a `framesDecoded`-delta freeze
   check and log freeze events.
10. `app/live/LiveClient.tsx` — no `pagehide`/`pageshow` handling exists; `visibilitychange` is
    wired only for the wake-lock effect (`:611-626`), not for the player. An iPhone Safari
    swipe-back into bfcache can leave the peer connection open uncleaned, and returning to the
    tab does not attempt a reconnect. Add pagehide-based teardown and pageshow(`persisted`)-based
    reconnect.
11. `app/live/LiveClient.tsx` — no handling for OS audio-session interruption (a phone call or
    another app taking audio focus). Per principle 7, this pauses the element outside any WebRTC
    state change, so it is currently indistinguishable from an unexplained stall and has no
    recovery path. Listen for an unexpected `pause` while `connectionState` is still healthy and
    resume on the next `play`-eligible moment.
12. `app/live/LiveClient.tsx:507-526` — the hls.js fallback sets only `lowLatencyMode: true` and
    relies on defaults for `liveSyncDuration`/`liveSyncDurationCount`; set them explicitly to
    match the server's `hlsPartDuration`/`hlsSegmentDuration` so the live edge behaves predictably
    across hls.js (desktop/Android) and native Safari HLS (iOS), which otherwise compute different
    live edges from the same manifest.

## Sources

- [draft-ietf-wish-whep — WebRTC-HTTP Egress Protocol](https://github.com/wish-wg/webrtc-http-egress-protocol/blob/main/draft-ietf-wish-whep.md)
- [datatracker: draft-ietf-wish-whep](https://datatracker.ietf.org/doc/draft-ietf-wish-whep/)
- [RFC 9725 — WHIP (sibling protocol, same header/verb conventions)](https://datatracker.ietf.org/doc/html/rfc9725)
- [MediaMTX docs — WebRTC-specific features](https://mediamtx.org/docs/usage/webrtc-specific-features)
- [MediaMTX docs — Publish with WebRTC servers](https://mediamtx.org/docs/publish/webrtc-servers)
- [MediaMTX docs — Read a stream (HLS/LL-HLS tuning)](https://mediamtx.org/docs/usage/read)
- [MDN — Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [MDN — HTMLMediaElement.play()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)
- [web.dev — Back/forward cache](https://web.dev/articles/bfcache)
- [MDN — Window: pagehide event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)
- [Eyevinn webrtc-player (WHEP client reference implementation)](https://github.com/Eyevinn/webrtc-player)
- [Cloudflare Blog — WebRTC live streaming with WHIP/WHEP](https://blog.cloudflare.com/webrtc-whip-whep-cloudflare-stream/)
- [Cloudflare Stream docs — Ultra-low latency with WebRTC](https://developers.cloudflare.com/stream/webrtc-beta/)
- [webrtcHacks — Power-up getStats for client monitoring](https://webrtchacks.com/power-up-getstats-for-client-monitoring/)
- [W3C — Identifiers for WebRTC's Statistics API](https://www.w3.org/TR/webrtc-stats/)
- [Mux Blog — Introducing Low-Latency Live Streaming](https://www.mux.com/blog/introducing-low-latency-live-streaming)
- [hls.js — low latency HLS issue thread on liveSyncDuration/part hold-back](https://github.com/video-dev/hls.js/issues/3077)
- [Apple Developer — webkitEnterFullscreen](https://developer.apple.com/documentation/webkitjs/htmlvideoelement/1633500-webkitenterfullscreen)
- [Apple Developer — webkitSupportsPresentationMode / PiP](https://developer.apple.com/documentation/webkitjs/htmlvideoelement/1629816-webkitsupportspresentationmode)
- [Apple Developer Forums — Low Power Mode blocking video autoplay](https://developer.apple.com/forums/thread/709821)
