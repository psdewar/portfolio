import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use anon key - inventory is public read
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("sku, quantity")
      .not("sku", "like", "_keepalive_%");

    if (error) {
      console.error("Inventory fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }

    // Transform to { "black-small": 6, "white-medium": 12, ... }
    const inventory = (data || []).reduce((acc, row) => {
      acc[row.sku] = row.quantity;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(inventory, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Inventory error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
