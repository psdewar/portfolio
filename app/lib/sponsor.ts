export const VENUE_CHOICES = ["Home", "Community center", "Baha'i center"];

export const SUPPORT_MENU: { category: string; items: string[]; exclusive?: string[] }[] = [
  {
    category: "Venue",
    items: [...VENUE_CHOICES, "Seating", "Setup help"],
    exclusive: VENUE_CHOICES,
  },
  {
    category: "Travel",
    items: [
      "Round-trip airfare",
      "Car rental or local rides",
      "Airport pickup and drop-off",
    ],
  },
  {
    category: "Lodging",
    items: ["Host home stay", "Hotel or Airbnb"],
  },
  {
    category: "Promotion",
    items: [
      "Community outreach and invitations",
      "Flyers or digital promotion",
    ],
  },
  {
    category: "Financial",
    items: ["Artist honorarium", "Space for merch and donations"],
  },
];
