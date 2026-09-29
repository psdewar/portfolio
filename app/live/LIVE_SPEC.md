# /live Layout Spec

Scope: how `LiveClient.tsx` composes the `/live` and `/live/rehearsal` page across breakpoints.
For the video element itself (WHEP/HLS, one-video-lifetime rule), see `PLAYER_SPEC.md`.

## File map

| File | Owns |
| --- | --- |
| `LiveClient.tsx` | Composition root: status/player wiring, loud-source arbitration, analytics effects, `stageProps` bundle, renders `DesktopTree` + `MobileTree` + the shared video portal |
| `useLiveLayout.ts` | Breakpoint (`isDesktop`), scheme selection (`useSchemeS`), all pixel-math (heights/widths) derived from `ResizeObserver` measurements; exports `DESKTOP_STAGE_ASPECT` (16/9), the fixed aspect every desktop stage box uses regardless of the stream's own aspect |
| `Stage.tsx` | `useStageVideo` (the video-home portal), marquee, hero, play/unmute/resume overlays: the single `Stage` component rendered by both trees. The `<video>` is always `object-contain`, so a portrait stream pillarboxes inside the fixed 16:9 desktop stage |
| `DesktopTree.tsx` | Rail nav, the two-way desktop scheme branch (S / A), the chat-rail slot |
| `LiveBand.tsx` | The schedule+Fund / clips / story band and its past-shows grid, used by scheme A's fixed 3 columns; exports `pastShowColumnCount`, used by the band's own past-shows grid |
| `MobileTree.tsx` | The mobile one-page column: stage, offline schedule sheet, live chat as an overlay (`AdlibChatOverlay`) or a real panel (`chatPane`, `AdlibChat` with Fund My Tour folded into its footer) |
| `LiveClips.tsx` | Thin wrapper around `EnergyVideos` shared by every scheme's clips slot: resolves `ref` only when its tree is the active one, passes through `fitHeight`/`className` |
| `HoverTip.tsx` | `useHoverTip()` hover state and `HoverTip` fixed-position tooltip (white pill, caret toward the anchor, 2px gap); used by the rail wordmark, the show-chat arrow, and the hide-chat arrow |
| `ChatRail.tsx` | `StoryColumn`, `DesktopChatRail`, `OfflineStoryRail` (shared between schemes) |
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

- `isDesktop === true` → one of the desktop schemes (A or S) renders in `DesktopTree`.
- `isDesktop === false` → the mobile one-page tree renders in `MobileTree`.
- `isDesktop === null` (first paint only) → neither video slot resolves; the video sits in the
  hidden `videoHome` fallback until the media query settles (same tick, before paint).

Within `isDesktop === true`, two schemes are mutually exclusive, checked in this order:

1. **Scheme S (offline only)**: `useSchemeS = !isLive && ...`, computed when scheme A's stage would
   be too small: stage height under `DESKTOP_STAGE_MIN_PX` (390) or stage width under half the
   available column width. Layout: stage + schedule side by side on top (`data-live-schedule` at
   `SUPPORT_OVERLAY_PX` width), then a `data-live-strip` row of clips below.
2. **Scheme A (default)**: full-width stage on top, then `data-live-support-area`/`data-live-strip`
   below it holding schedule + clips + story (live) or schedule + clips (offline). Offline, past
   shows render inside the schedule panel. Live, `LiveSupportAsk` gets `pastShows={[]}` and each of
   the band's three columns instead stacks its own chunk of past shows directly beneath its primary
   content, so the columns keep growing with no gap (see "Sticky rules" below), unlike offline.

Desktop ignores the stream's own aspect entirely: the stage box in both schemes is always sized to
`DESKTOP_STAGE_ASPECT` (16/9, `useLiveLayout.ts`), and the `<video>` inside it is `object-contain`.
A 9:16 stream pillarboxes inside the fixed-width stage instead of reshaping it — there is no
desktop layout branch driven by stream orientation.

Stage degradation while live: height is width-driven unless `bandFloorActive` (`isLive` and the
chat rail open and `bandFloorPx` measured), then `min(width-driven, colHeightPx - bandFloorPx)`.
`bandFloorPx` is measured in `LiveSupportAsk` from a hidden clone of two rows plus the Fund My Tour
button. Collapsing the chat rail disables the floor and the stage takes the freed width.

