const mask = (path: string, viewBox = "0 0 256 256") =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><path d='${path}'/></svg>`,
  )}")`;

const maskStyle = (path: string, viewBox?: string): React.CSSProperties => ({
  WebkitMaskImage: mask(path, viewBox),
  maskImage: mask(path, viewBox),
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: viewBox ? "left center" : "center",
  maskPosition: viewBox ? "left center" : "center",
});

const PLAY_PATH =
  "M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z";
const PAUSE_PATH =
  "M216,48V208a16,16,0,0,1-16,16H164a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h36A16,16,0,0,1,216,48ZM92,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H92a16,16,0,0,0,16-16V48A16,16,0,0,0,92,32Z";

export const PLAY_MASK_FLUSH = maskStyle(PLAY_PATH, "64 24 176 208");
export const PAUSE_MASK_FLUSH = maskStyle(PAUSE_PATH, "40 24 176 208");

export const PLAY_MASK_STYLE = maskStyle(PLAY_PATH);
