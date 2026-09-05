import type { Metadata } from "next";
import { parseLocalDate } from "../lib/dates";
import { getDoorLabel, getUpcomingShows, isResidence, type Show } from "../lib/shows";
import { DEFAULT_TAGLINE } from "../lib/poster-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "From The Ground Up",
  robots: { index: false, follow: false },
};

const CSS = `
.ftgu {
  --s: min(0.87vh, 0.5625vw);
  --bg: #262b3f;
  --ink: #f0ede6;
  --gold: #d4a553;
  --gold-lt: #e0b860;
  --hair: rgba(212, 165, 83, 0.28);
  --muted: rgba(240, 237, 230, 0.72);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-parkinsans), sans-serif;
}

.ftgu-hero {
  position: relative;
  flex: 1.35;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: calc(5 * var(--s)) calc(5 * var(--s));
}
.ftgu-hero > * {
  position: relative;
  z-index: 1;
}
.ftgu-hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.ftgu-hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 26%;
}
.ftgu-hero-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 72% at 0% 0%, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 35%, rgba(0, 0, 0, 0.25) 68%, transparent 100%);
}
.ftgu-hero-bg::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.45) 35%, transparent 100%);
}
.ftgu-hero-text {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
.ftgu-credits {
  margin-top: auto;
}
.ftgu-lockup {
  display: flex;
  align-items: center;
  gap: calc(0.7 * var(--s));
}
.ftgu-lockup-img {
  height: calc(5.6 * var(--s));
  width: auto;
}
.ftgu-lockup-records {
  font-family: var(--font-fira-sans), sans-serif;
  font-size: calc(4 * var(--s));
  font-weight: 500;
}
.ftgu-presents {
  font-family: var(--font-space-mono), monospace;
  font-size: calc(2.5 * var(--s));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold-lt);
  margin: calc(1.2 * var(--s)) 0 calc(1.2 * var(--s));
}
.ftgu-from {
  font-size: calc(5 * var(--s));
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
  line-height: 0.9;
}
.ftgu-big {
  font-size: calc(10.5 * var(--s));
  font-weight: 800;
  line-height: 0.88;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  margin-left: calc(-0.6 * var(--s));
}
.ftgu-rule {
  width: calc(14 * var(--s));
  height: calc(0.9 * var(--s));
  background: linear-gradient(to right, var(--gold), var(--gold-lt));
  margin: calc(2 * var(--s)) 0 calc(2.2 * var(--s));
}
.ftgu-tagline div {
  font-family: var(--font-space-mono), monospace;
  font-size: calc(2.8 * var(--s));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold-lt);
  line-height: 1.55;
}
.ftgu-credits div {
  font-family: var(--font-space-mono), monospace;
  font-size: calc(2.8 * var(--s));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.55;
}

.ftgu-dates {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: calc(5 * var(--s)) calc(5 * var(--s));
  border-left: 1px solid var(--hair);
  background: var(--bg);
}
.ftgu-heading {
  font-family: var(--font-space-mono), monospace;
  font-size: calc(2.4 * var(--s));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
  flex-shrink: 0;
}
.ftgu-rows {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(5 * var(--rs) * var(--s));
  padding: calc(2 * var(--s)) 0 calc(3 * var(--s));
}
.ftgu-row {
  display: flex;
  flex-direction: column;
  gap: calc(1.6 * var(--rs) * var(--s));
}
.ftgu-date {
  font-size: calc(5.2 * var(--rs) * var(--s));
  font-weight: 800;
  line-height: 1.08;
}
.ftgu-place {
  font-size: calc(3.4 * var(--rs) * var(--s));
  font-weight: 500;
  line-height: 1.25;
  margin-top: calc(0.8 * var(--rs) * var(--s));
}
.ftgu-doors {
  font-size: calc(3.4 * var(--rs) * var(--s));
  color: var(--muted);
  line-height: 1.25;
}
.ftgu-empty {
  font-size: calc(5 * var(--s));
  font-weight: 700;
  line-height: 1.1;
}

.ftgu-qr {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(2.4 * var(--s));
}
.ftgu-qr-box {
  flex-shrink: 0;
  width: calc(34 * var(--s));
  height: calc(34 * var(--s));
  padding: calc(1.4 * var(--s));
  border-radius: calc(1 * var(--s));
  background: #ffffff;
}
.ftgu-qr-box img {
  display: block;
  width: 100%;
  height: 100%;
}
.ftgu-qr-cta {
  font-size: calc(3.6 * var(--s));
  font-weight: 700;
  line-height: 1.1;
}
.ftgu-qr-url {
  font-family: var(--font-space-mono), monospace;
  font-size: calc(2.2 * var(--s));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold-lt);
  margin-top: calc(0.8 * var(--s));
}

@page { size: letter landscape; margin: 0; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

function rowScaleFor(count: number): number {
  if (count <= 2) return 1;
  if (count === 3) return 0.9;
  if (count === 4) return 0.62;
  return 0.5;
}

export default async function FtguPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const upcoming = (await getUpcomingShows()).filter((s) => s.visibility !== "private");

  const slugs = params.slugs
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let selected: Show[];
  if (slugs?.length) {
    selected = upcoming.filter((s) => slugs.includes(s.slug));
  } else if (params.leg) {
    selected = upcoming.filter((s) => s.leg === params.leg);
  } else {
    const city = (params.city ?? "").trim().toLowerCase();
    const leg = city ? null : upcoming[0]?.leg;
    selected = leg
      ? upcoming.filter((s) => s.leg === leg)
      : upcoming.filter((s) => s.city.toLowerCase() === (city || upcoming[0]?.city.toLowerCase()));
  }

  const places = new Set(selected.map((s) => `${s.city}, ${s.region}`));
  const sameCity = places.size === 1;
  const heading = params.title?.trim() || (sameCity ? [...places][0] : null);
  const rowScale = rowScaleFor(selected.length);

  return (
    <>
      <style>{CSS}</style>
      <div className="ftgu">
        <section className="ftgu-hero">
          <div className="ftgu-hero-bg">
            <img src="/Jan23OpenMicNight-08_Original.jpg" alt="" />
          </div>

          <div>
            <div className="ftgu-lockup ftgu-hero-text">
              <img src="/lyrist-trademark-white.png" alt="Lyrist" className="ftgu-lockup-img" />
              <span className="ftgu-lockup-records">Records</span>
            </div>
          </div>

          <div className="ftgu-hero-text">
            <div className="ftgu-presents">presents</div>
            <div className="ftgu-from">From The</div>
            <div className="ftgu-big">Ground</div>
            <div className="ftgu-big">Up</div>
            <div className="ftgu-rule" />
            <div className="ftgu-tagline">
              {DEFAULT_TAGLINE.split("\n").map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>

          <div className="ftgu-credits ftgu-hero-text">
            <div>rap concert for all ages</div>
            <div>by software engineer</div>
            <div>peyt spencer</div>
          </div>
        </section>

        <section className="ftgu-dates" style={{ "--rs": rowScale } as React.CSSProperties}>
          {heading && <div className="ftgu-heading">{heading}</div>}

          <div className="ftgu-rows">
            {selected.length === 0 ? (
              <div className="ftgu-empty">
                Next dates
                <br />
                drop soon
              </div>
            ) : (
              selected.map((show) => {
                const d = parseLocalDate(show.date);
                const cityLine = `${show.city}, ${show.region}`;
                const venue = isResidence(show) ? null : show.venue;
                const place = venue ? (sameCity ? venue : `${venue}, ${cityLine}`) : cityLine;
                return (
                  <div key={show.slug} className="ftgu-row">
                    <div className="ftgu-date">
                      {d
                        .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                        .replace("September", "Sept")}
                    </div>
                    <div className="ftgu-place">{place}</div>
                    <div className="ftgu-doors">{getDoorLabel(show)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="ftgu-qr">
            <div className="ftgu-qr-box">
              <img src="/api/qr?d=%2Frsvp" alt="Scan to RSVP" />
            </div>
            <div>
              <div className="ftgu-qr-cta">Scan to RSVP</div>
              <div className="ftgu-qr-url">peytspencer.com/rsvp</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
