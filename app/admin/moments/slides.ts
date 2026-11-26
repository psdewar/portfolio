const W = 1080;
const H = 1440;
const LABEL_BOTTOM = 1125;
const LABEL_X = 64;
const LABEL_MAX = W - LABEL_X * 2;
const LABEL_GAP = 14;
const CITY_SIZE = 88;
const DATE_SIZE = 36;
const BLEED = 120;
const BLUR_DIVISOR = 30;

export type SlideItem = { key: string; url: string; large?: string };
export type SlideLabel = { city: string; visit: string };

let fonts: Promise<unknown> | null = null;

function loadFonts() {
  fonts ??= Promise.all(
    [
      new FontFace("SlideCity", "url(/fonts/parkinsans-800.woff2)", {
        weight: "800",
      }),
      new FontFace("SlideDate", "url(/fonts/space-mono-400.woff2)", {
        weight: "400",
      }),
    ].map(async (face) => {
      document.fonts.add(face);
      await face.load();
    }),
  ).catch((err) => {
    fonts = null;
    throw err;
  });
  return fonts;
}

function formatLongDate(visit: string) {
  return new Date(`${visit}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function smoothCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function drawBackground(ctx: CanvasRenderingContext2D, bmp: ImageBitmap) {
  const first = smoothCanvas(W / BLUR_DIVISOR, H / BLUR_DIVISOR);
  let blurred = first.canvas;
  const bctx = first.ctx;
  const scale = Math.max(
    blurred.width / bmp.width,
    blurred.height / bmp.height,
  );
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  bctx.drawImage(bmp, (blurred.width - w) / 2, (blurred.height - h) / 2, w, h);
  while (blurred.width < W) {
    const next = smoothCanvas(blurred.width * 2, blurred.height * 2);
    next.ctx.drawImage(blurred, 0, 0, next.canvas.width, next.canvas.height);
    blurred = next.canvas;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(blurred, -BLEED / 2, -BLEED / 2, W + BLEED, H + BLEED);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: SlideLabel,
  top: number,
) {
  const city = label.city.toUpperCase();
  let size = CITY_SIZE;
  ctx.font = `800 ${size}px SlideCity`;
  while (size > 8 && ctx.measureText(city).width > LABEL_MAX) {
    size -= 2;
    ctx.font = `800 ${size}px SlideCity`;
  }
  const line = formatLongDate(label.visit);
  let dateSize = DATE_SIZE;
  ctx.font = `400 ${dateSize}px SlideDate`;
  while (dateSize > 8 && ctx.measureText(line).width > LABEL_MAX) {
    dateSize -= 2;
    ctx.font = `400 ${dateSize}px SlideDate`;
  }
  const block = size + LABEL_GAP + dateSize;
  const start = top + (H - top - block) / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#d4a553";
  ctx.font = `800 ${size}px SlideCity`;
  ctx.fillText(city, LABEL_X, start + size / 2);
  ctx.font = `400 ${dateSize}px SlideDate`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(line, LABEL_X, start + size + LABEL_GAP + dateSize / 2);
}

export async function renderSlide(
  item: SlideItem,
  label: SlideLabel | null,
): Promise<File> {
  const [res] = await Promise.all([
    fetch(item.large ?? item.url),
    label ? loadFonts() : null,
  ]);
  if (!res.ok) throw new Error(`Could not load ${item.key}`);
  const bmp = await createImageBitmap(await res.blob(), {
    imageOrientation: "from-image",
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    drawBackground(ctx, bmp);
    const landscape = bmp.width >= bmp.height;
    const limit = label && !landscape ? LABEL_BOTTOM : H;
    const scale = landscape
      ? W / bmp.width
      : Math.min(W / bmp.width, limit / bmp.height);
    const w = bmp.width * scale;
    const h = bmp.height * scale;
    const y = landscape ? (H - h) / 2 : (limit - h) / 2;
    ctx.drawImage(bmp, (W - w) / 2, y, w, h);
    if (label) drawLabel(ctx, label, y + h);
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", 0.92),
    );
    if (!blob) throw new Error(`Could not render ${item.key}`);
    return new File([blob], "slide.jpg", { type: "image/jpeg" });
  } finally {
    bmp.close();
  }
}