`DesktopChatRail` renders for both schemes (A, S) whenever `desktopChatRailVisible` (live and chat
not collapsed). `OfflineStoryRail` renders instead for scheme A/S when `!isLive`. Chat rail width is
`clamp(280px, 24%, 400px)` (`RAIL_WIDTH_CSS`) in both schemes, offline story rail included, placed
after the single left column (trailing edge).

**Mobile** (`isDesktop === false`): a single column (`MobileTree`), stage on top sized by
`mobileStageHeightPx`/`stageAspect`, then either the offline schedule sheet
(`LiveSupportAsk variant="sheet"`, only when `!isLive`) or, while live, one of two chat treatments,
gated by `mobilePanelChat` (`useLiveLayout.ts`) ahead of the old landscape/portrait split:
`overlayChat = !mobilePanelChat && (mobileLandscape || stageAspect < 1)`.

`mobilePanelChat` is a pure measurement: `chatBelowPx = mobileViewportHeightPx - stageForChatPx`,
where `stageForChatPx` is `mobileColRect.width / stageAspect` for a landscape stream
(`stageAspect >= 1`) or the full column height for a portrait stream (a portrait stream already
fills the column, so it always yields `chatBelowPx = 0`). `mobilePanelChat` is true once
`chatBelowPx >= 240`. This overrides window-orientation alone: a landscape-oriented window (e.g.
958x890) with a 16:9 stream and 240px+ of room below the stage now gets the real panel, not the
overlay, even though `mobileLandscape` is true.

- **Overlay** (`overlayChat` true: a short/landscape window with under 240px below the stage, or a
  portrait stream on a portrait phone): the stage fills the column
  (`calc(100dvh - var(--header-h, 56px))` when `!mobileLandscape`, `min(100/aspect vw, calc(100dvh
  - var(--header-h, 56px)))` when `mobileLandscape`) and chat overlays the lower video:
  `AdlibChatOverlay` (`app/components/AdlibChatOverlay.tsx`) renders inside the stage slot after
  `Stage`, showing the last 5 messages with a fade mask, a composer pill, a Fund My Tour pill, and
  its own reaction buttons. No `chatPane` renders in this mode, and `Stage.tsx` always passes
  `hideButtons` to its own `AdlibReactions` on mobile so the floating reaction buttons never double
  up with the overlay's.
- **Panel** (`overlayChat` false, i.e. `mobilePanelChat` true regardless of window orientation): the
  stage is sized to its natural `min(100/aspect vw, calc(100dvh - var(--header-h, 56px)))` (no
  shorter cap, since `mobilePanelChat` already guarantees 240px+ below it) and `chatPane`
  (`min-h-0 flex-1`) fills exactly the rest of the column with `AdlibChat` directly (not
  `ChatRail.tsx`): the message list scrolls (`flex-1 overflow-y-auto`), and the reactions row, the
  Fund My Tour button, and the composer are pinned in the non-scrolling footer, in that order — the
  reactions buttons and the Fund My Tour button are composed together into `AdlibChat`'s
  `reactionsBar` slot so no new footer markup is forked, just a different `reactionsBar` node.

## Sticky rules

- The navbar (`app/Navbar.tsx`) hides on scroll-down and reappears on scroll-up or near the top,
  gated to `/live` and `/live/rehearsal` (and `/shop`). It sets `--header-h` (header height) and
  `--header-offset` (header height when shown, `0px` when hidden) on `:root`.
- The Fund My Tour button, inside `LiveSupportAsk`'s `variant="sheet"` (mobile offline scroll),
  sticks with `top: var(--header-offset, var(--header-h, 0px))` so it clears the navbar exactly
  when the navbar is visible and rides up under it when the navbar hides.
- The live band (`data-live-band`, `LiveBand.tsx`) — scheme A only: `flex gap-3 items-start px-3`,
  three equal-width children until a side hits its cap, clips absorbing whatever's left: schedule
  (`flex-1 min-w-0 max-w-[480px]`, `LiveSupportAsk` in `flow` mode with `pastShows={[]}`, upcoming
  rows plus the sticky Fund button) | clips (`flex-1 min-w-0`, `LiveClips`) | story (`flex-1 min-w-0
  max-w-[480px]`, height pinned to the clips row via `ResizeObserver` (`clipsRowRef`/
  `clipsRowHeightPx`), `overflow-y-auto`). The band sits directly under the stage with no gap, so the
  clips' top edge meets the video's bottom edge. `LiveBand`'s clips always render `flush`: a
  continuous, square-cornered filmstrip with its own horizontal scroll. The story always renders
  while live, never offline (offline uses `OfflineStoryRail`); the band row itself never scrolls
  horizontally, only the clips wrapper can.
