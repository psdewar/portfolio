import { getAttendees } from "./eventbrite";
import { upsertRsvp } from "./rsvp";
import { Show } from "./shows";

export async function syncShowAttendees(show: Show): Promise<number> {
  if (!show.eventbriteId) return 0;
  const attendees = await getAttendees(show.eventbriteId);

  const byEmail = new Map<string, { name: string; guests: number }>();
  for (const a of attendees) {
    const key = a.email.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) existing.guests += 1;
    else byEmail.set(key, { name: a.name, guests: 1 });
  }

  for (const [email, { name, guests }] of byEmail) {
    await upsertRsvp({ email, name, slug: show.slug, guests });
  }
  return byEmail.size;
}
