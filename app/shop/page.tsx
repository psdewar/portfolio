"use client";
import { ShopContent } from "../components/ShopContent";
import { useOgMode } from "../lib/useOgMode";

export default function Page() {
  useOgMode();
  return <ShopContent />;
}
