export interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  notes: string;
  active: boolean;
}

export type CatalogKind = "setlist" | "quote" | "gear";

export const CATALOG_KIND_LABELS: Record<CatalogKind, string> = {
  setlist: "Setlist",
  quote: "Quotes",
  gear: "Gear",
};
