import Poster from "../components/Poster";
import { PAY_WHAT_YOU_WANT_TAG } from "../lib/poster-defaults";
import { POSTER_DIMS } from "../lib/poster-formats";

const FILL_MAX_WIDTH = `min(100cqw, calc(100cqh * 1.3 * ${POSTER_DIMS.pdf.W} / ${POSTER_DIMS.pdf.H}))`;

export type PosterShow = {
  date: string;
  city: string;
  region: string;
  doorTime?: string | null;
  doorLabel?: string | null;
  venue?: string | null;
  venueLabel?: string | null;
  address?: string | null;
  tags?: string | null;
  posterLine?: string | null;
  posterImg?: string | null;
  bgImg?: string | null;
};

export default function ShowPoster({ show, fill = false }: { show: PosterShow; fill?: boolean }) {
  const poster = (
    <Poster
      date={show.date}
      city={show.city}
      region={show.region}
      doorTime={show.doorTime ?? undefined}
      doorLabel={show.doorLabel}
      venue={show.venue}
      venueLabel={show.venueLabel}
      address={show.address}
      tags={show.tags ?? PAY_WHAT_YOU_WANT_TAG}
      posterLine={show.posterLine}
      posterImg={show.posterImg ?? undefined}
      bgImg={show.bgImg ?? undefined}
    />
  );
  return fill ? (
    <div className="h-full w-full [container-type:size]">
      <div
        className="h-full [&_.poster]:!h-full [&_.poster]:!w-full [&_.poster]:!max-w-none [&_.poster]:![aspect-ratio:auto]"
        style={{ width: FILL_MAX_WIDTH }}
      >
        {poster}
      </div>
    </div>
  ) : (
    poster
  );
}