- Live past shows (hidden when `isShortViewport`): a separate row (`data-live-past-shows`) below the
  band, not embedded in the band's own columns, so its column widths are independent of the band's.
  Rendered by `LiveBand`. Column count for the row is width-driven:
  `N = max(3, floor((pastRowsWidthPx + 12) / 492))` (492 = 480 max column width + 12 gap), columns
  are `flex-1 min-w-0 max-w-[480px]` with the same `gap-3 px-3` as the band, packed from the left so
  any unabsorbed width sits empty on the right once every column hits its 480px cap (plain flex
  default `justify-content: flex-start`, no extra CSS). Column 1 starts flush under the Fund
  wrapper, not under the band bottom: `pastGapAbovePx = clipsRowHeightPx - scheduleHeightPx` (the
  band's height difference, a sticky-position-proof proxy for `bandBottom - fundWrapperBottom`),
  `pastGridK = ceil(pastGapAbovePx / pastRowHeightPx)` counts how many of column 1's naturally
  flowing rows sit above the band bottom. Column 1 gets `margin-top: -pastGapAbovePx` (the *exact*
  measured gap, not row-quantized, so its first row is flush with zero gap under Fund — an earlier
  version quantized this to whole rows and left a leftover gap under the button, which is wrong).
  Columns 2..N get `margin-top: pastGridK * pastRowHeightPx - pastGapAbovePx`, landing them on grid
  row `pastGridK` (the first shared-grid row at or below the band bottom), so any leftover gap sits
  between the clips/story bottom and columns 2..N, never under the button. Split
  (`chunkPastShowColumns(n, k, N)`, `LiveBand.tsx`): `rest = n - k`, `col1 = k + ceil(rest / N)`,
  the remainder spread evenly over columns 2..N with larger chunks first. Chronological order is
  preserved throughout (`getShowHistory()` already returns most-recent-first, column-major fill,
  no reversal needed).
- `LiveSupportAsk` panel variant: the Fund My Tour wrapper is `sticky top-0 bottom-0` in every
  mode, no JS involved. While live (scheme A passes `flow`), the panel root has no overflow of
  its own and the enclosing schedule/band wrapper divs don't scroll either, so the sticky resolves
  against the one real scroller: `data-live-left-col` in scheme A — plain CSS `sticky bottom-0`
  behavior: the button pins to the bottom of that column only while its
  natural (in-flow) position would render below the fold; once scrolling brings that natural position
  above the fold, it releases and sits in flow like any other row, no re-pinning. Offline (`flow`
  unset, the default), the panel stays its own bounded scroller and Fund sticks inside it the same
  way.

## Single-video rule

Exactly one `<video>` element exists for the life of a session, portaled by `useStageVideo`
(`Stage.tsx`) into whichever slot ref is active: `desktopStageSlotRef` (scheme A/S),
`mobileStageSlotRef` (mobile), or the hidden `videoHome` div when no slot is resolved yet (or
`!isLive`). The slot-selection effect re-runs every render with no
dependency array (cheap, because it's a ref comparison), and it must not be given a dependency array
or it can miss a slot ref attaching. See `PLAYER_SPEC.md` for everything about the video element
itself (WHEP/HLS, autoplay, cleanup).

## Rooms rule

The chat room is the stream path. `LiveClient` receives `path?: StreamPath` (`"live" | "rehearsal"`,
default `"live"`) and passes it straight through: `useAdlibSocket(onNotify, path)` takes it as
`room`, `useLiveStatus({ path })` and `getStreamStatus(path)` key the Owncast-successor status
lookup on it, and the WHEP URL is rewritten from `/live/...` to `/${path}_opus/...` (Opus mirror)
while the HLS URL is rewritten to `/${path}_aac/...`. There is no separate room concept: one path,
one stream, one chat room.

The wire shapes and the reactions list in `app/lib/adlib.ts` mirror `src/room.ts` in the adlib
worker repo and change together.

Chat (`useAdlibSocket`) claims the room's single shared socket via `setLiveStatusSource("socket", room)`
before any status-only consumer can open its own anonymous one; no connect happens until auth
settles via `setAdlibAuthToken`.
