# /live Layout Spec

Scope: how `LiveClient.tsx` composes the `/live` and `/live/rehearsal` page across breakpoints.
For the video element itself (WHEP/HLS, one-video-lifetime rule), see `PLAYER_SPEC.md`.

## File map

| File | Owns |
| --- | --- |
| `LiveClient.tsx` | Composition root: status/player wiring, loud-source arbitration, analytics effects, `stageProps` bundle, renders `DesktopTree` + `MobileTree` + the shared video portal |
| `useLiveLayout.ts` | Breakpoint (`isDesktop`), all pixel-math (heights/widths) derived from `ResizeObserver` measurements; exports `DESKTOP_STAGE_ASPECT` (16/9), the fixed aspect every desktop stage box uses regardless of the stream's own aspect |
| `Stage.tsx` | `useStageVideo` (the video-home portal), marquee, hero, play/unmute/resume overlays: the single `Stage` component rendered by both trees. The `<video>` is always `object-contain`, so a portrait stream pillarboxes inside the fixed 16:9 desktop stage |
| `DesktopTree.tsx` | The menu state and overlay nav panel, the two-way desktop branch (live / offline), the chat-rail slot |
| `MenuButton.tsx` | `MenuControl` = `{ open, onToggle }`, `MenuBrand` (the hamburger + wordmark block on the marquee bar and live stage) and the 32px icon `MenuButton` (close button in the menu panel header) |
| `components/FundPill.tsx` | The one Fund My Tour pill (`h-11`, `rounded-full`, Bebas `text-lg`, Support nav icon before the label), used on the reactions row of every live chat surface |
| `MobileTree.tsx` | The mobile one-page column: stage, offline schedule sheet, live chat as an overlay (`AdlibChatOverlay`) or a real panel (`chatPane`, `AdlibChat` with `FundPill` passed as the reactions `action`) |
| `LiveClips.tsx` | Thin wrapper around `EnergyVideos` shared by every clips slot: resolves `ref` only when its tree is the active one, passes through `fitHeight`/`className` |
| `HoverTip.tsx` | `useHoverTip()` hover state and `HoverTip` fixed-position tooltip (white pill, caret toward the anchor, 2px gap); used by `MenuButton` ("Menu", hidden while the panel is open), the show-chat arrow, and the hide-chat arrow |
| `ChatRail.tsx` | `DesktopChatRail` |
| `LiveSupportAsk.tsx` | The schedule/support-ask block (variants `side` offline desktop, `strip` live desktop, `sheet` mobile; heading row with the past-shows count link) |

Both `DesktopTree` and `MobileTree` are always mounted. Visibility is CSS-only, toggled by
`LIVE_DESKTOP_HIDDEN` / `LIVE_DESKTOP_FLEX` (from `live-breakpoint.ts`) against
`LIVE_DESKTOP_MEDIA_QUERY`. Neither tree conditionally unmounts on breakpoint change: only the
video (see below) needs a stable single instance; the trees themselves are cheap to double-render.

## Breakpoint and layout triggers

`isDesktop` (`useLiveLayout.ts`) starts `null` (or `true` if `isOgMode`) and resolves via
`matchMedia(LIVE_DESKTOP_MEDIA_QUERY)`:

```
(orientation: landscape) and (min-width: 1024px) and (min-height: 500px)
```

The `LIVE_DESKTOP_*` class constants (`live-breakpoint.ts`) must be referenced literally wherever they're used, because Tailwind only generates an arbitrary variant's class when the exact string appears in scanned source.

- `isDesktop === true` → `DesktopTree` renders the live stage (live) or the two-column offline layout.
- `isDesktop === false` → the mobile one-page tree renders in `MobileTree`.
- `isDesktop === null` (first paint only) → neither video slot resolves; the video sits in the
  hidden `videoHome` fallback until the media query settles (same tick, before paint).

Within `isDesktop === true`, `DesktopTree` renders one of two layouts:

0. **Live**: the left column (`data-live-left-col`, black) holds the stage box and a schedule strip (`data-live-strip`, black) that is the secondary panel: `flex-1 min-h-0`, absorbing all height under the stage. The stage is set directly: `onlineStageHeightPx` = `min(stageAvailableWidth / DESKTOP_STAGE_ASPECT, colHeightPx - liveStripMinPx)`, where `liveStripMinPx` is the 4-across strip height (heading row 56 = `mt-3` 12 + `h-10` 40 + `mb-1` 4, + one row 56 + 12 pad = 124). `useLiveLayout` picks `liveStripColumns` from the leftover height (`colHeightPx - onlineStageBoxHeightPx`, where `onlineStageBoxHeightPx` = `ceil(onlineStageHeightPx)` also sets the stage box height and drives `liveStripRowPx`): 2 (2x2, 180px) when leftover is at least the 2-column height; otherwise 4 when the column is at least 960px; otherwise 2 with internal scroll as the last resort. At 1280x800 this gives 2x2 with spare pad below; 4-across appears only on short viewports. The strip is `LiveSupportAsk variant="strip" tone="dark" stripColumns`: heading row at the top ("Pull up in {place}" in EpundaSans (the site body font) `font-semibold` (`leading-[0.95]`) at 2rem left, baseline-aligned, the `h-10` row unchanged so the strip math stays exact, "{n} shows since March" right-aligned, `text-sm`), the first four quiet `ShowRow`s directly under it in `grid-cols-4` or `grid-cols-2`. The rows stretch to fill the leftover: `useLiveLayout` exposes `liveStripRowPx` = (leftover - heading 56 - pad 12) / row count (2 rows for 2 columns, 1 for 4) and the strip sets `gridAutoRows` to it, so each row (full-bleed hover/active tint included) is as tall as its cell with content centered. At 72px or more the rows render `ShowRow size="lg"` (`text-2xl` city, `text-5xl` date), below 72 the default size; below 56 the rows keep natural height and the strip scrolls internally (the 2-column fallback). Row height is capped at 120px; beyond the cap the extra height sits below the last row (about 40px at 1512x982). No Fund button, clips or story. The chat rail stays on the right.

1. **Offline**: two columns following the primary/secondary rule, no schemes. Primary (left): the stage box, `OFFLINE_STAGE_ASPECT` 4:5, height `min(viewportHeight, (rowWidth - 420) / 0.8)` (`offlineStageHeightPx`, viewport height from `window.innerHeight`), width = height x 0.8, photo `object-cover`, marquee across the top, "Notify me" on it. Secondary (right, `data-live-secondary`, `flex-1 min-w-0`): `LiveSupportAsk variant="side"` (headline "Pull up in {place}" in EpundaSans `font-semibold`, `leading-[0.95]` with `pb-[0.2em] -mb-[0.2em]` so the truncate clip keeps the descender, `2.5rem`, one line, `truncate`, with the "{n} shows since March" plain text right-aligned on its baseline, `text-sm`, then the first four quiet `ShowRow size="lg"`: city `text-2xl`, date stack `text-5xl`, rows `min-h-[72px]`), then `data-live-strip`, a `flex-1` clips box with `min-height` `CLIP_WRAPPER_MIN_PX` whose clips fill the remaining height and scroll horizontally. At 1440x900 the stage is 900 tall by 720 wide and the clips are about 540 tall; at 1280x800 about 440; at 1024x700 the stage is 700 by 560 and the secondary is 464 wide with clips about 340. When the secondary content exceeds the viewport (about 500px tall) the document scrolls (the /rsvp pattern): `LiveClient` root becomes `relative` with `min-height: 100dvh` (`desktopDocScroll`, not in OG mode), the desktop row is `relative min-h-[100dvh]`, the secondary is `overflow-visible`, the stage box is `sticky top-0 self-start`, and the menu panel switches from `absolute` to `fixed`. There is no inner scroll container.

/live max weight is 600 (`font-semibold`). EpundaSans is registered with `weight: "300 900"` in `app/layout.tsx`, so weight classes render real instances; never use `font-bold`, `font-extrabold` or `font-black` on /live.

Scheme S (the short-wide offline layout), `schemeS*` pixel math, `SUPPORT_OVERLAY_PX` and the desktop first-screen measurement were retired: the 4:5 stage is sized from height, so short-wide viewports just get a smaller stage plus document scroll. The first-screen measurement (`firstScreenClone`) remains only for the mobile sheet.

Desktop ignores the stream's own aspect entirely: the live stage box is always sized to
`DESKTOP_STAGE_ASPECT` (16/9, `useLiveLayout.ts`), and the `<video>` inside it is `object-contain`.
A 9:16 stream pillarboxes inside the fixed-width stage instead of reshaping it (there is no
desktop layout branch driven by stream orientation).

While live the stage height is `min(width-driven, colHeightPx)`. Collapsing the chat rail gives the stage the freed width.

