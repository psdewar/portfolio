import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../shared/stripe-utils";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const customer = customers.data[0];

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    // Set patron cookie for server-side auth
    const response = NextResponse.json({
      success: true,
      email: customer.email,
    });

    response.cookies.set("patronToken", "active", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Verify patron error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
