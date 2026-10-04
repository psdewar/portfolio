import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../shared/stripe-utils";
import { readSession } from "../../../lib/session";
import { verifySlug } from "../../lib/confirm";

export async function GET(request: NextRequest) {
  try {
    const queryEmail = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const sig = request.nextUrl.searchParams.get("sig") || undefined;
    const signedEmail = queryEmail && verifySlug(queryEmail, sig) ? queryEmail : null;
    const email = readSession(request)?.email.trim().toLowerCase() ?? signedEmail;

    if (!email) {
      return NextResponse.redirect(new URL("/support?manage=1", request.url));
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.redirect(new URL("/support?error=no-subscription", request.url));
    }

    const customer = customers.data[0];

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${request.nextUrl.origin}/support`,
    });

    return NextResponse.redirect(portalSession.url);
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.redirect(new URL("/support?error=portal-failed", request.url));
  }
}
