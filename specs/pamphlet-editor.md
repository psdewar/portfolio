# Pamphlet Layout Editor — Build Spec

**Status:** Draft for a fresh Claude Code instance to implement.
**Owner:** Peyt Spencer (peytspencer.com).
**Repo:** `/Users/psd/Documents/portfolio` (Next.js 16.1.1, App Router, TypeScript, Tailwind).

---

## Mission

Build a free, self-contained drag-and-drop pamphlet editor inside `/Users/psd/Documents/portfolio`. Replace the code-driven layout iteration loop in `app/api/pamphlet/route.ts` with a visual editor. Output is a JSON layout saved to a new `Pamphlet.layout` field, consumed by the existing Playwright-based screenshot endpoint at render time.

This is a free, self-hosted Polotno SDK alternative built with **Konva.js + react-konva** (both MIT-licensed).

---

## Constraints (non-negotiable)

1. **Fully isolated, easy to rip out.** All editor code lives under `app/admin/editor/`. To remove: `rm -rf app/admin/editor` + `npm uninstall konva react-konva`. Do not touch any other file in the project except:
   - **(a)** one new optional field on the `Pamphlet` type in `app/lib/pamphlets.ts`,
   - **(b)** one optional consumer block in `app/api/pamphlet/route.ts` to read that field if present (with hardcoded HTML as fallback for backward compat),
   - **(c)** one button in `app/admin/hosts/page.tsx` that links to the editor.
   
   Tag all three additions with the comment `// EDITOR_INTEGRATION` so they're greppable for clean removal later.

2. **No paid services.** No Polotno SDK, no IMG.LY, no API keys.

3. **Brand fonts locked.** Only:
   - Parkinsans (Google Fonts) — display/headings/dates.
   - Fira Sans (Google Fonts) — Lyrist Records lockup.
   - Space Mono (Google Fonts) — kickers, tags, URL labels.
   
   No font picker beyond these three. No custom font upload.

4. **Brand colors locked.** Color picker shows only:
   - Golds: `#d4a553`, `#e0b860`, `#e8c474`
   - Cream: `#f0ede6`
   - Muted cream: `#c0b8a8`
   - Pure: `#ffffff`, `#0a0a0a`
   - Plus rgba variants for transparency.

5. **Next.js 16 App Router.** Use `dynamic(() => import('./Editor'), { ssr: false })` to skip SSR for Konva (Konva references `window`).

6. **TypeScript.** Match existing code style (no semicolons inside JSX, double quotes, ESM imports).

---

## Project context

Personal site for Peyt Spencer (rapper, Microsoft engineer, founder of Lyrist Records). The pamphlet endpoint generates promotional images for shows. Existing pipeline:

```
admin/hosts
  → PamphletGroupButton modal
  → PATCH /api/pamphlets {id, shows, label, ...}
  → download pamphlet image via /api/pamphlet?id=X&format=ig
  → Playwright screenshot of rendered HTML
```

Right now the HTML layout in `app/api/pamphlet/route.ts` is hardcoded. The editor lets the user drag elements, save positions to `Pamphlet.layout`, and the Playwright endpoint reads that layout to render at screenshot time.

Already installed (verify with `grep konva package.json`):
- `konva: ^10.2.5`
- `react-konva: ^19.2.3`

---

## Visual reference: read this file FIRST

**`/Users/psd/Documents/portfolio/app/api/pamphlet/route.ts`** — the existing pamphlet template. Open it. The `pamphletHtml()` function shows every element, its current position, font, size, color, and CSS classes. The editor must be capable of producing layouts that **look identical** to what `pamphletHtml` currently renders. Use this file as the spec for:

