import { isResidence, type Show } from "./shows";
import { todayIn } from "./dates";

export type RsvpShow = Pick<
  Show,
  | "slug"
  | "date"
  | "city"
  | "region"
  | "doorTime"
  | "doorLabel"
  | "venue"
  | "venueLabel"
  | "eventName"
  | "address"
  | "tags"
  | "fundDefault"
  | "posterImg"
  | "bgImg"
  | "visibility"
> & { posterLine?: string | null; isPast: boolean };

export function toRsvpShow(show: Show & { posterLine?: string | null }): RsvpShow {
  const hideStreet = show.visibility === "private" || isResidence(show) || !!show.hideHost;
  return {
    slug: show.slug,
    date: show.date,
    city: show.city,
    region: show.region,
    doorTime: show.doorTime,
    doorLabel: show.doorLabel,
    venue: hideStreet ? null : show.venue,
    venueLabel: show.hideHost ? null : show.venueLabel,
    eventName: show.eventName,
    address: hideStreet ? null : show.address,
    tags: show.tags,
    fundDefault: show.fundDefault,
    posterImg: show.posterImg,
    bgImg: show.bgImg,
    visibility: show.visibility,
    posterLine: show.hideHost ? null : show.posterLine,
    isPast: show.date < todayIn("Pacific/Honolulu"),
  };
}
