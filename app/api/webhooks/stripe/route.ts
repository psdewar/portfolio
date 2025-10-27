import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSecureEnv } from "../../../../lib/env-validation";
import { stripe } from "../../shared/stripe-utils";
import fs from "fs";
import path from "path";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!endpointSecret) {
      console.error("Stripe webhook secret not found");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    event = stripe.webhooks.constructEvent(payload, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Check if this is a project funding payment
    if (session.metadata?.type === "project_funding") {
      await updateProjectFunding(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function updateProjectFunding(session: Stripe.Checkout.Session) {
  try {
    const { projectId, productId } = session.metadata!;
    const amountCents = session.amount_total || 0;

    // Read current projects data
    const projectsPath = path.join(process.cwd(), "data", "projects.json");
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

    // Update the project's raised amount
    if (projectsData[projectId!]) {
      projectsData[projectId!].raisedCents += amountCents;
      projectsData[projectId!].backers += 1;

      // Write back to file
      fs.writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

      console.log(
        `Updated project ${projectId}: +$${amountCents / 100} (total: $${
          projectsData[projectId!].raisedCents / 100
        })`
      );
    }
  } catch (error) {
    console.error("Error updating project funding:", error);
  }
}