- **Format dimensions:** `standard 480×720`, `ig 540×675`, `yt 540×540`
- **Background image:** `${BASE_URL}/Jan23OpenMicNight-08_Original.jpg`
- **Photo overlays:** left gradient (`linear-gradient(to right, ...)`) + bottom gradient (`linear-gradient(to top, ...)`)
- **Grain texture:** SVG noise filter via `data:image/svg+xml`, opacity 0.4
- **Lockup:** Lyrist trademark image (`${BASE_URL}/lyrist-trademark-white.png`) + "Records" text in Fira Sans 15px white
- **"presents" kicker:** Space Mono 10px gold uppercase, tracking 0.06em
- **Title block:** "From The" / "Ground" / "Up", Parkinsans, gradient accent bar (`linear-gradient(to right, #d4a553, #e8c474)`)
- **Tagline:** "My path of growth" / "and the principles" / "that connect us [first word of label]" + label rest, all Space Mono gold uppercase 10px tracking 0.06em
- **Tagline image** (optional, e.g. `/tcc.webp`), `display: block; height: 120px; width: auto`
- **Theme top-right:** "a rap concert by / microsoft engineer / peyt spencer", Space Mono 9px muted cream uppercase tracking 0.06em with text-shadow
- **Bottom utility row:** "PAY WHAT YOU WANT · [location]" left, "PEYTSPENCER.COM/RSVP" right (Space Mono 10px tracking 0.08em uppercase)
- **Show rows:** date (Parkinsans 15px bold cream `#f0ede6`) + optional doors + optional venue
  - Two modes: `compact` (date + doors inline, gold dividers) when all shows share venue; `full` (stacked date/venue/doors per row) when venues differ.
- **Optional QR code** (bottom-right): static PNG at `https://assets.peytspencer.com/images/rsvp-qr-s10.png`. 92×92 (standard/ig), 72×72 (yt).

---

## Data model

Existing `Pamphlet` interface in `app/lib/pamphlets.ts`:

```ts
export interface Pamphlet {
  id: string;
  label?: string;
  shows: PamphletShow[];        // [{ slug, venueLabel? }]
  showDoors?: boolean;
  showQr?: boolean;
  location?: string;
  taglineImage?: string;
}
```

**Add one field for the editor (TAG WITH `// EDITOR_INTEGRATION`):**

```ts
export interface PamphletLayout {
  format: "standard" | "ig" | "yt";
  elements: Array<{
    id: string;                     // stable id, e.g. "title-from", "qr"
    type: "text" | "image" | "rect" | "line" | "group";
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;              // degrees
    visible?: boolean;
    locked?: boolean;
    zIndex?: number;
    // text-only:
    text?: string;
    fontFamily?: "Parkinsans" | "Fira Sans" | "Space Mono";
    fontSize?: number;
    fontWeight?: number;            // 400, 500, 600, 700, 800
    fill?: string;                  // hex or rgba
    letterSpacing?: number;         // em
    lineHeight?: number;
    align?: "left" | "center" | "right";
    transform?: "none" | "uppercase";
    // image-only:
    src?: string;
    // rect-only:
    cornerRadius?: number;
    // dynamic content placeholder:
    bind?: string;                  // e.g. "shows.0.date" | "shows.0.venue" | "label.first" | "label.rest" | "url" | "free-tag"
  }>;
}

export interface Pamphlet {
  id: string;
  label?: string;
  shows: PamphletShow[];
  showDoors?: boolean;
  showQr?: boolean;
  location?: string;
  taglineImage?: string;
  layout?: PamphletLayout;          // ← new, EDITOR_INTEGRATION
}
```

The `bind` field is critical: an element bound to `shows.0.date` renders the first show's date dynamically at screenshot time. The user positions a "date placeholder" in the editor; the rendered pamphlet substitutes real data when generating the image.

---

## Existing endpoints to integrate with

- **`GET /api/pamphlets`** — list of pamphlets (chorus passthrough).
- **`POST /api/pamphlets`** — create pamphlet.
- **`PATCH /api/pamphlets`** — update pamphlet (any fields, including new `layout`).
- **`DELETE /api/pamphlets`** — delete by id.
- **`GET /api/shows`** — list of shows. Use to resolve dates/venues for `bind` placeholders.
- **`GET /api/pamphlet?id=X&format=Y`** — generates the pamphlet image. Update minimally to read `pamphlet.layout` if present and render that; otherwise fall back to existing hardcoded `pamphletHtml`. Keep the fallback for backward compat.

