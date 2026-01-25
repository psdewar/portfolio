export type EventType =
  | "show"
  | "single"
  | "feature"
  | "crowdfunding"
  | "content"
  | "checkpoint"
  | "update";

export interface TimelineEvent {
  id: number;
  date: string;
  title: string;
  description?: string;
  location?: string;
  type: EventType;
  url?: string; // Link to tickets, single, etc.
  urlLabel?: string; // "RSVP", "Listen", "Watch", etc.
  relatedSong?: string; // For content/milestone events tied to a specific song
  artist?: string; // For features - the artist who made the original song
  media?: string; // URL to image/video for this event (displayed in journey view)
}

const isPast = (dateStr: string): boolean => {
  const eventDate = new Date(dateStr + "T23:59:59").getTime();
  return Date.now() > eventDate;
};

export const TIMELINE: TimelineEvent[] = [
  { id: 2026032100, date: "2026-03-21", title: "Naw-Ruz 183", type: "checkpoint" },
  {
    id: 2026012300,
    date: "2026-01-23",
    title: "Open Mic Night",
    description: "Third Culture Coffee",
    location: "Bellevue, WA",
    type: "show",
  },
  {
    id: 2026011900,
    date: "2026-01-19",
    title: "Better World Concert Tour w/ Colby Jeffers",
    description: "Cowlitz County Historical Museum",
    location: "Kelso, WA",
    type: "show",
  },
  {
    id: 2026011800,
    date: "2026-01-18",
    title: "Better World Concert Tour w/ Colby Jeffers",
    description: "Hayes Residence house show",
    location: "Edmonds, WA",
    type: "show",
  },
  {
    id: 2026011700,
    date: "2026-01-17",
    title: "Better World Concert Tour w/ Colby Jeffers",
    description: "Eastside Baha'i Center",
    location: "Bellevue, WA",
    type: "show",
  },
  {
    id: 2026011600,
    date: "2026-01-16",
    title: "Better World Concert Tour w/ Colby Jeffers",
    description: "Fourth Plain Community Commons",
    location: "Vancouver, WA",
    type: "show",
  },
  {
    id: 2025122500,
    date: "2025-12-25",
    title: "First livestream",
    location: "Bellevue, WA",
    description: "Eastside Baha'i Center",
    type: "content",
  },
  {
    id: 2025121300,
    date: "2025-12-13",
    title: "Friend's Wedding",
    description: "Casey Key Resort",
    location: "Nokomis, FL",
    type: "show",
  },
  {
    id: 2025112800,
    date: "2025-11-28",
    title: "Family dinner",
    type: "content",
    relatedSong: "Mula Freestyle",
  },
  {
    id: 2025102100,
    date: "2025-10-21",
    title: "Noble Being Always (Remix) ft. Peyt Spencer",
    artist: "Colby Jeffers",
    type: "feature",
  },
  {
    id: 2025101400,
    date: "2025-10-14",
    title: "Arrived in Boise, show cancelled",
    description: "Redirected funds toward next single",
    type: "update",
  },
  {
    id: 2025101000,
    date: "2025-10-10",
    title: "Flight to Boise funded in 3 days",
    type: "crowdfunding",
  },
  {
    id: 2025100700,
    date: "2025-10-07",
    title: "Launched Boise funding campaign",
    type: "crowdfunding",
  },
  {
    id: 2025100500,
    date: "2025-10-05",
    title: "Won opening spot on I'll Be Home In A Minute Tour",
    description: "Mark Battles Submit Your Music Nero competition",
    type: "content",
  },
  { id: 2025090500, date: "2025-09-05", title: "Patience", type: "single" },
  { id: 2025080800, date: "2025-08-08", title: "Safe", type: "single" },
  {
    id: 2025073100,
    date: "2025-07-31",
    title: "When someone is on their phone while you're talking",
    type: "content",
    relatedSong: "Chains & Whips Freestyle",
  },
  {
    id: 2025063000,
    date: "2025-06-30",
    title: "When You Turn The Baha'i Teachings Into A Rap",
    type: "content",
    relatedSong: "Right One",
  },
  {
    id: 2025062700,
    date: "2025-06-27",
    title: "Open Mic Night",
    location: "Bellevue, WA",
    description: "Third Culture Coffee",
    type: "show",
  },
  {
    id: 2025062100,
    date: "2025-06-21",
    title: "Canvas of Hope Hip-Hop Showcase",
    location: "Seattle, WA",
    description: "Seattle Armory",
    type: "show",
  },
  { id: 2025062000, date: "2025-06-20", title: "Right One", type: "single" },
  {
    id: 2025062001,
    date: "2025-06-20",
    title: "Will Smith sent me a beat",
    type: "content",
    relatedSong: "Pretty Girls Freestyle",
  },
  {
    id: 2025053000,
    date: "2025-05-30",
    title: "Open Mic Night",
    location: "Bellevue, WA",
    description: "Third Culture Coffee",
    type: "show",
  },
  {
    id: 2025052400,
    date: "2025-05-24",
    title: "Better World Concert w/ Colby Jeffers",
    description: "Windstock Youth Retreat",
    location: "Lyle, WA",
    type: "show",
  },
  {
    id: 2025052300,
    date: "2025-05-23",
    title: "Vulnerable Thoughts of the Modern Man",
    type: "content",
    relatedSong: "Troglodyte",
  },
  {
    id: 2025052100,
    date: "2025-05-21",
    title: "Better World Concert w/ Colby Jeffers",
    description: "Beaverton Baha'i Center",
    location: "Beaverton, OR",
    type: "show",
  },
  {
    id: 2025050200,
    date: "2025-05-02",
    title: "Troglodyte ft. Peyt Spencer",
    artist: "jeph.ilosopher",
    type: "feature",
  },
  { id: 2025032000, date: "2025-03-20", title: "Naw-Ruz 182", type: "checkpoint" },
  { id: 2024110800, date: "2024-11-08", title: "Where I Wanna Be", type: "single" },
  { id: 2021052800, date: "2021-05-28", title: "Whoopty / Lemon Pepper Freestyle", type: "single" },
  { id: 2020091100, date: "2020-09-11", title: "Critical Race Theory", type: "single" },
  { id: 2019121200, date: "2019-12-12", title: "Better Days", type: "single" },
  { id: 2018032000, date: "2018-03-20", title: "Baha'i", type: "single" },
];

// Naw-Ruz 2025 - the starting point for the current journey
export const NAW_RUZ_2025 = "2025-03-20";

// Parse date for sorting (using noon to avoid timezone shifts)
const parseDate = (dateStr: string) => new Date(dateStr + "T12:00:00").getTime();

// Get upcoming events (sorted by date ascending)
export const getUpcomingEvents = () =>
  TIMELINE.filter((e) => !isPast(e.date)).sort((a, b) => parseDate(a.date) - parseDate(b.date));

// Get past events (sorted by date descending - most recent first)
export const getPastEvents = () =>
  TIMELINE.filter((e) => isPast(e.date)).sort((a, b) => parseDate(b.date) - parseDate(a.date));

// Get events since Naw-Ruz 2025
export const getJourneyEvents = () =>
  TIMELINE.filter((e) => isPast(e.date) && parseDate(e.date) >= parseDate(NAW_RUZ_2025)).sort(
    (a, b) => parseDate(b.date) - parseDate(a.date),
  );

// Format date for display (using noon to avoid timezone shifts)
export const formatEventDate = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return {
    day: date.getDate().toString(),
    dayOfWeek: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    year: date.getFullYear().toString(),
  };
};
