export const HONORARIUM_ITEM = "Artist honorarium";
export const HONORARIUM_DEFINITION =
  "Monetary gift that recognizes my concert. Any amount goes a long way.";

export const SPECIAL_ITEMS = ["Sandwich board outside your venue", "50/50 donation split"];

export const CORE_ITEMS = [
  "Spread the word via concert poster",
  "Arrange the venue space",
  "Table for merch and donations",
  HONORARIUM_ITEM,
];

export const COVER_ITEMS = ["Lodging", "Car rental", "Round-trip flight"];

export const SUPPORT_MENU: { category: string; items: string[] }[] = [
  { category: "", items: CORE_ITEMS },
  { category: "You can also cover", items: COVER_ITEMS },
];

// What every draft starts with checked until the host or admin edits the list.
export const DRAFT_DEFAULT_ITEMS = CORE_ITEMS.slice(0, 3);

// Every menu item, flattened, in display order (no category grouping).
export const SUPPORT_ITEMS = SUPPORT_MENU.flatMap((s) => s.items);

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
