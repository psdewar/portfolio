import { NextRequest, NextResponse } from "next/server";
import { getPurchaseBySessionId, markEmailSent, isKeepalive } from "../../../lib/supabase-admin";
import { sendDownloadEmail } from "../../../lib/sendgrid";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Ignore keepalive pings
    if (isKeepalive(sessionId)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Get purchase from Supabase
    const purchase = await getPurchaseBySessionId(sessionId);

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Ignore keepalive rows
    if (isKeepalive(purchase.product_id) || isKeepalive(purchase.email)) {
      return NextResponse.json({ error: "Invalid purchase" }, { status: 400 });
    }

    if (purchase.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Check if already sent
    if (purchase.email_sent) {
      return NextResponse.json({
        success: true,
        message: "Email already sent. Check your inbox (and spam folder).",
      });
    }

    // Build download URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://peytspencer.com";
    const downloadUrl = `${baseUrl}/shop/success?session_id=${sessionId}`;

    // Send email
    const sent = await sendDownloadEmail({
      to: purchase.email,
      productName: purchase.product_name || "Your music",
      downloadUrl,
    });

    if (!sent) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    // Mark as sent
    await markEmailSent(sessionId);

    return NextResponse.json({
      success: true,
      message: `Download link sent to ${purchase.email}`,
    });
  } catch (error) {
    console.error("Send download email error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
