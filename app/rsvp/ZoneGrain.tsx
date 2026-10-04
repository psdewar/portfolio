export const STAMP_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='110'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.16 0.22' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 1.32'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)'/%3E%3C/svg%3E\")";

export default function ZoneGrain() {
  return (
    <div
      aria-hidden="true"
      className="rsvp-grain pointer-events-none absolute inset-0"
      style={{ WebkitMaskImage: STAMP_TEXTURE, maskImage: STAMP_TEXTURE, WebkitMaskSize: "220px 110px", maskSize: "220px 110px" }}
    />
  );
}
