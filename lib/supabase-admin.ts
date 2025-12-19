import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key (can bypass RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Keepalive marker - ignore rows starting with this
export const KEEPALIVE_PREFIX = "_keepalive_";
export const isKeepalive = (value: string | null | undefined): boolean =>
  value?.startsWith(KEEPALIVE_PREFIX) ?? false;

export type Purchase = {
  id: string;
  session_id: string;
  email: string;
  product_id: string;
  product_name: string | null;
  downloadable_assets: string[] | null;
  amount_cents: number | null;
  payment_status: string;
  download_count: number;
  email_sent: boolean;
  created_at: string;
  expires_at: string;
};

export async function savePurchase(data: {
  sessionId: string;
  email: string;
  productId: string;
  productName?: string;
  downloadableAssets?: string[];
  amountCents?: number;
}): Promise<Purchase | null> {
  const { data: purchase, error } = await supabaseAdmin
    .from("purchases")
    .upsert(
      {
        session_id: data.sessionId,
        email: data.email,
        product_id: data.productId,
        product_name: data.productName,
        downloadable_assets: data.downloadableAssets,
        amount_cents: data.amountCents,
      },
      { onConflict: "session_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving purchase:", error);
    return null;
  }

  return purchase;
}

export async function getPurchaseBySessionId(sessionId: string): Promise<Purchase | null> {
  const { data, error } = await supabaseAdmin
    .from("purchases")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    console.error("Error fetching purchase:", error);
    return null;
  }

  return data;
}

export async function incrementDownloadCount(sessionId: string): Promise<void> {
  await supabaseAdmin.rpc("increment_download_count", { sid: sessionId });
}

export async function markEmailSent(sessionId: string): Promise<void> {
  await supabaseAdmin.from("purchases").update({ email_sent: true }).eq("session_id", sessionId);
}

export async function isPurchaseValid(sessionId: string): Promise<boolean> {
  const purchase = await getPurchaseBySessionId(sessionId);
  if (!purchase) return false;

  const now = new Date();
  const expires = new Date(purchase.expires_at);

  return purchase.payment_status === "paid" && now < expires;
}

// ============================================================================
// INVENTORY
// ============================================================================

export async function getInventory(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("sku, quantity")
    .not("sku", "like", "_keepalive_%");

  if (error) {
    console.error("Error fetching inventory:", error);
    return {};
  }

  return (data || []).reduce((acc, row) => {
    acc[row.sku] = row.quantity;
    return acc;
  }, {} as Record<string, number>);
}

export async function decrementInventory(sku: string): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc("decrement_inventory", { sku_param: sku });

  if (error) {
    // Fallback to manual decrement if RPC doesn't exist
    const { error: updateError } = await supabaseAdmin
      .from("inventory")
      .update({ quantity: supabaseAdmin.rpc("greatest", { a: 0, b: "quantity - 1" }) })
      .eq("sku", sku);

    if (updateError) {
      // Simple fallback
      const { data } = await supabaseAdmin
        .from("inventory")
        .select("quantity")
        .eq("sku", sku)
        .single();
      if (data && data.quantity > 0) {
        await supabaseAdmin
          .from("inventory")
          .update({ quantity: data.quantity - 1 })
          .eq("sku", sku);
      }
    }
  }

  console.log(`[Inventory] Decremented ${sku}`);
  return true;
}
