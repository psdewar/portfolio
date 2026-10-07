# Portfolio Project Rules

## UI Patterns

_Applies when: any UI, layout, JSX, or CSS change. Always-on invariants; responsiveness first._

### Fluid/Intrinsic Sizing

All layouts use fluid sizing — elements fill available space proportionally with zero wasted space.

1. **No dead space** — remaining space = elements grow (`flex-1`). Content-sized = `shrink-0`.
2. **Test all breakpoints** — 768px, 900px, etc. The in-between sizes break layouts.
3. **Graceful degradation** — reduce padding/fonts first, horizontal scroll second, collapse layout third.
4. **Never cut off** — `overflow-x-auto` for scrollable lists, `truncate` only when appropriate.
5. **Content-aware sizing** — inputs sized to expected content, buttons sized to text.

### Flexbox

- **Ratio-based**: `flex-[2]` and `flex-[1]` for proportional relationships.
- **Primary/Secondary panels**: Primary has FIXED dimensions (`aspect-[9/16] h-full`). Secondary has `flex-1 min-w-0` and absorbs ALL viewport changes.
- Always add `min-w-0` to flex children.
- Responsive degradation: secondary shrinks → secondary fonts/padding reduce → secondary collapses into primary as overlay.

### Height + Width Responsive

- Primary panel: Fixed aspect ratio based on height. Width calculated from height.
- Secondary panel: `flex-1 min-w-0`, absorbs all viewport changes.
- Collapse threshold: BOTH width AND height checks: `@media (min-width: 1024px) and (min-height: 500px)`.
- When a component's width depends on a sibling (e.g., poster aspect ratio), use `@container` so it responds to its own width, not the viewport.

### GlobalAudioPlayer Clearance Pattern

The player is `fixed bottom-0` and sets `--player-h` on `:root` via a `useEffect` in `GlobalAudioPlayer` when visible. Only `/listen` clears it as a page (`SiteShell clearPlayer` pads `<main>`). Every other page ignores the player: fixed full-screen surfaces (RSVP, live, ticket) run to `bottom-0`, and viewport-height layouts (shop) don't subtract it. The one exception is a pressable the player would cover — a bottom-anchored button, a scroll column that ends in a submit, or a list of rows (RSVP shows, support tracks) — which floats above it with `bottom: max(<baseline>, var(--player-h, 0px))` or pads with `max(<baseline>, var(--player-h, 0px))`. Never hardcode `pb-24` or `bottom-24`.

- Player is suppressed (and `--player-h` removed) on: `/hire`, `/fund/*`, `/support`, `/live` when stream is online, and when `?play=` overlay is open

## Data Conventions

- **Derive, don't store**: Compute values from existing data. Don't store `isPast` when you have `date`.
- **Meaningful IDs**: `YYYYMMDD00` format for timeline events. Multiple same-date = `01`, `02`.
- **Schema.org structured data**: MusicRecording (tracks), MusicEvent (shows), Person/MusicGroup (artist). Use helpers in `app/lib/schema.ts`.
- **List items never fetch**: the parent fetches once and passes data down. Page-load data comes from the parent or a server component, not a per-item effect.
- **Public reads are cached**: use `chorusRead` and `publicCache`; `no-store` is for admin reads and read-before-write inside the same request.

## Artist Brand Context

- Location: Bellevue, WA
- Style: East Coast cadence — Jay-Z, Ja Rule, LL Cool J, Ludacris, T.I.
- Background: software engineer, decade at Microsoft, now independent (contrast effect still applies)
- Founder of Lyrist (songwriting app) + built own streaming infrastructure
- Record label: Lyrist Records (current), 817413 Records DK (legacy)
- Faith: Baha'i (depth, not top-of-funnel filter)

## Code Preferences

- No emojis
- No unnecessary comments
- No over-engineered error handling — let errors surface clearly
- Follow the AI signs of writing
- DRY — extract shared logic into hooks/utilities, don't copy-paste

## Workflow

- DO NOT EXPLORE UNLESS I EXPLICITLY ASK
- Favor loading files into memory and reading them, or whichever is less tokens

## Surface classes (scoped rules)

Every surface belongs to a functional class that decides what dominates the build, and the classes form one artistpreneurship funnel: attract a stranger (Marketing), deepen into a fan (Media), capture a relationship (Capture), convert to revenue (Transaction), operate (Internal), close partnerships (Artifact/print). Surfaces can blend classes; when they do, stack the concerns rather than forcing one. The always-on UI invariants above apply to all of them; the rules below layer on per class, and the pre-commit review applies a class's rules only where the diff touches it. Full per-class playbook: `specs/platform-taxonomy.md`.

- **Marketing** (home, `/hire`, `/live` offline): top-of-funnel curiosity over depth; honest SEO (real canonical and lastModified, OG); fast paint, no layout shift.
- **Media** (`/listen`, `/live` online, player): performance first (lazy images, media fetched on play); clear the player with `--player-h`; fixed-aspect primary panel; audio/video needs a user gesture. `/live` layout (schemes A/S/D, mobile, slot ownership) is documented in `app/live/LIVE_SPEC.md`; the video element (WHEP/HLS, one-video-lifetime rule) is documented in `app/live/PLAYER_SPEC.md`.
- **Capture** (`/moments`, `/rsvp`, contact forms): mobile-first and low-friction, every field earns its place; mobile-Safari-first and in-app-browser tolerant; client storage is best-effort; handle PII carefully, no private addresses in public code.
- **Transaction** (`/shop`, `/support`, `/fund`): fewer, obviously-distinct products; build trust before the ask; let Stripe errors surface.
- **Internal** (`/admin/**`): function over form, fast entry; noindex and gated; no vanity metrics (push back if asked).
- **Artifact/print** (`/sponsor`, posters, pamphlet, OG): fixed canvas (Letter 816x1056 at 2x, light colorScheme, Playwright), not responsive; lawyerly and plain; noindex.
