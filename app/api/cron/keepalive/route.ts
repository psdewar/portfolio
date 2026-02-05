import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Need service role to write to purchases table (RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Keepalive markers - use these to filter in other code
const KEEPALIVE_PREFIX = "_keepalive_";
const KEEPALIVE_SKU = "_keepalive_";
const KEEPALIVE_SESSION = "_keepalive_ping_";
const KEEPALIVE_ENTRY = "_keepalive_ping_";

export async function GET(request: Request) {
  // Verify cron secret (prevents random hits)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Insert then delete from each table to force write activity

    // Inventory: insert/delete dummy SKU
    await supabase.from("inventory").upsert({ sku: KEEPALIVE_SKU, quantity: 0 });
    await supabase.from("inventory").delete().eq("sku", KEEPALIVE_SKU);

    // Purchases: insert/delete dummy purchase
    await supabase.from("purchases").upsert(
      {
        session_id: KEEPALIVE_SESSION,
        email: "keepalive@ping.local",
        product_id: "_keepalive_",
        payment_status: "ping",
      },
      { onConflict: "session_id" }
    );
    await supabase.from("purchases").delete().eq("session_id", KEEPALIVE_SESSION);

    // Stay-connected: insert/delete dummy entry
    const { data: inserted } = await supabase
      .from("stay-connected")
      .insert({ email: KEEPALIVE_ENTRY })
      .select("id")
      .single();

    if (inserted?.id) {
      await supabase.from("stay-connected").delete().eq("id", inserted.id);
    }

    const status = {
      timestamp: new Date().toISOString(),
      tables: ["inventory", "purchases", "stay-connected"],
      action: "insert+delete",
    };

    console.log("[Cron] Supabase keepalive:", status);

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("[Cron] Keepalive failed:", error);
    return NextResponse.json({ error: "Keepalive failed" }, { status: 500 });
  }
}