---

## Editor scope

### File structure

```
app/admin/editor/
  page.tsx              ← server entry; dynamically imports Editor (ssr: false)
  Editor.tsx            ← main editor shell (left sidebar + canvas + right panel)
  Canvas.tsx            ← Konva Stage + Layer + element rendering
  Toolbar.tsx           ← top toolbar (undo/redo, save, format selector, zoom)
  ElementsPanel.tsx     ← left sidebar: element library + layer list
  PropertiesPanel.tsx   ← right sidebar: properties of selected element
  hooks/useHistory.ts   ← undo/redo stack
  hooks/useKeyboard.ts  ← keyboard shortcuts
  lib/elements.ts       ← element factory functions (createText, createImage, etc.)
  lib/snap.ts           ← snap-to-grid + snap-to-edge helpers
  lib/render.ts         ← layout → HTML rendering (used by /api/pamphlet)
  lib/binds.ts          ← resolve bind expressions like "shows.0.date" → actual data
  defaults.ts           ← default layout that matches the current pamphlet HTML
  README.md             ← removal procedure
```

### URL pattern

- `/admin/editor` — opens with last edited or empty.
- `/admin/editor?id=<pamphlet-id>` — opens the specific pamphlet.
- `/admin/editor?id=<pamphlet-id>&format=ig` — opens at a specific format.

### UI: 3-column layout

```
┌──────────┬──────────────────────┬──────────┐
│ Library  │      Canvas          │ Props    │
│ + Layers │   (Konva Stage)      │ panel    │
│          │                      │          │
│          │  [Live preview at    │          │
│          │   format dimensions] │          │
└──────────┴──────────────────────┴──────────┘
       Toolbar across the top: undo/redo/save/format/zoom
```

### Top Toolbar

- **Undo / Redo** (icons + keyboard `⌘Z` / `⌘⇧Z`).
- **Save** (PATCH `/api/pamphlets`). Show a dot indicator when unsaved changes exist.
- **Format selector:** `standard` / `ig` / `yt` — switching resizes the canvas to that format's W×H.
- **Zoom:** 25% / 50% / 100% / 150% / 200% / Fit.
- **Preview mode toggle** (hide selection handles, show what the screenshot would look like).
- **"Render Sample" button** — opens `/api/pamphlet?id=X&format=Y` in a new tab to compare against the editor's output.

### Left sidebar — two stacked panels

1. **Library:** click-to-add element types — Text, Image, Rectangle, Line, Date placeholder, Venue placeholder, QR placeholder, Tagline-mark image, Photo background.
2. **Layers:** list of all elements in z-order. Click to select. Drag to reorder. Eye icon toggles `visible`. Lock icon toggles `locked`.

### Center — canvas

- Konva `Stage` at the format's W×H, scaled by zoom level.
- Draggable elements with a single `Transformer` attached to the selected element.
- Multi-select via shift-click or marquee drag (Konva sandbox has examples).
- **Snap to:** 8px grid, edges of other elements, center axis, page edges. Show pink/magenta guide lines while dragging when snapping.
- Right-click context menu: bring forward / send backward / duplicate / delete / lock / hide.
- Background photo + scrim layers rendered behind everything else, non-selectable but configurable from properties panel.

### Right sidebar — properties panel (context-sensitive to selected element)