`DesktopChatRail` renders whenever `desktopChatRailVisible` (live and chat not collapsed). Its width is `clamp(280px, 24%, 400px)` (`RAIL_WIDTH_CSS`), placed after the left column (trailing edge). Offline has no right rail; the secondary column fills the space. There is no bio or story anywhere on /live (desktop or mobile).

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
  `Stage`, showing the last 5 messages with a fade mask and a composer row of input and Send,
  with the reaction buttons beside or below it and `FundPill` (`tone="overlay"`) right-aligned on the reactions row. No `chatPane` renders in this mode, and `Stage.tsx` always passes
  `hideButtons` to its own `AdlibReactions` so the floating reaction buttons never double
  up with the overlay's.
- **Panel** (`overlayChat` false, i.e. `mobilePanelChat` true regardless of window orientation): the
  stage is sized to its natural `min(100/aspect vw, calc(100dvh - var(--header-h, 56px)))` (no
  shorter cap, since `mobilePanelChat` already guarantees 240px+ below it) and `chatPane`
  (`min-h-0 flex-1`) fills exactly the rest of the column with `AdlibChat` directly (not
  `ChatRail.tsx`): the message list scrolls (`flex-1 overflow-y-auto`), and the reactions row and
  the composer are pinned in the non-scrolling footer. `FundPill` is passed as the `action` of `AdlibReactionButtons` (right-aligned on the reactions row); the composer row is the input plus Send; there is no separate Fund footer.

**Mobile offline** and live Stage controls: offline, the stage shows the "Notify me" primary (below).
Live, the Notify bell sits top-right above Share and fullscreen and does not auto-hide.

## Mobile offline sheet heading

The sheet and `firstScreenClone` headings share `cityHeadingClass` and `clamp(2rem, 9vw, 2.75rem)` (the city-list face), so the measured first screen matches the rendered one.

## Clip viewer

