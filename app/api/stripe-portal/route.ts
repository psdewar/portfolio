import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../shared/stripe-utils";

export async function GET(request: NextRequest) {
  try {
    // Get email from query param (passed from client)
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.redirect(new URL("/patron?error=no-email", request.url));
    }

    // Look up customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.redirect(new URL("/patron?error=no-subscription", request.url));
    }

    const customer = customers.data[0];

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${request.nextUrl.origin}/patron`,
    });

    return NextResponse.redirect(portalSession.url);
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.redirect(new URL("/patron?error=portal-failed", request.url));
  }
}
