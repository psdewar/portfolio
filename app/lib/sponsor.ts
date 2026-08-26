export const HONORARIUM_ITEM = "Artist honorarium";
export const HONORARIUM_DEFINITION =
  "Monetary gift that recognizes the performance itself. Any amount goes a long way.";

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

// Every item in menu order, the sequence a host reads them in on the form.
const ITEM_ORDER: readonly string[] = [
  ...SUPPORT_MENU.flatMap((section) => section.items),
  ...SPECIAL_ITEMS,
];

// Display a host's checked items in menu order, not the order they tapped them.
// Anything off-menu keeps its relative position at the end.
export function orderItems(items: string[]): string[] {
  const rank = (item: string) => {
    const i = ITEM_ORDER.indexOf(item);
    return i === -1 ? ITEM_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}
