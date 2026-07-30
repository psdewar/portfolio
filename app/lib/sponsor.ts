export const HONORARIUM_ITEM = "Artist honorarium";
export const HONORARIUM_DEFINITION =
  "Recognizes the performance itself. Any amount goes a long way.";

export const SUPPORTER_ITEMS = ["Spread the word via concert poster", HONORARIUM_ITEM];

export const SPECIAL_ITEMS = ["Sandwich board outside your venue", "50/50 donation split"];

export const SUPPORT_MENU: { category: string; items: string[] }[] = [
  {
    category: "General",
    items: [
      "Spread the word via concert poster",
      "Arrange the venue space",
      "Table for merch and donations",
      "Airport pickup and drop-off",
      "Stay with a local host",
    ],
  },
  {
    category: "Financial",
    items: ["Round-trip airfare", "Car rental", "Hotel or Airbnb", HONORARIUM_ITEM],
  },
];
