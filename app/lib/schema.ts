const PERFORMER = {
  "@type": "MusicGroup" as const,
  name: "Peyt Spencer",
  "@id": "https://peytspencer.com/#artist",
};

interface MusicEventInput {
  name: string;
  date: string;
  venueName: string;
  city: string;
  region: string;
  streetAddress?: string;
  description?: string;
  url?: string;
  doorTime?: string;
  isAccessibleForFree?: boolean;
}

export function musicEventSchema(event: MusicEventInput) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.name,
    startDate: event.date,
    ...(event.doorTime ? { doorTime: event.doorTime } : {}),
    ...(event.description ? { description: event.description } : {}),
    ...(event.url ? { url: event.url } : {}),
    ...(event.isAccessibleForFree !== undefined ? { isAccessibleForFree: event.isAccessibleForFree } : {}),
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        ...(event.streetAddress ? { streetAddress: event.streetAddress } : {}),
        addressLocality: event.city,
        addressRegion: event.region,
      },
    },
    performer: PERFORMER,
    organizer: {
      "@type": "Organization",
      name: "Lyrist Records",
      url: "https://peytspencer.com",
    },
  };
}

export function musicEventListSchema(events: MusicEventInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Peyt Spencer Live Shows",
    itemListElement: events.map((e) => {
      const { "@context": _, ...event } = musicEventSchema(e);
      return event;
    }),
  };
}
