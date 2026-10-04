import { parseDoorTime } from "./dates";

export interface IcsEvent {
  uid: string;
  title: string;
  date: string;
  doorTime?: string | null;
  durationMinutes?: number;
  location?: string | null;
  description?: string | null;
  url?: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function stamp(date: string, minutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(y, m - 1, d, 0, minutes);
  return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
}

export function buildIcs(event: IcsEvent): string {
  const { h, m } = parseDoorTime(event.doorTime);
  const start = h * 60 + m;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peyt Spencer//RSVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
    `DTSTART:${stamp(event.date, start)}`,
    `DTEND:${stamp(event.date, start + (event.durationMinutes ?? 120))}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  const description = [event.description, event.url].filter(Boolean).join("\n");
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, ics: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
