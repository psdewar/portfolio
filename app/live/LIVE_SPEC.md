# /live Layout Spec

Scope: how `LiveClient.tsx` composes the `/live` and `/live/rehearsal` page across breakpoints.
For the video element itself (WHEP/HLS, one-video-lifetime rule), see `PLAYER_SPEC.md`.

## File map

| File | Owns |
| --- | --- |
| `LiveClient.tsx` | Composition root: status/player wiring, loud-source arbitration, analytics effects, `stageProps` bundle, renders `DesktopTree` + `MobileTree` + the shared video portal |
| `useLiveLayout.ts` | Breakpoint (`isDesktop`), scheme selection (`useSchemeS`, `usePortraitDesktopLayout`), all pixel-math (heights/widths) derived from `ResizeObserver` measurements |
| `Stage.tsx` | `useStageVideo` (the video-home portal), marquee, hero, play/unmute/resume overlays: the single `Stage` component rendered by both trees |
| `DesktopTree.tsx` | Rail nav, the three-way desktop scheme branch (portrait / S / A), the chat-rail slot |
| `MobileTree.tsx` | The mobile one-page column: stage, offline schedule sheet, live chat pane, Fund My Tour bar |
| `LiveClips.tsx` | Thin wrapper around `EnergyVideos` shared by every scheme's clips slot: resolves `ref` only when its tree is the active one, passes through `fitHeight`/`className` |
| `HoverTip.tsx` | `useHoverTip()` hover state and `HoverTip` fixed-position tooltip (white pill, caret toward the anchor, 4px gap); used by the rail wordmark, the show-chat arrow, and the hide-chat arrow |
| `ChatRail.tsx` | `StoryColumn`, `PortraitChatRail`, `DesktopChatRail`, `OfflineStoryRail` (shared between schemes) |
| `LiveSupportAsk.tsx` | The schedule/support-ask block (shows list + Fund My Tour), used by every scheme |

Both `DesktopTree` and `MobileTree` are always mounted. Visibility is CSS-only, toggled by
`LIVE_DESKTOP_HIDDEN` / `LIVE_DESKTOP_FLEX` (from `live-breakpoint.ts`) against
`LIVE_DESKTOP_MEDIA_QUERY`. Neither tree conditionally unmounts on breakpoint change: only the
video (see below) needs a stable single instance; the trees themselves are cheap to double-render.

## Breakpoint and scheme triggers

`isDesktop` (`useLiveLayout.ts`) starts `null` (or `true` if `isOgMode`) and resolves via
`matchMedia(LIVE_DESKTOP_MEDIA_QUERY)`:

```
(orientation: landscape) and (min-width: 1280px) and (min-height: 500px)
```

The `LIVE_DESKTOP_*` class constants (`live-breakpoint.ts`) must be referenced literally wherever they're used, because Tailwind only generates an arbitrary variant's class when the exact string appears in scanned source.

- `isDesktop === true` → one of the desktop schemes (A, S, or D) renders in `DesktopTree`.
- `isDesktop === false` → the mobile one-page tree renders in `MobileTree`.
- `isDesktop === null` (first paint only) → neither video slot resolves; the video sits in the
  hidden `videoHome` fallback until the media query settles (same tick, before paint).

Within `isDesktop === true`, three schemes are mutually exclusive, checked in this order:

1. **Scheme D (portrait desktop)**: `usePortraitDesktopLayout = fullBleedDesktop && isLive && isPortraitStream`.
   Triggers only while live on a 9:16 stream. Layout: schedule + clips column (`data-live-left-col`,
   28% width) next to a full-height portrait stage (`portraitStageSlotRef`), plus `PortraitChatRail`.
2. **Scheme S**: `useSchemeS`, computed when scheme A's stage would be too small: stage height
   under `DESKTOP_STAGE_MIN_PX` (390) or stage width under half the available column width. Layout:
   stage + schedule side by side on top (`data-live-schedule` at `SUPPORT_OVERLAY_PX` width), then a
   `data-live-strip` row of clips + story below.
3. **Scheme A (default)**: full-width stage on top, then `data-live-support-area`/`data-live-strip`
   below it holding schedule + clips + story (live) or schedule + clips (offline).

Schemes S and A both render `DesktopChatRail` when `desktopChatRailVisible` (chat not collapsed),
and `OfflineStoryRail` instead when `!isLive`. Scheme D always renders `PortraitChatRail` and never
the offline story rail (portrait layout only applies while live).

**Mobile** (`isDesktop === false`): a single column (`MobileTree`), stage on top sized by
`mobileStageHeightPx`/`effectiveAspect`, then either the offline schedule sheet
(`LiveSupportAsk variant="sheet"`, only when `!isLive`) or, while live, the Fund My Tour bar plus
the chat pane (`AdlibChat` directly, not `ChatRail.tsx`).

## Sticky rules

- The navbar (`app/Navbar.tsx`) hides on scroll-down and reappears on scroll-up or near the top,
  gated to `/live` and `/live/rehearsal` (and `/shop`). It sets `--header-h` (header height) and
  `--header-offset` (header height when shown, `0px` when hidden) on `:root`.
- The Fund My Tour button, inside `LiveSupportAsk`'s `variant="sheet"` (mobile offline scroll),
  sticks with `top: var(--header-offset, var(--header-h, 0px))` so it clears the navbar exactly
  when the navbar is visible and rides up under it when the navbar hides.

## Single-video rule

Exactly one `<video>` element exists for the life of a session, portaled by `useStageVideo`
(`Stage.tsx`) into whichever slot ref is active: `desktopStageSlotRef` (scheme A/S),
`portraitStageSlotRef` (scheme D), `mobileStageSlotRef` (mobile), or the hidden `videoHome` div
when no slot is resolved yet (or `!isLive`). The slot-selection effect re-runs every render with no
dependency array (cheap, because it's a ref comparison), and it must not be given a dependency array
or it can miss a slot ref attaching. See `PLAYER_SPEC.md` for everything about the video element
itself (WHEP/HLS, autoplay, cleanup).

## Rooms rule

The chat room is the stream path. `LiveClient` receives `path?: StreamPath` (`"live" | "rehearsal"`,
default `"live"`) and passes it straight through: `useAdlibSocket(onNotify, path)` takes it as
`room`, `useLiveStatus({ path })` and `getStreamStatus(path)` key the Owncast-successor status
lookup on it, and the WHEP/HLS URLs are rewritten from `/live/...` to `/${path}/...`. There is no
separate room concept: one path, one stream, one chat room.

The wire shapes and the reactions list in `app/lib/adlib.ts` mirror `src/room.ts` in the adlib
worker repo and change together.

Chat (`useAdlibSocket`) claims the room's single shared socket via `setLiveStatusSource("socket", room)`
before any status-only consumer can open its own anonymous one; no connect happens until auth
settles via `setAdlibAuthToken`.
