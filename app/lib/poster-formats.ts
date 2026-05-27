export type PosterFormat = "standard" | "ig" | "yt" | "eb" | "print" | "fb" | "fbe";

export const POSTER_DIMS: Record<PosterFormat, { W: number; H: number }> = {
  standard: { W: 480, H: 720 },
  ig: { W: 540, H: 675 },
  yt: { W: 540, H: 540 },
  print: { W: 612, H: 792 },
  eb: { W: 1080, H: 540 },
  fb: { W: 820, H: 312 },
  fbe: { W: 960, H: 502 },
};

export const PAMPHLET_PREVIEW_FORMATS: PosterFormat[] = ["print", "ig", "yt", "eb", "fb", "fbe"];
export const POSTER_PREVIEW_FORMATS: PosterFormat[] = ["standard", "ig", "yt", "print", "eb", "fb", "fbe"];
