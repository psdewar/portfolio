export type PosterFormat = "pdf" | "ig" | "yt" | "eb" | "fb" | "fbe";

export const POSTER_DIMS: Record<PosterFormat, { W: number; H: number }> = {
  pdf: { W: 612, H: 792 },
  ig: { W: 540, H: 675 },
  yt: { W: 540, H: 540 },
  eb: { W: 1080, H: 540 },
  fb: { W: 820, H: 312 },
  fbe: { W: 960, H: 502 },
};

export const POSTER_FORMATS = Object.keys(POSTER_DIMS) as PosterFormat[];

export const POSTER_SCALE = 2;

export const posterAspect = (format: PosterFormat = "pdf") =>
  `${POSTER_DIMS[format].W} / ${POSTER_DIMS[format].H}`;

export const posterFileName = (base: string, format: PosterFormat) =>
  format === "pdf" ? `${base}.pdf` : `${base}-${format}.jpg`;

export const posterSizeLabel = (format: PosterFormat) => {
  if (format === "pdf") return "8.5x11";
  const { W, H } = POSTER_DIMS[format];
  return `${W * POSTER_SCALE}x${H * POSTER_SCALE}`;
};