- **Common:** position (x, y), size (w, h), rotation, opacity, visibility, lock.
- **Text:** text content (textarea), font family (3-button toggle), font size (slider), font weight (radio: 400/500/600/700/800), color (palette of 7 brand colors), letter spacing, line height, align, transform (none/uppercase).
- **Image:** source path/URL (text input + file upload that goes to `/public`), preserve aspect ratio toggle.
- **Rect/Line:** fill, stroke, cornerRadius.
- **Bind:** dropdown of available data placeholders (`shows.0.date`, `shows.0.venue`, `label.first`, `label.rest`, `url`, `free-tag`, etc.). When bound, the text content shows `{{shows.0.date}}` and the canvas renders a sample value pulled from the loaded pamphlet's data.

### Keyboard shortcuts (in `hooks/useKeyboard.ts`)

- Arrow keys: nudge 1px. Shift+Arrow: nudge 10px.
- ⌘C / ⌘V: copy/paste element.
- ⌘D: duplicate.
- Delete/Backspace: delete selected.
- ⌘Z / ⌘⇧Z: undo / redo.
- ⌘S: save.
- Esc: deselect.
- ⌘+ / ⌘-: zoom in/out.
- 1/2/3 number keys: switch format (standard/ig/yt).

### Save / Load behavior

- **Save:** serialize `editor.elements[]` + `format` to `Pamphlet.layout` JSON, PATCH `/api/pamphlets {id, layout}`.
- **Load:** GET `/api/pamphlets`, find by id, populate elements from `pamphlet.layout.elements`. If `pamphlet.layout` is missing, populate from `defaults.ts` (a hardcoded default that visually matches the current `pamphletHtml` output).
- **Autosave:** debounced 1s after last change, soft-save to localStorage; only PATCH on explicit Save click.
- **Dirty indicator:** show a dot in the toolbar Save button when unsaved changes exist.

### Render integration with `/api/pamphlet/route.ts`

Add minimal logic (TAG WITH `// EDITOR_INTEGRATION`):

```ts
// EDITOR_INTEGRATION: read layout if present, render via editor's renderer
if (pamphlet?.layout?.elements?.length) {
  const { renderLayoutHtml } = await import("../../admin/editor/lib/render");
  const html = renderLayoutHtml(pamphlet.layout, {
    shows: selected,
    label: pamphletLabel,
    location,
    taglineImage,
    showDoors,
    showQr,
  });
  // pass `html` to takeScreenshot below instead of the hardcoded pamphletHtml() output
}
```

Implement `renderLayoutHtml` in `app/admin/editor/lib/render.ts`. The function takes a layout + data context and emits HTML/CSS that:

- Sets up the canvas at format W×H.
- Renders the background photo + overlays (matching current scrim/grain).
- For each element, emits absolute-positioned HTML with the element's font/size/color/transform.
- Resolves `bind` expressions against the data context (e.g., `bind="shows.0.date"` → renders the first show's formatted date using `formatEventDateShort`).

The output should be visually identical to the current `pamphletHtml()` output when the default layout is loaded.

---

## Defaults: matching the current pamphlet

`defaults.ts` exports `defaultLayout(format: PamphletFormat): PamphletLayout` that produces an element list equivalent to the current hardcoded HTML. Each element in `pamphletHtml()` becomes one entry in the defaults:

- `id: "lockup-img"`, type `image`, src `/lyrist-trademark-white.png`, position computed from existing `padding: 24px 28px` + `lockup` class.
- `id: "lockup-records"`, type `text`, text "Records", font Fira Sans 15px white.
- `id: "presents"`, type `text`, text "presents", Space Mono 10px gold.
- `id: "title-from"`, type `text`, text "From The", Parkinsans 26px bold, color `#d4a553`.
- `id: "title-ground"`, type `text`, text "Ground", Parkinsans 72px 800-weight, color `#f0ede6`.
- `id: "title-up"`, type `text`, text "Up", same as ground.
- `id: "title-accent"`, type `rect`, gradient fill 64×3.
- `id: "tagline-1"` / `tagline-2` / `tagline-3` text elements (Space Mono 10px gold uppercase).
- `id: "tagline-suffix-first"`, type `text`, bind `label.first` (suffix attached to "that connect us").
- `id: "tagline-suffix-rest"`, type `text`, bind `label.rest`.
- `id: "tagline-image"`, type `image`, bind `taglineImage` (resolves to e.g. `/tcc.webp`).
- `id: "theme-1"`, `theme-2`, `theme-3` for the rap-concert hook (Space Mono 9px muted cream).
- `id: "free-admission"`, type `text`, bind `free-tag` (composes "Pay what you want · [location]").
- `id: "url"`, type `text`, text "peytspencer.com/rsvp", Space Mono 10px cream.
- For each show in `shows[]`: `id: "show-N-date"` text bound to `shows.N.date`, `id: "show-N-doors"` bound to `shows.N.doors` (only if `showDoors` true).
- `id: "qr"`, type `image`, src `https://assets.peytspencer.com/images/rsvp-qr-s10.png`, 92×92 (or 72×72 for yt) — only if `showQr` true.

For each format (standard/ig/yt), the defaults differ in title font sizes — match the existing format-specific overrides at the bottom of the CSS in `pamphletHtml()`.

---

## Removal procedure (also document in `app/admin/editor/README.md`)

```bash
# 1. Delete editor folder
rm -rf app/admin/editor

# 2. Uninstall canvas deps
npm uninstall konva react-konva

# 3. Remove the EDITOR_INTEGRATION block in app/api/pamphlet/route.ts
#    (search for "EDITOR_INTEGRATION" and remove the conditional block;
#    pamphletHtml fallback already handles non-layout pamphlets)

# 4. Remove the editor link button in app/admin/hosts/page.tsx
#    (search for "EDITOR_INTEGRATION")

# 5. Optionally remove `layout?: PamphletLayout` from app/lib/pamphlets.ts
#    (it's optional, so leaving it is harmless; just unused)
```

---

## Acceptance criteria

1. `/admin/editor?id=<existing-pamphlet-id>` loads the editor with the pamphlet's existing or default layout.
2. User can drag any element, see snapping guides, save.
3. Save persists to `pamphlet.layout` via PATCH `/api/pamphlets`.
4. `/api/pamphlet?id=<X>` produces a screenshot matching the editor's preview.
5. Format switching (standard/ig/yt) repositions/rescales elements based on per-format defaults; if no per-format override exists for an element, scale proportionally.
6. Removing the editor folder + uninstalling deps + removing the marked integration blocks restores the project to its pre-editor state.

---

## References

- **Konva canvas editor sandbox:** https://konvajs.org/docs/sandbox/Canvas_Editor.html
- **react-konva docs:** https://konvajs.org/docs/react/index.html
- **Konva selection rectangle (marquee):** https://konvajs.org/docs/select_and_transform/Basic_demo.html
- **Konva snapping demo:** https://konvajs.org/docs/sandbox/Objects_Snapping.html
- **Existing pamphlet template (REQUIRED reading):** `app/api/pamphlet/route.ts`
- **Existing admin pamphlet flow:** `app/admin/hosts/page.tsx` — find `PamphletGroupButton` for the data flow.
- **Next.js 16 docs (current version):** https://nextjs.org/docs

---

## Style notes (match existing codebase)

- TypeScript strict.
- Use Tailwind classes consistently with existing admin pages.
- No emojis in UI copy.
- Prefer Phosphor icons (`@phosphor-icons/react`) — already in the project.
- File header comments are sparse in this codebase; keep new files clean too.
- For destructive actions (delete element, clear canvas), use a typed-confirm pattern (matching `handleDeleteShow` in `app/admin/hosts/page.tsx`).

---

## Out of scope for v1

- Stock photo library / Unsplash integration.
- AI background removal.
- AI image generation.
- Templates marketplace.
- Mobile/touch optimization.
- Real-time multiplayer editing.
- Version history beyond undo/redo within session.

These can be added later if the v1 lands.

Build everything in `app/admin/editor/`. Don't touch the rest of the codebase except for the marked integration points and the one-line type addition.