`LiveClips` passes `expandOnPlay` to `EnergyVideos` (home's `ArtistIntro` does not, so it is unchanged). With it,
a tile's play button opens `components/ClipViewer.tsx` instead of unmuting inline. The viewer is portaled to
`document.body` (tile ancestors have transforms), `role="dialog"` `aria-modal`, `fixed inset-0 z-[100] bg-black/90`,
locks page scroll with `useScrollLock`, and plays the clip with sound from the inline preview's `currentTime`
(`playsInline`, looping) in the largest 9:16 box that fits (`height: min(100dvh, 100vw * 16/9)`, full screen on
phones). Controls: close X top right (focused on open; focus returns to the tile on close), Esc and backdrop click
close, prev/next chevrons on `md+`, ArrowLeft/Up and ArrowRight/Down, vertical swipe of 50px or more on touch, tap
the video to pause or resume, Tab trapped inside. Open and close call `onLoudPlay`/`onLoudEnd` (loud id
`__viewer`, idempotent; pausing also ends the duck), and `silence()` mutes the viewer video. Inline `fitHeight`
tiles do not autoplay, so closing leaves previews as they were.

## Offline marquee

`marqueeRow` in `Stage.tsx` is `w-max`, two identical halves translated by `-50%` (the `marquee` keyframe), so the loop is seamless. Each half has `max(10, ceil(2700 / copyWidth))` copies (copy width estimated as `7.6px x characters + 50px`), so a half is always wider than any stage the bar can span (the widest offline stage is under 1100px, and 2700px also covers a 2560px container). The duration is `half width / 10px per second`, so speed does not depend on text length.

## Offline and live CTAs

- **Offline (Marketing)** has a primary and a secondary action (`renderOfflineState` in `Stage.tsx`), anchored
  bottom-left of the stage photo (`px-4 pb-5`, over a `h-[30%]` `from-black/50` bottom scrim) on desktop and mobile, nothing under the marquee, hidden for patrons. `computePhotoFit` still pins the hairline 48px from the top, clear of the 36px marquee. Primary on the right: "Notify me"
  (`aria-label` "Notify me by email"), `min-h-[52px]`, white pill, Bebas `text-[26px]`, dark text, bell icon.
  Secondary on the left: "Fund My Tour" (`onOpenSupport`), same height and Bebas size, `bg-black/40
  backdrop-blur`, white text, the Support nav icon (`NAV_ICON["/support"]`). At max-width 400px the row goes full width with a smaller gap (`gap-1.5`), padding (`px-3`) and
  font (`text-[22px]`).
- **Live (Media)** has one money ask: `FundPill` ("Fund My Tour", `onOpenSupport`), right-aligned on the reactions row
  on all four chat surfaces: desktop rail (`DesktopChatRail`), mobile panel chat (`MobileTree`), the mobile
  overlay and the desktop fullscreen overlay (both `AdlibChatOverlay`), via the `action` slot of
  `AdlibReactionButtons`. The input spans the full composer row next to Send (`h-10 w-10` in the panel).
- **Live Notify**: a bell button (`renderNotifyButton`, hidden for patrons) top-right of the stage on
  mobile and desktop, before Share. It is `pointer-events-auto` and never uses `fadeCls`, so it does
  not auto-hide; Share, fullscreen, the volume pill label and show-chat keep the auto-hide.
- **Show rows**: `/live` rows pass `quietRsvp` to `ShowRow`, so the Bebas "RSVP" label becomes a small
  `CaretRightIcon` (with an `sr-only` "RSVP"); rows stay links. `SupporterSection` city rows pass it too.
- **Past shows** are one line under the upcoming rows: `{pastShows.length} shows since March`, plain quiet
  text (`text-sm`, neutral, no link, no hover) in the heading rows too. The count derives from `pastShows`
  (`LivePage` passes the shows on or after 2026-03-20); the line is omitted when the list is empty.
- `onOpenSupport` from `supportAsk` is also passed to `DesktopChatRail`. `AdlibReactions` has no
  `onSupport` path.

## Desktop menu button and panel

There is no nav strip and no floating tile. Every desktop layout uses the full row width. The menu is
a brand block, `MenuBrand` in `MenuButton.tsx`: one `h-9` button (hamburger `ListIcon` + "PEYT SPENCER" in Bebas `text-[22px]`, `aria-label` "Open menu"/"Close menu", `aria-expanded`, `data-live-menu-button`). `DesktopTree` passes it to the desktop `Stage` as `menuBlock`; the mobile `Stage` gets none.

- **Offline**: the left end of the yellow marquee bar (`h-9`, black on solid `#facc15`, `px-3`). The bar is `absolute inset-x-0 top-0 flex`: the block, then a `min-w-0 flex-1 overflow-hidden` marquee wrapper, so both edges stay anchored and the marquee starts after the block. Nothing hangs below the bar.
- **Live**: top-left of the stage overlay, white on `bg-black/40 backdrop-blur`, inside the same auto-hiding `fadeCls` wrapper as the stage controls. The LIVE badge, elapsed time and volume pill sit to its right.
- **Mobile**: unchanged, the navbar hamburger.

The panel (`data-live-menu-panel`, z-50) is an absolutely positioned overlay, `MENU_PANEL_WIDTH_PX` (288) wide and full height, that slides from the left edge (`translateX(-100%)` to 0, 150ms, `visibility` toggled so the closed panel is not focusable, transition off under `prefers-reduced-motion`) with a trailing shadow. Its first row is a `MENU_HEADER_PX` (44) header holding a close `MenuButton` and the "PEYT SPENCER" wordmark, followed by the nav rows (no "Live" item, `MENU_NAV_ITEMS`) and a `MENU_SOCIAL_PX` (64) footer with the six socials as one `justify-between` row (`px-2`) of 24px icons in 44px round tap targets, with hover and active background (aria-labels kept). 288 is the narrowest width that fits six 44px targets with the 8px side padding. `--rail-row` divides the height left after the header and social footer by `railRowCount` (= `MENU_NAV_ITEMS.length`).

State (`menuOpen`) is local to `DesktopTree` and not persisted. It closes on the close button, Escape, pointerdown outside the panel and any `[data-live-menu-button]`, and clicking any link. Opening moves focus to the first panel link (Home); closing returns focus to the first visible menu button outside the panel. Nothing beside the panel moves or resizes: content rects are identical open and closed.

## Sticky rules

- The navbar (`app/Navbar.tsx`) hides on scroll-down and reappears on scroll-up or near the top,
  gated to `/live` and `/live/rehearsal` (and `/shop`). It sets `--header-h` (header height) and
  `--header-offset` (header height when shown, `0px` when hidden) on `:root`.
- Nothing in `LiveSupportAsk` is sticky: the Fund button, sentinel and stuck state were removed.
  The panel variant is its own bounded scroller (`h-full overflow-y-auto`); the sheet variant flows in the mobile page.

## Single-video rule

Exactly one `<video>` element exists for the life of a session, portaled by `useStageVideo`
(`Stage.tsx`) into whichever slot ref is active: `desktopStageSlotRef` (desktop),
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
